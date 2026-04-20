import { z } from 'zod';
import { Router, type Router as RouterType } from 'express';
import { authMiddleware } from '../../../middleware/auth.js';
import { requireRole } from '../../../middleware/rbac.js';
import { asyncHandler } from '../../../lib/async-handler.js';
import { NotFoundError, ValidationError } from '../../../lib/errors.js';
import { uuidSchema } from '../_shared.js';

const aulaCreateSchema = z.object({
  turma_id: z.string().uuid(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  conteudo: z.string().min(1),
  horas: z.number().positive().default(1),
});

const frequenciaBatchSchema = z.object({
  aula_id: z.string().uuid(),
  registros: z.array(z.object({
    matricula_id: z.string().uuid(),
    presente: z.boolean(),
    justificativa: z.string().optional(),
  })).min(1),
});

const notaBatchSchema = z.object({
  avaliacao_id: z.string().uuid(),
  notas: z.array(z.object({
    matricula_id: z.string().uuid(),
    nota: z.number().min(0).max(10),
  })).min(1),
});

export const diarioRouter: RouterType = Router();
diarioRouter.use(authMiddleware);

// POST /api/diario/aulas — professor registra aula
diarioRouter.post('/aulas', requireRole('professor', 'secretaria', 'admin'), asyncHandler(async (req, res) => {
  const body = aulaCreateSchema.parse(req.body);
  const { data, error } = await req.supabase!.from('aulas').insert(body).select().single();
  if (error) throw new ValidationError(error.message);
  res.status(201).json({ data });
}));

// GET /api/diario/aulas?turma_id=...
diarioRouter.get('/aulas', asyncHandler(async (req, res) => {
  const turma_id = req.query.turma_id as string;
  if (!turma_id) throw new ValidationError('turma_id é obrigatório');
  const { data, error } = await req.supabase!
    .from('aulas')
    .select('*')
    .eq('turma_id', turma_id)
    .order('data', { ascending: false });
  if (error) throw new ValidationError(error.message);
  res.json({ data });
}));

// POST /api/diario/frequencias — lançamento em lote
diarioRouter.post('/frequencias', requireRole('professor', 'secretaria', 'admin'), asyncHandler(async (req, res) => {
  const body = frequenciaBatchSchema.parse(req.body);
  const rows = body.registros.map((r) => ({
    aula_id: body.aula_id,
    matricula_id: r.matricula_id,
    presente: r.presente,
    justificativa: r.justificativa,
  }));
  const { data, error } = await req.supabase!
    .from('frequencias')
    .upsert(rows, { onConflict: 'aula_id,matricula_id' })
    .select();
  if (error) throw new ValidationError(error.message);
  res.status(201).json({ data, count: data?.length ?? 0 });
}));

// POST /api/diario/notas — lançamento em lote
diarioRouter.post('/notas', requireRole('professor', 'secretaria', 'admin'), asyncHandler(async (req, res) => {
  const body = notaBatchSchema.parse(req.body);
  const rows = body.notas.map((n) => ({
    avaliacao_id: body.avaliacao_id,
    matricula_id: n.matricula_id,
    nota: n.nota,
  }));
  const { data, error } = await req.supabase!
    .from('notas_avaliacao')
    .upsert(rows, { onConflict: 'avaliacao_id,matricula_id' })
    .select();
  if (error) throw new ValidationError(error.message);
  res.status(201).json({ data, count: data?.length ?? 0 });
}));

// POST /api/diario/pauta-final — consolida média/resultado
diarioRouter.post('/pauta-final', requireRole('professor', 'secretaria', 'admin'), asyncHandler(async (req, res) => {
  const schema = z.object({
    matricula_id: z.string().uuid(),
    media_final: z.number().min(0).max(10),
    frequencia_pct: z.number().min(0).max(100),
    resultado: z.enum(['aprovado', 'reprovado', 'reprovado_por_falta', 'em_exame']),
  });
  const body = schema.parse(req.body);
  const { data, error } = await req.supabase!
    .from('pauta_final')
    .upsert(body, { onConflict: 'matricula_id' })
    .select()
    .single();
  if (error || !data) throw new NotFoundError('Falha ao registrar pauta');
  res.status(201).json({ data });
}));
