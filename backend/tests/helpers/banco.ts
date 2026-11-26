import { supabase } from '../../src/config/supabase';
import { exigirDesenvolvimento } from '../../scripts/ambiente';
import { USUARIOS_FICTICIOS } from '../../scripts/usuariosFicticios';

const UUID_NULO = '00000000-0000-0000-0000-000000000000';
const EMAILS_FICTICIOS = new Set<string>(USUARIOS_FICTICIOS.map((u) => u.email));

async function apagarTudo(tabela: string) {
  const { error } = await supabase().from(tabela).delete().neq('id', UUID_NULO);
  if (error) throw new Error(`Limpar ${tabela}: ${error.message}`);
}

/**
 * Deixa o banco de desenvolvimento só com os usuários fictícios.
 * Ordem: filhos antes dos pais (recebimentos bloqueiam a exclusão de itens, RN23).
 * Contas criadas pelos testes (e-mail @echeck.test fora da lista) também são removidas.
 */
export async function limparBanco() {
  exigirDesenvolvimento('Limpar o banco (testes)');
  await apagarTudo('recebimentos');
  await apagarTudo('itens_solicitados');
  await apagarTudo('maquinas');
  await apagarTudo('projetos');
  await apagarTudo('importacoes');

  const { data, error } = await supabase().auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  for (const conta of data.users) {
    if (conta.email?.endsWith('@echeck.test') && !EMAILS_FICTICIOS.has(conta.email)) {
      await supabase().from('usuarios').delete().eq('id', conta.id);
      await supabase().auth.admin.deleteUser(conta.id);
    }
  }
}
