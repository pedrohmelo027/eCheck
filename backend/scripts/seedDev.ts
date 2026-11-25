import { env } from '../src/config/env';
import { garantirUsuariosFicticios, SENHA_FICTICIA, USUARIOS_FICTICIOS } from './usuariosFicticios';

/** Cria só os usuários fictícios no Supabase de desenvolvimento, para testar pelo front. */
async function main() {
  console.log(`Supabase: ${env().SUPABASE_URL}`);
  await garantirUsuariosFicticios();
  console.log('Usuários fictícios prontos (senha de todos:', SENHA_FICTICIA + '):');
  for (const u of USUARIOS_FICTICIOS) {
    console.log(`  ${u.email.padEnd(26)} ${u.tipo.padEnd(14)} ${u.ativo ? 'ativo' : 'desativado'}`);
  }
}

main().catch((erro) => {
  console.error('Falha no seed:', erro.message ?? erro);
  process.exit(1);
});
