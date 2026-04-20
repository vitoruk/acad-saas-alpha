-- =============================================================
-- 007_enturmacao.sql
-- Turmas, Matrículas, Histórico de matrículas (audit trail)
-- =============================================================

CREATE TABLE public.turmas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  disciplina_id UUID NOT NULL REFERENCES public.disciplinas(id) ON DELETE RESTRICT,
  periodo_letivo_id UUID NOT NULL REFERENCES public.periodos_letivos(id) ON DELETE RESTRICT,
  professor_id UUID REFERENCES public.professores(id) ON DELETE SET NULL,
  codigo VARCHAR(50) NOT NULL,
  nome VARCHAR(255),
  turno public.turno_curso NOT NULL,
  sala VARCHAR(50),
  capacidade INTEGER NOT NULL DEFAULT 40 CHECK (capacidade > 0),
  vagas_ocupadas INTEGER NOT NULL DEFAULT 0,
  horario JSONB, -- [{dia_semana, inicio, fim}]
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(disciplina_id, periodo_letivo_id, codigo)
);

CREATE INDEX idx_turmas_professor ON public.turmas(professor_id);
CREATE INDEX idx_turmas_periodo ON public.turmas(periodo_letivo_id);

CREATE TABLE public.matriculas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE RESTRICT,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE RESTRICT,
  data_matricula TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status public.status_matricula NOT NULL DEFAULT 'ativo',
  data_trancamento TIMESTAMPTZ,
  motivo_trancamento TEXT,
  nota_final DECIMAL(4, 2),
  frequencia_final DECIMAL(5, 2),
  aprovado BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(aluno_id, turma_id)
);

CREATE INDEX idx_matriculas_aluno ON public.matriculas(aluno_id);
CREATE INDEX idx_matriculas_turma ON public.matriculas(turma_id);
CREATE INDEX idx_matriculas_status ON public.matriculas(status);

-- Histórico imutável de transições de status de matrícula (audit trail)
CREATE TABLE public.historico_matriculas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  matricula_id UUID NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  status_anterior public.status_matricula,
  status_novo public.status_matricula NOT NULL,
  motivo TEXT,
  alterado_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hist_matriculas_matricula ON public.historico_matriculas(matricula_id);

-- Trigger: registra transição de status em histórico
CREATE OR REPLACE FUNCTION public.fn_log_matricula_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.historico_matriculas (
      matricula_id, status_anterior, status_novo, alterado_por
    ) VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
      NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_matriculas_status_log
  AFTER INSERT OR UPDATE OF status ON public.matriculas
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_matricula_status_change();

-- Trigger: atualiza vagas_ocupadas em turmas
CREATE OR REPLACE FUNCTION public.fn_update_turma_vagas()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'ativo' THEN
    UPDATE public.turmas SET vagas_ocupadas = vagas_ocupadas + 1 WHERE id = NEW.turma_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'ativo' AND NEW.status <> 'ativo' THEN
      UPDATE public.turmas SET vagas_ocupadas = GREATEST(vagas_ocupadas - 1, 0) WHERE id = NEW.turma_id;
    ELSIF OLD.status <> 'ativo' AND NEW.status = 'ativo' THEN
      UPDATE public.turmas SET vagas_ocupadas = vagas_ocupadas + 1 WHERE id = NEW.turma_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'ativo' THEN
    UPDATE public.turmas SET vagas_ocupadas = GREATEST(vagas_ocupadas - 1, 0) WHERE id = OLD.turma_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_matriculas_vagas
  AFTER INSERT OR UPDATE OR DELETE ON public.matriculas
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_turma_vagas();

-- =============================================================
-- RLS
-- =============================================================

ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_matriculas ENABLE ROW LEVEL SECURITY;

-- Turmas: catálogo público (listável)
CREATE POLICY turmas_select_all ON public.turmas FOR SELECT USING (TRUE);

CREATE POLICY turmas_write_staff ON public.turmas
  FOR ALL USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Matrículas: aluno vê próprias; professor vê as da sua turma; staff gerencia
CREATE POLICY matriculas_select ON public.matriculas
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = aluno_id AND a.profile_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.turmas t
      JOIN public.professores p ON p.id = t.professor_id
      WHERE t.id = turma_id AND p.profile_id = auth.uid()
    )
    OR public.is_staff()
  );

CREATE POLICY matriculas_insert_staff ON public.matriculas
  FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY matriculas_update_staff ON public.matriculas
  FOR UPDATE USING (public.is_staff());

CREATE POLICY matriculas_delete_staff ON public.matriculas
  FOR DELETE USING (public.is_staff());

-- Histórico: somente leitura para aluno/staff
CREATE POLICY hist_matriculas_select ON public.historico_matriculas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matriculas m
      JOIN public.alunos a ON a.id = m.aluno_id
      WHERE m.id = matricula_id AND a.profile_id = auth.uid()
    )
    OR public.is_staff()
  );
