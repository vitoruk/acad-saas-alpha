/**
 * xml-mec-builder.ts
 *
 * Constrói XML conforme estrutura simplificada da Portaria MEC 554/2019.
 * Em produção real, use os XSDs oficiais publicados pelo MEC:
 *   https://www.gov.br/mec/pt-br/diplomadigital/xsd
 *
 * Este builder cobre os elementos principais do MVP.
 */

import { env } from '../../config/env.js';

export interface DiplomaData {
  numeroRegistro: string;
  livroRegistro?: string;
  folhaRegistro?: string;
  dataColacao: string; // YYYY-MM-DD
  dataExpedicao: string;
  dataRegistro?: string;

  aluno: {
    nomeCompleto: string;
    cpf: string;
    rg?: string;
    dataNascimento: string;
    nacionalidade: string;
    naturalidade?: string;
    ufNaturalidade?: string;
    matricula: string;
    sexo?: string;
    nomeMae?: string;
    nomePai?: string;
  };

  curso: {
    codigoEmec: string;
    nome: string;
    grau: string;
    modalidade: string;
    cargaHorariaTotal: number;
    atoAutorizativo: { tipo?: string; portaria?: string; data?: string };
  };

  iesEmissora: {
    codigoEmec: string;
    cnpj: string;
    nome: string;
    uf: string;
    municipio: string;
  };

  iesRegistradora: {
    codigoEmec: string;
    cnpj: string;
    nome: string;
    uf: string;
    municipio: string;
  };

  historico: Array<{
    disciplinaCodigo: string;
    disciplinaNome: string;
    cargaHoraria: number;
    notaFinal: number | null;
    frequencia: number | null;
    periodo: string; // "2024.1"
    situacao: string; // "Aprovado", "Reprovado"
    professorNome?: string;
  }>;

  atividadesComplementares?: {
    cargaHorariaTotal: number;
    itens: Array<{ descricao: string; cargaHoraria: number }>;
  };

  enade?: {
    ano: number;
    situacao: string; // "Participante", "Dispensado", etc.
  };
}

