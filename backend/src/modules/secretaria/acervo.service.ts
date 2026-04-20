/**
 * acervo.service.ts — upload/gestão do acervo documental (Portaria MEC 315/2018).
 *
 * Cada documento é armazenado no Supabase Storage e tem:
 *  - hash SHA-256 (integridade)
 *  - referência a `tipos_documento` → `tabela_temporalidade_conarq` (descarte automático)
 *  - timestamp + cadeia de assinaturas
 */

import { supabaseAdmin } from '../../lib/supabase.js';
import { sha256, sha512 } from '../../lib/crypto-vault.js';
import { AppError, NotFoundError, ValidationError } from '../../lib/errors.js';

export interface UploadDocumentoInput {
  aluno_id?: string;
  tipo_documento_id: string;
  arquivo: Buffer;
  nome_arquivo: string;
  mime_type: string;
  uploaded_by: string;
  bucket?: string;
}

const DEFAULT_BUCKET = 'acervo';

export async function uploadDocumento(input: UploadDocumentoInput) {
  const bucket = input.bucket ?? DEFAULT_BUCKET;
  const hash = sha256(input.arquivo);
  const hash512 = sha512(input.arquivo);
  const storagePath = `${input.tipo_documento_id}/${hash}-${Date.now()}-${input.nome_arquivo}`;

  // Upload no Supabase Storage
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, input.arquivo, {
      contentType: input.mime_type,
      upsert: false,
    });
  if (uploadErr) throw new AppError(uploadErr.message, 500, 'UPLOAD_ERROR');

  // Consulta temporalidade para calcular data_descarte_prevista
  const { data: tipo } = await supabaseAdmin
    .from('tipos_documento')
    .select('*, temporalidade:tabela_temporalidade_conarq(*)')
    .eq('id', input.tipo_documento_id)
    .single();
  if (!tipo) throw new ValidationError('Tipo de documento inválido');

  const prazoAnos = tipo.temporalidade?.prazo_guarda_anos ?? 5;
  const dataDescarte = new Date();
  dataDescarte.setFullYear(dataDescarte.getFullYear() + prazoAnos);

  const { data, error } = await supabaseAdmin.from('documentos_acervo').insert({
    aluno_id: input.aluno_id,
    tipo_documento_id: input.tipo_documento_id,
    nome_arquivo: input.nome_arquivo,
    mime_type: input.mime_type,
    tamanho_bytes: input.arquivo.length,
    storage_bucket: bucket,
    storage_path: storagePath,
    hash_sha256: hash,
    hash_sha512: hash512,
    uploaded_by: input.uploaded_by,
    data_descarte_prevista: dataDescarte.toISOString().slice(0, 10),
  }).select().single();
  if (error) throw new AppError(error.message, 500, 'DOC_INSERT_ERROR');

  return data;
}

export async function getDocumentoDownloadUrl(documentoId: string, expiresIn = 300) {
  const { data: doc } = await supabaseAdmin
    .from('documentos_acervo')
    .select('storage_bucket, storage_path')
    .eq('id', documentoId)
    .single();
  if (!doc) throw new NotFoundError('Documento não encontrado');

  const { data, error } = await supabaseAdmin.storage
    .from(doc.storage_bucket)
    .createSignedUrl(doc.storage_path, expiresIn);
  if (error) throw new AppError(error.message, 500, 'SIGNED_URL_ERROR');
  return data.signedUrl;
}
