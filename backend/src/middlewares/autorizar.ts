import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { TipoUsuario } from '../models/enums';

/**
 * Libera a rota só para os tipos informados (RN24). Sem tipos = qualquer usuário autenticado.
 * Quem está com senha provisória não passa (EX23) até definir a própria senha em /auth/senha.
 * Usar sempre depois de `autenticar`.
 */
export function autorizar(...tipos: TipoUsuario[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) throw new AppError('EX03');
    if (req.usuario.trocarSenha) throw new AppError('EX23');
    if (tipos.length > 0 && !tipos.includes(req.usuario.tipo)) throw new AppError('EX04');
    next();
  };
}
