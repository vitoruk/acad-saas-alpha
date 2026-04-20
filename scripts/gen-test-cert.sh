#!/usr/bin/env bash
#
# Gera certificado A1 SELF-SIGNED para testes locais (NÃO usar em produção).
# Produz:
#   certs/test-a1.pfx        (PKCS#12, senha: alpha123)
#   certs/test-a1.cert.pem   (certificado público)
#   certs/test-a1.key.pem    (chave privada)
#
# Uso: bash scripts/gen-test-cert.sh
#
set -euo pipefail

CERT_DIR="certs"
PFX_PASSWORD="${TEST_PFX_PASSWORD:-alpha123}"
CN="Faculdade Alpha TESTE"
O="Faculdade Alpha"
OU="Secretaria Academica"
C="BR"
ST="PE"
L="Recife"
DAYS="825"

mkdir -p "$CERT_DIR"

echo "==> Gerando chave privada RSA 2048..."
openssl genrsa -out "$CERT_DIR/test-a1.key.pem" 2048 2>/dev/null

echo "==> Gerando certificado auto-assinado (validade ${DAYS} dias)..."
openssl req -new -x509 \
  -key "$CERT_DIR/test-a1.key.pem" \
  -out "$CERT_DIR/test-a1.cert.pem" \
  -days "$DAYS" \
  -subj "/C=$C/ST=$ST/L=$L/O=$O/OU=$OU/CN=$CN" \
  -sha256 2>/dev/null

echo "==> Empacotando em PKCS#12 (.pfx) com senha '$PFX_PASSWORD'..."
openssl pkcs12 -export \
  -out "$CERT_DIR/test-a1.pfx" \
  -inkey "$CERT_DIR/test-a1.key.pem" \
  -in "$CERT_DIR/test-a1.cert.pem" \
  -name "ACAD-SaaS Test A1" \
  -passout "pass:$PFX_PASSWORD"

echo ""
echo "✅ Certificado de TESTE gerado em: $CERT_DIR/"
echo "   - test-a1.pfx       (use com senha: $PFX_PASSWORD)"
echo "   - test-a1.cert.pem"
echo "   - test-a1.key.pem"
echo ""
echo "⚠️  Este é um certificado SELF-SIGNED. Em produção, use A1 ICP-Brasil real."
