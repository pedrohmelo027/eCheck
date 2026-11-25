import { z } from 'zod';

const textoObrigatorio = (max: number) =>
  z.string({ error: 'é obrigatório' }).trim().min(1, 'não pode ficar vazio').max(max, `máximo de ${max} caracteres`);

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `máximo de ${max} caracteres`)
    .nullish()
    .transform((t) => t || null);

export const esquemaMaquina = z.object({ nome: textoObrigatorio(200) });

/** RN08: desenho, quantidade inteira > 0 e data obrigatórios; processo e material opcionais. */
export const esquemaItem = z
  .object({
    desenho: textoObrigatorio(200),
    processo: textoOpcional(200),
    material: textoOpcional(200),
    quantidadeSolicitada: z
      .number({ error: 'deve ser um número inteiro maior que zero' })
      .int('deve ser um número inteiro maior que zero')
      .positive('deve ser um número inteiro maior que zero'),
    dataSolicitacao: z.iso.date({ error: 'data inválida (AAAA-MM-DD)' }),
  })
  .transform(({ quantidadeSolicitada, dataSolicitacao, ...resto }) => ({
    ...resto,
    quantidade_solicitada: quantidadeSolicitada,
    data_solicitacao: dataSolicitacao,
  }));

export const esquemaFiltroItens = z.object({
  maquina: z.uuid({ error: 'id de máquina inválido' }).optional(),
});
