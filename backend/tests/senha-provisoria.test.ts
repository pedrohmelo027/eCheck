import request from 'supertest';
import { criarApp } from '../src/app';
import { env } from '../src/config/env';
import { entrar } from '../scripts/usuariosFicticios';
import { comoUsuario, mockarConvite, prepararUsuarios } from './helpers/auth';
import { limparBanco } from './helpers/banco';

// Senha provisória com troca obrigatória no primeiro login (UC01 + UC02; ver docs/DECISOES.md).
const app = criarApp(env().FRONTEND_URL);
const FORMATO = /^eCheck-[A-HJ-NP-Za-km-np-z2-9]{4}-[A-HJ-NP-Za-km-np-z2-9]{4}$/;
const INEXISTENTE = '7d1a3c1e-0000-4000-8000-000000000000';
let convite: ReturnType<typeof mockarConvite>;

beforeAll(async () => {
  await prepararUsuarios();
  await limparBanco();
});

beforeEach(() => {
  convite = mockarConvite();
});

afterEach(() => {
  convite.mockRestore();
});

afterAll(async () => {
  await limparBanco();
});

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

async function cadastrarComSenha(email: string, tipo = 'ENCARREGADO') {
  return request(app).post('/usuarios').set(await comoUsuario('admin')).send({ nome: 'Provisório Teste', email, tipo, forma: 'senha' });
}

describe('cadastro com senha provisória', () => {
  it('gera uma senha forte e única, sem convite por e-mail, e a lista mostra que falta trocar', async () => {
    const a = await cadastrarComSenha('provisorio-a@echeck.test');
    const b = await cadastrarComSenha('provisorio-b@echeck.test');

    expect(a.status).toBe(201);
    expect(a.body).toMatchObject({ email: 'provisorio-a@echeck.test', tipo: 'ENCARREGADO', ativo: true });
    expect(a.body.senhaProvisoria).toMatch(FORMATO);
    expect(b.body.senhaProvisoria).not.toBe(a.body.senhaProvisoria);
    expect(convite).not.toHaveBeenCalled();

    const lista = await request(app).get('/usuarios').set(await comoUsuario('admin'));
    expect(lista.body).toContainEqual(expect.objectContaining({ email: 'provisorio-a@echeck.test', trocaPendente: true }));
    expect(lista.body).toContainEqual(expect.objectContaining({ email: 'admin@echeck.test', trocaPendente: false }));
  });

  it('a forma padrão continua sendo o convite por e-mail (sem senha na resposta)', async () => {
    const res = await request(app)
      .post('/usuarios')
      .set(await comoUsuario('admin'))
      .send({ nome: 'Convite Teste', email: 'convite-padrao@echeck.test', tipo: 'USUARIO' });
    expect(res.status).toBe(201);
    expect(res.body.senhaProvisoria).toBeNull();
    expect(convite).toHaveBeenCalledTimes(1);
  });

  it('forma inválida → EX06', async () => {
    const res = await request(app).post('/usuarios').set(await comoUsuario('admin')).send({ nome: 'X', email: 'x@echeck.test', tipo: 'USUARIO', forma: 'sms' });
    expect(res.body.codigo).toBe('EX06');
  });
});

describe('primeiro login com senha provisória', () => {
  it('entra, fica bloqueado (EX23) até trocar a senha, e depois só a senha nova vale', async () => {
    const { body } = await cadastrarComSenha('primeiro-login@echeck.test', 'ENGENHEIRO');
    const tokenProvisorio = await entrar('primeiro-login@echeck.test', body.senhaProvisoria);

    // /auth/me responde e avisa que precisa trocar; o resto da API bloqueia
    const me = await request(app).get('/auth/me').set(bearer(tokenProvisorio));
    expect(me.body).toMatchObject({ email: 'primeiro-login@echeck.test', tipo: 'ENGENHEIRO', trocarSenha: true });
    for (const caminho of ['/projetos', '/painel', '/itens']) {
      const res = await request(app).get(caminho).set(bearer(tokenProvisorio));
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ codigo: 'EX23', mensagem: 'Defina uma nova senha antes de continuar.' });
    }

    // Senha fraca é recusada
    for (const fraca of ['curta1', 'somenteletras', '12345678']) {
      const res = await request(app).post('/auth/senha').set(bearer(tokenProvisorio)).send({ senha: fraca });
      expect(res.status).toBe(400);
      expect(res.body.codigo).toBe('EX06');
    }

    // Troca de verdade
    const troca = await request(app).post('/auth/senha').set(bearer(tokenProvisorio)).send({ senha: 'MinhaSenha2026' });
    expect(troca.status).toBe(204);

    // A senha provisória não vale mais; a nova vale e libera a API
    await expect(entrar('primeiro-login@echeck.test', body.senhaProvisoria)).rejects.toBeTruthy();
    const tokenNovo = await entrar('primeiro-login@echeck.test', 'MinhaSenha2026');
    expect((await request(app).get('/auth/me').set(bearer(tokenNovo))).body.trocarSenha).toBe(false);
    expect((await request(app).get('/projetos').set(bearer(tokenNovo))).status).toBe(200);

    const lista = await request(app).get('/usuarios').set(await comoUsuario('admin'));
    expect(lista.body).toContainEqual(expect.objectContaining({ email: 'primeiro-login@echeck.test', trocaPendente: false }));
  });

  it('POST /auth/senha sem login → EX03', async () => {
    const res = await request(app).post('/auth/senha').send({ senha: 'MinhaSenha2026' });
    expect(res.body.codigo).toBe('EX03');
  });
});

describe('nova senha provisória (esqueceu a senha)', () => {
  it('o Administrador gera outra senha: a antiga para de valer e a troca volta a ser obrigatória', async () => {
    const { body } = await cadastrarComSenha('esqueceu@echeck.test', 'USUARIO');
    const t1 = await entrar('esqueceu@echeck.test', body.senhaProvisoria);
    await request(app).post('/auth/senha').set(bearer(t1)).send({ senha: 'SenhaAntiga2026' });

    const res = await request(app).patch(`/usuarios/${body.id}/senha-provisoria`).set(await comoUsuario('admin'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: body.id, email: 'esqueceu@echeck.test' });
    expect(res.body.senhaProvisoria).toMatch(FORMATO);

    await expect(entrar('esqueceu@echeck.test', 'SenhaAntiga2026')).rejects.toBeTruthy();
    const t2 = await entrar('esqueceu@echeck.test', res.body.senhaProvisoria);
    expect((await request(app).get('/auth/me').set(bearer(t2))).body.trocarSenha).toBe(true);
  });

  it('usuário inexistente → EX09; quem não é Administrador → EX04', async () => {
    expect((await request(app).patch(`/usuarios/${INEXISTENTE}/senha-provisoria`).set(await comoUsuario('admin'))).body.codigo).toBe('EX09');
    const engenheiro = await request(app).patch(`/usuarios/${INEXISTENTE}/senha-provisoria`).set(await comoUsuario('engenheiro'));
    expect(engenheiro.status).toBe(403);
    expect(engenheiro.body.codigo).toBe('EX04');
  });
});
