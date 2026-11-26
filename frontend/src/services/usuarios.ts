import type { TipoUsuario, Usuario, UsuarioComSenha } from '@/types';
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

  /** forma "senha": devolve a senha provisória (uma única vez); "convite": envia o link por e-mail. */
  cadastrar(dados: { nome: string; email: string; tipo: TipoUsuario; forma: 'senha' | 'convite' }) {
    return api<UsuarioComSenha>('/usuarios', { metodo: 'POST', corpo: dados });
  },

  gerarSenhaProvisoria(id: string) {
    return api<UsuarioComSenha>(`/usuarios/${id}/senha-provisoria`, { metodo: 'PATCH' });
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
