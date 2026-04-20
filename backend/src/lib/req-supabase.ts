/**
 * Helper para extrair o Supabase client autenticado (com JWT do usuário)
 * a partir de uma Request. Usa supabaseForUser(token) para respeitar RLS.
 */
import type { Request } from 'express';
import { supabaseForUser, supabaseAdmin } from './supabase.js';
import { AuthError } from './errors.js';

export function getSupabaseFromReq(req: Request) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    throw new AuthError('Token ausente');
  }
  const token = auth.slice(7);
  return supabaseForUser(token);
}

export { supabaseAdmin };
