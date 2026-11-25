import { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';

/** Converte qualquer erro no JSON padrão { codigo, mensagem, detalhes }. */
export function tratarErros(erro: unknown, _req: Request, res: Response, _next: NextFunction) {
  let appError: AppError;

  if (erro instanceof AppError) {
    appError = erro;
  } else if (erro instanceof ZodError) {
    const [primeiro] = erro.issues;
    const campo = primeiro?.path.join('.') || 'entrada';
    const detalhes = erro.issues.map((i) => ({ campo: i.path.join('.'), motivo: i.message }));
    appError = new AppError('EX06', { campo, motivo: primeiro?.message ?? 'inválido' }, detalhes);
  } else if (erro instanceof MulterError) {
    appError = new AppError('EX10');
  } else if (erro instanceof SyntaxError && 'body' in erro) {
    // JSON malformado no corpo da requisição
    appError = new AppError('EX06', { campo: 'corpo', motivo: 'JSON inválido' });
  } else {
    if (process.env.NODE_ENV !== 'test') console.error(erro);
    appError = new AppError('EX22');
  }

  res.status(appError.http).json(appError.toJSON());
}
