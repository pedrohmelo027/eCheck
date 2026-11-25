import { Request, Response } from 'express';
import { Engenheiro } from '../models/Engenheiro';
import { Projeto } from '../models/Projeto';
import { idDaRota } from '../validators/comum';
import { esquemaProjeto } from '../validators/projeto';

const engenheiro = (req: Request) => Engenheiro.carregar(req.usuario!.id);

export const ProjetoController = {
  async listar(_req: Request, res: Response) {
    res.json(await Projeto.listar());
  },

  async detalhar(req: Request, res: Response) {
    const projeto = await Projeto.buscar(idDaRota(req.params.id));
    res.json(await projeto.detalhar());
  },

  async cadastrar(req: Request, res: Response) {
    const dados = esquemaProjeto.parse(req.body);
    res.status(201).json(await (await engenheiro(req)).cadastrarProjeto(dados));
  },

  async alterar(req: Request, res: Response) {
    const id = idDaRota(req.params.id);
    const dados = esquemaProjeto.parse(req.body);
    res.json(await (await engenheiro(req)).alterarProjeto(id, dados));
  },

  async excluir(req: Request, res: Response) {
    await (await engenheiro(req)).excluirProjeto(idDaRota(req.params.id));
    res.status(204).end();
  },
};
