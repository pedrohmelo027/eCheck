import { Request, Response } from 'express';
import { Usuario } from '../models/Usuario';
import { esquemaNovaSenha } from '../validators/usuario';

/** UC02 — o login é no Supabase Auth; a API confirma quem é o usuário, o tipo e se precisa trocar a senha. */
export const AuthController = {
  /** Usuário logado (carregado e conferido pelo middleware autenticar: ativo, tipo vindo do banco). */
  me(req: Request, res: Response) {
    res.json(req.usuario);
  },

  /**
   * POST /auth/senha — a própria pessoa define a senha (obrigatório depois de uma senha
   * provisória). Tira a marca de troca obrigatória. A troca encerra as sessões: o front entra
   * de novo com a senha nova.
   */
  async definirSenha(req: Request, res: Response) {
    const { senha } = esquemaNovaSenha.parse(req.body);
    await Usuario.definirSenha(req.usuario!.id, senha);
    res.status(204).end();
  },
};
