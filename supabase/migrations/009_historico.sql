-- =============================================================
-- 009_historico.sql
-- View de histórico acadêmico + função de pré-requisitos + CRA
-- =============================================================

-- View consolidada do histórico do aluno (usada para gerar XML diploma)
CREATE OR REPLACE VIEW public.vw_historico_academico AS
SELECT
  a.id AS aluno_id,
  a.matricula,
  a.nome_completo,
  a.cpf,
  c.nome AS curso_nome,
  c.codigo_emec_curso,
  d.codigo AS disciplina_codigo,
  d.nome AS disciplina_nome,
  d.carga_horaria,
  d.tipo AS disciplina_tipo,
  pl.ano,
  pl.semestre,
  pl.nome AS periodo_letivo,
  m.nota_final,
  m.frequencia_final,
  m.aprovado,
  m.status AS status_matricula,
  md.tipo_relacao,
  md.periodo_sugerido,
  t.id AS turma_id,
  prof.nome_completo AS professor_nome
FROM public.alunos a
JOIN public.matriculas m ON m.aluno_id = a.id
JOIN public.turmas t ON t.id = m.turma_id
JOIN public.disciplinas d ON d.id = t.disciplina_id
JOIN public.cursos c ON c.id = a.curso_id
JOIN public.matriz_disciplinas md
  ON md.matriz_id = a.matriz_id AND md.disciplina_id = d.id
JOIN public.periodos_letivos pl ON pl.id = t.periodo_letivo_id
LEFT JOIN public.professores prof ON prof.id = t.professor_id;

-- Verifica se o aluno atendeu aos pré-requisitos de uma disciplina em determinada matriz
CREATE OR REPLACE FUNCTION public.fn_pre_requisitos_atendidos(
  p_aluno_id UUID,
  p_matriz_disciplina_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_todos_atendidos BOOLEAN := TRUE;
  r RECORD;
BEGIN
  FOR r IN
    SELECT pr.disciplina_requerida_id
    FROM public.pre_requisitos pr
    WHERE pr.matriz_disciplina_id = p_matriz_disciplina_id
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.matriculas m
      JOIN public.turmas t ON t.id = m.turma_id
      WHERE m.aluno_id = p_aluno_id
        AND t.disciplina_id = r.disciplina_requerida_id
        AND m.aprovado = TRUE
    ) THEN
      v_todos_atendidos := FALSE;
      EXIT;
    END IF;
  END LOOP;
  RETURN v_todos_atendidos;
END;
$$;

-- Calcula CRA (Coeficiente de Rendimento Acadêmico) ponderado pela carga horária
CREATE OR REPLACE FUNCTION public.fn_calcular_cra(p_aluno_id UUID)
RETURNS DECIMAL(4, 2)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ROUND(
      SUM(m.nota_final * d.carga_horaria) / NULLIF(SUM(d.carga_horaria), 0),
      2
    ),
    0.00
  )
  FROM public.matriculas m
  JOIN public.turmas t ON t.id = m.turma_id
  JOIN public.disciplinas d ON d.id = t.disciplina_id
  WHERE m.aluno_id = p_aluno_id
    AND m.nota_final IS NOT NULL
    AND m.status IN ('ativo', 'formado');
$$;

-- Verifica se aluno pode se formar (todas disciplinas obrigatórias concluídas)
CREATE OR REPLACE FUNCTION public.fn_aluno_pode_formar(p_aluno_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_obrigatorias_pendentes INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_obrigatorias_pendentes
  FROM public.matriz_disciplinas md
  WHERE md.matriz_id = (SELECT matriz_id FROM public.alunos WHERE id = p_aluno_id)
    AND md.tipo_relacao = 'obrigatoria'
    AND NOT EXISTS (
      SELECT 1
      FROM public.matriculas m
      JOIN public.turmas t ON t.id = m.turma_id
      WHERE m.aluno_id = p_aluno_id
        AND t.disciplina_id = md.disciplina_id
        AND m.aprovado = TRUE
    );
  RETURN v_obrigatorias_pendentes = 0;
END;
$$;
