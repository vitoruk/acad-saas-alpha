/**
 * timestamp.service.ts
 *
 * Serviço de carimbo temporal (prova de existência).
 * Providers:
 *  - OpenTimestamps (gratuito, ancorado em Bitcoin) — MVP
 *  - RFC 3161 (Certisign, SafeID, etc.) — para produção premium
 *
 * Estratégia: tenta RFC 3161 se configurado; fallback para OTS.
 *
 * NOTA: Este arquivo usa chamadas HTTP diretas aos calendários OTS
 * para evitar dependência do pacote `opentimestamps` (que depende de
 * libs nativas). O formato de bytes é conforme spec OTS.
 */

import axios from 'axios';
import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export type TimestampProvider = 'opentimestamps' | 'rfc3161_certisign' | 'rfc3161_safeid' | 'rfc3161_custom';

export interface TimestampResult {
  provider: TimestampProvider;
  hashHex: string;
  timestampUtc: string;
  tstBase64?: string; // TimeStampToken RFC 3161
  otsProofBase64?: string; // prova OpenTimestamps
  anchorInfo?: Record<string, unknown>;
  rawResponse?: unknown;
  confirmado: boolean;
}

/** Gera hash SHA-256 do buffer (ou recebe hash pronto) */
export function hashFor(data: Buffer | string): { hex: string; bytes: Buffer } {
  const h = createHash('sha256').update(data).digest();
  return { hex: h.toString('hex'), bytes: h };
}

/**
 * OpenTimestamps — envia hash para 1 ou mais calendários Bitcoin.
 * Retorna a "incomplete proof" (confirmado=false). Precisa ser "upgraded" depois
 * (aguardar confirmação blockchain, ~1h), via upgradeProof().
 */
export async function timestampWithOpenTimestamps(
  hashBytes: Buffer,
): Promise<TimestampResult> {
  if (hashBytes.length !== 32) {
    throw new Error(`OTS requer hash SHA-256 de 32 bytes (recebido: ${hashBytes.length})`);
  }

  const calendars = env.OTS_CALENDARS.split(',').map((s) => s.trim()).filter(Boolean);
  if (calendars.length === 0) throw new Error('Nenhum calendário OTS configurado');

  const digests: string[] = [];
  for (const cal of calendars) {
    try {
      const url = `${cal.replace(/\/$/, '')}/digest`;
      const { data } = await axios.post(url, hashBytes, {
        headers: { 'Content-Type': 'application/octet-stream', Accept: 'application/octet-stream' },
        responseType: 'arraybuffer',
        timeout: 15_000,
      });
      digests.push(Buffer.from(data).toString('base64'));
      logger.info({ calendar: cal }, 'OTS: digest aceito pelo calendário');
    } catch (err) {
      logger.warn({ calendar: cal, err: (err as Error).message }, 'OTS: calendário falhou');
    }
  }

  if (digests.length === 0) {
    throw new Error('Nenhum calendário OTS aceitou o digest');
  }

  return {
    provider: 'opentimestamps',
    hashHex: hashBytes.toString('hex'),
    timestampUtc: new Date().toISOString(),
    otsProofBase64: digests[0], // proof parcial; completar via upgrade depois
    anchorInfo: { calendars_accepted: digests.length, total_calendars: calendars.length },
    rawResponse: { pendingDigests: digests },
    confirmado: false,
  };
}

/**
 * RFC 3161 — TSA real. Envia TimeStampRequest e recebe TimeStampToken.
 * `tsaUrl` ex: https://freetsa.org/tsr
 */
export async function timestampWithRfc3161(
  hashBytes: Buffer,
  tsaUrl: string,
  provider: TimestampProvider = 'rfc3161_custom',
): Promise<TimestampResult> {
  // Constrói TimeStampRequest ASN.1 (RFC 3161) com node-forge
  const forge = await import('node-forge');

  // OID SHA-256 = 2.16.840.1.101.3.4.2.1
  const sha256Oid = forge.asn1.oidToDer('2.16.840.1.101.3.4.2.1').getBytes();
  const hashBinStr = String.fromCharCode(...hashBytes);

  const tsq = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.INTEGER, false, String.fromCharCode(1)), // version
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false, sha256Oid),
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, ''),
      ]),
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OCTETSTRING, false, hashBinStr),
    ]),
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.BOOLEAN, false, String.fromCharCode(0xff)), // certReq
  ]);

  const tsqBytes = Buffer.from(forge.asn1.toDer(tsq).getBytes(), 'binary');

  const { data, status } = await axios.post(tsaUrl, tsqBytes, {
    headers: { 'Content-Type': 'application/timestamp-query', Accept: 'application/timestamp-reply' },
    responseType: 'arraybuffer',
    timeout: 30_000,
  });

  if (status !== 200) throw new Error(`TSA retornou HTTP ${status}`);
  const tstBase64 = Buffer.from(data).toString('base64');

  return {
    provider,
    hashHex: hashBytes.toString('hex'),
    timestampUtc: new Date().toISOString(),
    tstBase64,
    confirmado: true,
    anchorInfo: { tsaUrl },
  };
}

/**
 * Carimbo com fallback: tenta RFC3161 se `preferRfc3161Url` informado, senão OTS.
 */
export async function createTimestamp(
  data: Buffer | string,
  opts?: { preferRfc3161Url?: string; provider?: TimestampProvider },
): Promise<TimestampResult> {
  const { bytes, hex } = hashFor(data);

  if (opts?.preferRfc3161Url) {
    try {
      return await timestampWithRfc3161(bytes, opts.preferRfc3161Url, opts.provider ?? 'rfc3161_custom');
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'RFC3161 falhou, tentando OTS');
    }
  }

  try {
    return await timestampWithOpenTimestamps(bytes);
  } catch (err) {
    logger.error({ err, hash: hex }, 'Todos os providers de timestamp falharam');
    throw err;
  }
}
