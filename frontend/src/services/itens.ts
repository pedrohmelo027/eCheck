import type { HistoricoItem, Item, StatusItem } from '@/types';
import { api } from './api';

export interface FiltroItens {
  /** Só projetos liberados (tela de recebimentos). */
  liberados?: boolean;
  projeto?: string;
  maquina?: string;
  desenho?: string;
  processo?: string;
  status?: StatusItem | '';
}

/** UC08 — consulta de itens e histórico de baixas (todos os tipos). */
export const itensService = {
  listar(filtro: FiltroItens = {}) {
    const params = new URLSearchParams();
    for (const [chave, valor] of Object.entries(filtro)) {
      if (typeof valor === 'string' && valor.trim()) params.set(chave, valor.trim());
      if (valor === true) params.set(chave, 'true');
    }
    const query = params.toString();
    return api<Item[]>(`/itens${query ? `?${query}` : ''}`);
  },

  historico(itemId: string) {
    return api<HistoricoItem>(`/itens/${itemId}/recebimentos`);
  },
};
