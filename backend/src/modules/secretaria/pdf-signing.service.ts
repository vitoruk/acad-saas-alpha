/**
 * pdf-signing.service.ts — assina PDFs com certificado A1 no padrão PAdES.
 * Usa @signpdf/signpdf + @signpdf/signer-p12.
 */

import { SignPdf } from '@signpdf/signpdf';
import { P12Signer } from '@signpdf/signer-p12';
import { plainAddPlaceholder } from '@signpdf/placeholder-plain';
import { AppError } from '../../lib/errors.js';
import { sha256 } from '../../lib/crypto-vault.js';

export interface SignPdfInput {
  pdfBuffer: Buffer;
  pfxBuffer: Buffer;
  password: string;
  reason?: string;
  location?: string;
  name?: string;
  contactInfo?: string;
}

/**
 * Adiciona placeholder de assinatura no PDF e assina com o PFX fornecido.
 * Retorna novo PDF assinado + hash SHA-256 do resultado.
 */
export async function signPdf(input: SignPdfInput): Promise<{ signedPdf: Buffer; hash: string }> {
  try {
    const pdfWithPlaceholder = plainAddPlaceholder({
      pdfBuffer: input.pdfBuffer,
      reason: input.reason ?? 'Assinatura digital',
      location: input.location ?? 'Brasil',
      name: input.name ?? 'Signatário',
      contactInfo: input.contactInfo ?? '',
      signatureLength: 8192,
    });

    const signer = new P12Signer(input.pfxBuffer, { passphrase: input.password });
    const signpdf = new SignPdf();
    const signedPdf = await signpdf.sign(pdfWithPlaceholder, signer);

    return {
      signedPdf: Buffer.from(signedPdf),
      hash: sha256(Buffer.from(signedPdf)),
    };
  } catch (err) {
    throw new AppError(
      `Falha ao assinar PDF: ${(err as Error).message}`,
      500,
      'PDF_SIGN_ERROR',
    );
  }
}
