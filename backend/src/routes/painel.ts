import { Router } from 'express';
import { PainelController } from '../controllers/PainelController';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';

/** UC09 e UC10 — painéis. Qualquer usuário logado. */
export const rotasPainel = Router();

rotasPainel.use(autenticar, autorizar());

rotasPainel.get('/', PainelController.geral);
rotasPainel.get('/projetos/:id', PainelController.porProjeto);
