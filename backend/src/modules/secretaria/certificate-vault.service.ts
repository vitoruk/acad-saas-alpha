/**
 * certificate-vault.service.ts — CRUD do cofre de certificados A1 (PFX).
 *
 * Estratégia de segurança:
 *  - Conteúdo PFX + senha são criptografados com AES-256-GCM (crypto-vault.ts)
 *    usando KEK mestra em env (PFX_KEK_BASE64). Jamais guardar PFX em claro.
 *  - Cada acesso ao cofre gera um registro em `cofre_acessos_log` (auditoria).
 *  - Listagem retorna apenas metadados (subject/issuer/thumbprint/valid_to).
 */

import { encrypt, decrypt } from '../../lib/crypto-vault.js';
import { extractPfx } from '../diplomas/xml-signing.service.js';
import { supabaseAdmin } from '../../lib/supabase.js';
import { env } from '../../config/env.js';
import { AppError, NotFoundError, ValidationError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

export interface StoreCertInput {
  ies_id: string;
  apelido: string;
  pfxBuffer: Buffer;
  password: string;
  uploaded_by_user_id: string;
}

/**
 * Armazena um PFX criptografado. Antes de armazenar, valida que a senha extrai.
 */
export async function storeCertificate(input: StoreCertInput): Promise<{ id: string; thumbprint: string }> {
  // 1. Valida PFX+senha
  const key = extractPfx(input.pfxBuffer, input.password);

  // 2. Criptografa conteúdo e senha
  const encPfx = encrypt(input.pfxBuffer);
  const encPass = encrypt(Buffer.from(input.password, 'utf8'));

  // 3. Extrai validade do cert (subject/issuer/thumbprint) — já vieram de extractPfx
  // Para datas, usa node-forge novamente para ler validity
  const forge = await import('node-forge');
  const pfxAsn1 = forge.default.asn1.fromDer(input.pfxBuffer.toString('binary'));
  const pfx = forge.default.pkcs12.pkcs12FromAsn1(pfxAsn1, false, input.password);
  const certBags = pfx.getBags({ bagType: forge.default.pki.oids.certBag! });
  const cert = certBags[forge.default.pki.oids.certBag!]?.[0]?.cert;
  if (!cert) throw new ValidationError('PFX sem certificado válido');

  // 4. Persiste
  const { data, error } = await supabaseAdmin.from('cofre_certificados').insert({
    ies_id: input.ies_id,
    apelido: input.apelido,
    subject: key.subject,
    issuer: key.issuer,
    serial_number: key.serialNumber,
    thumbprint_sha256: key.thumbprint,
    valid_from: cert.validity.notBefore.toISOString(),
    valid_to: cert.validity.notAfter.toISOString(),
    conteudo_pfx_encrypted: encPfx.ciphertext,
    conteudo_pfx_iv: encPfx.iv,
    conteudo_pfx_auth_tag: encPfx.authTag,
    senha_encrypted: encPass.ciphertext,
    senha_iv: encPass.iv,
    senha_auth_tag: encPass.authTag,
    kek_version: env.PFX_KEK_VERSION ?? 1,
    uploaded_by: input.uploaded_by_user_id,
  }).select('id,thumbprint_sha256').single();

  if (error) {
    logger.error({ err: error }, 'falha ao armazenar certificado');
    throw new AppError(error.message, 500, 'VAULT_STORE_ERROR');
  }
  return { id: data!.id, thumbprint: data!.thumbprint_sha256 };
}

/**
 * Busca um PFX+senha descriptografados para uso em assinatura.
 * SEMPRE registra no log de acessos.
 */
export async function retrieveCertificate(
  certId: string,
  accessedByUserId: string,
  purpose: string,
): Promise<{ pfxBuffer: Buffer; password: string; thumbprint: string }> {
  const { data, error } = await supabaseAdmin
    .from('cofre_certificados')
    .select('*')
    .eq('id', certId)
    .single();

  if (error || !data) throw new NotFoundError('Certificado não encontrado no cofre');

  // Log de acesso
  await supabaseAdmin.from('cofre_acessos_log').insert({
    cofre_certificado_id: certId,
    acessado_por: accessedByUserId,
    proposito: purpose,
    ip: null,
  });

  const pfxBuffer = decrypt({
    ciphertext: data.conteudo_pfx_encrypted,
    iv: data.conteudo_pfx_iv,
    authTag: data.conteudo_pfx_auth_tag,
    kekVersion: data.kek_version,
  });
  const password = decrypt({
    ciphertext: data.senha_encrypted,
    iv: data.senha_iv,
    authTag: data.senha_auth_tag,
    kekVersion: data.kek_version,
  }).toString('utf8');

  return { pfxBuffer, password, thumbprint: data.thumbprint_sha256 };
}

export async function listCertificates(iesId: string) {
  const { data, error } = await supabaseAdmin
    .from('cofre_certificados')
    .select('id, apelido, subject, issuer, thumbprint_sha256, valid_from, valid_to, revoked_at, created_at')
    .eq('ies_id', iesId)
    .order('created_at', { ascending: false });
  if (error) throw new AppError(error.message, 500, 'VAULT_LIST_ERROR');
  return data;
}

export async function revokeCertificate(certId: string, revokedByUserId: string, reason: string) {
  const { error } = await supabaseAdmin
    .from('cofre_certificados')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: revokedByUserId,
      revocation_reason: reason,
    })
    .eq('id', certId);
  if (error) throw new AppError(error.message, 500, 'VAULT_REVOKE_ERROR');
}
