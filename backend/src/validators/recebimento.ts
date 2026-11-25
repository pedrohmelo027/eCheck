import { z } from 'zod';

/** RN13 / RN16: quantidade inteira > 0. Para zerar, usa-se o estorno. */
const quantidade = z
  .number({ error: 'deve ser um número inteiro maior que zero' })
  .int('deve ser um número inteiro maior que zero')
  .positive('deve ser um número inteiro maior que zero');

const observacao = z
  .string()
  .trim()
  .max(500, 'máximo de 500 caracteres')
  .nullish()
  .transform((o) => o || null);

const desenho = z.string({ error: 'é obrigatório' }).trim().min(1, 'não pode ficar vazio').max(200, 'máximo de 200 caracteres');

export const esquemaBaixa = z.object({ quantidade, observacao });
export const esquemaBaixaProjeto = z.object({ desenho, quantidade, observacao });
export const esquemaAtualizarRecebimento = z.object({ quantidade });
export const esquemaBuscaDesenho = z.object({ desenho });
