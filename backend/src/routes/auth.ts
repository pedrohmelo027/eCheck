import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { autenticar } from '../middlewares/autenticar';

/**
 * UC02 — Fazer login. Todos os tipos. Estas duas rotas não passam por autorizar(): elas
 * precisam responder mesmo para quem ainda está com senha provisória.
 */
export const rotasAuth = Router();

rotasAuth.get('/me', autenticar, AuthController.me);
rotasAuth.post('/senha', autenticar, AuthController.definirSenha);
