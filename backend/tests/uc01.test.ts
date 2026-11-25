import request from 'supertest';
import { criarApp } from '../src/app';
import { env } from '../src/config/env';
import { supabase } from '../src/config/supabase';
import { garantirUsuariosFicticios } from '../scripts/usuariosFicticios';
import { comoUsuario, mockarConvite, prepararUsuarios } from './helpers/auth';
import { limparBanco } from './helpers/banco';

// UC01 — Manter usuários (CONTEXT.md seção 9; plano seção 4). Roda no Supabase de desenvolvimento.
const app = criarApp(env().FRONTEND_URL);
let ids: Awaited<ReturnType<typeof prepararUsuarios>>;
let convite: ReturnType<typeof mockarConvite>;

beforeAll(async () => {
  ids = await prepararUsuarios();
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
  await garantirUsuariosFicticios(); // devolve tipos e situação originais
});

async function cadastrar(corpo: object) {
  return request(app).post('/usuarios').set(await comoUsuario('admin')).send(corpo);
}

describe('FP — cadastrar usuário', () => {
  it('Admin cadastra "Novo Teste": 201, convite enviado e aparece na lista como ativo', async () => {
    const res = await cadastrar({ nome: 'Novo Teste', email: 'Novo@Echeck.test', tipo: 'ENCARREGADO' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nome: 'Novo Teste', email: 'novo@echeck.test', tipo: 'ENCARREGADO', ativo: true });
    expect(convite).toHaveBeenCalledWith('novo@echeck.test', { redirectTo: `${env().FRONTEND_URL}/login` });

    const lista = await request(app).get('/usuarios').set(await comoUsuario('admin'));
    expect(lista.status).toBe(200);
    expect(lista.body).toContainEqual(expect.objectContaining({ id: res.body.id, nome: 'Novo Teste', ativo: true }));
  });
});

describe('FA — fluxos alternativos', () => {
  it('FA1 alterar dados: muda nome e e-mail, também na conta do Auth', async () => {
    const { body: novo } = await cadastrar({ nome: 'Para Alterar', email: 'alterar@echeck.test', tipo: 'USUARIO' });

    const res = await request(app)
      .put(`/usuarios/${novo.id}`)
      .set(await comoUsuario('admin'))
      .send({ nome: 'Alterado Teste', email: 'alterado@echeck.test' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: novo.id, nome: 'Alterado Teste', email: 'alterado@echeck.test' });
    const { data } = await supabase().auth.admin.getUserById(novo.id);
    expect(data.user?.email).toBe('alterado@echeck.test');
  });

  it('FA2 tornar Engenheiro Teste ADMINISTRADOR: permissão muda na próxima requisição', async () => {
    const antes = await request(app).get('/usuarios').set(await comoUsuario('engenheiro'));
    expect(antes.body.codigo).toBe('EX04');

    const res = await request(app)
      .patch(`/usuarios/${ids.engenheiro}/tipo`)
      .set(await comoUsuario('admin'))
      .send({ tipo: 'ADMINISTRADOR' });
    expect(res.status).toBe(200);
    expect(res.body.tipo).toBe('ADMINISTRADOR');

    const depois = await request(app).get('/usuarios').set(await comoUsuario('engenheiro'));
    expect(depois.status).toBe(200);

    await request(app).patch(`/usuarios/${ids.engenheiro}/tipo`).set(await comoUsuario('admin')).send({ tipo: 'ENGENHEIRO' });
  });

  it('FA3 desativar: Usuário Teste perde o acesso (EX02) e continua na lista', async () => {
    const res = await request(app).patch(`/usuarios/${ids.usuario}/desativar`).set(await comoUsuario('admin'));
    expect(res.status).toBe(200);
    expect(res.body.ativo).toBe(false);

    const bloqueado = await request(app).get('/usuarios').set(await comoUsuario('usuario'));
    expect(bloqueado.status).toBe(403);
    expect(bloqueado.body.codigo).toBe('EX02');

    const lista = await request(app).get('/usuarios').set(await comoUsuario('admin'));
    expect(lista.body).toContainEqual(expect.objectContaining({ id: ids.usuario, ativo: false }));
  });

  it('FA4 reativar: o acesso volta (agora barra só por permissão, EX04)', async () => {
    const res = await request(app).patch(`/usuarios/${ids.usuario}/reativar`).set(await comoUsuario('admin'));
    expect(res.status).toBe(200);
    expect(res.body.ativo).toBe(true);

    const depois = await request(app).get('/usuarios').set(await comoUsuario('usuario'));
    expect(depois.body.codigo).toBe('EX04');
  });

  it('FA5 filtrar por tipo e por nome (parcial, sem diferenciar maiúsculas)', async () => {
    const porTipo = await request(app).get('/usuarios?tipo=ENGENHEIRO').set(await comoUsuario('admin'));
    expect(porTipo.status).toBe(200);
    expect(porTipo.body.map((u: { email: string }) => u.email)).toEqual(['engenheiro@echeck.test']);

    const porNome = await request(app).get('/usuarios?nome=encar').set(await comoUsuario('admin'));
    expect(porNome.body.map((u: { email: string }) => u.email)).toEqual(['encarregado@echeck.test']);

    const nada = await request(app).get('/usuarios?nome=ninguem-assim').set(await comoUsuario('admin'));
    expect(nada.body).toEqual([]);
  });
});

