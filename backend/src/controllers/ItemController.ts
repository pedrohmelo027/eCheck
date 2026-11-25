import { Request, Response } from 'express';
import { Engenheiro } from '../models/Engenheiro';
import { ItemSolicitado } from '../models/ItemSolicitado';
import { idDaRota } from '../validators/comum';
import { esquemaFiltroItens, esquemaItem } from '../validators/maquina';

const engenheiro = (req: Request) => Engenheiro.carregar(req.usuario!.id);

export const ItemController = {
  /** GET /itens?maquina= (todos). Os demais filtros do UC08 entram depois. */
  async listar(req: Request, res: Response) {
    const { maquina } = esquemaFiltroItens.parse(req.query);
    res.json(await ItemSolicitado.listar({ maquinaId: maquina }));
  },

  async alterar(req: Request, res: Response) {
    const id = idDaRota(req.params.id);
    const dados = esquemaItem.parse(req.body);
    res.json(await (await engenheiro(req)).alterarItem(id, dados));
  },

  async excluir(req: Request, res: Response) {
    await (await engenheiro(req)).excluirItem(idDaRota(req.params.id));
    res.status(204).end();
  },
};
