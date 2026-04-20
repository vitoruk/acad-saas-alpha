-- =============================================================
-- 003_core_profiles.sql
-- Perfis de usuário + RBAC + helper functions de role
-- =============================================================

-- Perfil único do usuário (extende auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE,
  email CITEXT UNIQUE NOT NULL,
  telefone VARCHAR(20),
  avatar_url TEXT,
  is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_cpf ON public.profiles(cpf);

-- Tabela de roles por usuário (N:N implícito — usuário pode ter múltiplos papéis)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.role_usuario NOT NULL,
  granted_by UUID REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role_active ON public.user_roles(role) WHERE revoked_at IS NULL;

-- =============================================================
-- Helper functions para RLS
-- =============================================================

-- Verifica se o usuário atual possui role específico (ativo)
CREATE OR REPLACE FUNCTION public.has_role(p_role public.role_usuario)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = p_role
      AND ur.revoked_at IS NULL
  );
$$;

-- Verifica se o usuário é super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_super_admin = TRUE
  );
$$;

-- Verifica se possui QUALQUER role administrativo
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
      OR public.has_role('admin')
      OR public.has_role('secretaria');
$$;

-- =============================================================
-- RLS em profiles e user_roles
-- =============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Usuário lê o próprio profile; staff lê todos
CREATE POLICY profiles_select_self ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_staff());

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR public.is_staff());

CREATE POLICY profiles_insert_staff ON public.profiles
  FOR INSERT WITH CHECK (public.is_staff() OR id = auth.uid());

CREATE POLICY profiles_delete_super_admin ON public.profiles
  FOR DELETE USING (public.is_super_admin());

-- user_roles: ler próprio; staff gerencia
CREATE POLICY user_roles_select ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR public.is_staff());

CREATE POLICY user_roles_manage_admin ON public.user_roles
  FOR ALL USING (public.has_role('admin') OR public.is_super_admin())
  WITH CHECK (public.has_role('admin') OR public.is_super_admin());

-- Trigger: cria profile automaticamente quando auth.users é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome_completo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