describe('FE — fluxos de exceção', () => {
  it('FE1 e-mail repetido (mesmo com maiúsculas) → EX05, sem enviar convite', async () => {
    const res = await cadastrar({ nome: 'Repetido', email: 'ENGENHEIRO@echeck.test', tipo: 'USUARIO' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ codigo: 'EX05', mensagem: 'Já existe um usuário com este e-mail.' });
    expect(convite).not.toHaveBeenCalled();
  });

  it('FE1 alterar para e-mail de outro usuário → EX05', async () => {
    const res = await request(app)
      .put(`/usuarios/${ids.usuario}`)
      .set(await comoUsuario('admin'))
      .send({ nome: 'Usuário Teste', email: 'encarregado@echeck.test' });
    expect(res.body.codigo).toBe('EX05');
  });

  it.each([
    ['e-mail inválido', { nome: 'X', email: 'nao-e-email', tipo: 'USUARIO' }, 'email'],
    ['nome vazio', { nome: '   ', email: 'vazio@echeck.test', tipo: 'USUARIO' }, 'nome'],
    ['tipo inexistente', { nome: 'X', email: 'tipo@echeck.test', tipo: 'GERENTE' }, 'tipo'],
  ])('FE2 %s → EX06 indicando o campo', async (_caso, corpo, campo) => {
    const res = await cadastrar(corpo);
    expect(res.status).toBe(400);
    expect(res.body.codigo).toBe('EX06');
    expect(res.body.mensagem).toContain(`campo ${campo}`);
    expect(convite).not.toHaveBeenCalled();
  });

  it('FE3 Admin altera o próprio tipo ou se desativa → EX20', async () => {
    const tipo = await request(app).patch(`/usuarios/${ids.admin}/tipo`).set(await comoUsuario('admin')).send({ tipo: 'USUARIO' });
    expect(tipo.status).toBe(422);
    expect(tipo.body.codigo).toBe('EX20');

    const desativar = await request(app).patch(`/usuarios/${ids.admin}/desativar`).set(await comoUsuario('admin'));
    expect(desativar.body.codigo).toBe('EX20');
  });

  it('FE4 id inexistente ou malformado → EX09', async () => {
    const admin = await comoUsuario('admin');
    const inexistente = '7d1a3c1e-0000-4000-8000-000000000000';
    const respostas = await Promise.all([
      request(app).put(`/usuarios/${inexistente}`).set(admin).send({ nome: 'X', email: 'x@echeck.test' }),
      request(app).patch(`/usuarios/${inexistente}/tipo`).set(admin).send({ tipo: 'USUARIO' }),
      request(app).patch(`/usuarios/${inexistente}/desativar`).set(admin),
      request(app).patch(`/usuarios/${inexistente}/reativar`).set(admin),
      request(app).patch('/usuarios/nao-e-uuid/reativar').set(admin),
    ]);
    for (const res of respostas) {
      expect(res.status).toBe(404);
      expect(res.body.codigo).toBe('EX09');
    }
  });

  it('FE5 Engenheiro chama /usuarios → EX04 (listar e cadastrar)', async () => {
    const engenheiro = await comoUsuario('engenheiro');
    const listar = await request(app).get('/usuarios').set(engenheiro);
    const criar = await request(app).post('/usuarios').set(engenheiro).send({ nome: 'X', email: 'x@echeck.test', tipo: 'USUARIO' });
    expect(listar.status).toBe(403);
    expect(listar.body.codigo).toBe('EX04');
    expect(criar.body.codigo).toBe('EX04');
    expect(convite).not.toHaveBeenCalled();
  });

  it('usuário desativado tenta usar a API → EX02', async () => {
    const res = await request(app).get('/usuarios').set(await comoUsuario('inativo'));
    expect(res.status).toBe(403);
    expect(res.body.codigo).toBe('EX02');
  });

  it('sem token → EX03', async () => {
    const res = await request(app).get('/usuarios');
    expect(res.status).toBe(401);
    expect(res.body.codigo).toBe('EX03');
  });
});
