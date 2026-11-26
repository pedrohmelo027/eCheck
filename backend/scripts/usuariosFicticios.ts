import { createClient } from '@supabase/supabase-js';
import { env } from '../src/config/env';
import { supabase } from '../src/config/supabase';
import { TipoUsuario } from '../src/models/enums';
import { exigirDesenvolvimento } from './ambiente';

/** Usuários fictícios (PLANO-DE-DESENVOLVIMENTO.md, seção 3). O domínio .test nunca recebe e-mail. */
export const USUARIOS_FICTICIOS = [
  { chave: 'admin', nome: 'Admin Teste', email: 'admin@echeck.test', tipo: TipoUsuario.ADMINISTRADOR, ativo: true },
  { chave: 'engenheiro', nome: 'Engenheiro Teste', email: 'engenheiro@echeck.test', tipo: TipoUsuario.ENGENHEIRO, ativo: true },
  { chave: 'encarregado', nome: 'Encarregado Teste', email: 'encarregado@echeck.test', tipo: TipoUsuario.ENCARREGADO, ativo: true },
  { chave: 'usuario', nome: 'Usuário Teste', email: 'usuario@echeck.test', tipo: TipoUsuario.USUARIO, ativo: true },
  { chave: 'inativo', nome: 'Inativo Teste', email: 'inativo@echeck.test', tipo: TipoUsuario.USUARIO, ativo: false },
] as const;

export type ChaveUsuario = (typeof USUARIOS_FICTICIOS)[number]['chave'];

/** Senha só do ambiente de desenvolvimento, igual para todos os fictícios. */
export const SENHA_FICTICIA = 'Senha-Teste-123';

/** Marca em app_metadata: a senha padrão já foi definida nesta conta. */
const MARCA_SENHA = 'echeck_senha_ficticia';

/**
 * Garante que os 5 usuários fictícios existem no Supabase Auth (com senha e e-mail confirmado)
 * e na tabela `usuarios`, com o tipo e a situação da seção 3. Pode rodar várias vezes.
 * Devolve o id de cada um.
 */
export async function garantirUsuariosFicticios(): Promise<Record<ChaveUsuario, string>> {
  exigirDesenvolvimento('Criar usuários fictícios');
  const admin = supabase().auth.admin;
  const { data: lista, error: erroLista } = await admin.listUsers({ perPage: 1000 });
  if (erroLista) throw erroLista;

  const ids = {} as Record<ChaveUsuario, string>;
  for (const u of USUARIOS_FICTICIOS) {
    const conta = lista.users.find((c) => c.email === u.email);
    let id = conta?.id;
    if (!id) {
      const { data, error } = await admin.createUser({
        email: u.email,
        password: SENHA_FICTICIA,
        email_confirm: true,
        app_metadata: { [MARCA_SENHA]: true },
      });
      if (error) throw error;
      id = data.user.id;
    } else if (!conta?.app_metadata?.[MARCA_SENHA]) {
      // Só define a senha uma vez (a marca fica na conta): trocar a senha derruba as sessões
      // abertas no front, e conferir com login a cada teste estoura o limite de logins do Auth.
      const { error } = await admin.updateUserById(id, {
        password: SENHA_FICTICIA,
        app_metadata: { ...conta?.app_metadata, [MARCA_SENHA]: true },
      });
      if (error) throw error;
    }

    const { error } = await supabase()
      .from('usuarios')
      .upsert({ id, nome: u.nome, email: u.email, tipo: u.tipo, ativo: u.ativo }, { onConflict: 'id' });
    if (error) throw error;
    ids[u.chave] = id;
  }
  return ids;
}

/** Faz login real no Supabase Auth com a anon key e devolve o JWT. */
export async function entrar(email: string, senha = SENHA_FICTICIA): Promise<string> {
  const anonKey = env().SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error('Defina SUPABASE_ANON_KEY no .env para os testes e o seed.');
  const cliente = createClient(env().SUPABASE_URL, anonKey, { auth: { persistSession: false } });
  const { data, error } = await cliente.auth.signInWithPassword({ email, password: senha });
  if (error || !data.session) throw error ?? new Error(`Login falhou para ${email}`);
  return data.session.access_token;
}
