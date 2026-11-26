import { TipoUsuario } from '@/types';
import { supabaseAuth } from './supabaseClient';

/** JWT da sessão atual, ou null se ninguém estiver logado. O supabase-js renova o token sozinho. */
export async function obterToken(): Promise<string | null> {
  const { data } = await supabaseAuth.getSession();
  return data.session?.access_token ?? null;
}

/** Encerra só a sessão deste navegador (o padrão do Supabase encerraria as de todos os dispositivos). */
export async function sair() {
  marcarSenhaPendente(false);
  await supabaseAuth.signOut({ scope: 'local' });
}

/**
 * Link de convite ou de redefinição abre uma sessão antes de a senha existir.
 * Enquanto a senha não for salva, a aba fica presa na tela "defina sua senha".
 */
const CHAVE_SENHA_PENDENTE = 'echeck:senha-pendente';

export function marcarSenhaPendente(pendente: boolean) {
  if (typeof window === 'undefined') return;
  if (pendente) sessionStorage.setItem(CHAVE_SENHA_PENDENTE, '1');
  else sessionStorage.removeItem(CHAVE_SENHA_PENDENTE);
}

export function senhaPendente(): boolean {
  return typeof window !== 'undefined' && sessionStorage.getItem(CHAVE_SENHA_PENDENTE) === '1';
}

/**
 * Mensagens de login (CONTEXT.md seção 8.2). EX01 vem do Supabase Auth, não da API;
 * EX02 e EX03 também são mostradas na tela de login depois de um redirecionamento.
 */
export const MENSAGENS_LOGIN = {
  EX01: 'E-mail ou senha incorretos.',
  EX02: 'Seu acesso está desativado. Procure o administrador.',
  EX03: 'Sua sessão expirou. Entre novamente.',
  EX22: 'Algo deu errado. Tente novamente.',
} as const;

export type MotivoLogin = keyof typeof MENSAGENS_LOGIN;

/** Só aceita caminhos internos (evita redirecionar para outro site). */
export function destinoSeguro(caminho: string | null | undefined): string {
  return caminho && caminho.startsWith('/') && !caminho.startsWith('//') && caminho !== '/login' ? caminho : '/painel';
}

const TODOS = Object.values(TipoUsuario);

/**
 * Telas do sistema e quem vê cada uma (CONTEXT.md, seção 6.2).
 * Serve só para montar o menu e redirecionar: quem decide a permissão é sempre a API (RN24).
 */
export const TELAS = [
  { rota: '/painel', rotulo: 'Painel', tipos: TODOS },
  { rota: '/itens', rotulo: 'Itens', tipos: TODOS },
  { rota: '/recebimentos', rotulo: 'Recebimentos', tipos: [TipoUsuario.ENCARREGADO] },
  { rota: '/projetos', rotulo: 'Projetos', tipos: [TipoUsuario.ENGENHEIRO] },
  { rota: '/importar', rotulo: 'Importar planilha', tipos: [TipoUsuario.ENGENHEIRO] },
  { rota: '/usuarios', rotulo: 'Usuários', tipos: [TipoUsuario.ADMINISTRADOR] },
] as const satisfies readonly { rota: string; rotulo: string; tipos: readonly TipoUsuario[] }[];

export function telasDoTipo(tipo: TipoUsuario) {
  return TELAS.filter((tela) => (tela.tipos as readonly TipoUsuario[]).includes(tipo));
}

export function podeVer(rota: string, tipo: TipoUsuario): boolean {
  const tela = TELAS.find((t) => rota === t.rota || rota.startsWith(`${t.rota}/`));
  return !tela || (tela.tipos as readonly TipoUsuario[]).includes(tipo);
}
