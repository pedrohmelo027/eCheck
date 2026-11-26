import { env } from '../src/config/env';

/** Projeto Supabase de PRODUÇÃO (Rotex Máquinas). Testes e seed de usuários fictícios nunca rodam nele. */
export const REF_PRODUCAO = 'kwxaodwxoopuyywvjcwu';

export function ehProducao(): boolean {
  return env().SUPABASE_URL.includes(REF_PRODUCAO);
}

/** Para o processo se estiver apontando para a produção (testes limpam o banco; o seed cria usuários fictícios). */
export function exigirDesenvolvimento(oQue: string) {
  if (ehProducao()) {
    throw new Error(`${oQue} não pode rodar no Supabase de PRODUÇÃO (${REF_PRODUCAO}). Use o .env de desenvolvimento.`);
  }
}
