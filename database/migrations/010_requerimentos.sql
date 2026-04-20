-- =============================================================
-- 010_requerimentos.sql
-- Requerimentos acadêmicos com workflow e SLA
-- =============================================================

CREATE TABLE public.tipos_requerimento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  sla_horas INTEGER NOT NULL DEFAULT 120, -- 5 dias úteis
  requer_anexo BOOLEAN NOT NULL DEFAULT FALSE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.requerimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_protocolo VARCHAR(50) NOT NULL UNIQUE DEFAULT ('REQ-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 8)),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE RESTRICT,
  tipo_id UUID NOT NULL REFERENCES public.tipos_requerimento(id) ON DELETE RESTRICT,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT NOT NULL,
  status public.status_requerimento NOT NULL DEFAULT 'pendente',
  data_solicitacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_limite TIMESTAMPTZ,
  data_resposta TIMESTAMPTZ,
  resposta TEXT,
  respondido_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_requerimentos_aluno ON public.requerimentos(aluno_id);
CREATE INDEX idx_requerimentos_status ON public.requerimentos(status);

-- Workflow de transições (máquina de estados)
CREATE TABLE public.requerimento_workflow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requerimento_id UUID NOT NULL REFERENCES public.requerimentos(id) ON DELETE CASCADE,
  status_anterior public.status_requerimento,
  status_novo public.status_requerimento NOT NULL,
  observacao TEXT,
  executado_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Anexos
CREATE TABLE public.requerimento_anexos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requerimento_id UUID NOT NULL REFERENCES public.requerimentos(id) ON DELETE CASCADE,
  nome_arquivo VARCHAR(255) NOT NULL,
  bucket_path TEXT NOT NULL,
  mime_type VARCHAR(100),
  tamanho_bytes BIGINT,
  hash_sha256 VARCHAR(64),
  enviado_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: calcula data_limite com base no SLA
CREATE OR REPLACE FUNCTION public.fn_calcula_data_limite_requerimento()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_sla INTEGER;
BEGIN
  SELECT sla_horas INTO v_sla FROM public.tipos_requerimento WHERE id = NEW.tipo_id;
  NEW.data_limite := NEW.data_solicitacao + (v_sla || ' hours')::INTERVAL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_requerimento_sla
  BEFORE INSERT ON public.requerimentos
  FOR EACH ROW EXECUTE FUNCTION public.fn_calcula_data_limite_requerimento();

-- Trigger: log de transições
CREATE OR REPLACE FUNCTION public.fn_log_requerimento_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.requerimento_workflow (
      requerimento_id, status_anterior, status_novo, executado_por
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

CREATE TRIGGER trg_requerimento_workflow
  AFTER INSERT OR UPDATE OF status ON public.requerimentos
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_requerimento_workflow();

-- =============================================================
-- RLS
-- =============================================================

ALTER TABLE public.tipos_requerimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requerimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requerimento_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requerimento_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY tipos_req_select_all ON public.tipos_requerimento FOR SELECT USING (TRUE);
CREATE POLICY tipos_req_write_admin ON public.tipos_requerimento
  FOR ALL USING (public.has_role('admin') OR public.is_super_admin())
  WITH CHECK (public.has_role('admin') OR public.is_super_admin());

-- Requerimentos: aluno vê/cria os próprios; staff vê todos
CREATE POLICY req_select ON public.requerimentos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = aluno_id AND a.profile_id = auth.uid())
    OR public.is_staff()
  );

CREATE POLICY req_insert_aluno ON public.requerimentos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = aluno_id AND a.profile_id = auth.uid())
    OR public.is_staff()
  );

CREATE POLICY req_update_staff ON public.requerimentos
  FOR UPDATE USING (public.is_staff());

-- Workflow: somente leitura pelo aluno/staff
CREATE POLICY req_wf_select ON public.requerimento_workflow
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requerimentos r
      JOIN public.alunos a ON a.id = r.aluno_id
      WHERE r.id = requerimento_id AND a.profile_id = auth.uid()
    )
    OR public.is_staff()
  );

-- Anexos
CREATE POLICY req_anexo_select ON public.requerimento_anexos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requerimentos r
      JOIN public.alunos a ON a.id = r.aluno_id
      WHERE r.id = requerimento_id AND a.profile_id = auth.uid()
    )
    OR public.is_staff()
  );

CREATE POLICY req_anexo_insert ON public.requerimento_anexos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requerimentos r
      JOIN public.alunos a ON a.id = r.aluno_id
      WHERE r.id = requerimento_id AND a.profile_id = auth.uid()
    )
    OR public.is_staff()
  );
