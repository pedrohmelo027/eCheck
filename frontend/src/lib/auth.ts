import { TipoUsuario } from '@/types';
import { supabaseAuth } from './supabaseClient';

/** JWT da sessão atual, ou null se ninguém estiver logado. O supabase-js renova o token sozinho. */
export async function obterToken(): Promise<string | null> {
  const { data } = await supabaseAuth.getSession();
  return data.session?.access_token ?? null;
}

export async function sair() {
  await supabaseAuth.signOut();
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
