import express from 'express';
import serverless from 'serverless-http';
import { criarApp } from '../../src/app';
import { env } from '../../src/config/env';

/**
 * A API inteira (Express) como uma função do Netlify. O netlify.toml manda todas as rotas para
 * cá; a mesma app atende pelo caminho original (/usuarios) ou pelo da função
 * (/.netlify/functions/api/usuarios), conforme o Netlify repassar.
 */
const app = criarApp(env().FRONTEND_URL);
const servidor = express();
servidor.use('/.netlify/functions/api', app);
servidor.use(app);

export const handler = serverless(servidor, {
  // A planilha (.xlsx) chega em base64 no evento; o multer precisa dela como binário
  binary: ['multipart/form-data', 'application/octet-stream'],
});
