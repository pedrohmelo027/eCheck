import request from 'supertest';
import { criarApp } from '../src/app';
import { env } from '../src/config/env';
import { supabase } from '../src/config/supabase';
import { distribuir } from '../src/models/calculos';
import { comoUsuario, prepararUsuarios } from './helpers/auth';
import { limparBanco } from './helpers/banco';
import { idDoItem, importarPlanilhaTeste } from './helpers/cenarios';

// UC07 — Manter recebimentos (CONTEXT.md seção 9; plano seção 10).
// Cenário: planilha de teste importada e PRJ-TESTE-01 liberado.
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
  await request(app).patch(`/projetos/${projetos['PRJ-TESTE-01']}/liberar`).set(await comoUsuario('engenheiro'));
});

afterAll(async () => {
  await limparBanco();
});

const enc = () => comoUsuario('encarregado');

async function baixa(itemId: string, quantidade: unknown, observacao?: string) {
  return request(app).post(`/itens/${itemId}/recebimentos`).set(await enc()).send({ quantidade, observacao });
}

async function baixaProjeto(projetoId: string, desenho: string, quantidade: unknown, previa = false) {
  return request(app)
    .post(`/projetos/${projetoId}/recebimentos${previa ? '/previa' : ''}`)
    .set(await enc())
    .send({ desenho, quantidade });
}

/** As três solicitações de TST-001 no PRJ-TESTE-01, da mais antiga para a mais nova. */
async function solicitacoesTst001() {
  return Promise.all([
    idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-001'),
    idDoItem('PRJ-TESTE-01', 'Alimentador Teste B', 'TST-001', '2026-11-05'),
    idDoItem('PRJ-TESTE-01', 'Alimentador Teste B', 'TST-001', '2026-11-07'),
  ]);
}

async function recebidoDe(itemId: string) {
  const { data } = await supabase().from('vw_itens_saldo').select('quantidade_recebida, saldo, status').eq('id', itemId).single();
  return data!;
}

describe('distribuir (RN14) — exemplo do CONTEXT.md', () => {
  const itens = [
    { id: 'a', saldo: 64 },
    { id: 'b', saldo: 8 },
    { id: 'c', saldo: 4 },
  ];
  it('70 peças → 64 + 6 + 0', () => {
    expect(distribuir(itens, 70)).toEqual({ partes: [{ itemId: 'a', quantidade: 64 }, { itemId: 'b', quantidade: 6 }, { itemId: 'c', quantidade: 0 }], registrada: 70, excedente: 0 });
  });
  it('80 peças → 64 + 8 + 4 = 76 e 4 excedentes', () => {
    expect(distribuir(itens, 80)).toMatchObject({ registrada: 76, excedente: 4 });
  });
});

