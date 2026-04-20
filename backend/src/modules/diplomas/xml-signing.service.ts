/**
 * xml-signing.service.ts
 *
 * Assina XML com ICP-Brasil (PFX A1) usando padrão XMLDSig (W3C).
 * Compatível com Portaria MEC 554/2019 (Diploma Digital).
 *
 * Fluxo:
 *   1. Lê PFX (buffer) + senha
 *   2. Extrai chave privada + certificado X.509 via node-forge
 *   3. Converte para PEM
 *   4. Usa xml-crypto v6+ para assinar (enveloped, C14N exclusivo, RSA-SHA256)
 *   5. Retorna XML assinado com <Signature> embutido
 *
 * Pronto para hospedagem no Render.
 */

import forge from 'node-forge';
import { SignedXml } from 'xml-crypto';
import { DOMParser } from '@xmldom/xmldom';
import { sha256 } from '../../lib/crypto-vault.js';
import { AppError } from '../../lib/errors.js';

export interface PfxKeyMaterial {
  privateKeyPem: string;
  certificatePem: string;
  certificateChain: string[];
  x509Base64: string; // cert em base64 (sem cabeçalhos PEM)
  subject: string;
  issuer: string;
  serialNumber: string;
  thumbprint: string;
}

/**
 * Extrai chave privada + certificado de um PFX (PKCS#12).
 * @param pfxBuffer buffer do .pfx
 * @param password senha do pfx
 */
export function extractPfx(pfxBuffer: Buffer, password: string): PfxKeyMaterial {
  try {
    const pfxAsn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
    const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, password);

    // Extrai chave privada
    const shroudedOid = forge.pki.oids.pkcs8ShroudedKeyBag!;
    const keyBagOid = forge.pki.oids.keyBag!;
    const certBagOid = forge.pki.oids.certBag!;
    const keyBags = pfx.getBags({ bagType: shroudedOid });
    const keyBag = keyBags[shroudedOid]?.[0]
      ?? pfx.getBags({ bagType: keyBagOid })[keyBagOid]?.[0];
    if (!keyBag?.key) throw new Error('Chave privada não encontrada no PFX');
    const privateKey = keyBag.key as forge.pki.rsa.PrivateKey;

    // Extrai certificado(s)
    const certBags = pfx.getBags({ bagType: certBagOid });
    const certs = (certBags[certBagOid] ?? [])
      .map((b: forge.pkcs12.Bag) => b.cert)
      .filter((c: forge.pki.Certificate | undefined): c is forge.pki.Certificate => !!c);
    if (certs.length === 0) throw new Error('Certificado não encontrado no PFX');

    const leaf = certs[0]!;
    const chain = certs.slice(1);

    const privateKeyPem = forge.pki.privateKeyToPem(privateKey);
    const certificatePem = forge.pki.certificateToPem(leaf);
    const chainPem = chain.map((c: forge.pki.Certificate) => forge.pki.certificateToPem(c));

    // Base64 do DER do cert (para <X509Certificate>)
    const derBytes = forge.asn1.toDer(forge.pki.certificateToAsn1(leaf)).getBytes();
    const x509Base64 = forge.util.encode64(derBytes);

    // Thumbprint SHA-256 do DER
    const md = forge.md.sha256.create();
    md.update(derBytes);
    const thumbprint = md.digest().toHex();

    return {
      privateKeyPem,
      certificatePem,
      certificateChain: chainPem,
      x509Base64,
      subject: leaf.subject.attributes.map((a: forge.pki.CertificateField) => `${a.shortName}=${a.value}`).join(', '),
      issuer: leaf.issuer.attributes.map((a: forge.pki.CertificateField) => `${a.shortName}=${a.value}`).join(', '),
      serialNumber: leaf.serialNumber,
      thumbprint,
    };
  } catch (err) {
    throw new AppError(
      `Falha ao extrair PFX: ${(err as Error).message}`,
      500,
      'PFX_EXTRACT_ERROR',
    );
  }
}

