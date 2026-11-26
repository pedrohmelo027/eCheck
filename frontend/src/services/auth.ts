import type { UsuarioLogado } from '@/types';
import { api } from './api';

/** UC02 — o login é no Supabase Auth; a API confirma o usuário, o tipo e se está ativo. */
export const authService = {
  me() {
    return api<UsuarioLogado>('/auth/me', { tratarSessao: false });
  },

  /** Define a própria senha (obrigatório depois de uma senha provisória). Encerra as sessões. */
  definirSenha(senha: string) {
    return api<void>('/auth/senha', { metodo: 'POST', corpo: { senha }, tratarSessao: false });
  },
};
