/**
 * signature-email.service.ts — assinatura eletrônica qualificada via e-mail.
 *
 * Fluxo:
 *  1. createSignatureRequest() gera token JWT de curta duração (72h default)
 *     + armazena hash SHA-256 do token em tokens_assinatura_email.
 *  2. Envia e-mail (Resend) com link: /api/assinar/:token
 *  3. Usuário clica → valida hash → registra assinatura com:
 *       - timestamp, IP, user-agent, hash do documento, email do signatário
 *  4. Token é marcado como consumido.
 */

import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { env } from '../../config/env.js';
import { supabaseAdmin } from '../../lib/supabase.js';
import { sha256 } from '../../lib/crypto-vault.js';
import { AppError, NotFoundError, ValidationError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

interface SignTokenPayload {
  documento_id: string;
  signatario_email: string;
  tipo: 'email_qualificada';
  jti: string;
}

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface CreateSignatureRequestInput {
  documento_id: string;
  signatario_email: string;
  signatario_nome: string;
  hash_documento_sha256: string;
  texto_email?: string;
}

export async function createSignatureRequest(input: CreateSignatureRequestInput) {
  const jti = crypto.randomUUID();
  const payload: SignTokenPayload = {
    documento_id: input.documento_id,
    signatario_email: input.signatario_email.toLowerCase(),
    tipo: 'email_qualificada',
    jti,
  };

  const token = jwt.sign(payload, env.SIGN_TOKEN_SECRET, {
    expiresIn: `${env.SIGN_TOKEN_TTL_HOURS}h`,
    issuer: 'acad-saas',
  });

  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + env.SIGN_TOKEN_TTL_HOURS * 3600 * 1000);

  const { error } = await supabaseAdmin.from('tokens_assinatura_email').insert({
    jti,
    token_hash: tokenHash,
    documento_id: input.documento_id,
    signatario_email: input.signatario_email.toLowerCase(),
    signatario_nome: input.signatario_nome,
    hash_documento_sha256: input.hash_documento_sha256,
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new AppError(error.message, 500, 'TOKEN_STORE_ERROR');

  // Envia e-mail (se Resend configurado)
  const signUrl = `${env.VALIDADOR_PUBLIC_URL}/assinar/${token}`;
  if (resend) {
    try {
      await resend.emails.send({
        from: env.RESEND_FROM,
        to: input.signatario_email,
        subject: 'Solicitação de assinatura eletrônica — ACAD-SaaS',
        html: `
          <p>Olá, ${input.signatario_nome}.</p>
          <p>${input.texto_email ?? 'Você foi solicitado a assinar eletronicamente um documento.'}</p>
          <p><a href="${signUrl}">Clique aqui para revisar e assinar</a></p>
          <p>Este link expira em ${env.SIGN_TOKEN_TTL_HOURS} horas.</p>
          <hr>
          <p><small>Hash SHA-256 do documento: <code>${input.hash_documento_sha256}</code></small></p>
        `,
      });
    } catch (err) {
      logger.error({ err }, 'falha ao enviar e-mail de assinatura');
      // não falha a criação — token fica válido para reenvio manual
    }
  } else {
    logger.warn({ signUrl }, 'RESEND_API_KEY não configurado — link gerado mas não enviado');
  }

  return { jti, signUrl, expiresAt };
}

export interface ConsumeTokenInput {
  token: string;
  ip: string;
  userAgent: string;
  consentimentoTexto: string;
}

export async function consumeSignatureToken(input: ConsumeTokenInput) {
  let payload: SignTokenPayload;
  try {
    payload = jwt.verify(input.token, env.SIGN_TOKEN_SECRET, { issuer: 'acad-saas' }) as SignTokenPayload;
  } catch (err) {
    throw new ValidationError(`Token inválido ou expirado: ${(err as Error).message}`);
  }

  const tokenHash = sha256(input.token);
  const { data: tokenRow, error } = await supabaseAdmin
    .from('tokens_assinatura_email')
    .select('*')
    .eq('jti', payload.jti)
    .eq('token_hash', tokenHash)
    .single();

  if (error || !tokenRow) throw new NotFoundError('Token não encontrado');
  if (tokenRow.consumed_at) throw new ValidationError('Token já utilizado');
  if (new Date(tokenRow.expires_at) < new Date()) throw new ValidationError('Token expirado');

  // Registra assinatura
  const { data: sig, error: sigErr } = await supabaseAdmin.from('assinaturas_eletronicas').insert({
    documento_id: tokenRow.documento_id,
    signatario_email: tokenRow.signatario_email,
    signatario_nome: tokenRow.signatario_nome,
    tipo: 'email_qualificada',
    hash_documento_sha256: tokenRow.hash_documento_sha256,
    ip: input.ip,
    user_agent: input.userAgent,
    consentimento_texto: input.consentimentoTexto,
    assinado_em: new Date().toISOString(),
  }).select().single();
  if (sigErr) throw new AppError(sigErr.message, 500, 'SIGNATURE_INSERT_ERROR');

  // Marca token consumido
  await supabaseAdmin
    .from('tokens_assinatura_email')
    .update({ consumed_at: new Date().toISOString() })
    .eq('jti', payload.jti);

  return sig;
}
