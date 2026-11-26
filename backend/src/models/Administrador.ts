import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { FiltroUsuarios, UsuarioRepository } from '../repositories/UsuarioRepository';
import { TipoUsuario } from './enums';
import { gerarSenhaProvisoria } from './senha';
import { Usuario, type UsuarioDTO } from './Usuario';

export type FormaPrimeiroAcesso = 'convite' | 'senha';

/** Administrador: mantém os usuários (UC01). Herda do Usuário login, consultas e painéis. */
export class Administrador extends Usuario {
  /** Carrega o administrador logado (a rota já passou por autorizar(ADMINISTRADOR)). */
  static async carregar(id: string): Promise<Administrador> {
    const linha = await UsuarioRepository.buscarPorId(id);
    if (!linha || linha.tipo !== TipoUsuario.ADMINISTRADOR) throw new AppError('EX04');
    return new Administrador(linha);
  }

  /** Lista com a indicação de quem ainda está com senha provisória. */
  async listarUsuarios(filtro: FiltroUsuarios = {}): Promise<(UsuarioDTO & { trocaPendente: boolean })[]> {
    const [linhas, provisorias] = await Promise.all([UsuarioRepository.listar(filtro), UsuarioRepository.idsComSenhaProvisoria()]);
    return linhas.map((linha) => ({ ...new Usuario(linha).toJSON(), trocaPendente: provisorias.has(linha.id) }));
  }

  /**
   * RN02: e-mail único. Novo usuário entra ativo. Duas formas de primeiro acesso:
   * - "convite" (RN01): link por e-mail para a pessoa definir a senha (exige SMTP);
   * - "senha": senha provisória gerada aqui, devolvida uma única vez para o Administrador
   *   repassar; a pessoa é obrigada a trocá-la no primeiro login (EX23 até trocar).
   */
  async cadastrarUsuario(
    nome: string,
    email: string,
    tipo: TipoUsuario,
    forma: FormaPrimeiroAcesso = 'convite',
  ): Promise<{ usuario: Usuario; senhaProvisoria: string | null }> {
    const emailNormalizado = email.toLowerCase();
    if (await UsuarioRepository.buscarPorEmail(emailNormalizado)) throw new AppError('EX05');

    const senhaProvisoria = forma === 'senha' ? gerarSenhaProvisoria() : null;
    const id = senhaProvisoria
      ? await UsuarioRepository.criarContaComSenha(emailNormalizado, senhaProvisoria)
      : await UsuarioRepository.convidar(emailNormalizado, `${env().FRONTEND_URL}/login`);
    try {
      const linha = await UsuarioRepository.inserir({ id, nome, email: emailNormalizado, tipo, ativo: true });
      return { usuario: new Usuario(linha), senhaProvisoria };
    } catch (erro) {
      // Não deixa conta do Auth sem cadastro em usuarios
      await UsuarioRepository.removerConta(id);
      throw erro;
    }
  }

  /** Gera outra senha provisória (a pessoa esqueceu a senha ou não recebeu o convite). */
  async gerarNovaSenhaProvisoria(id: string): Promise<{ usuario: Usuario; senhaProvisoria: string }> {
    const linha = await this.#buscar(id);
    const senhaProvisoria = gerarSenhaProvisoria();
    await UsuarioRepository.definirSenhaProvisoria(id, senhaProvisoria);
    return { usuario: new Usuario(linha), senhaProvisoria };
  }

  /** Altera nome e e-mail. O e-mail muda também na conta do Auth, para o login continuar valendo. */
  async alterarUsuario(id: string, nome: string, email: string): Promise<Usuario> {
    const atual = await this.#buscar(id);
    const emailNormalizado = email.toLowerCase();

    if (emailNormalizado !== atual.email) {
      const dono = await UsuarioRepository.buscarPorEmail(emailNormalizado);
      if (dono && dono.id !== id) throw new AppError('EX05');
      await UsuarioRepository.alterarEmailDaConta(id, emailNormalizado);
    }
    return new Usuario(await UsuarioRepository.atualizar(id, { nome, email: emailNormalizado }));
  }

  /** RN03: exatamente um tipo. RN05: pode promover outro a administrador, mas não muda o próprio tipo. */
  async alterarTipo(id: string, tipo: TipoUsuario): Promise<Usuario> {
    this.#impedirAlterarASiMesmo(id);
    await this.#buscar(id);
    return new Usuario(await UsuarioRepository.atualizar(id, { tipo }));
  }

  /** RN04: não exclui, só desativa; o histórico fica. RN05: não desativa a si mesmo. */
  async desativarUsuario(id: string): Promise<Usuario> {
    this.#impedirAlterarASiMesmo(id);
    await this.#buscar(id);
    return new Usuario(await UsuarioRepository.atualizar(id, { ativo: false }));
  }

  async reativarUsuario(id: string): Promise<Usuario> {
    await this.#buscar(id);
    return new Usuario(await UsuarioRepository.atualizar(id, { ativo: true }));
  }

  #impedirAlterarASiMesmo(id: string) {
    if (id === this.id) throw new AppError('EX20');
  }

  async #buscar(id: string) {
    const linha = await UsuarioRepository.buscarPorId(id);
    if (!linha) throw new AppError('EX09');
    return linha;
  }
}
