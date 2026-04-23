import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Cofre criptográfico AES-256-GCM para proteger PFX e senhas em repouso.
 *
 * Layout persistido:
 *   ciphertext: BYTEA
 *   iv:         BYTEA (12 bytes)
 *   auth_tag:   BYTEA (16 bytes)
 *   kek_version: INT
 */

const ALG = 'aes-256-gcm';
const IV_LEN = 12;

function getKek(version: number = env.PFX_KEK_VERSION): Buffer {
  if (version !== env.PFX_KEK_VERSION) {
    throw new Error(
      `KEK versão ${version} não configurada (atual: ${env.PFX_KEK_VERSION}). Rotação pendente.`,
    );
  }
  const kek = Buffer.from(env.PFX_KEK_BASE64 ?? '', 'base64');
  if (!env.PFX_KEK_BASE64 || kek.length !== 32) {
    throw new Error(`PFX_KEK_BASE64 inválida ou ausente neste serviço (${kek.length} bytes).`);
  }
  return kek;
}

export interface EncryptedBlob {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  kekVersion: number;
}

export function encrypt(plaintext: Buffer | string): EncryptedBlob {
  const kek = getKek();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, kek, iv);
  const input = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
  const ciphertext = Buffer.concat([cipher.update(input), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, iv, authTag, kekVersion: env.PFX_KEK_VERSION };
}

export function decrypt(blob: EncryptedBlob): Buffer {
  const kek = getKek(blob.kekVersion);
  const decipher = createDecipheriv(ALG, kek, blob.iv);
  decipher.setAuthTag(blob.authTag);
  return Buffer.concat([decipher.update(blob.ciphertext), decipher.final()]);
}

export function sha256(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

export function sha512(data: Buffer | string): string {
  return createHash('sha512').update(data).digest('hex');
}
