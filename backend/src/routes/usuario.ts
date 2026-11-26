import { Router } from 'express';
import { UsuarioController } from '../controllers/UsuarioController';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';
import { TipoUsuario } from '../models/enums';

/** UC01 — Manter usuários. Só ADMINISTRADOR (RN24). */
export const rotasUsuario = Router();

rotasUsuario.use(autenticar, autorizar(TipoUsuario.ADMINISTRADOR));

rotasUsuario.get('/', UsuarioController.listar);
rotasUsuario.post('/', UsuarioController.cadastrar);
rotasUsuario.put('/:id', UsuarioController.alterar);
rotasUsuario.patch('/:id/tipo', UsuarioController.alterarTipo);
rotasUsuario.patch('/:id/desativar', UsuarioController.desativar);
rotasUsuario.patch('/:id/reativar', UsuarioController.reativar);
rotasUsuario.patch('/:id/senha-provisoria', UsuarioController.gerarSenhaProvisoria);
