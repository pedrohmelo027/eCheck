import { Router } from 'express';
import { ItemController } from '../controllers/ItemController';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';
import { TipoUsuario } from '../models/enums';

/** Itens: listar (todos, UC08); alterar e excluir (só ENGENHEIRO, UC05). */
export const rotasItem = Router();

rotasItem.use(autenticar);

rotasItem.get('/', autorizar(), ItemController.listar);
rotasItem.put('/:id', autorizar(TipoUsuario.ENGENHEIRO), ItemController.alterar);
rotasItem.delete('/:id', autorizar(TipoUsuario.ENGENHEIRO), ItemController.excluir);
