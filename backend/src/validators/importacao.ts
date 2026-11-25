import { z } from 'zod';

export const esquemaConfirmarImportacao = z.object({
  linhas: z.array(z.number({ error: 'deve ser o número da linha' }).int('deve ser o número da linha').positive('deve ser o número da linha'), {
    error: 'deve ser a lista das linhas marcadas',
  }),
});
