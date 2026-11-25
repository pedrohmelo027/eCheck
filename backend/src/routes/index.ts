import { Router } from 'express';
import { rotasAuth } from './auth';
import { rotasImportacao } from './importacao';
import { rotasItem } from './item';
import { rotasMaquina } from './maquina';
import { rotasProjeto } from './projeto';
import { rotasRecebimento } from './recebimento';
import { rotasUsuario } from './usuario';

export const rotas = Router();

// Rota pública de verificação. As rotas dos UCs ficam abaixo, sempre com autenticar + autorizar.
rotas.get('/saude', (_req, res) => {
  res.json({ ok: true });
});

rotas.use('/auth', rotasAuth);
rotas.use('/importacoes', rotasImportacao);
rotas.use('/projetos', rotasProjeto);
rotas.use('/maquinas', rotasMaquina);
rotas.use('/itens', rotasItem);
rotas.use('/recebimentos', rotasRecebimento);
rotas.use('/usuarios', rotasUsuario);
