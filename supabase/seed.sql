-- =============================================================
-- 99_seed_dev.sql
-- Seeds iniciais para desenvolvimento (Faculdade Alpha Recife-PE)
-- =============================================================

-- 1) IES
INSERT INTO public.ies (codigo_emec, cnpj, razao_social, nome_fantasia, natureza_juridica, endereco, telefone, email, website, ato_credenciamento)
VALUES (
  '9999',
  '00.000.000/0001-00',
  'Faculdade Alpha LTDA',
  'Faculdade Alpha',
  'Privada com fins lucrativos',
  jsonb_build_object('logradouro', 'Av. Principal', 'numero', '100', 'bairro', 'Boa Viagem', 'cidade', 'Recife', 'uf', 'PE', 'cep', '51020-000'),
  '(81) 3000-0000',
  'contato@faculdadealpha.edu.br',
  'https://faculdadealpha.edu.br',
  jsonb_build_object('portaria', 'Portaria 000', 'data', '2020-01-01', 'dou', '01/01/2020')
)
ON CONFLICT (codigo_emec) DO NOTHING;

-- 2) Campus
INSERT INTO public.campi (ies_id, codigo, nome, uf, municipio, codigo_ibge_municipio, email)
SELECT id, 'ALPHA-RECIFE', 'Campus Recife', 'PE', 'Recife', '2611606', 'recife@faculdadealpha.edu.br'
FROM public.ies WHERE codigo_emec = '9999'
ON CONFLICT DO NOTHING;

-- 3) Período letivo vigente
INSERT INTO public.periodos_letivos (campus_id, ano, semestre, data_inicio, data_fim, data_limite_matricula, data_limite_trancamento)
SELECT c.id, 2026, 1, '2026-02-10', '2026-07-10', '2026-02-20', '2026-04-30'
FROM public.campi c WHERE c.codigo = 'ALPHA-RECIFE'
ON CONFLICT DO NOTHING;

-- 4) Curso: Sistemas de Informação
INSERT INTO public.cursos (campus_id, codigo, codigo_emec_curso, nome, grau, modalidade, turno, duracao_semestres, carga_horaria_total, ato_autorizativo)
SELECT c.id, 'SI', '9999001', 'Sistemas de Informação', 'bacharelado', 'presencial', 'noturno', 8, 3200,
  jsonb_build_object('portaria', 'Portaria 111', 'data', '2021-01-01')
FROM public.campi c WHERE c.codigo = 'ALPHA-RECIFE'
ON CONFLICT DO NOTHING;

-- 5) Matriz curricular 2026
INSERT INTO public.matrizes_curriculares (curso_id, codigo, nome, ano_vigencia, carga_horaria_total)
SELECT id, 'SI-2026', 'Matriz SI 2026', 2026, 3200
FROM public.cursos WHERE codigo = 'SI'
ON CONFLICT DO NOTHING;

-- 6) Disciplinas exemplo
INSERT INTO public.disciplinas (codigo, nome, carga_horaria, tipo, ementa) VALUES
  ('SI-101', 'Introdução à Computação', 60, 'teorica', 'Fundamentos de computação, história e estruturas básicas.'),
  ('SI-102', 'Lógica de Programação', 80, 'teorico_pratica', 'Algoritmos e lógica.'),
  ('SI-201', 'Estruturas de Dados', 80, 'teorico_pratica', 'Listas, pilhas, filas, árvores.'),
  ('SI-202', 'Banco de Dados', 80, 'teorico_pratica', 'Modelagem, SQL, RDBMS.'),
  ('SI-801', 'TCC', 120, 'tcc', 'Trabalho de conclusão de curso.')
ON CONFLICT (codigo) DO NOTHING;

-- 7) Vincula disciplinas à matriz
WITH m AS (SELECT id FROM public.matrizes_curriculares WHERE codigo = 'SI-2026')
INSERT INTO public.matriz_disciplinas (matriz_id, disciplina_id, periodo_sugerido, tipo_relacao)
SELECT m.id, d.id,
  CASE d.codigo WHEN 'SI-101' THEN 1 WHEN 'SI-102' THEN 1 WHEN 'SI-201' THEN 2 WHEN 'SI-202' THEN 2 WHEN 'SI-801' THEN 8 END,
  'obrigatoria'::public.tipo_relacao_matriz
