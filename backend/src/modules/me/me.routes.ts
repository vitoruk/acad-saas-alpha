/**
 * me.routes.ts — rotas do usuário logado (self-service).
 * Todas as rotas retornam dados do próprio usuário usando req.user.id (Supabase auth).
 */

import { Router, type Router as RouterType } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { supabaseAdmin } from '../../lib/supabase.js';

export const meRouter: RouterType = Router();
meRouter.use(authMiddleware);

/** GET /api/me — perfil + roles + aluno/professor associado */
meRouter.get('/', asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const [{ data: profile }, { data: aluno }, { data: professor }] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabaseAdmin.from('alunos').select('*').eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('professores').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  res.json({
    user: req.user,
    profile,
    aluno,
    professor,
  });
}));

/** GET /api/me/historico — histórico do aluno logado */
meRouter.get('/historico', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { data: aluno } = await supabaseAdmin
    .from('alunos')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!aluno) return res.json({ data: [] });

  const { data } = await supabaseAdmin
    .from('vw_historico_academico')
    .select('*')
    .eq('aluno_id', aluno.id);

  res.json({ data: data ?? [] });
}));

/** GET /api/me/cra — CRA do aluno logado */
meRouter.get('/cra', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { data: aluno } = await supabaseAdmin
    .from('alunos')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!aluno) return res.json({ cra: null });

  const { data } = await supabaseAdmin.rpc('fn_calcular_cra', { p_aluno_id: aluno.id });
  res.json({ cra: data ?? null });
}));

/** GET /api/me/matriculas — turmas do semestre atual */
meRouter.get('/matriculas', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { data: aluno } = await supabaseAdmin
    .from('alunos')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!aluno) return res.json({ data: [] });

  const { data } = await supabaseAdmin
    .from('matriculas')
    .select('*, turma:turmas(*, disciplina:matriz_disciplinas(*, disciplina:disciplinas(*)))')
    .eq('aluno_id', aluno.id)
    .order('created_at', { ascending: false });

  res.json({ data: data ?? [] });
}));

/** GET /api/me/requerimentos — requerimentos abertos pelo aluno */
meRouter.get('/requerimentos', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { data } = await supabaseAdmin
    .from('requerimentos')
    .select('*, tipo:tipos_requerimento(*)')
    .eq('solicitante_id', userId)
    .order('created_at', { ascending: false });

  res.json({ data: data ?? [] });
}));

/** GET /api/me/diplomas — diplomas do aluno logado */
meRouter.get('/diplomas', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { data: aluno } = await supabaseAdmin
    .from('alunos')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!aluno) return res.json({ data: [] });

  const { data } = await supabaseAdmin
    .from('diplomas_emitidos')
    .select('*')
    .eq('aluno_id', aluno.id)
    .order('created_at', { ascending: false });

  res.json({ data: data ?? [] });
}));

/**
 * GET /api/me/export — LGPD Art. 18, II (portabilidade).
 * Retorna todos os dados pessoais do usuário em JSON.
 */
meRouter.get('/export', asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const [
    { data: profile },
    { data: aluno },
    { data: professor },
    { data: matriculas },
    { data: requerimentos },
    { data: diplomas },
    { data: historico },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabaseAdmin.from('alunos').select('*').eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('professores').select('*').eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('matriculas').select('*').eq('aluno_id', userId),
    supabaseAdmin.from('requerimentos').select('*').eq('solicitante_id', userId),
    supabaseAdmin.from('diplomas_emitidos').select('*').eq('aluno_id', userId),
    supabaseAdmin.from('vw_historico_academico').select('*').eq('aluno_id', userId),
  ]);

  res.setHeader('Content-Disposition', `attachment; filename="meus-dados-${userId}.json"`);
  res.json({
    _meta: {
      solicitado_em: new Date().toISOString(),
      base_legal: 'LGPD Art. 18, II — portabilidade',
      usuario_id: userId,
    },
    user: req.user,
    profile,
    aluno,
    professor,
    matriculas: matriculas ?? [],
    requerimentos: requerimentos ?? [],
    diplomas: diplomas ?? [],
    historico: historico ?? [],
  });
}));

/**
 * POST /api/me/delete-request — LGPD Art. 18, VI (eliminação).
 * Cria solicitação de anonimização que será processada pela secretaria em até 15 dias.
 * NÃO deleta imediatamente porque há retenção legal (diplomas, documentos fiscais).
 */
meRouter.post('/delete-request', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const motivo = (req.body?.motivo as string | undefined)?.slice(0, 1000) ?? null;

  const { data, error } = await supabaseAdmin
    .from('lgpd_solicitacoes')
    .insert({
      user_id: userId,
      tipo: 'exclusao',
      motivo,
      status: 'aberta',
    })
    .select()
    .single();

  if (error) {
    // Tabela pode não existir ainda — fallback em audit_log
    await supabaseAdmin.from('audit_log').insert({
      actor_id: userId,
      action: 'lgpd.delete_request',
      entity: 'user',
      entity_id: userId,
      payload: { motivo },
    });
    return res.status(202).json({
      ok: true,
      message: 'Solicitação registrada. A secretaria processará em até 15 dias úteis.',
    });
  }

  res.status(202).json({
    ok: true,
    protocolo: data.id,
    message: 'Solicitação registrada. A secretaria processará em até 15 dias úteis.',
  });
}));