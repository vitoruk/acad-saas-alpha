-- =============================================================
-- 006_pessoas.sql
-- Alunos, Professores, Responsáveis civis
-- =============================================================

CREATE TABLE public.alunos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  matricula VARCHAR(50) NOT NULL UNIQUE,
  curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE RESTRICT,
  matriz_id UUID NOT NULL REFERENCES public.matrizes_curriculares(id) ON DELETE RESTRICT,
  periodo_ingresso_id UUID REFERENCES public.periodos_letivos(id),
  status public.status_aluno NOT NULL DEFAULT 'ativo',
  nome_completo VARCHAR(255) NOT NULL,
  nome_social VARCHAR(255),
  cpf VARCHAR(14) NOT NULL UNIQUE,
  rg VARCHAR(30),
  rg_orgao VARCHAR(20),
  rg_uf CHAR(2),
  data_nascimento DATE NOT NULL,
  sexo CHAR(1),
  nacionalidade VARCHAR(100) DEFAULT 'Brasileira',
  naturalidade VARCHAR(100),
  uf_naturalidade CHAR(2),
  email CITEXT NOT NULL,
  telefone VARCHAR(20),
  endereco JSONB,
  nome_mae VARCHAR(255),
  nome_pai VARCHAR(255),
  observacoes TEXT,
  data_ingresso DATE NOT NULL DEFAULT NOW(),
  data_conclusao DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alunos_profile ON public.alunos(profile_id);
CREATE INDEX idx_alunos_curso ON public.alunos(curso_id);
CREATE INDEX idx_alunos_status ON public.alunos(status);
CREATE INDEX idx_alunos_nome_trgm ON public.alunos USING gin(nome_completo gin_trgm_ops);

CREATE TABLE public.professores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  matricula_funcional VARCHAR(50) NOT NULL UNIQUE,
  nome_completo VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) NOT NULL UNIQUE,
  email CITEXT NOT NULL,
  telefone VARCHAR(20),
  titulacao VARCHAR(100), -- Graduado, Especialista, Mestre, Doutor, Pós-doutor
  lattes_url TEXT,
  regime_trabalho VARCHAR(50), -- Integral, Parcial, Horista
  data_admissao DATE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_professores_profile ON public.professores(profile_id);
CREATE INDEX idx_professores_ativo ON public.professores(ativo) WHERE ativo = TRUE;

-- Adiciona FK do coordenador em cursos agora que professores existe
ALTER TABLE public.cursos
  ADD CONSTRAINT fk_cursos_coordenador
  FOREIGN KEY (coordenador_id) REFERENCES public.professores(id) ON DELETE SET NULL;

-- Responsáveis civis (menores de idade, etc.) — sem vínculo financeiro
CREATE TABLE public.responsaveis_civis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  nome_completo VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  parentesco VARCHAR(50),
  email CITEXT,
  telefone VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_responsaveis_aluno ON public.responsaveis_civis(aluno_id);

-- =============================================================
-- RLS
-- =============================================================

ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsaveis_civis ENABLE ROW LEVEL SECURITY;

-- Aluno vê o próprio registro; professor vê alunos das turmas que leciona (policy refinada em 007); staff vê todos
CREATE POLICY alunos_select_self ON public.alunos
  FOR SELECT USING (
    profile_id = auth.uid() OR public.is_staff() OR public.has_role('professor')
  );

CREATE POLICY alunos_update_self_limited ON public.alunos
  FOR UPDATE USING (profile_id = auth.uid() OR public.is_staff());

CREATE POLICY alunos_write_staff ON public.alunos
  FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY alunos_delete_staff ON public.alunos
  FOR DELETE USING (public.is_staff());

-- Professor vê o próprio cadastro; staff gerencia
CREATE POLICY professores_select ON public.professores
  FOR SELECT USING (
    profile_id = auth.uid() OR public.is_staff() OR public.has_role('professor')
  );

CREATE POLICY professores_write_staff ON public.professores
  FOR ALL USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Responsáveis: aluno vê os próprios; staff gerencia
CREATE POLICY responsaveis_select ON public.responsaveis_civis
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = aluno_id AND a.profile_id = auth.uid())
    OR public.is_staff()
  );

CREATE POLICY responsaveis_write_staff ON public.responsaveis_civis
  FOR ALL USING (public.is_staff())
  WITH CHECK (public.is_staff());
