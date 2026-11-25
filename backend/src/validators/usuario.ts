import { z } from 'zod';
import { TipoUsuario } from '../models/enums';

const nome = z.string({ error: 'é obrigatório' }).trim().min(1, 'não pode ficar vazio').max(120, 'máximo de 120 caracteres');
const email = z
  .string({ error: 'é obrigatório' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'e-mail inválido' }));
const tipo = z.enum(TipoUsuario, { error: 'tipo inexistente' });

export const esquemaCadastrarUsuario = z.object({ nome, email, tipo });
export const esquemaAlterarUsuario = z.object({ nome, email });
export const esquemaAlterarTipo = z.object({ tipo });

export const esquemaFiltroUsuarios = z.object({
  nome: z.string().trim().optional(),
  tipo: tipo.optional(),
});
