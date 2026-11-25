import { supabase } from '../config/supabase';
import { StatusProjeto } from '../models/enums';
import { escaparLike, falhaBanco } from './util';

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

export const ProjetoRepository = {
  /** Busca por código sem diferenciar maiúsculas (RN06). */
  async buscarPorCodigo(codigo: string): Promise<ProjetoLinha | null> {
    const { data, error } = await supabase().from('projetos').select('*').ilike('codigo', escaparLike(codigo)).maybeSingle();
    if (error) falhaBanco(error);
    return data as ProjetoLinha | null;
  },

  async buscarPorCodigos(codigos: string[]): Promise<ProjetoLinha[]> {
    const encontrados = await Promise.all([...new Set(codigos)].map((c) => this.buscarPorCodigo(c)));
    return encontrados.filter((p): p is ProjetoLinha => p !== null);
  },
};
