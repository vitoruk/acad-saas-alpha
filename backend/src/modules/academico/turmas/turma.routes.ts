import { z } from 'zod';
import { Router, type Router as RouterType } from 'express';
import { authMiddleware } from '../../../middleware/auth.js';
import { requireRole } from '../../../middleware/rbac.js';
import { asyncHandler } from '../../../lib/async-handler.js';
import { NotFoundError, ValidationError } from '../../../lib/errors.js';
import { paginationSchema, range, uuidSchema } from '../_shared.js';

const turmaCreateSchema = z.object({
  curso_id: z.string().uuid(),
  disciplina_id: z.string().uuid(),
  periodo_letivo_id: z.string().uuid(),
  professor_id: z.string().uuid().optional(),
  codigo: z.string().min(1).max(50),
  vagas_total: z.number().int().positive(),
  sala: z.string().optional(),
  horario: z.string().optional(),
});

export const turmaRouter: RouterType = Router();
turmaRouter.use(authMiddleware);

turmaRouter.get('/', asyncHandler(async (req, res) => {
  const p = paginationSchema.parse(req.query);
  const { from, to } = range(p);
  const cursoId = req.query.curso_id as string | undefined;
  const periodoId = req.query.periodo_letivo_id as string | undefined;
  let q = req.supabase!.from('turmas').select('*, disciplina:disciplinas(nome,codigo), professor:professores(id)', { count: 'exact' });
  if (cursoId) q = q.eq('curso_id', cursoId);
  if (periodoId) q = q.eq('periodo_letivo_id', periodoId);
  const { data, error, count } = await q.order('codigo').range(from, to);
  if (error) throw new ValidationError(error.message);
  res.json({ data, page: p.page, pageSize: p.pageSize, total: count ?? 0 });
}));

turmaRouter.get('/:id', asyncHandler(async (req, res) => {
  const id = uuidSchema.parse(req.params.id);
  const { data, error } = await req.supabase!.from('turmas').select('*').eq('id', id).single();
  if (error || !data) throw new NotFoundError('Turma não encontrada');
  res.json({ data });
}));

turmaRouter.post('/', requireRole('secretaria', 'admin'), asyncHandler(async (req, res) => {
  const body = turmaCreateSchema.parse(req.body);
  const { data, error } = await req.supabase!.from('turmas').insert(body).select().single();
  if (error) throw new ValidationError(error.message);
  res.status(201).json({ data });
}));

turmaRouter.patch('/:id', requireRole('secretaria', 'admin'), asyncHandler(async (req, res) => {
  const id = uuidSchema.parse(req.params.id);
  const body = turmaCreateSchema.partial().parse(req.body);
  const { data, error } = await req.supabase!.from('turmas').update(body).eq('id', id).select().single();
  if (error || !data) throw new NotFoundError('Turma não encontrada');
  res.json({ data });
}));
