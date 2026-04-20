import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin, supabaseForUser } from '../lib/supabase.js';
import { AuthError } from '../lib/errors.js';
import type { SupabaseClient } from '@supabase/supabase-js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roles: string[];
        isSuperAdmin: boolean;
      };
      supabase?: SupabaseClient;
      accessToken?: string;
    }
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthError('Token ausente');
    }
    const token = authHeader.slice(7);

    // Valida token via Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      throw new AuthError('Token inválido');
    }

    // Busca roles + flag super admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_super_admin')
      .eq('id', data.user.id)
      .single();

    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .is('revoked_at', null);

    req.user = {
      id: data.user.id,
      email: data.user.email ?? '',
      roles: (roles ?? []).map((r) => r.role as string),
      isSuperAdmin: profile?.is_super_admin === true,
    };
    req.accessToken = token;
    req.supabase = supabaseForUser(token);
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Variante opcional: não exige token, mas popula req.user se houver.
 * Útil para endpoints públicos que ganham funcionalidade extra se autenticado.
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.headers.authorization) {
    next();
    return;
  }
  await authMiddleware(req, res, next);
}
