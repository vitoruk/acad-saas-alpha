import { z } from 'zod';
import { Router, type Router as RouterType } from 'express';
import { authMiddleware } from '../../../middleware/auth.js';
import { requireRole, requireSuperAdmin } from '../../../middleware/rbac.js';
import { asyncHandler } from '../../../lib/async-handler.js';
import { NotFoundError, ValidationError } from '../../../lib/errors.js';
import { paginationSchema, range, uuidSchema } from '../_shared.js';

const cursoCreateSchema = z.object({
  ies_id: z.string().uuid(),
  campus_id: z.string().uuid(),
  nome: z.string().min(3).max(200),
  codigo_emec: z.string().min(1).max(50),
  grau: z.enum(['bacharelado', 'licenciatura', 'tecnologo', 'sequencial', 'pos_lato', 'pos_stricto']),
  modalidade: z.enum(['presencial', 'ead', 'semipresencial']),
  carga_horaria_total: z.number().int().positive(),
  integralizacao_min_semestres: z.number().int().positive(),
  integralizacao_max_semestres: z.number().int().positive(),
  ato_autorizativo: z.string().optional(),
  data_ato_autorizativo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const cursoUpdateSchema = cursoCreateSchema.partial();

export const cursoRouter: RouterType = Router();
cursoRouter.use(authMiddleware);

cursoRouter.get('/', asyncHandler(async (req, res) => {
  const p = paginationSchema.parse(req.query);
  const { from, to } = range(p);
  const { data, error, count } = await req.supabase!
    .from('cursos').select('*', { count: 'exact' }).order('nome').range(from, to);
  if (error) throw new ValidationError(error.message);
  res.json({ data, page: p.page, pageSize: p.pageSize, total: count ?? 0 });
}));

cursoRouter.get('/:id', asyncHandler(async (req, res) => {
  const id = uuidSchema.parse(req.params.id);
  const { data, error } = await req.supabase!.from('cursos').select('*').eq('id', id).single();
  if (error || !data) throw new NotFoundError('Curso não encontrado');
  res.json({ data });
}));

cursoRouter.post('/', requireRole('admin'), asyncHandler(async (req, res) => {
  const body = cursoCreateSchema.parse(req.body);
  const { data, error } = await req.supabase!.from('cursos').insert(body).select().single();
  if (error) throw new ValidationError(error.message);
  res.status(201).json({ data });
}));

cursoRouter.patch('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const id = uuidSchema.parse(req.params.id);
  const body = cursoUpdateSchema.parse(req.body);
  const { data, error } = await req.supabase!.from('cursos').update(body).eq('id', id).select().single();
  if (error || !data) throw new NotFoundError('Curso não encontrado');
  res.json({ data });
}));

cursoRouter.delete('/:id', requireSuperAdmin, asyncHandler(async (req, res) => {
  const id = uuidSchema.parse(req.params.id);
  const { error } = await req.supabase!.from('cursos').delete().eq('id', id);
  if (error) throw new ValidationError(error.message);
  res.status(204).send();
}));
