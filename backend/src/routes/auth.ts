import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';

/** UC02 — Fazer login. Todos os tipos. */
export const rotasAuth = Router();

rotasAuth.get('/me', autenticar, autorizar(), AuthController.me);
