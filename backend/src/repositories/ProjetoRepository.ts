import { supabase } from '../config/supabase';
import { AppError } from '../errors/AppError';
import { StatusProjeto } from '../models/enums';
import { buscarTodas, escaparLike, falhaBanco } from './util';

export interface ProjetoLinha {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  status: StatusProjeto;
  criado_por: string;
  criado_em: string;
  liberado_por: string | null;
  liberado_em: string | null;
}

/** Projeto com os totais calculados (view vw_resumo_projetos). */
export interface ProjetoResumoLinha extends ProjetoLinha {
  total_maquinas: number;
  total_itens: number;
  total_solicitado: number;
  total_recebido: number;
}

export type DadosProjeto = Pick<ProjetoLinha, 'codigo' | 'nome' | 'descricao'>;

const VIOLACAO_UNICIDADE = '23505';
const VIOLACAO_CHAVE_ESTRANGEIRA = '23503';

function falha(error: { message: string; code?: string }): never {
  if (error.code === VIOLACAO_UNICIDADE) throw new AppError('EX07'); // RN06
  falhaBanco(error);
}

export const ProjetoRepository = {
  /** Busca por código sem diferenciar maiúsculas (RN06). */
  async buscarPorCodigo(codigo: string): Promise<ProjetoLinha | null> {
    const { data, error } = await supabase().from('projetos').select('*').ilike('codigo', escaparLike(codigo)).maybeSingle();
    if (error) falha(error);
    return data as ProjetoLinha | null;
  },

  async buscarPorCodigos(codigos: string[]): Promise<ProjetoLinha[]> {
    const encontrados = await Promise.all([...new Set(codigos)].map((c) => this.buscarPorCodigo(c)));
    return encontrados.filter((p): p is ProjetoLinha => p !== null);
  },

  async listarResumo(): Promise<ProjetoResumoLinha[]> {
    return buscarTodas<ProjetoResumoLinha>((de, ate) =>
      supabase().from('vw_resumo_projetos').select('*').order('codigo').range(de, ate),
    );
  },

  async buscarResumo(id: string): Promise<ProjetoResumoLinha | null> {
    const { data, error } = await supabase().from('vw_resumo_projetos').select('*').eq('id', id).maybeSingle();
    if (error) falha(error);
    return data as ProjetoResumoLinha | null;
  },

  async inserir(dados: DadosProjeto & { criado_por: string }): Promise<ProjetoLinha> {
    const { data, error } = await supabase().from('projetos').insert(dados).select('*').single();
    if (error) falha(error);
    return data as ProjetoLinha;
  },

  async atualizar(id: string, dados: DadosProjeto): Promise<void> {
    const { error } = await supabase().from('projetos').update(dados).eq('id', id);
    if (error) falha(error);
  },

  /**
   * Muda para LIBERADO só se ainda estiver EM_CADASTRO (atômico: duas liberações ao mesmo tempo
   * não passam as duas). Devolve false se o projeto já estava liberado.
   */
  async liberar(id: string, engenheiroId: string): Promise<boolean> {
    const { data, error } = await supabase()
      .from('projetos')
      .update({ status: StatusProjeto.LIBERADO, liberado_por: engenheiroId, liberado_em: new Date().toISOString() })
      .eq('id', id)
      .eq('status', StatusProjeto.EM_CADASTRO)
      .select('id');
    if (error) falha(error);
    return (data ?? []).length === 1;
  },

  /**
   * Exclui o projeto com máquinas e itens (cascata). Se algum item tiver recebimento,
   * a chave estrangeira barra a exclusão inteira (RN23 → EX17).
   */
  async excluir(id: string): Promise<void> {
    const { error } = await supabase().from('projetos').delete().eq('id', id);
    if (error?.code === VIOLACAO_CHAVE_ESTRANGEIRA) throw new AppError('EX17');
    if (error) falha(error);
  },
};
