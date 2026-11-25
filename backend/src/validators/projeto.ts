import { z } from 'zod';

const texto = (max: number) =>
  z.string({ error: 'é obrigatório' }).trim().min(1, 'não pode ficar vazio').max(max, `máximo de ${max} caracteres`);

/** UC04 — código e nome obrigatórios; descrição opcional (vazia vira null). */
export const esquemaProjeto = z.object({
  codigo: texto(50),
  nome: texto(200),
  descricao: z
    .string()
    .trim()
    .max(2000, 'máximo de 2000 caracteres')
    .nullish()
    .transform((d) => d || null),
});
