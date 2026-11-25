import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { FiltroUsuarios, UsuarioRepository } from '../repositories/UsuarioRepository';
import { TipoUsuario } from './enums';
import { Usuario } from './Usuario';

/** Administrador: mantém os usuários (UC01). Herda do Usuário login, consultas e painéis. */
export class Administrador extends Usuario {
  /** Carrega o administrador logado (a rota já passou por autorizar(ADMINISTRADOR)). */
  static async carregar(id: string): Promise<Administrador> {
    const linha = await UsuarioRepository.buscarPorId(id);
    if (!linha || linha.tipo !== TipoUsuario.ADMINISTRADOR) throw new AppError('EX04');
    return new Administrador(linha);
  }

  async listarUsuarios(filtro: FiltroUsuarios = {}): Promise<Usuario[]> {
    const linhas = await UsuarioRepository.listar(filtro);
    return linhas.map((linha) => new Usuario(linha));
  }

  /** RN01: cria a conta pelo convite por e-mail. RN02: e-mail único. Novo usuário entra ativo. */
  async cadastrarUsuario(nome: string, email: string, tipo: TipoUsuario): Promise<Usuario> {
    const emailNormalizado = email.toLowerCase();
    if (await UsuarioRepository.buscarPorEmail(emailNormalizado)) throw new AppError('EX05');

    const id = await UsuarioRepository.convidar(emailNormalizado, `${env().FRONTEND_URL}/login`);
    try {
      const linha = await UsuarioRepository.inserir({ id, nome, email: emailNormalizado, tipo, ativo: true });
      return new Usuario(linha);
    } catch (erro) {
      // Não deixa conta do Auth sem cadastro em usuarios
      await UsuarioRepository.removerConta(id);
      throw erro;
    }
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
