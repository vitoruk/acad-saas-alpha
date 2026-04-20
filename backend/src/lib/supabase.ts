import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

/**
 * Cliente admin (service_role) — bypassa RLS. USAR COM EXTREMO CUIDADO.
 * Somente em caminhos controlados: criação de usuário, leitura de cofre, etc.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);

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
