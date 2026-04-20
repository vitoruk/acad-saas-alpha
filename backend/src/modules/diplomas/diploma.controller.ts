/**
 * diploma.controller.ts — Orquestra emissão e consulta de diplomas.
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../lib/supabase.js';
import { decrypt } from '../../lib/crypto-vault.js';
import { AppError, NotFoundError, ValidationError } from '../../lib/errors.js';
import { buildDiplomaXml, type DiplomaData } from './xml-mec-builder.js';
import { signXmlWithPfx } from './xml-signing.service.js';
import { buildRvddPdf } from './rvdd.service.js';
import { createTimestamp } from '../secretaria/timestamp.service.js';
import { logger } from '../../lib/logger.js';
import { env } from '../../config/env.js';
import { createHash } from 'node:crypto';

const EmitirSchema = z.object({
  alunoId: z.string().uuid(),
  certificadoEmissoraId: z.string().uuid(),
  certificadoRegistradoraId: z.string().uuid().optional(),
  dataColacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  numeroRegistro: z.string().min(1).max(100),
  livroRegistro: z.string().optional(),
  folhaRegistro: z.string().optional(),
});

type SupabaseRow = Record<string, unknown>;

async function carregarDadosDiploma(alunoId: string): Promise<DiplomaData> {
  const { data: aluno, error: alunoErr } = await supabaseAdmin
    .from('alunos')
    .select('*, curso:cursos(*, campus:campi(*, ies:ies(*)))')
    .eq('id', alunoId)
    .single();

  if (alunoErr || !aluno) throw new NotFoundError('Aluno não encontrado');

  // Verifica elegibilidade (aluno pode formar?)
  const { data: podeFormar } = await supabaseAdmin.rpc('fn_aluno_pode_formar', {
    p_aluno_id: alunoId,
  });
  if (podeFormar !== true) {
    throw new ValidationError('Aluno não concluiu todas as disciplinas obrigatórias');
  }

  const { data: historico } = await supabaseAdmin
    .from('vw_historico_academico')
    .select('*')
    .eq('aluno_id', alunoId);

  const ies = (aluno as SupabaseRow & { curso: { campus: { ies: SupabaseRow } } }).curso.campus.ies;
  const curso = (aluno as SupabaseRow & { curso: SupabaseRow }).curso;

  return {
    numeroRegistro: '',
    dataColacao: '',
    dataExpedicao: new Date().toISOString().slice(0, 10),
    aluno: {
      nomeCompleto: aluno.nome_completo,
      cpf: aluno.cpf,
      rg: aluno.rg ?? undefined,
      dataNascimento: aluno.data_nascimento,
      nacionalidade: aluno.nacionalidade ?? 'Brasileira',
      naturalidade: aluno.naturalidade ?? undefined,
      ufNaturalidade: aluno.uf_naturalidade ?? undefined,
      matricula: aluno.matricula,
      sexo: aluno.sexo ?? undefined,
      nomeMae: aluno.nome_mae ?? undefined,
      nomePai: aluno.nome_pai ?? undefined,
    },
    curso: {
      codigoEmec: (curso.codigo_emec_curso as string) ?? '',
      nome: curso.nome as string,
      grau: curso.grau as string,
      modalidade: curso.modalidade as string,
      cargaHorariaTotal: curso.carga_horaria_total as number,
      atoAutorizativo: (curso.ato_autorizativo as Record<string, string>) ?? {},
    },
    iesEmissora: {
      codigoEmec: ies.codigo_emec as string,
      cnpj: ies.cnpj as string,
      nome: ies.nome_fantasia as string,
      uf: env.IES_UF,
      municipio: env.IES_MUNICIPIO,
    },
    iesRegistradora: {
      codigoEmec: ies.codigo_emec as string,
      cnpj: ies.cnpj as string,
      nome: ies.nome_fantasia as string,
      uf: env.IES_UF,
      municipio: env.IES_MUNICIPIO,
    },
    historico: (historico ?? []).map((h: SupabaseRow) => ({
      disciplinaCodigo: h.disciplina_codigo as string,
      disciplinaNome: h.disciplina_nome as string,
      cargaHoraria: h.carga_horaria as number,
      notaFinal: (h.nota_final as number) ?? null,
      frequencia: (h.frequencia_final as number) ?? null,
      periodo: h.periodo_letivo as string,
      situacao: (h.aprovado as boolean) ? 'Aprovado' : 'Reprovado',
      professorNome: (h.professor_nome as string) ?? undefined,
    })),
  };
}

async function carregarPfxDoCofre(certificadoId: string): Promise<{ pfx: Buffer; senha: string; nome: string }> {
  const { data, error } = await supabaseAdmin
    .from('cofre_certificados')
    .select('*')
    .eq('id', certificadoId)
    .eq('ativo', true)
    .single();
  if (error || !data) throw new NotFoundError('Certificado não encontrado ou inativo');
  if (data.revogado) throw new AppError('Certificado revogado', 400, 'CERT_REVOKED');

  const pfx = decrypt({
    ciphertext: Buffer.from(data.conteudo_pfx_encrypted),
    iv: Buffer.from(data.conteudo_pfx_iv),
    authTag: Buffer.from(data.conteudo_pfx_auth_tag),
    kekVersion: data.kek_version,
  });
  const senhaBuf = decrypt({
    ciphertext: Buffer.from(data.senha_pfx_encrypted),
    iv: Buffer.from(data.senha_pfx_iv),
    authTag: Buffer.from(data.senha_pfx_auth_tag),
    kekVersion: data.kek_version,
  });

  // Log de uso (auditoria)
  await supabaseAdmin.from('cofre_acessos_log').insert({
    certificado_id: certificadoId,
    acao: 'use_sign',
    contexto: { scope: 'emitir_diploma' },
  });

  return { pfx, senha: senhaBuf.toString('utf8'), nome: data.nome };
}

export async function emitirDiploma(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = EmitirSchema.parse(req.body);

    // 1. Carrega dados
    const data = await carregarDadosDiploma(input.alunoId);
    data.numeroRegistro = input.numeroRegistro;
    data.dataColacao = input.dataColacao;
    data.livroRegistro = input.livroRegistro;
    data.folhaRegistro = input.folhaRegistro;

    // 2. Monta XML
    const xmlBase = buildDiplomaXml(data);

    // 3. Assina (emissora)
    const emissora = await carregarPfxDoCofre(input.certificadoEmissoraId);
    const signedEmissora = signXmlWithPfx(xmlBase, emissora.pfx, emissora.senha, {
      referenceId: 'DadosDiploma',
    });

    // 4. Assina registradora (pode ser a mesma na mesma IES)
    const regId = input.certificadoRegistradoraId ?? input.certificadoEmissoraId;
    const registradora = await carregarPfxDoCofre(regId);
    const signedFinal = signXmlWithPfx(signedEmissora.signedXml, registradora.pfx, registradora.senha, {
      referenceId: 'DadosDiploma',
    });

    const xmlHash = createHash('sha256').update(signedFinal.signedXml).digest('hex');

    // 5. Carimbo temporal
    let timestamp;
    try {
      timestamp = await createTimestamp(signedFinal.signedXml);
    } catch (tsErr) {
      logger.warn({ err: tsErr }, 'Timestamp falhou, diploma emitido sem carimbo');
    }

    // 6. Persiste diploma no Supabase
    const { data: diploma, error: dipErr } = await supabaseAdmin
      .from('diplomas_emitidos')
      .insert({
        aluno_id: input.alunoId,
        curso_id: (data as unknown as { cursoId: string }).cursoId ?? undefined,
        matriz_id: undefined,
        ies_emissora_id: undefined,
        ies_registradora_id: undefined,
        numero_registro: input.numeroRegistro,
        livro_registro: input.livroRegistro,
        folha_registro: input.folhaRegistro,
        data_colacao: input.dataColacao,
        status: 'emitido',
        xml_hash_sha256: xmlHash,
        url_publica_validador: `${env.VALIDADOR_PUBLIC_URL}/${input.numeroRegistro}`,
      })
      .select()
      .single();

    if (dipErr) throw new AppError(`Falha ao persistir diploma: ${dipErr.message}`, 500);

    // 7. Gera RVDD (PDF + QR) e faz upload para Storage
    const validadorUrl = `${env.VALIDADOR_PUBLIC_URL}/public/validar/${input.numeroRegistro}`;
    let rvddPath: string | undefined;
    try {
      const pdfBuffer = await buildRvddPdf({
        data,
        xmlHashSha256: xmlHash,
        validadorUrl,
      });
      rvddPath = `${diploma.id}/rvdd.pdf`;
      const { error: upErr } = await supabaseAdmin.storage
        .from('diplomas-rvdd-pdf')
        .upload(rvddPath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });
      if (upErr) {
        logger.warn({ err: upErr }, 'Falha ao subir RVDD PDF');
        rvddPath = undefined;
      } else {
        await supabaseAdmin
          .from('diplomas_emitidos')
          .update({ rvdd_pdf_path: rvddPath })
          .eq('id', diploma.id);
      }
    } catch (pdfErr) {
      logger.warn({ err: pdfErr }, 'Falha ao gerar RVDD PDF');
    }

    // 8. Upload XML assinado
    try {
      const xmlPath = `${diploma.id}/diploma.xml`;
      await supabaseAdmin.storage
        .from('diplomas-xml-publico')
        .upload(xmlPath, Buffer.from(signedFinal.signedXml, 'utf8'), {
          contentType: 'application/xml',
          upsert: true,
        });
      await supabaseAdmin
        .from('diplomas_emitidos')
        .update({ xml_path: xmlPath })
        .eq('id', diploma.id);
    } catch (xmlErr) {
      logger.warn({ err: xmlErr }, 'Falha ao subir XML assinado');
    }

    if (timestamp && diploma) {
      await supabaseAdmin.from('logs_blockchain').insert({
        diploma_id: diploma.id,
        entidade_tipo: 'diploma',
        entidade_id: diploma.id,
        hash_sha256: xmlHash,
        provider: timestamp.provider,
        tst_base64: timestamp.tstBase64,
        ots_proof_base64: timestamp.otsProofBase64,
        anchor_info: timestamp.anchorInfo,
        timestamp_utc: timestamp.timestampUtc,
        confirmado: timestamp.confirmado,
      });
    }

    res.status(201).json({
      diploma,
      xml_hash: xmlHash,
      rvdd_path: rvddPath,
      validador_url: validadorUrl,
      timestamp,
    });
  } catch (err) {
    next(err);
  }
}

/** GET /diplomas/:id/rvdd — retorna PDF RVDD (signed URL de 5min) */
export async function getRvddUrl(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('diplomas_emitidos')
      .select('id, rvdd_pdf_path')
      .eq('id', id)
      .single();
    if (error || !data?.rvdd_pdf_path) throw new NotFoundError('RVDD não encontrado');

    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from('diplomas-rvdd-pdf')
      .createSignedUrl(data.rvdd_pdf_path as string, 300);
    if (sErr || !signed) throw new AppError('Falha ao gerar URL assinada', 500);

    res.json({ url: signed.signedUrl, expiresIn: 300 });
  } catch (err) {
    next(err);
  }
}

