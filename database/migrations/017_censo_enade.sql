-- =============================================================
-- 017_censo_enade.sql
-- Views estruturadas para Censo Inep e Enade (Decreto 9235/17)
-- =============================================================

-- View: alunos ativos com dados Censo-compatíveis
CREATE OR REPLACE VIEW public.vw_censo_superior AS
SELECT
  i.codigo_emec AS cod_ies,
  c.codigo_emec_curso AS cod_curso,
  c.nome AS nome_curso,
  c.grau AS grau_academico,
  c.modalidade,
  c.turno,
  a.id AS aluno_id,
  a.matricula,
  a.cpf,
  a.nome_completo,
  a.sexo,
  a.data_nascimento,
  a.nacionalidade,
  a.uf_naturalidade,
  a.status,
  a.data_ingresso,
  a.data_conclusao,
  pl.ano AS ano_ingresso,
  pl.semestre AS semestre_ingresso,
  COUNT(m.id) FILTER (WHERE m.aprovado = TRUE) AS disciplinas_aprovadas,
  COALESCE(SUM(d.carga_horaria) FILTER (WHERE m.aprovado = TRUE), 0) AS carga_horaria_cursada,
  public.fn_calcular_cra(a.id) AS cra
FROM public.alunos a
JOIN public.cursos c ON c.id = a.curso_id
JOIN public.campi cm ON cm.id = c.campus_id
JOIN public.ies i ON i.id = cm.ies_id
LEFT JOIN public.periodos_letivos pl ON pl.id = a.periodo_ingresso_id
LEFT JOIN public.matriculas m ON m.aluno_id = a.id
LEFT JOIN public.turmas t ON t.id = m.turma_id
LEFT JOIN public.disciplinas d ON d.id = t.disciplina_id
GROUP BY i.codigo_emec, c.codigo_emec_curso, c.nome, c.grau, c.modalidade, c.turno,
         a.id, a.matricula, a.cpf, a.nome_completo, a.sexo, a.data_nascimento,
         a.nacionalidade, a.uf_naturalidade, a.status, a.data_ingresso, a.data_conclusao,
         pl.ano, pl.semestre;

-- View: possíveis inscritos no Enade (70%+ da carga horária cursada)
CREATE OR REPLACE VIEW public.vw_enade_inscritos AS
SELECT
  v.*,
  ROUND((v.carga_horaria_cursada::decimal / NULLIF(c.carga_horaria_total, 0)) * 100, 2) AS pct_conclusao
FROM public.vw_censo_superior v
JOIN public.cursos c ON c.codigo_emec_curso = v.cod_curso
WHERE v.status IN ('ativo', 'formado')
  AND (v.carga_horaria_cursada::decimal / NULLIF(c.carga_horaria_total, 0)) >= 0.70;

-- Permissões: views herdam RLS das tabelas base
