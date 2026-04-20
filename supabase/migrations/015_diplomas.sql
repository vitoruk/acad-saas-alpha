-- =============================================================
-- 015_diplomas.sql
-- Diploma Digital (Portaria MEC 554/2019)
-- =============================================================

CREATE TABLE public.diplomas_emitidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE RESTRICT,
  curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE RESTRICT,
  matriz_id UUID NOT NULL REFERENCES public.matrizes_curriculares(id) ON DELETE RESTRICT,

  -- IES emissora e registradora (Portaria 554/2019)
  ies_emissora_id UUID NOT NULL REFERENCES public.ies(id) ON DELETE RESTRICT,
  ies_registradora_id UUID NOT NULL REFERENCES public.ies(id) ON DELETE RESTRICT,

  numero_registro VARCHAR(100) NOT NULL UNIQUE,
  livro_registro VARCHAR(50),
  folha_registro VARCHAR(50),
  data_colacao DATE NOT NULL,
  data_expedicao DATE NOT NULL DEFAULT NOW(),
  data_registro DATE,

  status public.status_diploma NOT NULL DEFAULT 'em_emissao',

  -- Conteúdos
  xml_mec_path TEXT, -- bucket path do XML assinado
  xml_hash_sha256 VARCHAR(64),
  rvdd_pdf_path TEXT, -- bucket path do PDF RVDD
  rvdd_hash_sha256 VARCHAR(64),
  qrcode_url TEXT,
  url_publica_validador TEXT NOT NULL,

  -- Revogação
  revogado BOOLEAN NOT NULL DEFAULT FALSE,
  data_revogacao TIMESTAMPTZ,
  motivo_revogacao TEXT,
  revogado_por UUID REFERENCES public.profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diplomas_aluno ON public.diplomas_emitidos(aluno_id);
CREATE INDEX idx_diplomas_status ON public.diplomas_emitidos(status);
CREATE INDEX idx_diplomas_numero ON public.diplomas_emitidos(numero_registro);

-- Assinaturas do diploma (emissora + registradora — Portaria 554/2019)
CREATE TABLE public.diplomas_assinaturas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diploma_id UUID NOT NULL REFERENCES public.diplomas_emitidos(id) ON DELETE CASCADE,
  papel VARCHAR(50) NOT NULL, -- emissora, registradora, reitor, secretario, coordenador
  certificado_id UUID NOT NULL REFERENCES public.cofre_certificados(id),
  signatario_nome VARCHAR(255) NOT NULL,
  signatario_cpf VARCHAR(14),
  signatario_cargo VARCHAR(100),
  xml_signature_base64 TEXT NOT NULL,
  hash_xml_assinado VARCHAR(64) NOT NULL,
  assinado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dipl_assin_diploma ON public.diplomas_assinaturas(diploma_id);

-- Trilha de auditoria de eventos do diploma
CREATE TABLE public.diplomas_eventos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diploma_id UUID NOT NULL REFERENCES public.diplomas_emitidos(id) ON DELETE CASCADE,
  evento VARCHAR(100) NOT NULL, -- emitido, assinado_emissora, assinado_registradora, carimbado, revogado...
  detalhes JSONB,
  executado_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dipl_eventos_diploma ON public.diplomas_eventos(diploma_id);

-- Atualiza FK do logs_blockchain para diplomas
ALTER TABLE public.logs_blockchain
  ADD CONSTRAINT fk_blockchain_diploma
  FOREIGN KEY (diploma_id) REFERENCES public.diplomas_emitidos(id) ON DELETE SET NULL;

-- View pública para o validador (apenas dados seguros)
CREATE OR REPLACE VIEW public.vw_diplomas_publicos AS
SELECT
  d.id,
  d.numero_registro,
  d.data_colacao,
  d.data_expedicao,
  d.data_registro,
  d.status,
  d.revogado,
  d.xml_hash_sha256,
  d.rvdd_hash_sha256,
  d.url_publica_validador,
  a.nome_completo AS aluno_nome,
  substring(a.cpf, 1, 3) || '.***.***-' || substring(a.cpf from length(a.cpf)-1) AS aluno_cpf_mascarado,
  c.nome AS curso_nome,
  c.grau AS curso_grau,
  ie.nome_fantasia AS ies_emissora,
  ir.nome_fantasia AS ies_registradora
FROM public.diplomas_emitidos d
JOIN public.alunos a ON a.id = d.aluno_id
JOIN public.cursos c ON c.id = d.curso_id
JOIN public.ies ie ON ie.id = d.ies_emissora_id
JOIN public.ies ir ON ir.id = d.ies_registradora_id
WHERE d.status IN ('emitido', 'registrado', 'revogado');

-- =============================================================
-- RLS
-- =============================================================

ALTER TABLE public.diplomas_emitidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diplomas_assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diplomas_eventos ENABLE ROW LEVEL SECURITY;

-- Aluno vê o próprio diploma; staff gerencia
CREATE POLICY diplomas_select ON public.diplomas_emitidos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = aluno_id AND a.profile_id = auth.uid())
    OR public.is_staff()
  );

CREATE POLICY diplomas_insert_staff ON public.diplomas_emitidos
  FOR INSERT WITH CHECK (public.has_role('secretaria') OR public.has_role('admin') OR public.is_super_admin());

CREATE POLICY diplomas_update_staff ON public.diplomas_emitidos
  FOR UPDATE USING (public.has_role('secretaria') OR public.has_role('admin') OR public.is_super_admin());

-- Assinaturas e eventos: staff only
CREATE POLICY dipl_assin_staff ON public.diplomas_assinaturas
  FOR ALL USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY dipl_eventos_select ON public.diplomas_eventos
  FOR SELECT USING (
    public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.diplomas_emitidos d
      JOIN public.alunos a ON a.id = d.aluno_id
      WHERE d.id = diploma_id AND a.profile_id = auth.uid()
    )
  );

CREATE POLICY dipl_eventos_insert ON public.diplomas_eventos
  FOR INSERT WITH CHECK (public.is_staff());
