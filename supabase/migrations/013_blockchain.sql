-- =============================================================
-- 013_blockchain.sql
-- Logs de carimbo temporal (OpenTimestamps / RFC 3161)
-- =============================================================

CREATE TABLE public.logs_blockchain (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  documento_id UUID REFERENCES public.documentos_acervo(id) ON DELETE SET NULL,
  diploma_id UUID, -- FK após 015
  entidade_tipo VARCHAR(50) NOT NULL, -- documento_acervo, diploma, pauta, etc
  entidade_id UUID NOT NULL,
  hash_sha256 VARCHAR(64) NOT NULL,
  provider public.tipo_provider_timestamp NOT NULL,
  provider_response JSONB,
  tst_base64 TEXT, -- TimeStampToken RFC 3161 em base64
  ots_proof_base64 TEXT, -- OpenTimestamps proof em base64
  anchor_info JSONB, -- infos da âncora Bitcoin (blockHash, height, txid)
  tx_id VARCHAR(255),
  timestamp_utc TIMESTAMPTZ NOT NULL,
  confirmado BOOLEAN NOT NULL DEFAULT FALSE, -- OTS requer aguardar confirmação Bitcoin
  verificado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blockchain_entidade ON public.logs_blockchain(entidade_tipo, entidade_id);
CREATE INDEX idx_blockchain_hash ON public.logs_blockchain(hash_sha256);
CREATE INDEX idx_blockchain_nao_confirmado ON public.logs_blockchain(confirmado) WHERE confirmado = FALSE;

ALTER TABLE public.logs_blockchain ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer um com acesso à entidade; escrita: staff
CREATE POLICY blockchain_select ON public.logs_blockchain FOR SELECT USING (TRUE);

CREATE POLICY blockchain_write_staff ON public.logs_blockchain
  FOR ALL USING (public.is_staff())
  WITH CHECK (public.is_staff());
