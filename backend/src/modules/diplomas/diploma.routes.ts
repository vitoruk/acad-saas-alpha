import { Router, type Router as RouterType } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { emitirDiploma, getRvddUrl } from './diploma.controller.js';

export const diplomaRouter: RouterType = Router();

diplomaRouter.use(authMiddleware);

diplomaRouter.post(
  '/emitir',
  requireRole('secretaria', 'admin'),
  emitirDiploma,
);

diplomaRouter.get(
  '/:id/rvdd',
  requireRole('aluno', 'secretaria', 'admin', 'super_admin'),
  getRvddUrl,
);
