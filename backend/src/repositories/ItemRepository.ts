import { supabase } from '../config/supabase';
import { buscarTodas, emBlocos } from './util';

export interface ItemLinha {
  id: string;
  maquina_id: string;
  desenho: string;
  processo: string | null;
  material: string | null;
  quantidade_solicitada: number;
  data_solicitacao: string; // AAAA-MM-DD
  criado_em: string;
}

export const ItemRepository = {
  async listarPorMaquinas(maquinaIds: string[]): Promise<ItemLinha[]> {
    const blocos = await Promise.all(
      emBlocos(maquinaIds).map((ids) =>
        buscarTodas<ItemLinha>((de, ate) =>
          supabase().from('itens_solicitados').select('*').in('maquina_id', ids).order('criado_em').range(de, ate),
        ),
      ),
    );
    return blocos.flat();
  },
};
