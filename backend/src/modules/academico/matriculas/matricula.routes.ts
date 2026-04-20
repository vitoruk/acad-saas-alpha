import { z } from 'zod';
import { Router, type Router as RouterType } from 'express';
import { authMiddleware } from '../../../middleware/auth.js';
import { requireRole } from '../../../middleware/rbac.js';
import { asyncHandler } from '../../../lib/async-handler.js';
import { NotFoundError, ValidationError } from '../../../lib/errors.js';
import { paginationSchema, range, uuidSchema } from '../_shared.js';

const matriculaCreateSchema = z.object({
  aluno_id: z.string().uuid(),
  turma_id: z.string().uuid(),
});

const matriculaStatusSchema = z.object({
  status: z.enum(['ativa', 'trancada', 'cancelada', 'aprovada', 'reprovada']),
  motivo: z.string().optional(),
});

export const matriculaRouter: RouterType = Router();
matriculaRouter.use(authMiddleware);

matriculaRouter.get('/', asyncHandler(async (req, res) => {
  const p = paginationSchema.parse(req.query);
  const { from, to } = range(p);
  const { aluno_id, turma_id, status } = req.query as Record<string, string | undefined>;
  let q = req.supabase!.from('matriculas').select('*', { count: 'exact' });
  if (aluno_id) q = q.eq('aluno_id', aluno_id);
  if (turma_id) q = q.eq('turma_id', turma_id);
  if (status) q = q.eq('status', status);
  const { data, error, count } = await q.order('created_at', { ascending: false }).range(from, to);
  if (error) throw new ValidationError(error.message);
  res.json({ data, page: p.page, pageSize: p.pageSize, total: count ?? 0 });
}));

matriculaRouter.post('/', requireRole('secretaria', 'admin'), asyncHandler(async (req, res) => {
  const body = matriculaCreateSchema.parse(req.body);
  // pré-requisitos checados por trigger DB (fn_pre_requisitos_atendidos)
  const { data, error } = await req.supabase!.from('matriculas').insert({ ...body, status: 'ativa' }).select().single();
  if (error) throw new ValidationError(error.message);
  res.status(201).json({ data });
}));

matriculaRouter.patch('/:id/status', requireRole('secretaria', 'admin'), asyncHandler(async (req, res) => {
  const id = uuidSchema.parse(req.params.id);
  const body = matriculaStatusSchema.parse(req.body);
  const { data, error } = await req.supabase!
    .from('matriculas')
    .update({ status: body.status, motivo_alteracao: body.motivo })
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw new NotFoundError('Matrícula não encontrada');
  res.json({ data });
}));
