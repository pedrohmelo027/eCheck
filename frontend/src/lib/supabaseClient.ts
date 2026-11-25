import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local (modelo em .env.example).');
}

/**
 * Cliente do Supabase usado SÓ para Auth (login, sessão, convite, redefinição de senha).
 * Nunca use para ler ou gravar tabelas: os dados vêm sempre da API.
 *
 * A sessão fica em cookie (@supabase/ssr) para o proxy.ts enxergar quem está logado.
 * detectSessionInUrl desligado: os links de convite e de redefinição são tratados na tela
 * /login, porque o convite chega com o token no #hash e o cliente do navegador só aceita PKCE.
 */
export const supabaseAuth = createBrowserClient(url, anonKey, {
  auth: { detectSessionInUrl: false },
}).auth;
