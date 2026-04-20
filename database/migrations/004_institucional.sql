-- =============================================================
-- 004_institucional.sql
-- IES (single-tenant), Campi, Cursos, Períodos Letivos
-- =============================================================

-- Faculdade Alpha (single-tenant: apenas 1 linha nesta tabela)
CREATE TABLE public.ies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_emec VARCHAR(20) NOT NULL UNIQUE,
  cnpj VARCHAR(18) NOT NULL UNIQUE,
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255) NOT NULL,
  natureza_juridica VARCHAR(100),
  endereco JSONB,
  telefone VARCHAR(20),
  email CITEXT,
  website TEXT,
  ato_credenciamento JSONB, -- {portaria, data, dou}
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.campi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ies_id UUID NOT NULL REFERENCES public.ies(id) ON DELETE RESTRICT,
  codigo VARCHAR(50) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) UNIQUE,
  endereco JSONB,
  telefone VARCHAR(20),
  email CITEXT,
  uf CHAR(2) NOT NULL,
  municipio VARCHAR(100) NOT NULL,
  codigo_ibge_municipio VARCHAR(10),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ies_id, codigo)
);

CREATE INDEX idx_campi_ies ON public.campi(ies_id);

CREATE TABLE public.cursos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campus_id UUID NOT NULL REFERENCES public.campi(id) ON DELETE RESTRICT,
  codigo VARCHAR(50) NOT NULL,
  codigo_emec_curso VARCHAR(20),
  nome VARCHAR(255) NOT NULL,
  grau public.grau_curso NOT NULL,
  modalidade public.modalidade_curso NOT NULL,
  turno public.turno_curso NOT NULL,
  duracao_semestres INTEGER NOT NULL CHECK (duracao_semestres > 0),
  carga_horaria_total INTEGER NOT NULL CHECK (carga_horaria_total > 0),
  ato_autorizativo JSONB, -- {tipo, portaria, data, dou}
  ato_reconhecimento JSONB, -- idem
  coordenador_id UUID, -- FK p/ professores (preenchido após 006)
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campus_id, codigo)
);

CREATE INDEX idx_cursos_campus ON public.cursos(campus_id);

CREATE TABLE public.periodos_letivos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campus_id UUID NOT NULL REFERENCES public.campi(id) ON DELETE RESTRICT,
  ano INTEGER NOT NULL,
  semestre INTEGER NOT NULL CHECK (semestre IN (1, 2)),
  nome VARCHAR(50) GENERATED ALWAYS AS (ano::text || '.' || semestre::text) STORED,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  data_limite_matricula DATE,
  data_limite_trancamento DATE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campus_id, ano, semestre),
  CHECK (data_fim > data_inicio)
);

CREATE INDEX idx_periodos_ativo ON public.periodos_letivos(ativo) WHERE ativo = TRUE;

-- =============================================================
-- RLS: leitura pública (anônima) para catálogo; escrita só admin
-- =============================================================

ALTER TABLE public.ies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_letivos ENABLE ROW LEVEL SECURITY;

-- SELECT liberado (catálogo institucional é público)
CREATE POLICY ies_select_all ON public.ies FOR SELECT USING (TRUE);
CREATE POLICY campi_select_all ON public.campi FOR SELECT USING (TRUE);
CREATE POLICY cursos_select_all ON public.cursos FOR SELECT USING (TRUE);
CREATE POLICY periodos_select_all ON public.periodos_letivos FOR SELECT USING (TRUE);

-- Escrita: admin apenas
CREATE POLICY ies_write_admin ON public.ies
  FOR ALL USING (public.has_role('admin') OR public.is_super_admin())
  WITH CHECK (public.has_role('admin') OR public.is_super_admin());

CREATE POLICY campi_write_admin ON public.campi
  FOR ALL USING (public.has_role('admin') OR public.is_super_admin())
  WITH CHECK (public.has_role('admin') OR public.is_super_admin());

CREATE POLICY cursos_write_admin ON public.cursos
  FOR ALL USING (public.has_role('admin') OR public.is_super_admin())
  WITH CHECK (public.has_role('admin') OR public.is_super_admin());

CREATE POLICY periodos_write_staff ON public.periodos_letivos
  FOR ALL USING (public.is_staff())
  WITH CHECK (public.is_staff());
