import { z } from 'zod';
import { TipoUsuario } from '../models/enums';

const nome = z.string({ error: 'é obrigatório' }).trim().min(1, 'não pode ficar vazio').max(120, 'máximo de 120 caracteres');
const email = z
  .string({ error: 'é obrigatório' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'e-mail inválido' }));
const tipo = z.enum(TipoUsuario, { error: 'tipo inexistente' });

/** forma: "convite" (link por e-mail, exige SMTP) ou "senha" (senha provisória, troca no 1º login). */
export const esquemaCadastrarUsuario = z.object({
  nome,
  email,
  tipo,
  forma: z.enum(['convite', 'senha'], { error: 'use convite ou senha' }).default('convite'),
});

/** Senha escolhida pela pessoa: 8 a 72 caracteres, com letra e número. */
export const esquemaNovaSenha = z.object({
  senha: z
    .string({ error: 'é obrigatória' })
    .min(8, 'precisa ter pelo menos 8 caracteres')
    .max(72, 'máximo de 72 caracteres')
    .regex(/[A-Za-z]/, 'precisa ter pelo menos uma letra')
    .regex(/[0-9]/, 'precisa ter pelo menos um número'),
});
export const esquemaAlterarUsuario = z.object({ nome, email });
export const esquemaAlterarTipo = z.object({ tipo });

export const esquemaFiltroUsuarios = z.object({
  nome: z.string().trim().optional(),
  tipo: tipo.optional(),
});
