-- =============================================================
-- 012_assinaturas.sql
-- Assinaturas eletrônicas (e-mail simples, A1, A3)
-- =============================================================

CREATE TABLE public.assinaturas_eletronicas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  documento_id UUID NOT NULL REFERENCES public.documentos_acervo(id) ON DELETE CASCADE,
  signatario_id UUID REFERENCES public.profiles(id),
  signatario_nome VARCHAR(255) NOT NULL,
  signatario_email CITEXT NOT NULL,
  signatario_cpf VARCHAR(14),
  tipo public.tipo_assinatura NOT NULL,
  certificado_id UUID, -- FK p/ cofre_certificados (criada após 014)
  hash_documento_sha256 VARCHAR(64) NOT NULL,
  assinatura_base64 TEXT, -- Assinatura PKCS#7 ou XMLDSig base64
  ip_address INET,
  user_agent TEXT,
  geolocalizacao JSONB,
  consentimento_texto TEXT, -- O texto exato com que consentiu
  assinada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assinaturas_doc ON public.assinaturas_eletronicas(documento_id);
CREATE INDEX idx_assinaturas_signatario ON public.assinaturas_eletronicas(signatario_id);

-- Tokens de assinatura por e-mail (link mágico para signatário)
CREATE TABLE public.tokens_assinatura_email (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  documento_id UUID NOT NULL REFERENCES public.documentos_acervo(id) ON DELETE CASCADE,
  email_destinatario CITEXT NOT NULL,
  nome_destinatario VARCHAR(255),
  token_hash VARCHAR(64) NOT NULL UNIQUE, -- hash do token (nunca guardar em claro)
  expires_at TIMESTAMPTZ NOT NULL,
  utilizado BOOLEAN NOT NULL DEFAULT FALSE,
  utilizado_em TIMESTAMPTZ,
  assinatura_id UUID REFERENCES public.assinaturas_eletronicas(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tokens_email_hash ON public.tokens_assinatura_email(token_hash);

-- =============================================================
-- RLS
-- =============================================================

ALTER TABLE public.assinaturas_eletronicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens_assinatura_email ENABLE ROW LEVEL SECURITY;

-- Assinaturas: signatário vê as próprias; staff gerencia; aluno dono do doc vê
CREATE POLICY assin_select ON public.assinaturas_eletronicas
  FOR SELECT USING (
    signatario_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.documentos_acervo d
      JOIN public.alunos a ON a.id = d.aluno_id
      WHERE d.id = documento_id AND a.profile_id = auth.uid()
    )
    OR public.is_staff()
  );

CREATE POLICY assin_insert ON public.assinaturas_eletronicas
  FOR INSERT WITH CHECK (
    signatario_id = auth.uid() OR public.is_staff()
  );

-- Tokens: acesso somente backend via service_role (nunca exposto)
CREATE POLICY tokens_staff_only ON public.tokens_assinatura_email
  FOR ALL USING (public.is_staff())
  WITH CHECK (public.is_staff());
