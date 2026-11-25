import cors from 'cors';
import express from 'express';
import { AppError } from './errors/AppError';
import { tratarErros } from './middlewares/tratarErros';
import { rotas } from './routes';

export function criarApp(frontendUrl: string) {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: frontendUrl }));
  app.use(express.json());
  app.use(rotas);

  app.use((_req, _res, next) => next(new AppError('EX09')));
  app.use(tratarErros);

  return app;
}
