import type { Item, Recebimento, ResultadoBaixa, SimulacaoBaixaProjeto } from '@/types';
import { api } from './api';

/** UC07 — recebimentos. Buscar: todos; o resto, só Encarregado. */
export const recebimentosService = {
  /** Onde o desenho (completo ou parcial) aparece em projetos liberados. Nenhum → EX19. */
  buscarPorDesenho(desenho: string) {
    return api<Item[]>(`/itens/busca?desenho=${encodeURIComponent(desenho)}`);
  },

  /** Baixa por máquina (num item). Excedente volta em `aviso` (EX16). */
  darBaixa(itemId: string, quantidade: number, observacao: string | null) {
    return api<ResultadoBaixa>(`/itens/${itemId}/recebimentos`, { metodo: 'POST', corpo: { quantidade, observacao } });
  },

  /** Mostra quanto vai para cada solicitação, sem gravar. */
  simularBaixaProjeto(projetoId: string, desenho: string, quantidade: number) {
    return api<SimulacaoBaixaProjeto>(`/projetos/${projetoId}/recebimentos/previa`, {
      metodo: 'POST',
      corpo: { desenho, quantidade },
    });
  },

  darBaixaProjeto(projetoId: string, desenho: string, quantidade: number, observacao: string | null) {
    return api<SimulacaoBaixaProjeto>(`/projetos/${projetoId}/recebimentos`, {
      metodo: 'POST',
      corpo: { desenho, quantidade, observacao },
    });
  },

  atualizar(id: string, quantidade: number) {
    return api<{ recebimento: Recebimento; item: Item }>(`/recebimentos/${id}`, { metodo: 'PUT', corpo: { quantidade } });
  },

  estornar(id: string) {
    return api<{ recebimento: Recebimento; item: Item }>(`/recebimentos/${id}/estornar`, { metodo: 'PATCH' });
  },
};
