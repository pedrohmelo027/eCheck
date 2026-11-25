import { supabase } from '../config/supabase';
import { buscarTodas } from './util';

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
};
