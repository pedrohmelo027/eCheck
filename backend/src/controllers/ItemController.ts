import { Request, Response } from 'express';
import { Engenheiro } from '../models/Engenheiro';
import { ItemSolicitado } from '../models/ItemSolicitado';
import { idDaRota } from '../validators/comum';
import { esquemaFiltroItens } from '../validators/item';
import { esquemaItem } from '../validators/maquina';

const engenheiro = (req: Request) => Engenheiro.carregar(req.usuario!.id);

export const ItemController = {
  /** GET /itens?projeto=&maquina=&desenho=&processo=&status= (todos, UC08). */
  async listar(req: Request, res: Response) {
    const filtro = esquemaFiltroItens.parse(req.query);
    res.json(await ItemSolicitado.listar(filtro));
  },

  /** GET /itens/:id/recebimentos (todos, UC08): o item e o histórico de remessas. */
  async historico(req: Request, res: Response) {
    const item = await ItemSolicitado.buscar(idDaRota(req.params.id));
    res.json({ item, recebimentos: await item.listarRecebimentos() });
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
