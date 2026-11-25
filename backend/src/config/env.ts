import 'dotenv/config';
import { z } from 'zod';

const esquema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Só testes e seed usam a anon key (login dos usuários fictícios).
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  PORT: z.coerce.number().int().positive().default(3333),
  FRONTEND_URL: z.url(),
});

export type Env = z.infer<typeof esquema>;

let cache: Env | undefined;

/** Lê e valida as variáveis de ambiente na primeira chamada. */
export function env(): Env {
  if (!cache) {
    const resultado = esquema.safeParse(process.env);
    if (!resultado.success) {
      const campos = resultado.error.issues.map((i) => i.path.join('.')).join(', ');
      throw new Error(`Variáveis de ambiente inválidas ou ausentes: ${campos}. Confira o .env (modelo em .env.example).`);
    }
    cache = resultado.data;
  }
  return cache;
}
