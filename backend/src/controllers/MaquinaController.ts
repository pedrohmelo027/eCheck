import { Request, Response } from 'express';
import { Engenheiro } from '../models/Engenheiro';
import { idDaRota } from '../validators/comum';
import { esquemaItem, esquemaMaquina } from '../validators/maquina';

const engenheiro = (req: Request) => Engenheiro.carregar(req.usuario!.id);

/** UC05 — máquinas de um projeto. */
export const MaquinaController = {
  /** POST /projetos/:id/maquinas */
  async cadastrar(req: Request, res: Response) {
    const projetoId = idDaRota(req.params.id);
    const { nome } = esquemaMaquina.parse(req.body);
    res.status(201).json(await (await engenheiro(req)).cadastrarMaquina(projetoId, nome));
  },

  async alterar(req: Request, res: Response) {
    const id = idDaRota(req.params.id);
    const { nome } = esquemaMaquina.parse(req.body);
    res.json(await (await engenheiro(req)).alterarMaquina(id, nome));
  },

  async excluir(req: Request, res: Response) {
    await (await engenheiro(req)).excluirMaquina(idDaRota(req.params.id));
    res.status(204).end();
  },

  /** POST /maquinas/:id/itens — cadastro manual de item */
  async cadastrarItem(req: Request, res: Response) {
    const maquinaId = idDaRota(req.params.id);
    const dados = esquemaItem.parse(req.body);
    res.status(201).json(await (await engenheiro(req)).cadastrarItem(maquinaId, dados));
  },
};
