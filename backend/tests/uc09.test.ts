import request from 'supertest';
import { criarApp } from '../src/app';
import { env } from '../src/config/env';
import { comoUsuario, prepararUsuarios } from './helpers/auth';
import { limparBanco } from './helpers/banco';
import { idDoItem, importarPlanilhaTeste } from './helpers/cenarios';

// UC09 — Visualizar painel geral (CONTEXT.md seção 9; plano seção 12).
const app = criarApp(env().FRONTEND_URL);
let projetos: Record<string, string>;

beforeAll(async () => {
  await prepararUsuarios();
});

beforeEach(async () => {
  await limparBanco();
  projetos = await importarPlanilhaTeste(app);
});

afterAll(async () => {
  await limparBanco();
});

async function painel(quem: 'usuario' | 'engenheiro' | 'encarregado' | 'admin' = 'usuario') {
  return request(app).get('/painel').set(await comoUsuario(quem));
}

async function liberarPrj01() {
  await request(app).patch(`/projetos/${projetos['PRJ-TESTE-01']}/liberar`).set(await comoUsuario('engenheiro'));
}

/** 15 peças de TST-001 pelo projeto: 10 (Esteira) + 5 (Alimentador 05/11), como no gabarito. */
async function receber15() {
  return request(app)
    .post(`/projetos/${projetos['PRJ-TESTE-01']}/recebimentos`)
    .set(await comoUsuario('encarregado'))
    .send({ desenho: 'TST-001', quantidade: 15 });
}

describe('UC09 — painel geral', () => {
  it('FA1 nenhum projeto liberado → totais zerados e nenhum projeto', async () => {
    const res = await painel();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ totalSolicitado: 0, totalRecebido: 0, totalFaltante: 0, percentualRecebido: 0, totalProjetos: 0, projetos: [] });
  });

  it('FP PRJ-TESTE-01 liberado (42 peças) com 15 recebidas → 35,7%, solicitado 42, recebido 15, faltante 27; PRJ-TESTE-02 fica de fora', async () => {
    await liberarPrj01();
    await receber15();

    const res = await painel();
    expect(res.body).toMatchObject({ totalSolicitado: 42, totalRecebido: 15, totalFaltante: 27, percentualRecebido: 35.7, totalProjetos: 1 });
    expect(res.body.projetos).toEqual([
      { id: projetos['PRJ-TESTE-01'], codigo: 'PRJ-TESTE-01', nome: 'PRJ-TESTE-01', totalSolicitado: 42, totalRecebido: 15, totalFaltante: 27, percentualRecebido: 35.7 },
    ]);
  });

  it('com os dois projetos liberados, soma tudo e mostra o percentual de cada um', async () => {
    await liberarPrj01();
    await receber15();
    await request(app).patch(`/projetos/${projetos['PRJ-TESTE-02']}/liberar`).set(await comoUsuario('engenheiro'));

    const res = await painel();
    // 15 de 51 = 29,4%
    expect(res.body).toMatchObject({ totalSolicitado: 51, totalRecebido: 15, totalFaltante: 36, percentualRecebido: 29.4, totalProjetos: 2 });
    expect(res.body.projetos.map((p: { codigo: string; percentualRecebido: number }) => [p.codigo, p.percentualRecebido])).toEqual([
      ['PRJ-TESTE-01', 35.7],
      ['PRJ-TESTE-02', 0],
    ]);
  });

  it('estornar uma remessa faz o percentual cair (RN17)', async () => {
    await liberarPrj01();
    const baixa = await receber15();
    const remessaDe5 = baixa.body.recebimentos.find((r: { quantidade: number }) => r.quantidade === 5);
    await request(app).patch(`/recebimentos/${remessaDe5.id}/estornar`).set(await comoUsuario('encarregado'));

    const res = await painel();
    // 10 de 42 = 23,8%
    expect(res.body).toMatchObject({ totalRecebido: 10, totalFaltante: 32, percentualRecebido: 23.8 });
  });

  it('todos os tipos veem o painel; sem login → EX03', async () => {
    await liberarPrj01();
    await request(app).post(`/itens/${await idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-002')}/recebimentos`).set(await comoUsuario('encarregado')).send({ quantidade: 4 });
    for (const quem of ['usuario', 'engenheiro', 'encarregado', 'admin'] as const) {
      const res = await painel(quem);
      expect(res.status).toBe(200);
      expect(res.body.totalRecebido).toBe(4);
    }
    const semLogin = await request(app).get('/painel');
    expect(semLogin.status).toBe(401);
    expect(semLogin.body.codigo).toBe('EX03');
  });
});
