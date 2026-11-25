import { Router } from 'express';
import { MaquinaController } from '../controllers/MaquinaController';
import { ProjetoController } from '../controllers/ProjetoController';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';
import { TipoUsuario } from '../models/enums';

/** UC04 — Manter projetos. Listar e ver: todos. Cadastrar, alterar e excluir: só ENGENHEIRO (RN24). */
export const rotasProjeto = Router();

const engenheiro = autorizar(TipoUsuario.ENGENHEIRO);

rotasProjeto.use(autenticar);

rotasProjeto.get('/', autorizar(), ProjetoController.listar);
rotasProjeto.get('/:id', autorizar(), ProjetoController.detalhar);
rotasProjeto.post('/', engenheiro, ProjetoController.cadastrar);
rotasProjeto.put('/:id', engenheiro, ProjetoController.alterar);
rotasProjeto.delete('/:id', engenheiro, ProjetoController.excluir);

// UC05 — cadastro de máquina no projeto
rotasProjeto.post('/:id/maquinas', engenheiro, MaquinaController.cadastrar);
