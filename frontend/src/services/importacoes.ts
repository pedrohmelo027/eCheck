import type { PreviaImportacao, ResumoImportacao } from '@/types';
import { api } from './api';

/** UC03 — chamadas à API de importação (só Engenheiro). */
export const importacoesService = {
  /** Envia o .xlsx e recebe a pré-visualização. Nada é gravado ainda. */
  enviar(arquivo: File) {
    const formulario = new FormData();
    formulario.append('arquivo', arquivo);
    return api<PreviaImportacao>('/importacoes', { metodo: 'POST', formulario });
  },

  /** Grava as linhas marcadas (tudo ou nada). */
  confirmar(id: string, linhas: number[]) {
    return api<ResumoImportacao>(`/importacoes/${id}/confirmar`, { metodo: 'POST', corpo: { linhas } });
  },
};
