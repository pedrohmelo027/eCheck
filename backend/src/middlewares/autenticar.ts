import { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { AppError } from '../errors/AppError';
import { TipoUsuario } from '../models/enums';
import { MARCA_TROCAR_SENHA, UsuarioRepository } from '../repositories/UsuarioRepository';

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  /** Entrou com senha provisória e ainda não trocou: só /auth/me e /auth/senha respondem (EX23). */
  trocarSenha: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}

/**
 * Valida o JWT no Supabase Auth e carrega o usuário da tabela `usuarios`.
 * Sem token, token inválido ou conta sem cadastro → EX03. Usuário desativado → EX02 (RN04).
 * O tipo vem sempre do banco, nunca do front (RN24).
 */
export async function autenticar(req: Request, _res: Response, next: NextFunction) {
  const [esquema, token] = (req.headers.authorization ?? '').split(' ');
  if (esquema !== 'Bearer' || !token) throw new AppError('EX03');

  const { data, error } = await supabase().auth.getUser(token);
  if (error || !data.user) throw new AppError('EX03');

  const usuario = await UsuarioRepository.buscarPorId(data.user.id);
  if (!usuario) throw new AppError('EX03');
  if (!usuario.ativo) throw new AppError('EX02');

  req.usuario = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    tipo: usuario.tipo,
    // A marca fica em app_metadata, que só a service role altera: a pessoa não consegue apagá-la
    trocarSenha: data.user.app_metadata?.[MARCA_TROCAR_SENHA] === true,
  };
  next();
}
