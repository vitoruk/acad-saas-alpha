import { Router, type Router as RouterType } from 'express';
import { authMiddleware } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../lib/async-handler.js';
import { NotFoundError, ValidationError } from '../../../lib/errors.js';
import { uuidSchema } from '../_shared.js';

export const historicoRouter: RouterType = Router();
historicoRouter.use(authMiddleware);

// GET /api/historico/:aluno_id — histórico escolar completo
historicoRouter.get('/:aluno_id', asyncHandler(async (req, res) => {
  const alunoId = uuidSchema.parse(req.params.aluno_id);
  const { data, error } = await req.supabase!
    .from('vw_historico_academico')
    .select('*')
    .eq('aluno_id', alunoId);
  if (error) throw new ValidationError(error.message);
  if (!data || data.length === 0) throw new NotFoundError('Histórico vazio ou aluno não encontrado');
  res.json({ data });
}));

// GET /api/historico/:aluno_id/cra — coeficiente
historicoRouter.get('/:aluno_id/cra', asyncHandler(async (req, res) => {
  const alunoId = uuidSchema.parse(req.params.aluno_id);
  const { data, error } = await req.supabase!.rpc('fn_calcular_cra', { p_aluno_id: alunoId });
  if (error) throw new ValidationError(error.message);
  res.json({ data: { aluno_id: alunoId, cra: data } });
}));

// GET /api/historico/:aluno_id/elegibilidade — pode formar?
historicoRouter.get('/:aluno_id/elegibilidade', asyncHandler(async (req, res) => {
  const alunoId = uuidSchema.parse(req.params.aluno_id);
  const { data, error } = await req.supabase!.rpc('fn_aluno_pode_formar', { p_aluno_id: alunoId });
  if (error) throw new ValidationError(error.message);
  res.json({ data });
}));
