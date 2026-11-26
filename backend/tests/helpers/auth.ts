import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { env } from '../../src/config/env';
import { supabase } from '../../src/config/supabase';
import { ChaveUsuario, entrar, garantirUsuariosFicticios, USUARIOS_FICTICIOS } from '../../scripts/usuariosFicticios';

let ids: Record<ChaveUsuario, string> | undefined;

/** Cria (se preciso) os usuários fictícios e devolve o id de cada um. */
export async function prepararUsuarios() {
  ids ??= await garantirUsuariosFicticios();
  return ids;
}

/**
 * Os JWTs valem 1 hora e ficam num arquivo temporário compartilhado entre os arquivos de teste:
 * sem isso cada arquivo faria seus próprios logins e a suíte estouraria o limite de logins
 * por IP do Supabase Auth.
 */
const ARQUIVO_TOKENS = path.join(
  tmpdir(),
  `echeck-tokens-${createHash('sha256').update(env().SUPABASE_URL).digest('hex').slice(0, 12)}.json`,
);
const MARGEM_SEGUNDOS = 300;

type TokenGuardado = { token: string; sub: string; exp: number };

function lerTokens(): Partial<Record<ChaveUsuario, TokenGuardado>> {
  try {
    return existsSync(ARQUIVO_TOKENS) ? JSON.parse(readFileSync(ARQUIVO_TOKENS, 'utf8')) : {};
  } catch {
    return {};
  }
}

function dadosDoJwt(token: string): { sub: string; exp: number } {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
}

/** JWT real de um usuário fictício (login no Supabase Auth), reaproveitado enquanto valer. */
export async function tokenDe(chave: ChaveUsuario): Promise<string> {
  const usuarios = await prepararUsuarios();
  const guardados = lerTokens();
  const guardado = guardados[chave];
  if (guardado && guardado.sub === usuarios[chave] && guardado.exp > Date.now() / 1000 + MARGEM_SEGUNDOS) {
    return guardado.token;
  }

  const email = USUARIOS_FICTICIOS.find((u) => u.chave === chave)!.email;
  const token = await entrar(email);
  const { sub, exp } = dadosDoJwt(token);
  writeFileSync(ARQUIVO_TOKENS, JSON.stringify({ ...guardados, [chave]: { token, sub, exp } }));
  return token;
}

/** Cabeçalho Authorization pronto para o supertest. */
export async function comoUsuario(chave: ChaveUsuario) {
  return { Authorization: `Bearer ${await tokenDe(chave)}` };
}

/**
 * Substitui o convite por e-mail do Supabase Auth por um mock (nada é enviado).
 * O mock cria a conta de verdade, sem e-mail, para o id bater com `usuarios`.
 */
export function mockarConvite() {
  const adminAuth = supabase().auth.admin;
  return jest.spyOn(adminAuth, 'inviteUserByEmail').mockImplementation(async (email: string) => {
    const resultado = await adminAuth.createUser({ email, email_confirm: true });
    return resultado as unknown as Awaited<ReturnType<typeof adminAuth.inviteUserByEmail>>;
  });
}
