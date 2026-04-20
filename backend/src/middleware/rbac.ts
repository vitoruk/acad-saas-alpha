import type { NextFunction, Request, Response } from 'express';
import { AuthError, ForbiddenError } from '../lib/errors.js';

export type Role = 'aluno' | 'professor' | 'secretaria' | 'admin' | 'super_admin';

/**
 * Middleware factory: exige que usuário possua AO MENOS UMA das roles informadas.
 * Super admin sempre passa.
 */
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AuthError();
    if (req.user.isSuperAdmin) return next();
    const hasAny = req.user.roles.some((r) => allowed.includes(r as Role));
    if (!hasAny) {
      throw new ForbiddenError(
        `Requer uma das roles: ${allowed.join(', ')}. Usuário possui: ${req.user.roles.join(', ') || '(nenhuma)'}`,
      );
    }
    next();
  };
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw new AuthError();
  if (!req.user.isSuperAdmin) {
    throw new ForbiddenError('Requer super admin');
  }
  next();
}
