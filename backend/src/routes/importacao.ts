import { Router } from 'express';
import multer from 'multer';
import { ImportacaoController } from '../controllers/ImportacaoController';
import { AppError } from '../errors/AppError';
import { autenticar } from '../middlewares/autenticar';
import { autorizar } from '../middlewares/autorizar';
import { TipoUsuario } from '../models/enums';

/** Upload em memória: só .xlsx, até 10 MB (carga típica de 2 a 3 mil linhas cabe com folga). */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, arquivo, aceitar) => {
    if (arquivo.originalname.toLowerCase().endsWith('.xlsx')) aceitar(null, true);
    else aceitar(new AppError('EX10'));
  },
});

/** UC03 — Importar planilha. Só ENGENHEIRO (RN24). */
export const rotasImportacao = Router();

rotasImportacao.use(autenticar, autorizar(TipoUsuario.ENGENHEIRO));

rotasImportacao.post('/', upload.single('arquivo'), ImportacaoController.enviar);
rotasImportacao.post('/:id/confirmar', ImportacaoController.confirmar);
