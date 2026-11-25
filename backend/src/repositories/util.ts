import { AppError } from '../errors/AppError';

/** O Supabase devolve no máximo 1000 linhas por consulta. */
const TAMANHO_PAGINA = 1000;

/** Erro de banco inesperado → EX22 (detalhe técnico só no log). */
export function falhaBanco(error: { message: string }): never {
  throw new AppError('EX22', {}, [error.message]);
}

/** Escapa os curingas do LIKE para buscar o texto literal. */
export function escaparLike(texto: string) {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Lê todas as páginas de uma consulta. `consulta(de, ate)` deve aplicar `.range(de, ate)`. */
export async function buscarTodas<T>(
  consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const todas: T[] = [];
  for (let de = 0; ; de += TAMANHO_PAGINA) {
    const { data, error } = await consulta(de, de + TAMANHO_PAGINA - 1);
    if (error) falhaBanco(error);
    todas.push(...(data ?? []));
    if (!data || data.length < TAMANHO_PAGINA) return todas;
  }
}

/** Divide uma lista em blocos (para filtros `in` sem URL gigante). */
export function emBlocos<T>(lista: T[], tamanho = 200): T[][] {
  const blocos: T[][] = [];
  for (let i = 0; i < lista.length; i += tamanho) blocos.push(lista.slice(i, i + tamanho));
  return blocos;
}
