import { z } from 'zod';
import { StatusItem } from '../models/enums';

const trecho = z
  .string()
  .trim()
  .max(200, 'máximo de 200 caracteres')
  .optional()
  .transform((t) => t || undefined);

/** UC08 passo 3 — filtros da lista de itens. Todos opcionais. */
export const esquemaFiltroItens = z
  .object({
    projeto: z.uuid({ error: 'id de projeto inválido' }).optional(),
    maquina: z.uuid({ error: 'id de máquina inválido' }).optional(),
    desenho: trecho,
    processo: trecho,
    status: z.enum(StatusItem, { error: 'use PENDENTE, PARCIAL ou COMPLETO' }).optional(),
  })
  .transform(({ projeto, maquina, ...resto }) => ({ projetoId: projeto, maquinaId: maquina, ...resto }));
