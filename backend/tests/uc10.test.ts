import request from 'supertest';
import { criarApp } from '../src/app';
import { env } from '../src/config/env';
import { comoUsuario, prepararUsuarios } from './helpers/auth';
import { limparBanco } from './helpers/banco';
import { importarPlanilhaTeste } from './helpers/cenarios';

// UC10 — Visualizar painel por projeto (CONTEXT.md seção 9; plano seção 13).
const app = criarApp(env().FRONTEND_URL);
const INEXISTENTE = '7d1a3c1e-0000-4000-8000-000000000000';
let projetos: Record<string, string>;

beforeAll(async () => {
  await prepararUsuarios();
});

beforeEach(async () => {
  await limparBanco();
  projetos = await importarPlanilhaTeste(app);
  await request(app).patch(`/projetos/${projetos['PRJ-TESTE-01']}/liberar`).set(await comoUsuario('engenheiro'));
});

afterAll(async () => {
  await limparBanco();
});

async function painelDo(projetoId: string, quem: 'usuario' | 'engenheiro' | 'encarregado' | 'admin' = 'usuario') {
  return request(app).get(`/painel/projetos/${projetoId}`).set(await comoUsuario(quem));
}

async function baixaPeloProjeto(desenho: string, quantidade: number) {
  return request(app)
    .post(`/projetos/${projetos['PRJ-TESTE-01']}/recebimentos`)
    .set(await comoUsuario('encarregado'))
    .send({ desenho, quantidade });
}

describe('UC10 — painel por projeto', () => {
  it('FP PRJ-TESTE-01 com 15 peças de TST-001: Esteira 10 de 14, Alimentador 5 de 28, e os faltantes certos', async () => {
    await baixaPeloProjeto('TST-001', 15);

    const res = await painelDo(projetos['PRJ-TESTE-01']);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      projeto: { id: projetos['PRJ-TESTE-01'], codigo: 'PRJ-TESTE-01', status: 'LIBERADO' },
      liberado: true,
      totalSolicitado: 42,
      totalRecebido: 15,
      totalFaltante: 27,
      percentualRecebido: 35.7,
    });
    expect(res.body.maquinas).toEqual([
      expect.objectContaining({ nome: 'Esteira Teste A', totalSolicitado: 14, totalRecebido: 10, totalFaltante: 4, percentualRecebido: 71.4 }),
      expect.objectContaining({ nome: 'Alimentador Teste B', totalSolicitado: 28, totalRecebido: 5, totalFaltante: 23, percentualRecebido: 17.9 }),
    ]);

    // TST-001 da Esteira chegou completo e sai da lista; os outros 4 faltam
    expect(
      res.body.faltantes.map((i: { desenho: string; maquina: string; quantidadeSolicitada: number; quantidadeRecebida: number; saldo: number; status: string }) => [
        i.desenho,
        i.maquina,
        i.quantidadeSolicitada,
        i.quantidadeRecebida,
        i.saldo,
        i.status,
      ]),
    ).toEqual([
      ['TST-002', 'Esteira Teste A', 4, 0, 4, 'PENDENTE'],
      ['TST-001', 'Alimentador Teste B', 6, 5, 1, 'PARCIAL'],
      ['TST-003', 'Alimentador Teste B', 20, 0, 20, 'PENDENTE'],
      ['TST-001', 'Alimentador Teste B', 2, 0, 2, 'PENDENTE'],
    ]);
  });

  it('FA1 PRJ-TESTE-02 em cadastro → não liberado e 0%, com as máquinas e os itens', async () => {
    const res = await painelDo(projetos['PRJ-TESTE-02']);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      projeto: { codigo: 'PRJ-TESTE-02', status: 'EM_CADASTRO', liberadoEm: null },
      liberado: false,
      totalSolicitado: 9,
      totalRecebido: 0,
      percentualRecebido: 0,
    });
    expect(res.body.maquinas.map((m: { nome: string; percentualRecebido: number }) => [m.nome, m.percentualRecebido])).toEqual([['Mesa Teste C', 0]]);
    expect(res.body.faltantes).toHaveLength(3);
  });

  it('FA2 projeto completo → sem faltantes e 100%', async () => {
    await baixaPeloProjeto('TST-001', 18);
    await baixaPeloProjeto('TST-002', 4);
    await baixaPeloProjeto('TST-003', 20);

    const res = await painelDo(projetos['PRJ-TESTE-01']);
    expect(res.body).toMatchObject({ totalRecebido: 42, totalFaltante: 0, percentualRecebido: 100, faltantes: [] });
    expect(res.body.maquinas.every((m: { percentualRecebido: number }) => m.percentualRecebido === 100)).toBe(true);
  });

  it('estorno volta o item para os faltantes (RN17)', async () => {
    const baixa = await baixaPeloProjeto('TST-002', 4);
    expect((await painelDo(projetos['PRJ-TESTE-01'])).body.faltantes.map((i: { desenho: string }) => i.desenho)).not.toContain('TST-002');

    await request(app).patch(`/recebimentos/${baixa.body.recebimentos[0].id}/estornar`).set(await comoUsuario('encarregado'));
    expect((await painelDo(projetos['PRJ-TESTE-01'])).body.faltantes.map((i: { desenho: string }) => i.desenho)).toContain('TST-002');
  });

  it('FE1 projeto inexistente → EX09', async () => {
    for (const id of [INEXISTENTE, 'nao-e-uuid']) {
      const res = await painelDo(id);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ codigo: 'EX09', mensagem: 'Registro não encontrado.' });
    }
  });

  it('todos os tipos veem; sem login → EX03', async () => {
    for (const quem of ['usuario', 'engenheiro', 'encarregado', 'admin'] as const) {
      expect((await painelDo(projetos['PRJ-TESTE-01'], quem)).status).toBe(200);
    }
    const semLogin = await request(app).get(`/painel/projetos/${projetos['PRJ-TESTE-01']}`);
    expect(semLogin.body.codigo).toBe('EX03');
  });
});
