import type { TipoUsuario, Usuario } from '@/types';
import { api } from './api';

export interface FiltroUsuarios {
  nome?: string;
  tipo?: TipoUsuario | '';
}

/** UC01 — chamadas à API de usuários (só Administrador). */
export const usuariosService = {
  listar(filtro: FiltroUsuarios = {}) {
    const params = new URLSearchParams();
    if (filtro.nome?.trim()) params.set('nome', filtro.nome.trim());
    if (filtro.tipo) params.set('tipo', filtro.tipo);
    const query = params.toString();
    return api<Usuario[]>(`/usuarios${query ? `?${query}` : ''}`);
  },

  cadastrar(dados: { nome: string; email: string; tipo: TipoUsuario }) {
    return api<Usuario>('/usuarios', { metodo: 'POST', corpo: dados });
  },

  alterar(id: string, dados: { nome: string; email: string }) {
    return api<Usuario>(`/usuarios/${id}`, { metodo: 'PUT', corpo: dados });
  },

  alterarTipo(id: string, tipo: TipoUsuario) {
    return api<Usuario>(`/usuarios/${id}/tipo`, { metodo: 'PATCH', corpo: { tipo } });
  },

  desativar(id: string) {
    return api<Usuario>(`/usuarios/${id}/desativar`, { metodo: 'PATCH' });
  },

  reativar(id: string) {
    return api<Usuario>(`/usuarios/${id}/reativar`, { metodo: 'PATCH' });
  },
};
