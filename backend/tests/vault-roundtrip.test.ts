/**
 * Valida o ciclo: PFX → encrypt → decrypt → extractPfx (senha + conteúdo válidos).
 * Não depende de Supabase (opera apenas sobre crypto-vault + xml-signing).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { encrypt, decrypt } from '../src/lib/crypto-vault.js';
import { extractPfx } from '../src/modules/diplomas/xml-signing.service.js';

const PFX_PATH = new URL('../../certs/test-a1.pfx', import.meta.url);
const PFX_PASS = 'alpha123';

describe('Vault roundtrip (PFX real)', () => {
  it('criptografa PFX + senha, descriptografa e extrai com sucesso', () => {
    const pfx = readFileSync(PFX_PATH);

    const encPfx = encrypt(pfx);
    const encPass = encrypt(Buffer.from(PFX_PASS, 'utf8'));

    const pfxBack = decrypt(encPfx);
    const passBack = decrypt(encPass).toString('utf8');

    expect(pfxBack.equals(pfx)).toBe(true);
    expect(passBack).toBe(PFX_PASS);

    const key = extractPfx(pfxBack, passBack);
    expect(key.privateKeyPem).toContain('BEGIN RSA PRIVATE KEY');
    expect(key.certificatePem).toContain('BEGIN CERTIFICATE');
    expect(key.thumbprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it('detecta adulteração em ciphertext do PFX', () => {
    const pfx = readFileSync(PFX_PATH);
    const enc = encrypt(pfx);
    enc.ciphertext[0] ^= 0xff;
    expect(() => decrypt(enc)).toThrow();
  });
});
