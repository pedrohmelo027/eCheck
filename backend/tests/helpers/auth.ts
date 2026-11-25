import { supabase } from '../../src/config/supabase';
import { ChaveUsuario, entrar, garantirUsuariosFicticios, USUARIOS_FICTICIOS } from '../../scripts/usuariosFicticios';

let ids: Record<ChaveUsuario, string> | undefined;
const tokens = new Map<ChaveUsuario, string>();

/** Cria (se preciso) os usuários fictícios e devolve o id de cada um. */
export async function prepararUsuarios() {
  ids ??= await garantirUsuariosFicticios();
  return ids;
}

/** JWT real de um usuário fictício (login no Supabase Auth). Fica em cache durante o arquivo de teste. */
export async function tokenDe(chave: ChaveUsuario): Promise<string> {
  await prepararUsuarios();
  let token = tokens.get(chave);
  if (!token) {
    const email = USUARIOS_FICTICIOS.find((u) => u.chave === chave)!.email;
    token = await entrar(email);
    tokens.set(chave, token);
  }
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
