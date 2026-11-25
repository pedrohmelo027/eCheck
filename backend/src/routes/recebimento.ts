import { Router } from 'express';
import { RecebimentoController } from '../controllers/RecebimentoController';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';
import { TipoUsuario } from '../models/enums';

/** UC07 — atualizar e estornar remessas. Só ENCARREGADO (RN24). */
export const rotasRecebimento = Router();

rotasRecebimento.use(autenticar, autorizar(TipoUsuario.ENCARREGADO));

rotasRecebimento.put('/:id', RecebimentoController.atualizar);
rotasRecebimento.patch('/:id/estornar', RecebimentoController.estornar);
