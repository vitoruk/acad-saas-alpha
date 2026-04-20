-- =============================================================
-- 008_diario_classe.sql
-- Plano de ensino, aulas, frequências, avaliações, notas
-- =============================================================

CREATE TABLE public.plano_ensino (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turma_id UUID NOT NULL UNIQUE REFERENCES public.turmas(id) ON DELETE CASCADE,
  objetivos TEXT,
  conteudo_programatico TEXT,
  metodologia TEXT,
  criterios_avaliacao TEXT,
  bibliografia TEXT,
  assinado BOOLEAN NOT NULL DEFAULT FALSE,
  assinado_em TIMESTAMPTZ,
  assinado_por UUID REFERENCES public.professores(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.aulas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  data_aula DATE NOT NULL,
  hora_inicio TIME,
  hora_fim TIME,
  conteudo_ministrado TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(turma_id, data_aula, hora_inicio)
);

CREATE INDEX idx_aulas_turma ON public.aulas(turma_id);

CREATE TABLE public.frequencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aula_id UUID NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  matricula_id UUID NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  presente BOOLEAN NOT NULL DEFAULT FALSE,
  justificativa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(aula_id, matricula_id)
);

CREATE INDEX idx_frequencias_matricula ON public.frequencias(matricula_id);

-- Avaliações configuráveis (prova, trabalho, seminário etc.)
CREATE TABLE public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- prova, trabalho, seminario, projeto...
  peso DECIMAL(4, 2) NOT NULL DEFAULT 1.0 CHECK (peso > 0),
  nota_maxima DECIMAL(4, 2) NOT NULL DEFAULT 10.0,
  data_aplicacao DATE,
  ordem INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_avaliacoes_turma ON public.avaliacoes(turma_id);

CREATE TABLE public.notas_avaliacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avaliacao_id UUID NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  matricula_id UUID NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  nota DECIMAL(4, 2) NOT NULL CHECK (nota >= 0),
  observacoes TEXT,
  lancada_por UUID REFERENCES public.profiles(id),
  lancada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(avaliacao_id, matricula_id)
);

CREATE INDEX idx_notas_matricula ON public.notas_avaliacao(matricula_id);

-- Pauta final (fechamento assinado do diário)
CREATE TABLE public.pauta_final (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turma_id UUID NOT NULL UNIQUE REFERENCES public.turmas(id) ON DELETE CASCADE,
  fechada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fechada_por UUID REFERENCES public.professores(id),
  assinatura_digital_url TEXT, -- bucket path do PDF assinado
  hash_sha256 VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- RLS
-- =============================================================

ALTER TABLE public.plano_ensino ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frequencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_avaliacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pauta_final ENABLE ROW LEVEL SECURITY;

-- Helper: usuário é professor da turma?
CREATE OR REPLACE FUNCTION public.is_professor_of_turma(p_turma_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.turmas t
    JOIN public.professores p ON p.id = t.professor_id
    WHERE t.id = p_turma_id AND p.profile_id = auth.uid()
  );
$$;

-- Helper: aluno está matriculado na turma?
CREATE OR REPLACE FUNCTION public.is_aluno_in_turma(p_turma_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matriculas m
    JOIN public.alunos a ON a.id = m.aluno_id
    WHERE m.turma_id = p_turma_id AND a.profile_id = auth.uid()
  );
$$;

-- Plano de ensino: prof da turma + aluno matriculado + staff
CREATE POLICY plano_select ON public.plano_ensino
  FOR SELECT USING (
    public.is_professor_of_turma(turma_id)
    OR public.is_aluno_in_turma(turma_id)
    OR public.is_staff()
  );

CREATE POLICY plano_write_professor ON public.plano_ensino
  FOR ALL USING (public.is_professor_of_turma(turma_id) OR public.is_staff())
  WITH CHECK (public.is_professor_of_turma(turma_id) OR public.is_staff());

-- Aulas idem
CREATE POLICY aulas_select ON public.aulas
  FOR SELECT USING (
    public.is_professor_of_turma(turma_id)
    OR public.is_aluno_in_turma(turma_id)
    OR public.is_staff()
  );

CREATE POLICY aulas_write_professor ON public.aulas
  FOR ALL USING (public.is_professor_of_turma(turma_id) OR public.is_staff())
  WITH CHECK (public.is_professor_of_turma(turma_id) OR public.is_staff());

-- Frequências: aluno vê própria; prof gerencia
CREATE POLICY freq_select ON public.frequencias
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matriculas m
      JOIN public.alunos a ON a.id = m.aluno_id
      WHERE m.id = matricula_id AND a.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.aulas au WHERE au.id = aula_id AND public.is_professor_of_turma(au.turma_id)
    )
    OR public.is_staff()
  );

CREATE POLICY freq_write_professor ON public.frequencias
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.aulas au WHERE au.id = aula_id AND public.is_professor_of_turma(au.turma_id))
    OR public.is_staff()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.aulas au WHERE au.id = aula_id AND public.is_professor_of_turma(au.turma_id))
    OR public.is_staff()
  );

-- Avaliações
CREATE POLICY avaliacoes_select ON public.avaliacoes
  FOR SELECT USING (
    public.is_professor_of_turma(turma_id)
    OR public.is_aluno_in_turma(turma_id)
    OR public.is_staff()
  );

CREATE POLICY avaliacoes_write_professor ON public.avaliacoes
  FOR ALL USING (public.is_professor_of_turma(turma_id) OR public.is_staff())
  WITH CHECK (public.is_professor_of_turma(turma_id) OR public.is_staff());

-- Notas
CREATE POLICY notas_select ON public.notas_avaliacao
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matriculas m
      JOIN public.alunos a ON a.id = m.aluno_id
      WHERE m.id = matricula_id AND a.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.avaliacoes av WHERE av.id = avaliacao_id AND public.is_professor_of_turma(av.turma_id)
    )
    OR public.is_staff()
  );

CREATE POLICY notas_write_professor ON public.notas_avaliacao
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.avaliacoes av WHERE av.id = avaliacao_id AND public.is_professor_of_turma(av.turma_id))
    OR public.is_staff()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.avaliacoes av WHERE av.id = avaliacao_id AND public.is_professor_of_turma(av.turma_id))
    OR public.is_staff()
  );

-- Pauta final
CREATE POLICY pauta_select ON public.pauta_final
  FOR SELECT USING (
    public.is_professor_of_turma(turma_id)
    OR public.is_aluno_in_turma(turma_id)
    OR public.is_staff()
  );

CREATE POLICY pauta_write_professor ON public.pauta_final
  FOR ALL USING (public.is_professor_of_turma(turma_id) OR public.is_staff())
  WITH CHECK (public.is_professor_of_turma(turma_id) OR public.is_staff());
