import type { Item, MaquinaResumo } from '@/types';
import { api } from './api';

export interface DadosItem {
  desenho: string;
  processo: string | null;
  material: string | null;
  quantidadeSolicitada: number;
  dataSolicitacao: string; // AAAA-MM-DD
}

/** UC05 — máquinas e itens (escrita só Engenheiro; listar itens, todos). */
export const maquinasService = {
  cadastrar(projetoId: string, nome: string) {
    return api<MaquinaResumo>(`/projetos/${projetoId}/maquinas`, { metodo: 'POST', corpo: { nome } });
  },

  renomear(id: string, nome: string) {
    return api<MaquinaResumo>(`/maquinas/${id}`, { metodo: 'PUT', corpo: { nome } });
  },

  excluir(id: string) {
    return api<void>(`/maquinas/${id}`, { metodo: 'DELETE' });
  },

  listarItens(maquinaId: string) {
    return api<Item[]>(`/itens?maquina=${encodeURIComponent(maquinaId)}`);
  },

  cadastrarItem(maquinaId: string, dados: DadosItem) {
    return api<Item>(`/maquinas/${maquinaId}/itens`, { metodo: 'POST', corpo: dados });
  },

  alterarItem(id: string, dados: DadosItem) {
    return api<Item>(`/itens/${id}`, { metodo: 'PUT', corpo: dados });
  },

  excluirItem(id: string) {
    return api<void>(`/itens/${id}`, { metodo: 'DELETE' });
  },
};
