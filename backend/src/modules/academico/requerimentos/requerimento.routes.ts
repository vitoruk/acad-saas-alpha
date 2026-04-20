import { z } from 'zod';
import { Router, type Router as RouterType } from 'express';
import { authMiddleware } from '../../../middleware/auth.js';
import { requireRole } from '../../../middleware/rbac.js';
import { asyncHandler } from '../../../lib/async-handler.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../../lib/errors.js';
import { paginationSchema, range, uuidSchema } from '../_shared.js';

const requerimentoCreateSchema = z.object({
  tipo_requerimento_id: z.string().uuid(),
  descricao: z.string().min(3).max(2000),
  anexos: z.array(z.object({
    nome: z.string(),
    url: z.string().url(),
    mime: z.string(),
    hash_sha256: z.string().length(64),
  })).optional(),
});

const workflowStepSchema = z.object({
  acao: z.enum(['aprovar', 'reprovar', 'solicitar_ajustes', 'encaminhar']),
  comentario: z.string().max(1000).optional(),
  proximo_responsavel_id: z.string().uuid().optional(),
});

export const requerimentoRouter: RouterType = Router();
requerimentoRouter.use(authMiddleware);

// GET /api/requerimentos
requerimentoRouter.get('/', asyncHandler(async (req, res) => {
  const p = paginationSchema.parse(req.query);
  const { from, to } = range(p);
  const { status } = req.query as Record<string, string | undefined>;
  let q = req.supabase!.from('requerimentos').select('*, tipo:tipos_requerimento(nome,sla_dias)', { count: 'exact' });
  if (status) q = q.eq('status', status);
  const { data, error, count } = await q.order('created_at', { ascending: false }).range(from, to);
  if (error) throw new ValidationError(error.message);
  res.json({ data, page: p.page, pageSize: p.pageSize, total: count ?? 0 });
}));

// GET /:id — detalhe + workflow + anexos
requerimentoRouter.get('/:id', asyncHandler(async (req, res) => {
  const id = uuidSchema.parse(req.params.id);
  const [req1, wf, anexos] = await Promise.all([
    req.supabase!.from('requerimentos').select('*, tipo:tipos_requerimento(*)').eq('id', id).single(),
    req.supabase!.from('requerimento_workflow').select('*').eq('requerimento_id', id).order('created_at'),
    req.supabase!.from('requerimento_anexos').select('*').eq('requerimento_id', id),
  ]);
  if (req1.error || !req1.data) throw new NotFoundError('Requerimento não encontrado');
  res.json({ data: { ...req1.data, workflow: wf.data ?? [], anexos: anexos.data ?? [] } });
}));

// POST — aluno cria
requerimentoRouter.post('/', asyncHandler(async (req, res) => {
  if (!req.user) throw new ForbiddenError();
  const body = requerimentoCreateSchema.parse(req.body);

  // busca aluno_id do usuário
  const { data: aluno } = await req.supabase!
    .from('alunos')
    .select('id')
    .eq('profile_id', req.user.id)
    .single();
  if (!aluno) throw new ForbiddenError('Usuário não está vinculado a um aluno');

  const { data, error } = await req.supabase!
    .from('requerimentos')
    .insert({
      aluno_id: aluno.id,
      tipo_requerimento_id: body.tipo_requerimento_id,
      descricao: body.descricao,
      status: 'aberto',
    })
    .select()
    .single();
  if (error) throw new ValidationError(error.message);

  if (body.anexos?.length) {
    await req.supabase!.from('requerimento_anexos').insert(
      body.anexos.map((a) => ({ ...a, requerimento_id: data.id })),
    );
  }
  res.status(201).json({ data });
}));

// POST /:id/workflow — avança estado (staff only)
requerimentoRouter.post('/:id/workflow', requireRole('secretaria', 'admin'), asyncHandler(async (req, res) => {
  const id = uuidSchema.parse(req.params.id);
  const body = workflowStepSchema.parse(req.body);
  if (!req.user) throw new ForbiddenError();

  const novoStatus = {
    aprovar: 'aprovado',
    reprovar: 'reprovado',
    solicitar_ajustes: 'aguardando_aluno',
    encaminhar: 'em_analise',
  }[body.acao];

  const { error: wfErr } = await req.supabase!.from('requerimento_workflow').insert({
    requerimento_id: id,
    responsavel_id: req.user.id,
    acao: body.acao,
    comentario: body.comentario,
    status_resultante: novoStatus,
  });
  if (wfErr) throw new ValidationError(wfErr.message);

  const { data, error } = await req.supabase!
    .from('requerimentos')
    .update({ status: novoStatus, responsavel_atual_id: body.proximo_responsavel_id ?? req.user.id })
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw new NotFoundError('Requerimento não encontrado');
  res.json({ data });
}));
