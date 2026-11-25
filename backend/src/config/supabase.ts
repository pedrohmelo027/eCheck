import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let cliente: SupabaseClient | undefined;

/** Cliente com a service role: só os repositories e o middleware autenticar usam. */
export function supabase(): SupabaseClient {
  if (!cliente) {
    cliente = createClient(env().SUPABASE_URL, env().SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cliente;
}
