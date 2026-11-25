import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local (modelo em .env.example).');
}

/**
 * Cliente do Supabase usado SÓ para Auth (login, sessão, convite, redefinição de senha).
 * Nunca use para ler ou gravar tabelas: os dados vêm sempre da API.
 */
export const supabaseAuth = createClient(url, anonKey).auth;
