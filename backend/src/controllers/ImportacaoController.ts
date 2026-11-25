import { Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { Engenheiro } from '../models/Engenheiro';
import { idDaRota } from '../validators/comum';
import { esquemaConfirmarImportacao } from '../validators/importacao';

const engenheiro = (req: Request) => Engenheiro.carregar(req.usuario!.id);

export const ImportacaoController = {
  /** POST /importacoes (multipart, campo "arquivo"): devolve a pré-visualização. */
  async enviar(req: Request, res: Response) {
    if (!req.file) throw new AppError('EX10');
    // O multer entrega o nome em latin1; o navegador envia em UTF-8
    const nomeArquivo = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const previa = await (await engenheiro(req)).importarPlanilha(nomeArquivo, req.file.buffer);
    res.status(201).json(previa);
  },

  /** POST /importacoes/:id/confirmar { linhas: number[] }: grava as linhas marcadas. */
  async confirmar(req: Request, res: Response) {
    const id = idDaRota(req.params.id);
    const { linhas } = esquemaConfirmarImportacao.parse(req.body);
    res.json(await (await engenheiro(req)).confirmarImportacao(id, linhas));
  },
};
