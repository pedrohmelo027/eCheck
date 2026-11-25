import { supabase } from '../config/supabase';
import { buscarTodas } from './util';

export interface MaquinaLinha {
  id: string;
  projeto_id: string;
  nome: string;
  criado_em: string;
}

export const MaquinaRepository = {
  async listarPorProjetos(projetoIds: string[]): Promise<MaquinaLinha[]> {
    if (projetoIds.length === 0) return [];
    return buscarTodas<MaquinaLinha>((de, ate) =>
      supabase().from('maquinas').select('*').in('projeto_id', projetoIds).order('criado_em').range(de, ate),
    );
  },
};
