import type { PainelGeral, PainelProjeto } from '@/types';
import { api } from './api';

/** UC09 e UC10 — painéis (todos os tipos). */
export const painelService = {
  geral() {
    return api<PainelGeral>('/painel');
  },

  porProjeto(projetoId: string) {
    return api<PainelProjeto>(`/painel/projetos/${projetoId}`);
  },
};