export interface SignXmlOptions {
  /** XPath que identifica o elemento a ser assinado (default: nó raiz) */
  xpath?: string;
  /** Id do nó raiz (obrigatório no XML do MEC). Ex: "DadosDiploma" */
  referenceId?: string;
  /** Prefixo opcional para a tag Signature (ex: 'ds') */
  prefix?: string;
}

/**
 * Assina um XML usando XMLDSig (enveloped signature, RSA-SHA256, C14N exclusivo).
 */
export function signXml(
  xml: string,
  key: PfxKeyMaterial,
  opts: SignXmlOptions = {},
): string {
  const { xpath = "/*", prefix, referenceId } = opts;

  // Valida XML antes de assinar
  const doc = new DOMParser({
    onError: (level, msg) => {
      if (level === 'error' || level === 'fatalError') {
        throw new Error(`XML inválido: ${msg}`);
      }
    },
  }).parseFromString(xml, 'application/xml');
  if (!doc.documentElement) throw new AppError('XML vazio ou sem elemento raiz', 400, 'INVALID_XML');

  const sig = new SignedXml({
    privateKey: key.privateKeyPem,
    publicCert: key.certificatePem,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
  });

  sig.addReference({
    xpath: referenceId ? `//*[@Id='${referenceId}']` : xpath,
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    ],
  });

  // KeyInfoProvider v6+: função que recebe (prefix) e retorna o conteúdo do KeyInfo
  sig.getKeyInfoContent = () => {
    return `<X509Data><X509Certificate>${key.x509Base64}</X509Certificate></X509Data>`;
  };

  sig.computeSignature(xml, {
    prefix,
    location: { reference: referenceId ? `//*[@Id='${referenceId}']` : xpath, action: 'append' },
  });

  return sig.getSignedXml();
}

/**
 * Verifica uma assinatura XMLDSig embutida em um XML.
 * Retorna { valid, errors, certificateUsed }.
 */
export function verifyXmlSignature(signedXml: string): {
  valid: boolean;
  errors: string[];
  certificateUsed?: string;
} {
  try {
    const doc = new DOMParser().parseFromString(signedXml, 'application/xml');
    const signatureNodes = doc.getElementsByTagNameNS(
      'http://www.w3.org/2000/09/xmldsig#',
      'Signature',
    );
    if (signatureNodes.length === 0) {
      return { valid: false, errors: ['Nenhuma assinatura encontrada no XML'] };
    }

    // Extrai certificado embutido para verificação
    const x509Nodes = doc.getElementsByTagNameNS(
      'http://www.w3.org/2000/09/xmldsig#',
      'X509Certificate',
    );
    const certBase64 = x509Nodes[0]?.textContent?.replace(/\s/g, '');
    if (!certBase64) {
      return { valid: false, errors: ['X509Certificate não encontrado'] };
    }
    const publicCert = `-----BEGIN CERTIFICATE-----\n${certBase64}\n-----END CERTIFICATE-----`;

    const sig = new SignedXml({ publicCert });
    sig.loadSignature(signatureNodes[0]!);

    const valid = sig.checkSignature(signedXml);
    return {
      valid,
      errors: valid ? [] : sig.getSignedReferences().length === 0 ? ['Nenhuma referência assinada'] : ['Assinatura inválida'],
      certificateUsed: publicCert,
    };
  } catch (err) {
    return { valid: false, errors: [(err as Error).message] };
  }
}

/**
 * Conveniência: dado XML + PFX + senha, retorna xml assinado + hash do resultado.
 */
export function signXmlWithPfx(
  xml: string,
  pfxBuffer: Buffer,
  password: string,
  opts?: SignXmlOptions,
): { signedXml: string; hash: string; thumbprint: string } {
  const key = extractPfx(pfxBuffer, password);
  const signedXml = signXml(xml, key, opts);
  const hash = sha256(signedXml);
  return { signedXml, hash, thumbprint: key.thumbprint };
}
