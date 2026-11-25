import { supabase } from '../config/supabase';
import { AppError } from '../errors/AppError';
import { buscarTodas, escaparLike, falhaBanco } from './util';

export interface MaquinaLinha {
  id: string;
  projeto_id: string;
  nome: string;
  criado_em: string;
}

/** Máquina com os totais calculados (view vw_resumo_maquinas). */
export interface MaquinaResumoLinha extends MaquinaLinha {
  total_itens: number;
  total_solicitado: number;
  total_recebido: number;
}

const VIOLACAO_UNICIDADE = '23505';
const VIOLACAO_CHAVE_ESTRANGEIRA = '23503';

function falha(error: { message: string; code?: string }): never {
  if (error.code === VIOLACAO_UNICIDADE) throw new AppError('EX08'); // RN07
  falhaBanco(error);
}

export const MaquinaRepository = {
  async listarPorProjetos(projetoIds: string[]): Promise<MaquinaLinha[]> {
    if (projetoIds.length === 0) return [];
    return buscarTodas<MaquinaLinha>((de, ate) =>
      supabase().from('maquinas').select('*').in('projeto_id', projetoIds).order('criado_em').range(de, ate),
    );
  },

  async listarResumoDoProjeto(projetoId: string): Promise<MaquinaResumoLinha[]> {
    return buscarTodas<MaquinaResumoLinha>((de, ate) =>
      supabase().from('vw_resumo_maquinas').select('*').eq('projeto_id', projetoId).order('criado_em').range(de, ate),
    );
  },

  async buscarResumo(id: string): Promise<MaquinaResumoLinha | null> {
    const { data, error } = await supabase().from('vw_resumo_maquinas').select('*').eq('id', id).maybeSingle();
    if (error) falha(error);
    return data as MaquinaResumoLinha | null;
  },

  /** Máquina do projeto pelo nome, sem diferenciar maiúsculas (RN07). */
  async buscarPorNome(projetoId: string, nome: string): Promise<MaquinaLinha | null> {
    const { data, error } = await supabase()
      .from('maquinas')
      .select('*')
      .eq('projeto_id', projetoId)
      .ilike('nome', escaparLike(nome))
      .maybeSingle();
    if (error) falha(error);
    return data as MaquinaLinha | null;
  },

  async inserir(projetoId: string, nome: string): Promise<MaquinaLinha> {
    const { data, error } = await supabase().from('maquinas').insert({ projeto_id: projetoId, nome }).select('*').single();
    if (error) falha(error);
    return data as MaquinaLinha;
  },

  async renomear(id: string, nome: string): Promise<void> {
    const { error } = await supabase().from('maquinas').update({ nome }).eq('id', id);
    if (error) falha(error);
  },

  /** Exclui a máquina com os itens (cascata); recebimento em algum item barra tudo (RN23 → EX17). */
  async excluir(id: string): Promise<void> {
    const { error } = await supabase().from('maquinas').delete().eq('id', id);
    if (error?.code === VIOLACAO_CHAVE_ESTRANGEIRA) throw new AppError('EX17');
    if (error) falha(error);
  },
};
