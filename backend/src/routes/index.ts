import { Router } from 'express';

export const rotas = Router();

// Rota pública de verificação. As rotas dos UCs entram aqui, sempre com autenticar + autorizar.
rotas.get('/saude', (_req, res) => {
  res.json({ ok: true });
});