describe('Busca por desenho (passo 2)', () => {
  it('desenho completo ou parcial: só itens de projetos liberados, com solicitado, recebido e saldo', async () => {
    const res = await request(app).get('/itens/busca?desenho=tst-00').set(await comoUsuario('usuario'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5); // os 5 do PRJ-TESTE-01; PRJ-TESTE-02 não está liberado
    expect(res.body.every((i: { projeto: string }) => i.projeto === 'PRJ-TESTE-01')).toBe(true);

    const tst001 = (await request(app).get('/itens/busca?desenho=TST-001').set(await enc())).body;
    expect(tst001.map((i: { maquina: string; dataSolicitacao: string; quantidadeSolicitada: number; saldo: number }) => [i.maquina, i.dataSolicitacao, i.quantidadeSolicitada, i.saldo])).toEqual([
      ['Esteira Teste A', '2026-11-03', 10, 10],
      ['Alimentador Teste B', '2026-11-05', 6, 6],
      ['Alimentador Teste B', '2026-11-07', 2, 2],
    ]);
  });
});

describe('FP — baixa por máquina', () => {
  it('TST-002 (Esteira Teste A): 3 peças → PARCIAL, saldo 1; mais 1 → COMPLETO; guarda quem e quando', async () => {
    const item = await idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-002');

    const primeira = await baixa(item, 3, 'Chegou na carga 1');
    expect(primeira.status).toBe(201);
    expect(primeira.body.aviso).toBeNull();
    expect(primeira.body.item).toMatchObject({ quantidadeRecebida: 3, saldo: 1, status: 'PARCIAL' });
    expect(primeira.body.recebimento).toMatchObject({ itemId: item, quantidade: 3, observacao: 'Chegou na carga 1', registradoPor: ids.encarregado, estornado: false });
    expect(Date.now() - new Date(primeira.body.recebimento.registradoEm).getTime()).toBeLessThan(60_000);

    const segunda = await baixa(item, 1);
    expect(segunda.body.item).toMatchObject({ quantidadeRecebida: 4, saldo: 0, status: 'COMPLETO' });
  });
});

describe('FA — fluxos alternativos', () => {
  it('FA1 pelo projeto, TST-001, 15 peças → 10 / 5 / 0; a prévia não grava e a gravação bate com ela', async () => {
    const [a, b, c] = await solicitacoesTst001();

    const previa = await baixaProjeto(projetos['PRJ-TESTE-01'], 'TST-001', 15, true);
    expect(previa.status).toBe(200);
    expect(previa.body).toMatchObject({ desenho: 'TST-001', quantidadeInformada: 15, quantidadeRegistrada: 15, excedente: 0, aviso: null });
    expect(previa.body.distribuicao.map((d: { item: { id: string }; quantidade: number }) => [d.item.id, d.quantidade])).toEqual([[a, 10], [b, 5], [c, 0]]);
    expect((await recebidoDe(a)).quantidade_recebida).toBe(0);

    const res = await baixaProjeto(projetos['PRJ-TESTE-01'], 'tst-001', 15);
    expect(res.status).toBe(201);
    expect(res.body.distribuicao.map((d: { quantidade: number }) => d.quantidade)).toEqual([10, 5, 0]);
    expect(res.body.recebimentos).toHaveLength(2); // cada item recebe a sua própria remessa
    expect(await recebidoDe(a)).toMatchObject({ quantidade_recebida: 10, status: 'COMPLETO' });
    expect(await recebidoDe(b)).toMatchObject({ quantidade_recebida: 5, saldo: 1, status: 'PARCIAL' });
    expect(await recebidoDe(c)).toMatchObject({ quantidade_recebida: 0, status: 'PENDENTE' });
  });

  it('FA1 em datas iguais vale a ordem de cadastro (RN14)', async () => {
    const eng = await comoUsuario('engenheiro');
    const maquina = (await supabase().from('maquinas').select('id').eq('nome', 'Esteira Teste A').single()).data!.id;
    // Duas solicitações novas do mesmo desenho na mesma data: a primeira cadastrada recebe primeiro
    const primeira = await request(app).post(`/maquinas/${maquina}/itens`).set(eng).send({ desenho: 'TST-007', quantidadeSolicitada: 3, dataSolicitacao: '2026-11-10' });
    const segunda = await request(app).post(`/maquinas/${maquina}/itens`).set(eng).send({ desenho: 'TST-007', quantidadeSolicitada: 3, dataSolicitacao: '2026-11-10' });

    const previa = await baixaProjeto(projetos['PRJ-TESTE-01'], 'TST-007', 4, true);
    expect(previa.body.distribuicao.map((d: { item: { id: string }; quantidade: number }) => [d.item.id, d.quantidade])).toEqual([
      [primeira.body.id, 3],
      [segunda.body.id, 1],
    ]);
  });

  it('FA2 pelo projeto, TST-001, 20 peças → 18 registradas e aviso EX16 de 2', async () => {
    const previa = await baixaProjeto(projetos['PRJ-TESTE-01'], 'TST-001', 20, true);
    expect(previa.body).toMatchObject({
      quantidadeRegistrada: 18,
      excedente: 2,
      aviso: { codigo: 'EX16', mensagem: 'Serão registradas 18 peça(s). 2 excedente(s) não serão registradas.' },
    });

    const res = await baixaProjeto(projetos['PRJ-TESTE-01'], 'TST-001', 20);
    expect(res.status).toBe(200);
    expect(res.body.distribuicao.map((d: { quantidade: number }) => d.quantidade)).toEqual([10, 6, 2]);
    expect(res.body.aviso.codigo).toBe('EX16');
    expect(res.body.distribuicao.every((d: { item: { status: string } }) => d.item.status === 'COMPLETO')).toBe(true);
  });

  it('FA2 por máquina: TST-002 com 6 → 4 registradas e aviso EX16 de 2', async () => {
    const item = await idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-002');
    const res = await baixa(item, 6);
    expect(res.status).toBe(200);
    expect(res.body.recebimento.quantidade).toBe(4);
    expect(res.body.aviso).toEqual({ codigo: 'EX16', mensagem: 'Serão registradas 4 peça(s). 2 excedente(s) não serão registradas.' });
    expect(res.body.item.status).toBe('COMPLETO');
  });

  it('FA3 atualizar remessa de 3 para 2 → saldo recalculado, com quem e quando; acima do saldo → recusa', async () => {
    const item = await idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-002');
    const { body } = await baixa(item, 3);

    const res = await request(app).put(`/recebimentos/${body.recebimento.id}`).set(await enc()).send({ quantidade: 2 });
    expect(res.status).toBe(200);
    expect(res.body.recebimento).toMatchObject({ quantidade: 2, atualizadoPor: ids.encarregado });
    expect(res.body.recebimento.atualizadoEm).not.toBeNull();
    expect(res.body.item).toMatchObject({ quantidadeRecebida: 2, saldo: 2, status: 'PARCIAL' });

    // O saldo conta a própria remessa: pode ir até 4 (2 da remessa + 2 de saldo), não 5
    const acima = await request(app).put(`/recebimentos/${body.recebimento.id}`).set(await enc()).send({ quantidade: 5 });
    expect(acima.status).toBe(400);
    expect(acima.body).toMatchObject({ codigo: 'EX06', mensagem: 'Verifique o campo quantidade: não pode passar de 4 peça(s) (saldo do item).' });
    const limite = await request(app).put(`/recebimentos/${body.recebimento.id}`).set(await enc()).send({ quantidade: 4 });
    expect(limite.body.item.status).toBe('COMPLETO');
  });

  it('FA4 estornar → item volta a PENDENTE; a remessa continua gravada e marcada', async () => {
    const item = await idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-002');
    const { body } = await baixa(item, 3);

    const res = await request(app).patch(`/recebimentos/${body.recebimento.id}/estornar`).set(await enc());
    expect(res.status).toBe(200);
    expect(res.body.recebimento).toMatchObject({ estornado: true, estornadoPor: ids.encarregado, quantidade: 3 });
    expect(res.body.recebimento.estornadoEm).not.toBeNull();
    expect(res.body.item).toMatchObject({ quantidadeRecebida: 0, saldo: 4, status: 'PENDENTE' });

    const { data: historico } = await supabase().from('recebimentos').select('quantidade, estornado').eq('item_id', item);
    expect(historico).toEqual([{ quantidade: 3, estornado: true }]);
  });
});

describe('FE — fluxos de exceção', () => {
  it('FE1 desenho "TST-999" ou só em projeto não liberado → EX19', async () => {
    for (const desenho of ['TST-999', 'TST-004']) {
      const res = await request(app).get(`/itens/busca?desenho=${desenho}`).set(await enc());
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ codigo: 'EX19', mensagem: 'Nenhum item com este desenho em projetos liberados.' });
    }
    expect((await baixaProjeto(projetos['PRJ-TESTE-01'], 'TST-999', 1, true)).body.codigo).toBe('EX19');
  });

  it('FE2 baixa no PRJ-TESTE-02 (não liberado) → EX12, por máquina e pelo projeto', async () => {
    const item = await idDoItem('PRJ-TESTE-02', 'Mesa Teste C', 'TST-004');
    const porMaquina = await baixa(item, 1);
    expect(porMaquina.status).toBe(422);
    expect(porMaquina.body).toEqual({ codigo: 'EX12', mensagem: 'Este projeto ainda não foi liberado para a produção.' });
    expect((await baixaProjeto(projetos['PRJ-TESTE-02'], 'TST-001', 1)).body.codigo).toBe('EX12');
    expect((await recebidoDe(item)).quantidade_recebida).toBe(0);
  });

  it('FE3 baixa em item COMPLETO → EX15 (por máquina e pelo projeto com tudo completo)', async () => {
    const item = await idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-002');
    await baixa(item, 4);
    const res = await baixa(item, 1);
    expect(res.status).toBe(422);
    expect(res.body).toEqual({ codigo: 'EX15', mensagem: 'Este item já foi recebido por completo.' });

    await baixaProjeto(projetos['PRJ-TESTE-01'], 'TST-001', 18);
    expect((await baixaProjeto(projetos['PRJ-TESTE-01'], 'TST-001', 1)).body.codigo).toBe('EX15');
  });

  it.each([0, 1.5, -2, '3'])('FE4 quantidade %p → EX06 (baixa, pelo projeto e atualização)', async (quantidade) => {
    const item = await idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-002');
    const porMaquina = await baixa(item, quantidade);
    expect(porMaquina.status).toBe(400);
    expect(porMaquina.body.codigo).toBe('EX06');
    expect(porMaquina.body.mensagem).toContain('campo quantidade');
    expect((await baixaProjeto(projetos['PRJ-TESTE-01'], 'TST-001', quantidade)).body.codigo).toBe('EX06');

    const { body } = await baixa(item, 1);
    const atualizar = await request(app).put(`/recebimentos/${body.recebimento.id}`).set(await enc()).send({ quantidade });
    expect(atualizar.body.codigo).toBe('EX06');
  });

  it('FE5 estornar duas vezes ou atualizar remessa estornada → EX18', async () => {
    const item = await idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-002');
    const { body } = await baixa(item, 2);
    await request(app).patch(`/recebimentos/${body.recebimento.id}/estornar`).set(await enc());

    const deNovo = await request(app).patch(`/recebimentos/${body.recebimento.id}/estornar`).set(await enc());
    const atualizar = await request(app).put(`/recebimentos/${body.recebimento.id}`).set(await enc()).send({ quantidade: 1 });
    for (const res of [deNovo, atualizar]) {
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ codigo: 'EX18', mensagem: 'Esta remessa já foi estornada.' });
    }
  });

  it('FE6 Engenheiro tenta dar baixa, simular, atualizar ou estornar → EX04', async () => {
    const eng = await comoUsuario('engenheiro');
    const item = await idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-002');
    const { body } = await baixa(item, 1);
    const respostas = [
      await request(app).post(`/itens/${item}/recebimentos`).set(eng).send({ quantidade: 1 }),
      await request(app).post(`/projetos/${projetos['PRJ-TESTE-01']}/recebimentos/previa`).set(eng).send({ desenho: 'TST-001', quantidade: 1 }),
      await request(app).post(`/projetos/${projetos['PRJ-TESTE-01']}/recebimentos`).set(eng).send({ desenho: 'TST-001', quantidade: 1 }),
      await request(app).put(`/recebimentos/${body.recebimento.id}`).set(eng).send({ quantidade: 1 }),
      await request(app).patch(`/recebimentos/${body.recebimento.id}/estornar`).set(eng),
    ];
    for (const res of respostas) {
      expect(res.status).toBe(403);
      expect(res.body.codigo).toBe('EX04');
    }
  });

  it('item, projeto ou remessa inexistente → EX09', async () => {
    const respostas = [
      await baixa(INEXISTENTE, 1),
      await baixaProjeto(INEXISTENTE, 'TST-001', 1),
      await request(app).put(`/recebimentos/${INEXISTENTE}`).set(await enc()).send({ quantidade: 1 }),
      await request(app).patch(`/recebimentos/${INEXISTENTE}/estornar`).set(await enc()),
    ];
    for (const res of respostas) expect(res.body.codigo).toBe('EX09');
  });
});

describe('Concorrência (RN13)', () => {
  it('duas baixas de 4 ao mesmo tempo no TST-002 (saldo 4): nunca passa do solicitado', async () => {
    const item = await idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-002');
    const respostas = await Promise.all([baixa(item, 4), baixa(item, 4)]);

    expect(await recebidoDe(item)).toMatchObject({ quantidade_recebida: 4, status: 'COMPLETO' });
    // Uma registra as 4; a outra encontra o item completo
    expect(respostas.map((r) => r.body.codigo ?? r.body.recebimento.quantidade).sort()).toEqual([4, 'EX15']);
  });

  it('duas baixas pelo projeto ao mesmo tempo (15 + 15 em TST-001, saldo 18): total registrado = 18', async () => {
    const [a, b, c] = await solicitacoesTst001();
    await Promise.all([baixaProjeto(projetos['PRJ-TESTE-01'], 'TST-001', 15), baixaProjeto(projetos['PRJ-TESTE-01'], 'TST-001', 15)]);
    const total = (await recebidoDe(a)).quantidade_recebida + (await recebidoDe(b)).quantidade_recebida + (await recebidoDe(c)).quantidade_recebida;
    expect(total).toBe(18);
  });
});
