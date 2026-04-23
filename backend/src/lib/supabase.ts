import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

/**
 * Cliente admin (service_role) — bypassa RLS. USAR COM EXTREMO CUIDADO.
 * Somente em caminhos controlados: criação de usuário, leitura de cofre, etc.
 * Lazy: só instancia se a key estiver disponível (não disponível no validador público).
 */
let _supabaseAdmin: SupabaseClient | null = null;
export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada. Admin client não disponível neste serviço.');
  }
  _supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _supabaseAdmin;
}
/** @deprecated use getSupabaseAdmin() */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return (getSupabaseAdmin() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/**
 * Cria um cliente escopado ao JWT do usuário atual.
 * Respeita todas as policies RLS. USAR EM 99% das operações.
 */
export function supabaseForUser(accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
