import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, sha256 } from '../src/lib/crypto-vault.js';

describe('Crypto Vault (AES-256-GCM)', () => {
  it('deve criptografar e decriptar string', () => {
    const plaintext = 'senha-super-secreta-123';
    const blob = encrypt(plaintext);
    expect(blob.iv.length).toBe(12);
    expect(blob.authTag.length).toBe(16);
    expect(blob.ciphertext.length).toBeGreaterThan(0);

    const decrypted = decrypt(blob);
    expect(decrypted.toString('utf8')).toBe(plaintext);
  });

  it('deve falhar se ciphertext for adulterado', () => {
    const blob = encrypt('original');
    blob.ciphertext[0] = blob.ciphertext[0] ^ 0xff;
    expect(() => decrypt(blob)).toThrow();
  });

  it('deve falhar se authTag for adulterado', () => {
    const blob = encrypt('original');
    blob.authTag[0] = blob.authTag[0] ^ 0xff;
    expect(() => decrypt(blob)).toThrow();
  });

  it('sha256 deve ser determinístico', () => {
    expect(sha256('hello')).toBe(sha256('hello'));
    expect(sha256('a')).not.toBe(sha256('b'));
    expect(sha256('').length).toBe(64);
  });

  it('deve lidar com buffers grandes (simula PFX)', () => {
    const big = Buffer.alloc(10_000);
    for (let i = 0; i < big.length; i++) big[i] = i % 256;
    const blob = encrypt(big);
    const out = decrypt(blob);
    expect(out.equals(big)).toBe(true);
  });
});
