-- =============================================================
-- 011_secretaria_acervo.sql
-- Acervo documental (Portaria MEC 315/2018) + tabela de temporalidade
-- =============================================================

-- Tabela de temporalidade inspirada no CONARQ (Conselho Nacional de Arquivos)
CREATE TABLE public.tabela_temporalidade_conarq (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(50) NOT NULL UNIQUE,
  classe VARCHAR(100) NOT NULL,
  assunto VARCHAR(255) NOT NULL,
  prazo_corrente_anos INTEGER NOT NULL,
  prazo_intermediario_anos INTEGER NOT NULL,
  destinacao_final VARCHAR(50) NOT NULL, -- guarda_permanente, eliminacao
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tipos de documento do acervo (referencia a temporalidade)
CREATE TABLE public.tipos_documento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  temporalidade_id UUID REFERENCES public.tabela_temporalidade_conarq(id),
  guarda_permanente BOOLEAN NOT NULL DEFAULT FALSE,
  exige_assinatura BOOLEAN NOT NULL DEFAULT FALSE,
  tipo_assinatura_minima public.tipo_assinatura,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documentos do acervo
CREATE TABLE public.documentos_acervo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo_documento_id UUID NOT NULL REFERENCES public.tipos_documento(id),
  aluno_id UUID REFERENCES public.alunos(id) ON DELETE SET NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  bucket_name VARCHAR(100) NOT NULL DEFAULT 'documentos-acervo',
  bucket_path TEXT NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  tamanho_bytes BIGINT NOT NULL,
  hash_sha256 VARCHAR(64) NOT NULL,
  hash_sha512 VARCHAR(128),
  nato_digital BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  data_upload TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_descarte_prevista DATE,
  descartado BOOLEAN NOT NULL DEFAULT FALSE,
  data_descarte_efetivo TIMESTAMPTZ,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_docs_aluno ON public.documentos_acervo(aluno_id);
CREATE INDEX idx_docs_tipo ON public.documentos_acervo(tipo_documento_id);
CREATE INDEX idx_docs_hash ON public.documentos_acervo(hash_sha256);
CREATE INDEX idx_docs_descarte ON public.documentos_acervo(data_descarte_prevista) WHERE descartado = FALSE;

-- Trigger: calcula data_descarte_prevista com base na temporalidade
CREATE OR REPLACE FUNCTION public.fn_calcula_descarte_documento()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_guarda_permanente BOOLEAN;
  v_prazo_corrente INT;
  v_prazo_intermediario INT;
BEGIN
  SELECT td.guarda_permanente, t.prazo_corrente_anos, t.prazo_intermediario_anos
  INTO v_guarda_permanente, v_prazo_corrente, v_prazo_intermediario
  FROM public.tipos_documento td
  LEFT JOIN public.tabela_temporalidade_conarq t ON t.id = td.temporalidade_id
  WHERE td.id = NEW.tipo_documento_id;

  IF v_guarda_permanente THEN
    NEW.data_descarte_prevista := NULL;
  ELSE
    NEW.data_descarte_prevista :=
      (NEW.data_upload::date + ((COALESCE(v_prazo_corrente, 0) + COALESCE(v_prazo_intermediario, 0)) || ' years')::interval)::date;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_docs_descarte
  BEFORE INSERT ON public.documentos_acervo
  FOR EACH ROW EXECUTE FUNCTION public.fn_calcula_descarte_documento();

-- =============================================================
-- RLS
-- =============================================================

ALTER TABLE public.tabela_temporalidade_conarq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_acervo ENABLE ROW LEVEL SECURITY;

CREATE POLICY tempo_select_all ON public.tabela_temporalidade_conarq FOR SELECT USING (TRUE);
CREATE POLICY tempo_write_admin ON public.tabela_temporalidade_conarq
  FOR ALL USING (public.has_role('admin') OR public.is_super_admin())
  WITH CHECK (public.has_role('admin') OR public.is_super_admin());

CREATE POLICY tipos_doc_select_all ON public.tipos_documento FOR SELECT USING (TRUE);
CREATE POLICY tipos_doc_write_admin ON public.tipos_documento
  FOR ALL USING (public.has_role('admin') OR public.is_super_admin())
  WITH CHECK (public.has_role('admin') OR public.is_super_admin());

-- Documentos: aluno vê os próprios; staff gerencia
CREATE POLICY docs_select ON public.documentos_acervo
  FOR SELECT USING (
    (aluno_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = aluno_id AND a.profile_id = auth.uid()))
    OR public.is_staff()
  );

CREATE POLICY docs_write_staff ON public.documentos_acervo
  FOR ALL USING (public.is_staff())
  WITH CHECK (public.is_staff());
