import { Request, Response } from 'express';
import { Painel } from '../models/Painel';

/** UC09 e UC10 — painéis (todos os tipos). */
export const PainelController = {
  /** GET /painel */
  async geral(_req: Request, res: Response) {
    res.json(await Painel.gerarGeral());
  },
};
