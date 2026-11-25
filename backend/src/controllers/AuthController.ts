import { Request, Response } from 'express';

/** UC02 — o login é no Supabase Auth; a API só confirma quem é o usuário e o tipo dele. */
export const AuthController = {
  /** Usuário logado (carregado e conferido pelo middleware autenticar: ativo, tipo vindo do banco). */
  me(req: Request, res: Response) {
    res.json(req.usuario);
  },
};