function escapeXml(s: string | number): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Monta XML do Diploma Digital (estrutura simplificada conforme Portaria 554/2019) */
export function buildDiplomaXml(data: DiplomaData): string {
  const { aluno, curso, iesEmissora, iesRegistradora, historico } = data;

  const historicoXml = historico
    .map(
      (h) => `    <Disciplina>
      <Codigo>${escapeXml(h.disciplinaCodigo)}</Codigo>
      <Nome>${escapeXml(h.disciplinaNome)}</Nome>
      <CargaHoraria>${h.cargaHoraria}</CargaHoraria>
      <Periodo>${escapeXml(h.periodo)}</Periodo>
      <NotaFinal>${h.notaFinal ?? ''}</NotaFinal>
      <Frequencia>${h.frequencia ?? ''}</Frequencia>
      <Situacao>${escapeXml(h.situacao)}</Situacao>
      ${h.professorNome ? `<Professor>${escapeXml(h.professorNome)}</Professor>` : ''}
    </Disciplina>`,
    )
    .join('\n');

  const atividades = data.atividadesComplementares
    ? `  <AtividadesComplementares cargaHorariaTotal="${data.atividadesComplementares.cargaHorariaTotal}">
${data.atividadesComplementares.itens
  .map(
    (i) => `    <Atividade cargaHoraria="${i.cargaHoraria}">${escapeXml(i.descricao)}</Atividade>`,
  )
  .join('\n')}
  </AtividadesComplementares>`
    : '';

  const enade = data.enade
    ? `  <Enade ano="${data.enade.ano}" situacao="${escapeXml(data.enade.situacao)}"/>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<DiplomaDigital Id="DadosDiploma" xmlns="http://portal.mec.gov.br/diplomadigital/arquivos-pdf/schema_DD_v1.00.xsd" versao="1.00">
  <DadosDiploma>
    <NumeroRegistro>${escapeXml(data.numeroRegistro)}</NumeroRegistro>
    ${data.livroRegistro ? `<LivroRegistro>${escapeXml(data.livroRegistro)}</LivroRegistro>` : ''}
    ${data.folhaRegistro ? `<FolhaRegistro>${escapeXml(data.folhaRegistro)}</FolhaRegistro>` : ''}
    <DataColacao>${data.dataColacao}</DataColacao>
    <DataExpedicao>${data.dataExpedicao}</DataExpedicao>
    ${data.dataRegistro ? `<DataRegistro>${data.dataRegistro}</DataRegistro>` : ''}
  </DadosDiploma>
  <IESEmissora>
    <CodigoEMEC>${escapeXml(iesEmissora.codigoEmec)}</CodigoEMEC>
    <CNPJ>${escapeXml(iesEmissora.cnpj)}</CNPJ>
    <Nome>${escapeXml(iesEmissora.nome)}</Nome>
    <UF>${escapeXml(iesEmissora.uf)}</UF>
    <Municipio>${escapeXml(iesEmissora.municipio)}</Municipio>
  </IESEmissora>
  <IESRegistradora>
    <CodigoEMEC>${escapeXml(iesRegistradora.codigoEmec)}</CodigoEMEC>
    <CNPJ>${escapeXml(iesRegistradora.cnpj)}</CNPJ>
    <Nome>${escapeXml(iesRegistradora.nome)}</Nome>
    <UF>${escapeXml(iesRegistradora.uf)}</UF>
    <Municipio>${escapeXml(iesRegistradora.municipio)}</Municipio>
  </IESRegistradora>
  <Curso>
    <CodigoEMEC>${escapeXml(curso.codigoEmec)}</CodigoEMEC>
    <Nome>${escapeXml(curso.nome)}</Nome>
    <Grau>${escapeXml(curso.grau)}</Grau>
    <Modalidade>${escapeXml(curso.modalidade)}</Modalidade>
    <CargaHorariaTotal>${curso.cargaHorariaTotal}</CargaHorariaTotal>
    <AtoAutorizativo>
      ${curso.atoAutorizativo.tipo ? `<Tipo>${escapeXml(curso.atoAutorizativo.tipo)}</Tipo>` : ''}
      ${curso.atoAutorizativo.portaria ? `<Portaria>${escapeXml(curso.atoAutorizativo.portaria)}</Portaria>` : ''}
      ${curso.atoAutorizativo.data ? `<Data>${curso.atoAutorizativo.data}</Data>` : ''}
    </AtoAutorizativo>
  </Curso>
  <Diplomado>
    <NomeCompleto>${escapeXml(aluno.nomeCompleto)}</NomeCompleto>
    <CPF>${escapeXml(aluno.cpf)}</CPF>
    ${aluno.rg ? `<RG>${escapeXml(aluno.rg)}</RG>` : ''}
    <DataNascimento>${aluno.dataNascimento}</DataNascimento>
    <Nacionalidade>${escapeXml(aluno.nacionalidade)}</Nacionalidade>
    ${aluno.naturalidade ? `<Naturalidade uf="${escapeXml(aluno.ufNaturalidade ?? '')}">${escapeXml(aluno.naturalidade)}</Naturalidade>` : ''}
    <Matricula>${escapeXml(aluno.matricula)}</Matricula>
    ${aluno.sexo ? `<Sexo>${escapeXml(aluno.sexo)}</Sexo>` : ''}
    ${aluno.nomeMae ? `<NomeMae>${escapeXml(aluno.nomeMae)}</NomeMae>` : ''}
    ${aluno.nomePai ? `<NomePai>${escapeXml(aluno.nomePai)}</NomePai>` : ''}
  </Diplomado>
  <HistoricoEscolar>
${historicoXml}
  </HistoricoEscolar>
${atividades}
${enade}
  <Metadados>
    <GeradoEm>${new Date().toISOString()}</GeradoEm>
    <Versao>1.00</Versao>
    <Validador>${escapeXml(env.VALIDADOR_PUBLIC_URL)}</Validador>
  </Metadados>
</DiplomaDigital>`;
}
