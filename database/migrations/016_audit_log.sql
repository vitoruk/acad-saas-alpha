-- =============================================================
-- 016_audit_log.sql
-- Audit log genérico (todas operações críticas)
-- =============================================================

CREATE TABLE public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  operation VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  actor_id UUID,
  actor_email CITEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_table ON public.audit_log(table_name);
CREATE INDEX idx_audit_record ON public.audit_log(record_id);
CREATE INDEX idx_audit_actor ON public.audit_log(actor_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);

-- Função de trigger genérica
CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_data JSONB;
  v_new_data JSONB;
  v_record_id UUID;
  v_changed TEXT[];
  v_actor_email CITEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
    v_record_id := (OLD).id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_record_id := (NEW).id;
    SELECT ARRAY_AGG(k)
      INTO v_changed
      FROM jsonb_each(v_new_data) kv(k, v)
      WHERE v_old_data->kv.k IS DISTINCT FROM kv.v;
  ELSIF TG_OP = 'INSERT' THEN
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
    v_record_id := (NEW).id;
  END IF;

  SELECT email INTO v_actor_email FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.audit_log (
    table_name, operation, record_id, old_data, new_data, changed_fields, actor_id, actor_email
  ) VALUES (
    TG_TABLE_NAME, TG_OP, v_record_id, v_old_data, v_new_data, v_changed, auth.uid(), v_actor_email
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplica audit trigger em tabelas críticas
CREATE TRIGGER audit_diplomas_emitidos
  AFTER INSERT OR UPDATE OR DELETE ON public.diplomas_emitidos
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER audit_diplomas_assinaturas
  AFTER INSERT OR UPDATE OR DELETE ON public.diplomas_assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER audit_cofre_certificados
  AFTER INSERT OR UPDATE OR DELETE ON public.cofre_certificados
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER audit_matriculas
  AFTER INSERT OR UPDATE OR DELETE ON public.matriculas
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER audit_documentos_acervo
  AFTER INSERT OR UPDATE OR DELETE ON public.documentos_acervo
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER audit_assinaturas
  AFTER INSERT OR UPDATE OR DELETE ON public.assinaturas_eletronicas
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- RLS: só admin lê
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_admin_only ON public.audit_log
  FOR SELECT USING (public.has_role('admin') OR public.is_super_admin());
