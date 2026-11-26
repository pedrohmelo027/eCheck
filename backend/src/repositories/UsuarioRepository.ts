import { supabase } from '../config/supabase';
import { AppError } from '../errors/AppError';
import { TipoUsuario } from '../models/enums';

/** Linha da tabela `usuarios`. */
export interface UsuarioLinha {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  ativo: boolean;
  criado_em: string;
}

export interface FiltroUsuarios {
  nome?: string;
  tipo?: TipoUsuario;
}

const VIOLACAO_UNICIDADE = '23505';

/** Marca na conta do Auth: a pessoa entrou com senha provisória e precisa trocá-la. */
export const MARCA_TROCAR_SENHA = 'trocar_senha';

async function atualizarConta(id: string, dados: { password: string; app_metadata: Record<string, unknown> }) {
  const { error } = await supabase().auth.admin.updateUserById(id, dados);
  if (error) {
    if (error.code === 'weak_password' || error.status === 422) {
      throw new AppError('EX06', { campo: 'senha', motivo: 'senha fraca demais' });
    }
    throw new AppError('EX22', {}, [error.message]);
  }
}

/** Escapa os curingas do LIKE para buscar o texto literal. */
function escaparLike(texto: string) {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function falha(error: { message: string; code?: string }): never {
  if (error.code === VIOLACAO_UNICIDADE) throw new AppError('EX05');
  throw new AppError('EX22', {}, [error.message]);
}

export const UsuarioRepository = {
  async buscarPorId(id: string): Promise<UsuarioLinha | null> {
    const { data, error } = await supabase().from('usuarios').select('*').eq('id', id).maybeSingle();
    if (error) falha(error);
    return data as UsuarioLinha | null;
  },

  /** E-mails são gravados em minúsculas, então a comparação exata basta. */
  async buscarPorEmail(email: string): Promise<UsuarioLinha | null> {
    const { data, error } = await supabase().from('usuarios').select('*').eq('email', email.toLowerCase()).maybeSingle();
    if (error) falha(error);
    return data as UsuarioLinha | null;
  },

  async listar(filtro: FiltroUsuarios = {}): Promise<UsuarioLinha[]> {
    let consulta = supabase().from('usuarios').select('*').order('nome');
    if (filtro.nome) consulta = consulta.ilike('nome', `%${escaparLike(filtro.nome)}%`);
    if (filtro.tipo) consulta = consulta.eq('tipo', filtro.tipo);
    const { data, error } = await consulta;
    if (error) falha(error);
    return data as UsuarioLinha[];
  },

  /** Nome de cada usuário pelo id (para históricos). Ids repetidos são consultados uma vez. */
  async buscarNomes(ids: string[]): Promise<Map<string, string>> {
    const unicos = [...new Set(ids)];
    if (unicos.length === 0) return new Map();
    const { data, error } = await supabase().from('usuarios').select('id, nome').in('id', unicos);
    if (error) falha(error);
    return new Map((data ?? []).map((u) => [u.id as string, u.nome as string]));
  },

  async inserir(linha: Omit<UsuarioLinha, 'criado_em'>): Promise<UsuarioLinha> {
    const { data, error } = await supabase().from('usuarios').insert(linha).select('*').single();
    if (error) falha(error);
    return data as UsuarioLinha;
  },

  async atualizar(id: string, campos: Partial<Pick<UsuarioLinha, 'nome' | 'email' | 'tipo' | 'ativo'>>): Promise<UsuarioLinha> {
    const { data, error } = await supabase().from('usuarios').update(campos).eq('id', id).select('*').single();
    if (error) falha(error);
    return data as UsuarioLinha;
  },

  // ─── Supabase Auth (contas e convites) ───

  /** Cria a conta no Auth e envia o convite por e-mail (RN01). Devolve o id da conta. */
  async convidar(email: string, redirecionarPara: string): Promise<string> {
    const { data, error } = await supabase().auth.admin.inviteUserByEmail(email, { redirectTo: redirecionarPara });
    if (error) {
      // Conta já existe no Auth (ex.: sobra de um cadastro anterior)
      if (error.status === 422 || /already.*registered|exists/i.test(error.message)) throw new AppError('EX05');
      throw new AppError('EX22', {}, [error.message]);
    }
    return data.user.id;
  },

  async alterarEmailDaConta(id: string, email: string): Promise<void> {
    const { error } = await supabase().auth.admin.updateUserById(id, { email, email_confirm: true });
    if (error) {
      if (error.status === 422 || /already.*registered|exists/i.test(error.message)) throw new AppError('EX05');
      throw new AppError('EX22', {}, [error.message]);
    }
  },

  /** Só para desfazer um cadastro que falhou no meio. */
  async removerConta(id: string): Promise<void> {
    await supabase().auth.admin.deleteUser(id);
  },

  // ─── Senha provisória (entrada sem e-mail) ───

  /**
   * Cria a conta já confirmada, com senha provisória e a marca de troca obrigatória
   * (`app_metadata.trocar_senha`: só a service role altera). Devolve o id da conta.
   */
  async criarContaComSenha(email: string, senha: string): Promise<string> {
    const { data, error } = await supabase().auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      app_metadata: { [MARCA_TROCAR_SENHA]: true },
    });
    if (error) {
      if (error.status === 422 || /already.*registered|exists/i.test(error.message)) throw new AppError('EX05');
      throw new AppError('EX22', {}, [error.message]);
    }
    return data.user.id;
  },

  /** Nova senha provisória (ex.: a pessoa esqueceu a senha). Encerra as sessões abertas dela. */
  async definirSenhaProvisoria(id: string, senha: string): Promise<void> {
    await atualizarConta(id, { password: senha, app_metadata: { [MARCA_TROCAR_SENHA]: true } });
  },

  /** Senha escolhida pela própria pessoa: tira a marca de troca obrigatória. */
  async definirSenhaDefinitiva(id: string, senha: string): Promise<void> {
    await atualizarConta(id, { password: senha, app_metadata: { [MARCA_TROCAR_SENHA]: false } });
  },

  /** Ids das contas que ainda estão com senha provisória (para a lista de usuários). */
  async idsComSenhaProvisoria(): Promise<Set<string>> {
    const ids = new Set<string>();
    for (let pagina = 1; ; pagina++) {
      const { data, error } = await supabase().auth.admin.listUsers({ page: pagina, perPage: 1000 });
      if (error) throw new AppError('EX22', {}, [error.message]);
      data.users.filter((c) => c.app_metadata?.[MARCA_TROCAR_SENHA] === true).forEach((c) => ids.add(c.id));
      if (data.users.length < 1000) return ids;
    }
  },
};