FROM m, public.disciplinas d
WHERE d.codigo IN ('SI-101','SI-102','SI-201','SI-202','SI-801')
ON CONFLICT DO NOTHING;

-- 8) Pré-requisito: SI-201 requer SI-102
WITH md AS (
  SELECT md.id FROM public.matriz_disciplinas md
  JOIN public.disciplinas d ON d.id = md.disciplina_id
  WHERE d.codigo = 'SI-201'
)
INSERT INTO public.pre_requisitos (matriz_disciplina_id, disciplina_requerida_id)
SELECT md.id, (SELECT id FROM public.disciplinas WHERE codigo = 'SI-102')
FROM md
ON CONFLICT DO NOTHING;

-- 9) Tipos de requerimento com SLA
INSERT INTO public.tipos_requerimento (codigo, nome, descricao, sla_horas, requer_anexo) VALUES
  ('ATESTADO_MAT', 'Atestado de Matrícula', 'Comprovante de vínculo ativo', 48, FALSE),
  ('HIST_PARCIAL', 'Histórico Parcial', 'Histórico até o período atual', 120, FALSE),
  ('TRANCAMENTO', 'Trancamento', 'Trancamento do semestre', 168, TRUE),
  ('REV_PROVA', 'Revisão de Prova', 'Pedido de revisão', 120, TRUE),
  ('TRANSFERENCIA', 'Transferência', 'Transferência interna ou externa', 240, TRUE),
  ('SEGUNDA_VIA_DIP', 'Segunda Via de Diploma', 'Emissão de 2ª via', 480, TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- 10) Tabela de temporalidade (exemplos CONARQ)
INSERT INTO public.tabela_temporalidade_conarq (codigo, classe, assunto, prazo_corrente_anos, prazo_intermediario_anos, destinacao_final) VALUES
  ('125.1', 'Vida Acadêmica', 'Processo de Matrícula', 5, 5, 'eliminacao'),
  ('125.11', 'Vida Acadêmica', 'Histórico Escolar', 0, 0, 'guarda_permanente'),
  ('125.12', 'Vida Acadêmica', 'Diário de Classe', 5, 45, 'guarda_permanente'),
  ('125.2', 'Vida Acadêmica', 'Requerimentos Acadêmicos', 2, 3, 'eliminacao'),
  ('125.3', 'Diplomas e Certificados', 'Diplomas', 0, 0, 'guarda_permanente')
ON CONFLICT (codigo) DO NOTHING;

-- 11) Tipos de documento
INSERT INTO public.tipos_documento (codigo, nome, descricao, temporalidade_id, guarda_permanente, exige_assinatura, tipo_assinatura_minima)
SELECT 'HIST_ESC', 'Histórico Escolar', 'Histórico acadêmico oficial',
  t.id, TRUE, TRUE, 'icp_brasil_a1'
FROM public.tabela_temporalidade_conarq t WHERE t.codigo = '125.11'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.tipos_documento (codigo, nome, descricao, temporalidade_id, guarda_permanente, exige_assinatura, tipo_assinatura_minima)
SELECT 'CONTRATO', 'Contrato de Prestação de Serviços', 'Contrato educacional',
  t.id, FALSE, TRUE, 'email_simples'
FROM public.tabela_temporalidade_conarq t WHERE t.codigo = '125.1'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.tipos_documento (codigo, nome, descricao, temporalidade_id, guarda_permanente, exige_assinatura, tipo_assinatura_minima)
SELECT 'DIPLOMA', 'Diploma Digital MEC', 'Diploma digital conforme Portaria 554/2019',
  t.id, TRUE, TRUE, 'icp_brasil_a1'
FROM public.tabela_temporalidade_conarq t WHERE t.codigo = '125.3'
ON CONFLICT (codigo) DO NOTHING;
