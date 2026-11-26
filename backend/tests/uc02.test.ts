import request from 'supertest';
import { criarApp } from '../src/app';
import { env } from '../src/config/env';
import { USUARIOS_FICTICIOS } from '../scripts/usuariosFicticios';
import { comoUsuario, prepararUsuarios } from './helpers/auth';

// UC02 — Fazer login (CONTEXT.md seção 9; plano seção 5). O login em si é no Supabase Auth;
// a senha errada (EX01) é testada pela tela.
const app = criarApp(env().FRONTEND_URL);
let ids: Awaited<ReturnType<typeof prepararUsuarios>>;

beforeAll(async () => {
  ids = await prepararUsuarios();
});

describe('FP — GET /auth/me devolve o usuário e o tipo certo', () => {
  it.each(USUARIOS_FICTICIOS.filter((u) => u.ativo).map((u) => [u.tipo, u] as const))('%s', async (_tipo, u) => {
    const res = await request(app).get('/auth/me').set(await comoUsuario(u.chave));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: ids[u.chave], nome: u.nome, email: u.email, tipo: u.tipo, trocarSenha: false });
  });
});

describe('FE — fluxos de exceção', () => {
  it('FE2 usuário desativado → EX02', async () => {
    const res = await request(app).get('/auth/me').set(await comoUsuario('inativo'));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ codigo: 'EX02', mensagem: 'Seu acesso está desativado. Procure o administrador.' });
  });

  it('FE3 sem token → EX03', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ codigo: 'EX03', mensagem: 'Sua sessão expirou. Entre novamente.' });
  });

  it('FE3 token inválido ou adulterado → EX03', async () => {
    const valido = (await comoUsuario('usuario')).Authorization;
    for (const token of ['Bearer abc.def.ghi', `${valido.slice(0, -4)}xxxx`, 'Basic dXN1YXJpbzpzZW5oYQ==']) {
      const res = await request(app).get('/auth/me').set('Authorization', token);
      expect(res.status).toBe(401);
      expect(res.body.codigo).toBe('EX03');
    }
  });
});
