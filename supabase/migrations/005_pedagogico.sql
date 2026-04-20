-- =============================================================
-- 005_pedagogico.sql
-- Matrizes curriculares, disciplinas, pré-requisitos, equivalências
-- =============================================================

CREATE TABLE public.disciplinas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nome VARCHAR(255) NOT NULL,
  carga_horaria INTEGER NOT NULL CHECK (carga_horaria > 0),
  tipo public.tipo_disciplina NOT NULL DEFAULT 'teorica',
  ementa TEXT,
  bibliografia_basica TEXT,
  bibliografia_complementar TEXT,
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disciplinas_nome_trgm ON public.disciplinas USING gin(nome gin_trgm_ops);

CREATE TABLE public.matrizes_curriculares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE RESTRICT,
  codigo VARCHAR(50) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  ano_vigencia INTEGER NOT NULL,
  carga_horaria_total INTEGER NOT NULL,
  carga_horaria_complementar INTEGER DEFAULT 0,
  carga_horaria_estagio INTEGER DEFAULT 0,
  carga_horaria_tcc INTEGER DEFAULT 0,
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(curso_id, codigo)
);

CREATE INDEX idx_matrizes_curso ON public.matrizes_curriculares(curso_id);

-- Disciplinas vinculadas a uma matriz (com período sugerido e tipo)
CREATE TABLE public.matriz_disciplinas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  matriz_id UUID NOT NULL REFERENCES public.matrizes_curriculares(id) ON DELETE CASCADE,
  disciplina_id UUID NOT NULL REFERENCES public.disciplinas(id) ON DELETE RESTRICT,
  periodo_sugerido INTEGER NOT NULL CHECK (periodo_sugerido > 0),
  tipo_relacao public.tipo_relacao_matriz NOT NULL DEFAULT 'obrigatoria',
  ordem INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(matriz_id, disciplina_id)
);

CREATE INDEX idx_matriz_disc_matriz ON public.matriz_disciplinas(matriz_id);
CREATE INDEX idx_matriz_disc_disc ON public.matriz_disciplinas(disciplina_id);

-- Pré-requisitos (disciplina X requer Y)
CREATE TABLE public.pre_requisitos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  matriz_disciplina_id UUID NOT NULL REFERENCES public.matriz_disciplinas(id) ON DELETE CASCADE,
  disciplina_requerida_id UUID NOT NULL REFERENCES public.disciplinas(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(matriz_disciplina_id, disciplina_requerida_id)
);

-- Co-requisitos (precisa cursar JUNTO)
CREATE TABLE public.co_requisitos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  matriz_disciplina_id UUID NOT NULL REFERENCES public.matriz_disciplinas(id) ON DELETE CASCADE,
  disciplina_corequisito_id UUID NOT NULL REFERENCES public.disciplinas(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(matriz_disciplina_id, disciplina_corequisito_id)
);

-- Equivalências entre disciplinas (ex: disc. antiga equivale à nova)
CREATE TABLE public.equivalencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  disciplina_origem_id UUID NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
  disciplina_destino_id UUID NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
  bidirecional BOOLEAN NOT NULL DEFAULT TRUE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(disciplina_origem_id, disciplina_destino_id),
  CHECK (disciplina_origem_id <> disciplina_destino_id)
);

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matrizes_curriculares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriz_disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_requisitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_requisitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equivalencias ENABLE ROW LEVEL SECURITY;

-- Leitura pública do catálogo pedagógico
CREATE POLICY disciplinas_select_all ON public.disciplinas FOR SELECT USING (TRUE);
CREATE POLICY matrizes_select_all ON public.matrizes_curriculares FOR SELECT USING (TRUE);
CREATE POLICY matriz_disc_select_all ON public.matriz_disciplinas FOR SELECT USING (TRUE);
CREATE POLICY pre_req_select_all ON public.pre_requisitos FOR SELECT USING (TRUE);
CREATE POLICY co_req_select_all ON public.co_requisitos FOR SELECT USING (TRUE);
CREATE POLICY equiv_select_all ON public.equivalencias FOR SELECT USING (TRUE);

-- Escrita: admin
CREATE POLICY disciplinas_write_admin ON public.disciplinas
  FOR ALL USING (public.has_role('admin') OR public.is_super_admin())
  WITH CHECK (public.has_role('admin') OR public.is_super_admin());

CREATE POLICY matrizes_write_admin ON public.matrizes_curriculares
  FOR ALL USING (public.has_role('admin') OR public.is_super_admin())
  WITH CHECK (public.has_role('admin') OR public.is_super_admin());

CREATE POLICY matriz_disc_write_admin ON public.matriz_disciplinas
  FOR ALL USING (public.has_role('admin') OR public.is_super_admin())
  WITH CHECK (public.has_role('admin') OR public.is_super_admin());

CREATE POLICY pre_req_write_admin ON public.pre_requisitos
  FOR ALL USING (public.has_role('admin') OR public.is_super_admin())
  WITH CHECK (public.has_role('admin') OR public.is_super_admin());

CREATE POLICY co_req_write_admin ON public.co_requisitos
  FOR ALL USING (public.has_role('admin') OR public.is_super_admin())
  WITH CHECK (public.has_role('admin') OR public.is_super_admin());

CREATE POLICY equiv_write_staff ON public.equivalencias
  FOR ALL USING (public.is_staff())
  WITH CHECK (public.is_staff());
