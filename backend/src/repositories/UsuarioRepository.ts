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
};
