import request from 'supertest';
import { criarApp } from '../src/app';
import { env } from '../src/config/env';
import { comoUsuario, prepararUsuarios } from './helpers/auth';
import { limparBanco } from './helpers/banco';
import { importarPlanilhaTeste } from './helpers/cenarios';

// UC06 — Liberar projeto para produção (CONTEXT.md seção 9; plano seção 9).
const app = criarApp(env().FRONTEND_URL);
const INEXISTENTE = '7d1a3c1e-0000-4000-8000-000000000000';
let ids: Awaited<ReturnType<typeof prepararUsuarios>>;
let projetos: Record<string, string>;

beforeAll(async () => {
  ids = await prepararUsuarios();
});

beforeEach(async () => {
  await limparBanco();
  projetos = await importarPlanilhaTeste(app);
});

afterAll(async () => {
  await limparBanco();
});

async function liberar(id: string, quem: 'engenheiro' | 'encarregado' = 'engenheiro') {
  return request(app).patch(`/projetos/${id}/liberar`).set(await comoUsuario(quem));
}

describe('FP — liberar projeto', () => {
  it('libera PRJ-TESTE-01: LIBERADO com quem e quando; o resto continua igual', async () => {
    const antes = Date.now();
    const res = await liberar(projetos['PRJ-TESTE-01']);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ codigo: 'PRJ-TESTE-01', status: 'LIBERADO', liberadoPor: ids.engenheiro, totalItens: 5, totalSolicitado: 42 });
    const liberadoEm = new Date(res.body.liberadoEm).getTime();
    expect(liberadoEm).toBeGreaterThanOrEqual(antes - 5000);
    expect(liberadoEm).toBeLessThanOrEqual(Date.now() + 5000);

    // O detalhe mostra quem liberou; PRJ-TESTE-02 segue em cadastro
    const detalhe = await request(app).get(`/projetos/${projetos['PRJ-TESTE-01']}`).set(await comoUsuario('usuario'));
    expect(detalhe.body).toMatchObject({ status: 'LIBERADO', liberadoPorNome: 'Engenheiro Teste', criadoPorNome: 'Engenheiro Teste' });
    const outro = await request(app).get(`/projetos/${projetos['PRJ-TESTE-02']}`).set(await comoUsuario('usuario'));
    expect(outro.body).toMatchObject({ status: 'EM_CADASTRO', liberadoPor: null, liberadoPorNome: null });
  });

  it('não pode ser desfeito: alterar o projeto não volta o status (RN11)', async () => {
    await liberar(projetos['PRJ-TESTE-01']);
    const res = await request(app)
      .put(`/projetos/${projetos['PRJ-TESTE-01']}`)
      .set(await comoUsuario('engenheiro'))
      .send({ codigo: 'PRJ-TESTE-01', nome: 'Renomeado', status: 'EM_CADASTRO' });
    expect(res.body).toMatchObject({ nome: 'Renomeado', status: 'LIBERADO' });
  });
});

describe('FE — fluxos de exceção', () => {
  it('FE1 projeto sem itens (sem máquinas ou só com máquina vazia) → EX14 e continua EM_CADASTRO', async () => {
    const eng = await comoUsuario('engenheiro');
    const vazio = await request(app).post('/projetos').set(eng).send({ codigo: 'PRJ-TESTE-03', nome: 'Sem itens' });
    const semMaquina = await liberar(vazio.body.id);
    expect(semMaquina.status).toBe(422);
    expect(semMaquina.body).toEqual({ codigo: 'EX14', mensagem: 'Cadastre ao menos um item antes de liberar o projeto.' });

    await request(app).post(`/projetos/${vazio.body.id}/maquinas`).set(eng).send({ nome: 'Máquina vazia' });
    expect((await liberar(vazio.body.id)).body.codigo).toBe('EX14');
    expect((await request(app).get(`/projetos/${vazio.body.id}`).set(eng)).body.status).toBe('EM_CADASTRO');
  });

  it('FE2 liberar de novo → EX13 e o registro da primeira liberação não muda', async () => {
    const primeira = await liberar(projetos['PRJ-TESTE-01']);
    const segunda = await liberar(projetos['PRJ-TESTE-01']);
    expect(segunda.status).toBe(409);
    expect(segunda.body).toEqual({ codigo: 'EX13', mensagem: 'Este projeto já está liberado.' });

    const detalhe = await request(app).get(`/projetos/${projetos['PRJ-TESTE-01']}`).set(await comoUsuario('engenheiro'));
    expect(detalhe.body.liberadoEm).toBe(primeira.body.liberadoEm);
  });

  it('FE2 duas liberações ao mesmo tempo: só uma passa', async () => {
    const respostas = await Promise.all([liberar(projetos['PRJ-TESTE-01']), liberar(projetos['PRJ-TESTE-01'])]);
    expect(respostas.map((r) => r.status).sort()).toEqual([200, 409]);
  });

  it('FE3 Encarregado tenta liberar → EX04', async () => {
    const res = await liberar(projetos['PRJ-TESTE-01'], 'encarregado');
    expect(res.status).toBe(403);
    expect(res.body.codigo).toBe('EX04');
  });

  it('projeto inexistente → EX09', async () => {
    const res = await liberar(INEXISTENTE);
    expect(res.status).toBe(404);
    expect(res.body.codigo).toBe('EX09');
  });
});
