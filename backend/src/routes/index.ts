import { Router } from 'express';
import { rotasUsuario } from './usuario';

export const rotas = Router();

// Rota pública de verificação. As rotas dos UCs ficam abaixo, sempre com autenticar + autorizar.
rotas.get('/saude', (_req, res) => {
  res.json({ ok: true });
});

rotas.use('/usuarios', rotasUsuario);
