import { Request, Response } from 'express';
import { Painel } from '../models/Painel';
import { idDaRota } from '../validators/comum';

/** UC09 e UC10 — painéis (todos os tipos). */
export const PainelController = {
  /** GET /painel */
  async geral(_req: Request, res: Response) {
    res.json(await Painel.gerarGeral());
  },

  /** GET /painel/projetos/:id */
  async porProjeto(req: Request, res: Response) {
    res.json(await Painel.gerarPorProjeto(idDaRota(req.params.id)));
  },
};
