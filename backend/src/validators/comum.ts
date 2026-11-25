import { z } from 'zod';
import { AppError } from '../errors/AppError';

const uuid = z.uuid();

/** Id de rota (:id). Um id que nem é UUID não existe no banco → EX09. */
export function idDaRota(valor: unknown): string {
  const resultado = uuid.safeParse(valor);
  if (!resultado.success) throw new AppError('EX09');
  return resultado.data;
}
