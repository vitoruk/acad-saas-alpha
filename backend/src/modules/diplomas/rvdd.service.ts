/**
 * rvdd.service.ts
 *
 * Gera o RVDD (Registro Visual do Diploma Digital) — PDF público com:
 *  - Dados principais do diploma
 *  - QR Code apontando para o validador público
 *  - Hash SHA-256 do XML assinado
 *
 * Portaria MEC 554/2019, art. 7º.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import type { DiplomaData } from './xml-mec-builder.js';

export interface RvddOptions {
  data: DiplomaData;
  xmlHashSha256: string;
  validadorUrl: string; // ex: https://valida.alpha.edu.br/ABC123
}

/** Gera PDF do RVDD. Retorna Buffer (application/pdf). */
export async function buildRvddPdf(opts: RvddOptions): Promise<Buffer> {
  const { data, xmlHashSha256, validadorUrl } = opts;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const left = 50;
  const lineHeight = 16;

  const writeLine = (text: string, bold = false, size = 11) => {
    page.drawText(text, {
      x: left,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;
  };

  writeLine('DIPLOMA DIGITAL — RVDD', true, 16);
  y -= 6;
  writeLine(`IES: ${data.iesEmissora.nome}`, true);
  writeLine(`Código e-MEC: ${data.iesEmissora.codigoEmec}`);
  writeLine(`CNPJ: ${data.iesEmissora.cnpj}`);
  writeLine(`${data.iesEmissora.municipio} — ${data.iesEmissora.uf}`);
  y -= 8;

  writeLine('DIPLOMADO', true, 13);
  writeLine(`Nome: ${data.aluno.nomeCompleto}`);
  writeLine(`CPF: ${data.aluno.cpf}`);
  if (data.aluno.rg) writeLine(`RG: ${data.aluno.rg}`);
  writeLine(`Nascimento: ${data.aluno.dataNascimento}`);
  writeLine(`Nacionalidade: ${data.aluno.nacionalidade}`);
  writeLine(`Matrícula: ${data.aluno.matricula}`);
  y -= 8;

  writeLine('CURSO', true, 13);
  writeLine(`Nome: ${data.curso.nome}`);
  writeLine(`Grau: ${data.curso.grau}`);
  writeLine(`Modalidade: ${data.curso.modalidade}`);
  writeLine(`Carga horária total: ${data.curso.cargaHorariaTotal}h`);
  writeLine(`Código e-MEC: ${data.curso.codigoEmec}`);
  y -= 8;

  writeLine('REGISTRO', true, 13);
  writeLine(`Nº: ${data.numeroRegistro}`);
  if (data.livroRegistro) writeLine(`Livro: ${data.livroRegistro}`);
  if (data.folhaRegistro) writeLine(`Folha: ${data.folhaRegistro}`);
  writeLine(`Data de colação: ${data.dataColacao}`);
  writeLine(`Data de expedição: ${data.dataExpedicao}`);
  y -= 12;

  writeLine('AUTENTICIDADE', true, 13);
  writeLine(`Hash SHA-256 do XML assinado:`);
  const hashLine1 = xmlHashSha256.slice(0, 32);
  const hashLine2 = xmlHashSha256.slice(32);
  writeLine(hashLine1, false, 9);
  writeLine(hashLine2, false, 9);
  y -= 6;
  writeLine(`Validador público:`);
  writeLine(validadorUrl, false, 9);

  // QR Code (canto inferior direito)
  const qrDataUrl = await QRCode.toDataURL(validadorUrl, { margin: 1, width: 180 });
  const qrBase64 = qrDataUrl.split(',')[1] ?? '';
  const qrImage = await pdf.embedPng(Buffer.from(qrBase64, 'base64'));
  const qrSize = 140;
  page.drawImage(qrImage, {
    x: 595.28 - qrSize - 50,
    y: 60,
    width: qrSize,
    height: qrSize,
  });
  page.drawText('Escaneie para validar', {
    x: 595.28 - qrSize - 50,
    y: 48,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
