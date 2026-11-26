/**
 * Cria o PRIMEIRO Administrador de um ambiente (não há autocadastro). Os demais usuários são
 * cadastrados por ele pela tela Usuários (UC01).
 *
 * Uso (na pasta backend/, com o .env do ambiente desejado):
 *   DOTENV_CONFIG_PATH=.env.producao npx tsx scripts/criarAdministrador.ts <email> "<nome>" --senha <arquivo>
 *       → senha provisória gravada no <arquivo>; troca obrigatória no primeiro login (sem e-mail)
 *   DOTENV_CONFIG_PATH=.env.producao npx tsx scripts/criarAdministrador.ts <email> "<nome>"
 *       → convite por e-mail (exige SMTP configurado no Supabase)
 */
import { writeFileSync } from 'node:fs';
import { env } from '../src/config/env';
import { TipoUsuario } from '../src/models/enums';
import { gerarSenhaProvisoria } from '../src/models/senha';
import { UsuarioRepository } from '../src/repositories/UsuarioRepository';

async function main() {
  const [email, nome, opcao, arquivo] = process.argv.slice(2);
  if (!email || !nome || (opcao && (opcao !== '--senha' || !arquivo))) {
    throw new Error('Uso: criarAdministrador.ts <email> "<nome>" [--senha <arquivo>]');
  }
  const emailNormalizado = email.trim().toLowerCase();
  console.log(`Supabase: ${env().SUPABASE_URL}\nFront: ${env().FRONTEND_URL}`);

  if (await UsuarioRepository.buscarPorEmail(emailNormalizado)) {
    throw new Error(`${emailNormalizado} já está cadastrado.`);
  }

  let id: string;
  if (opcao === '--senha') {
    const senha = gerarSenhaProvisoria();
    id = await UsuarioRepository.criarContaComSenha(emailNormalizado, senha);
    // Só o dono do arquivo lê (0600). A senha não aparece na tela nem no log.
    writeFileSync(
      arquivo,
      `Sistema: ${env().FRONTEND_URL}\nE-mail: ${emailNormalizado}\nSenha provisória: ${senha}\n(troca obrigatória no primeiro login)\n`,
      { mode: 0o600 },
    );
    console.log(`Senha provisória gravada em ${arquivo}.`);
  } else {
    id = await UsuarioRepository.convidar(emailNormalizado, `${env().FRONTEND_URL}/login`);
    console.log(`Convite enviado por e-mail para ${emailNormalizado}.`);
  }

  await UsuarioRepository.inserir({ id, nome: nome.trim(), email: emailNormalizado, tipo: TipoUsuario.ADMINISTRADOR, ativo: true });
  console.log(`Administrador criado: ${nome.trim()} <${emailNormalizado}>.`);
}

main().catch((erro) => {
  console.error('Falha:', erro.message ?? erro);
  process.exit(1);
});
