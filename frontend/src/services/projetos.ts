import type { Projeto, ProjetoDetalhe } from '@/types';
import { api } from './api';

export interface DadosProjeto {
  codigo: string;
  nome: string;
  descricao: string | null;
}

/** UC04 — chamadas à API de projetos. Listar e ver: todos; o resto, só Engenheiro. */
export const projetosService = {
  listar() {
    return api<Projeto[]>('/projetos');
  },

  detalhar(id: string) {
    return api<ProjetoDetalhe>(`/projetos/${id}`);
  },

  cadastrar(dados: DadosProjeto) {
    return api<Projeto>('/projetos', { metodo: 'POST', corpo: dados });
  },

  alterar(id: string, dados: DadosProjeto) {
    return api<Projeto>(`/projetos/${id}`, { metodo: 'PUT', corpo: dados });
  },

  /** UC06 — libera o projeto inteiro para receber material. Não pode ser desfeito. */
  liberar(id: string) {
    return api<Projeto>(`/projetos/${id}/liberar`, { metodo: 'PATCH' });
  },

  excluir(id: string) {
    return api<void>(`/projetos/${id}`, { metodo: 'DELETE' });
  },
};
