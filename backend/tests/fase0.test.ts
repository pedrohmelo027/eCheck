import express from 'express';
import request from 'supertest';
import { criarApp } from '../src/app';
import { AppError } from '../src/errors/AppError';
import { catalogo, montarMensagem } from '../src/errors/catalogo';
import { autorizar } from '../src/middlewares/autorizar';
import { tratarErros } from '../src/middlewares/tratarErros';
import { TipoUsuario } from '../src/models/enums';

// Fase 0: estrutura da API sem tocar no banco. autenticar é testado com o Supabase simulado.
const getUser = jest.fn();
const buscarPorId = jest.fn();
jest.mock('../src/config/supabase', () => ({ supabase: () => ({ auth: { getUser } }) }));
jest.mock('../src/repositories/UsuarioRepository', () => ({
  MARCA_TROCAR_SENHA: 'trocar_senha',
  UsuarioRepository: { buscarPorId: (...args: unknown[]) => buscarPorId(...args) },
}));

import { autenticar } from '../src/middlewares/autenticar';

const FRONT = 'http://localhost:3000';

function appProtegido(...tipos: TipoUsuario[]) {
  const app = express();
  app.get('/protegida', autenticar, autorizar(...tipos), (req, res) => res.json(req.usuario));
  app.use(tratarErros);
  return app;
}

const ativo = { id: 'u1', nome: 'Engenheiro Teste', email: 'engenheiro@echeck.test', tipo: 'ENGENHEIRO', ativo: true };

beforeEach(() => {
  getUser.mockReset();
  buscarPorId.mockReset();
});

describe('GET /saude e app base', () => {
  const app = criarApp(FRONT);

  it('responde { ok: true }', async () => {
    const res = await request(app).get('/saude');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('libera CORS só para o FRONTEND_URL', async () => {
    const res = await request(app).get('/saude').set('Origin', FRONT);
    expect(res.headers['access-control-allow-origin']).toBe(FRONT);
  });

  it('rota inexistente → EX09 no formato padrão', async () => {
    const res = await request(app).get('/nao-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ codigo: 'EX09', mensagem: 'Registro não encontrado.' });
  });

  it('JSON malformado → EX06', async () => {
    const res = await request(app).post('/saude').set('Content-Type', 'application/json').send('{ruim');
    expect(res.status).toBe(400);
    expect(res.body.codigo).toBe('EX06');
  });
});

describe('catálogo de erros', () => {
  it('tem EX01 a EX23 (EX23 acrescentado para a senha provisória)', () => {
    const esperado = Array.from({ length: 23 }, (_, i) => `EX${String(i + 1).padStart(2, '0')}`);
    expect(Object.keys(catalogo)).toEqual(esperado);
  });

  it('preenche os parâmetros da mensagem', () => {
    expect(montarMensagem('EX16', { x: 18, y: 2 })).toBe('Serão registradas 18 peça(s). 2 excedente(s) não serão registradas.');
    const erro = new AppError('EX06', { campo: 'email', motivo: 'formato inválido' });
    expect(erro.http).toBe(400);
    expect(erro.message).toBe('Verifique o campo email: formato inválido.');
  });

  it('erro inesperado → EX22 sem vazar detalhes', async () => {
    const app = express();
    app.get('/x', () => {
      throw new Error('segredo interno');
    });
    app.use(tratarErros);
    const res = await request(app).get('/x');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ codigo: 'EX22', mensagem: 'Algo deu errado. Tente novamente.' });
  });
});

describe('autenticar', () => {
  it('sem token → EX03', async () => {
    const res = await request(appProtegido()).get('/protegida');
    expect(res.status).toBe(401);
    expect(res.body.codigo).toBe('EX03');
    expect(getUser).not.toHaveBeenCalled();
  });

  it('token inválido → EX03', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid JWT') });
    const res = await request(appProtegido()).get('/protegida').set('Authorization', 'Bearer ruim');
    expect(res.body.codigo).toBe('EX03');
  });

  it('conta do Auth sem cadastro em usuarios → EX03', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u9' } }, error: null });
    buscarPorId.mockResolvedValue(null);
    const res = await request(appProtegido()).get('/protegida').set('Authorization', 'Bearer t');
    expect(res.body.codigo).toBe('EX03');
  });

  it('usuário desativado → EX02', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    buscarPorId.mockResolvedValue({ ...ativo, ativo: false });
    const res = await request(appProtegido()).get('/protegida').set('Authorization', 'Bearer t');
    expect(res.status).toBe(403);
    expect(res.body.codigo).toBe('EX02');
  });

  it('usuário ativo → carrega id, nome, e-mail e o tipo do banco', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', app_metadata: {} } }, error: null });
    buscarPorId.mockResolvedValue(ativo);
    const res = await request(appProtegido()).get('/protegida').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'u1', nome: 'Engenheiro Teste', email: 'engenheiro@echeck.test', tipo: 'ENGENHEIRO', trocarSenha: false });
    expect(buscarPorId).toHaveBeenCalledWith('u1');
  });
});

describe('autorizar', () => {
  beforeEach(() => getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }));

  it('tipo permitido passa', async () => {
    buscarPorId.mockResolvedValue(ativo);
    const res = await request(appProtegido(TipoUsuario.ENGENHEIRO)).get('/protegida').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
  });

  it('tipo sem permissão → EX04', async () => {
    buscarPorId.mockResolvedValue({ ...ativo, tipo: 'ENCARREGADO' });
    const res = await request(appProtegido(TipoUsuario.ENGENHEIRO)).get('/protegida').set('Authorization', 'Bearer t');
    expect(res.status).toBe(403);
    expect(res.body.codigo).toBe('EX04');
  });

  it('senha provisória ainda não trocada → EX23, em qualquer tipo', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', app_metadata: { trocar_senha: true } } }, error: null });
    buscarPorId.mockResolvedValue(ativo);
    const res = await request(appProtegido(TipoUsuario.ENGENHEIRO)).get('/protegida').set('Authorization', 'Bearer t');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ codigo: 'EX23', mensagem: 'Defina uma nova senha antes de continuar.' });
  });

  it('sem tipos = qualquer usuário autenticado', async () => {
    buscarPorId.mockResolvedValue({ ...ativo, tipo: 'USUARIO' });
    const res = await request(appProtegido()).get('/protegida').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
  });
});
