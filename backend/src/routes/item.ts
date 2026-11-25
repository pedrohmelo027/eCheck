import { Router } from 'express';
import { ItemController } from '../controllers/ItemController';
import { RecebimentoController } from '../controllers/RecebimentoController';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';
import { TipoUsuario } from '../models/enums';

/**
 * Itens: listar e buscar por desenho (todos, UC07/UC08); alterar e excluir (ENGENHEIRO, UC05);
 * dar baixa (ENCARREGADO, UC07).
 */
export const rotasItem = Router();

rotasItem.use(autenticar);

rotasItem.get('/', autorizar(), ItemController.listar);
rotasItem.get('/busca', autorizar(), RecebimentoController.buscarPorDesenho);
rotasItem.put('/:id', autorizar(TipoUsuario.ENGENHEIRO), ItemController.alterar);
rotasItem.delete('/:id', autorizar(TipoUsuario.ENGENHEIRO), ItemController.excluir);
rotasItem.post('/:id/recebimentos', autorizar(TipoUsuario.ENCARREGADO), RecebimentoController.darBaixa);
