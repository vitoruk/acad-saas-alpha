-- =============================================================
-- 014_cofre_certificados.sql
-- Cofre de certificados A1/A3 (criptografados em repouso com AES-256-GCM)
-- =============================================================

CREATE TABLE public.cofre_certificados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  tipo public.tipo_certificado NOT NULL,
  titular_nome VARCHAR(255) NOT NULL,
  titular_cpf_cnpj VARCHAR(18) NOT NULL,
  emissor VARCHAR(255),
  serial_number VARCHAR(255),
  thumbprint_sha256 VARCHAR(64) NOT NULL UNIQUE,

  -- Conteúdo criptografado (AES-256-GCM)
  conteudo_pfx_encrypted BYTEA NOT NULL,
  conteudo_pfx_iv BYTEA NOT NULL,
  conteudo_pfx_auth_tag BYTEA NOT NULL,

  -- Senha do PFX criptografada separadamente
  senha_pfx_encrypted BYTEA NOT NULL,
  senha_pfx_iv BYTEA NOT NULL,
  senha_pfx_auth_tag BYTEA NOT NULL,

  kek_version INTEGER NOT NULL DEFAULT 1,

  data_emissao DATE,
  data_validade DATE NOT NULL,
  revogado BOOLEAN NOT NULL DEFAULT FALSE,
  data_revogacao TIMESTAMPTZ,
  motivo_revogacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,

  uso_permitido JSONB DEFAULT '["assinatura_xml_diploma","assinatura_pdf_acervo"]'::jsonb,

  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cofre_ativo ON public.cofre_certificados(ativo) WHERE ativo = TRUE;
CREATE INDEX idx_cofre_validade ON public.cofre_certificados(data_validade);

-- Adiciona FK de assinaturas_eletronicas.certificado_id
ALTER TABLE public.assinaturas_eletronicas
  ADD CONSTRAINT fk_assinatura_certificado
  FOREIGN KEY (certificado_id) REFERENCES public.cofre_certificados(id) ON DELETE SET NULL;

-- Log de acessos ao cofre (auditoria crítica)
CREATE TABLE public.cofre_acessos_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificado_id UUID NOT NULL REFERENCES public.cofre_certificados(id) ON DELETE CASCADE,
  acessado_por UUID REFERENCES public.profiles(id),
  acao VARCHAR(50) NOT NULL, -- download, use_sign, rotate, revoke
  ip_address INET,
  user_agent TEXT,
  contexto JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cofre_log_cert ON public.cofre_acessos_log(certificado_id);

ALTER TABLE public.cofre_certificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cofre_acessos_log ENABLE ROW LEVEL SECURITY;

-- ACESSO EXTREMAMENTE RESTRITO: somente super_admin via service_role
CREATE POLICY cofre_super_admin_only ON public.cofre_certificados
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY cofre_log_super_admin ON public.cofre_acessos_log
  FOR SELECT USING (public.is_super_admin() OR public.has_role('admin'));

CREATE POLICY cofre_log_insert_staff ON public.cofre_acessos_log
  FOR INSERT WITH CHECK (public.is_staff());
