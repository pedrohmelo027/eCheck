import { Router } from 'express';
import { rotasAuth } from './auth';
import { rotasUsuario } from './usuario';

export const rotas = Router();

// Rota pública de verificação. As rotas dos UCs ficam abaixo, sempre com autenticar + autorizar.
rotas.get('/saude', (_req, res) => {
  res.json({ ok: true });
});

rotas.use('/auth', rotasAuth);
rotas.use('/usuarios', rotasUsuario);
