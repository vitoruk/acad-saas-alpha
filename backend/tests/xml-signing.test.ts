import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { extractPfx, signXml, verifyXmlSignature, signXmlWithPfx } from '../src/modules/diplomas/xml-signing.service.js';
import { buildDiplomaXml, type DiplomaData } from '../src/modules/diplomas/xml-mec-builder.js';

const PFX_PATH = new URL('../../certs/test-a1.pfx', import.meta.url);
const PFX_PASS = 'alpha123';

describe('XML Signing Service', () => {
  let pfxBuffer: Buffer;

  beforeAll(() => {
    pfxBuffer = readFileSync(PFX_PATH);
  });

  it('deve extrair chave privada e cert do PFX', () => {
    const key = extractPfx(pfxBuffer, PFX_PASS);
    expect(key.privateKeyPem).toContain('BEGIN RSA PRIVATE KEY');
    expect(key.certificatePem).toContain('BEGIN CERTIFICATE');
    expect(key.x509Base64.length).toBeGreaterThan(100);
    expect(key.thumbprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it('deve falhar com senha errada', () => {
    expect(() => extractPfx(pfxBuffer, 'senha-errada')).toThrow();
  });

  it('deve assinar um XML simples e verificar', () => {
    const xml = `<?xml version="1.0"?><Root Id="root"><Payload>hello</Payload></Root>`;
    const key = extractPfx(pfxBuffer, PFX_PASS);
    const signed = signXml(xml, key, { referenceId: 'root' });

    expect(signed).toContain('<Signature');
    expect(signed).toContain('<X509Certificate>');
    expect(signed).toContain('rsa-sha256');

    const v = verifyXmlSignature(signed);
    expect(v.valid).toBe(true);
    expect(v.errors).toHaveLength(0);
  });

  it('deve assinar XML do diploma MEC e retornar hash', () => {
    const data: DiplomaData = {
      numeroRegistro: 'TEST-0001',
      dataColacao: '2026-07-10',
      dataExpedicao: '2026-07-15',
      aluno: {
        nomeCompleto: 'João da Silva',
        cpf: '123.456.789-00',
        dataNascimento: '2000-01-01',
        nacionalidade: 'Brasileira',
        matricula: 'MAT-001',
      },
      curso: {
        codigoEmec: '9999001',
        nome: 'Sistemas de Informação',
        grau: 'bacharelado',
        modalidade: 'presencial',
        cargaHorariaTotal: 3200,
        atoAutorizativo: { portaria: 'Portaria 111', data: '2021-01-01' },
      },
      iesEmissora: {
        codigoEmec: '9999',
        cnpj: '00.000.000/0001-00',
        nome: 'Faculdade Alpha',
        uf: 'PE',
        municipio: 'Recife',
      },
      iesRegistradora: {
        codigoEmec: '9999',
        cnpj: '00.000.000/0001-00',
        nome: 'Faculdade Alpha',
        uf: 'PE',
        municipio: 'Recife',
      },
      historico: [
        {
          disciplinaCodigo: 'SI-101',
          disciplinaNome: 'Introdução à Computação',
          cargaHoraria: 60,
          notaFinal: 9.5,
          frequencia: 95,
          periodo: '2022.1',
          situacao: 'Aprovado',
        },
      ],
    };

    const xml = buildDiplomaXml(data);
    expect(xml).toContain('João da Silva');
    expect(xml).toContain('Sistemas de Informação');

    const { signedXml, hash, thumbprint } = signXmlWithPfx(xml, pfxBuffer, PFX_PASS, {
      referenceId: 'DadosDiploma',
    });

    expect(signedXml).toContain('<Signature');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(thumbprint).toMatch(/^[0-9a-f]{64}$/);

    // Dupla assinatura (emissora + registradora)
    const { signedXml: signedDouble } = signXmlWithPfx(signedXml, pfxBuffer, PFX_PASS, {
      referenceId: 'DadosDiploma',
    });
    expect((signedDouble.match(/<Signature/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('deve detectar assinatura corrompida', () => {
    const xml = `<?xml version="1.0"?><Root Id="root"><Payload>original</Payload></Root>`;
    const key = extractPfx(pfxBuffer, PFX_PASS);
    const signed = signXml(xml, key, { referenceId: 'root' });
    // Adultera o payload após assinar
    const tampered = signed.replace('original', 'hackeado');
    const v = verifyXmlSignature(tampered);
    expect(v.valid).toBe(false);
  });
});
