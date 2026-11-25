import { Request, Response } from 'express';
import { Encarregado } from '../models/Encarregado';
import { ItemSolicitado } from '../models/ItemSolicitado';
import { idDaRota } from '../validators/comum';
import {
  esquemaAtualizarRecebimento,
  esquemaBaixa,
  esquemaBaixaProjeto,
  esquemaBuscaDesenho,
} from '../validators/recebimento';

const encarregado = (req: Request) => Encarregado.carregar(req.usuario!.id);

/** 201 quando tudo foi registrado; 200 com o aviso EX16 quando houve excedente (aviso, não erro). */
const statusDaBaixa = (aviso: unknown) => (aviso ? 200 : 201);

/** UC07 — Manter recebimentos. */
export const RecebimentoController = {
  /** GET /itens/busca?desenho= (todos): onde o desenho aparece em projetos liberados. */
  async buscarPorDesenho(req: Request, res: Response) {
    const { desenho } = esquemaBuscaDesenho.parse(req.query);
    res.json(await ItemSolicitado.buscarPorDesenho(desenho));
  },

  /** POST /itens/:id/recebimentos — baixa por máquina. */
  async darBaixa(req: Request, res: Response) {
    const itemId = idDaRota(req.params.id);
    const { quantidade, observacao } = esquemaBaixa.parse(req.body);
    const resultado = await (await encarregado(req)).darBaixa(itemId, quantidade, observacao);
    res.status(statusDaBaixa(resultado.aviso)).json(resultado);
  },

  /** POST /projetos/:id/recebimentos/previa — simula a distribuição, sem gravar. */
  async simularBaixaProjeto(req: Request, res: Response) {
    const projetoId = idDaRota(req.params.id);
    const { desenho, quantidade } = esquemaBaixaProjeto.parse(req.body);
    res.json(await (await encarregado(req)).simularBaixaProjeto(projetoId, desenho, quantidade));
  },

  /** POST /projetos/:id/recebimentos — baixa pelo projeto inteiro. */
  async darBaixaProjeto(req: Request, res: Response) {
    const projetoId = idDaRota(req.params.id);
    const { desenho, quantidade, observacao } = esquemaBaixaProjeto.parse(req.body);
    const resultado = await (await encarregado(req)).darBaixaProjeto(projetoId, desenho, quantidade, observacao);
    res.status(statusDaBaixa(resultado.aviso)).json(resultado);
  },

  /** PUT /recebimentos/:id */
  async atualizar(req: Request, res: Response) {
    const id = idDaRota(req.params.id);
    const { quantidade } = esquemaAtualizarRecebimento.parse(req.body);
    res.json(await (await encarregado(req)).atualizarRecebimento(id, quantidade));
  },

  /** PATCH /recebimentos/:id/estornar */
  async estornar(req: Request, res: Response) {
    res.json(await (await encarregado(req)).estornarRecebimento(idDaRota(req.params.id)));
  },
};
