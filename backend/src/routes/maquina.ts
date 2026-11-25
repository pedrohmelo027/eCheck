import { Router } from 'express';
import { MaquinaController } from '../controllers/MaquinaController';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';
import { TipoUsuario } from '../models/enums';

/** UC05 — Manter máquinas. Só ENGENHEIRO (RN24). O cadastro fica em POST /projetos/:id/maquinas. */
export const rotasMaquina = Router();

rotasMaquina.use(autenticar, autorizar(TipoUsuario.ENGENHEIRO));

rotasMaquina.put('/:id', MaquinaController.alterar);
rotasMaquina.delete('/:id', MaquinaController.excluir);
rotasMaquina.post('/:id/itens', MaquinaController.cadastrarItem);
