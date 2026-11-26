import request from 'supertest';
import { criarApp } from '../src/app';
import { env } from '../src/config/env';
import { supabase } from '../src/config/supabase';
import { comoUsuario, prepararUsuarios } from './helpers/auth';
import { limparBanco } from './helpers/banco';
import { idDoItem, importarPlanilhaTeste } from './helpers/cenarios';

// UC08 — Consultar itens e baixas (CONTEXT.md seção 9; plano seção 11).
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

async function listar(query = '') {
  return request(app).get(`/itens${query}`).set(await comoUsuario('usuario'));
}

const desenhos = (itens: { desenho: string }[]) => itens.map((i) => i.desenho);

describe('FP — listar e filtrar itens', () => {
  it('Usuário Teste lista os 8 itens com projeto, máquina, desenho, processo, solicitado, recebido, saldo e status', async () => {
    const res = await listar();
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(8);
    expect(res.body[0]).toMatchObject({
      projeto: 'PRJ-TESTE-01',
      maquina: 'Esteira Teste A',
      desenho: 'TST-001',
      processo: 'Corte Laser',
      quantidadeSolicitada: 10,
      quantidadeRecebida: 0,
      saldo: 10,
      status: 'PENDENTE',
    });
  });

  it('filtros: status, desenho parcial, máquina, projeto, processo e combinados', async () => {
    const esteira = (await supabase().from('maquinas').select('id').eq('nome', 'Esteira Teste A').single()).data!.id;
    await request(app).post(`/itens/${await idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-002')}/recebimentos`).set(await comoUsuario('encarregado')).send({ quantidade: 2 });

    expect((await listar('?status=PENDENTE')).body).toHaveLength(7);
    expect(desenhos((await listar('?status=PARCIAL')).body)).toEqual(['TST-002']);
    expect((await listar('?status=COMPLETO')).body).toEqual([]);
    expect((await listar('?desenho=TST-00')).body).toHaveLength(8);
    expect((await listar('?desenho=tst-001')).body).toHaveLength(4);
    expect(desenhos((await listar(`?maquina=${esteira}`)).body)).toEqual(['TST-001', 'TST-002']);
    expect(desenhos((await listar(`?projeto=${projetos['PRJ-TESTE-02']}`)).body)).toEqual(['TST-001', 'TST-004', 'TST-005']);
    expect((await listar('?processo=laser')).body).toHaveLength(4);
    expect(desenhos((await listar(`?projeto=${projetos['PRJ-TESTE-01']}&desenho=TST-001&status=PENDENTE`)).body)).toEqual(['TST-001', 'TST-001', 'TST-001']);
  });

  it('histórico: quem e quando registrou, atualizou e estornou; estornada marcada e fora do recebido', async () => {
    const item = await idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-001');
    const enc = await comoUsuario('encarregado');
    const primeira = await request(app).post(`/itens/${item}/recebimentos`).set(enc).send({ quantidade: 3, observacao: 'Carga 1' });
    await request(app).put(`/recebimentos/${primeira.body.recebimento.id}`).set(enc).send({ quantidade: 4 });
    const segunda = await request(app).post(`/itens/${item}/recebimentos`).set(enc).send({ quantidade: 2 });
    await request(app).patch(`/recebimentos/${segunda.body.recebimento.id}/estornar`).set(enc);

    const res = await request(app).get(`/itens/${item}/recebimentos`).set(await comoUsuario('usuario'));
    expect(res.status).toBe(200);
    expect(res.body.item).toMatchObject({ desenho: 'TST-001', quantidadeRecebida: 4, saldo: 6, status: 'PARCIAL' });
    expect(res.body.recebimentos).toHaveLength(2);
    expect(res.body.recebimentos[0]).toMatchObject({
      quantidade: 4,
      observacao: 'Carga 1',
      registradoPor: ids.encarregado,
      registradoPorNome: 'Encarregado Teste',
      atualizadoPorNome: 'Encarregado Teste',
      estornado: false,
      estornadoPorNome: null,
    });
    expect(res.body.recebimentos[0].atualizadoEm).not.toBeNull();
    expect(res.body.recebimentos[1]).toMatchObject({ quantidade: 2, estornado: true, estornadoPorNome: 'Encarregado Teste', atualizadoPorNome: null });
    expect(new Date(res.body.recebimentos[0].registradoEm) < new Date(res.body.recebimentos[1].registradoEm)).toBe(true);
  });

  it('histórico de item sem remessas: lista vazia', async () => {
    const item = await idDoItem('PRJ-TESTE-02', 'Mesa Teste C', 'TST-005');
    const res = await request(app).get(`/itens/${item}/recebimentos`).set(await comoUsuario('usuario'));
    expect(res.body).toMatchObject({ item: { desenho: 'TST-005', status: 'PENDENTE' }, recebimentos: [] });
  });
});

describe('FA / FE', () => {
  it('FA2 filtro sem resultado → lista vazia', async () => {
    const res = await listar('?desenho=NAO-EXISTE');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('filtro inválido (status ou id) → EX06', async () => {
    for (const query of ['?status=CANCELADO', '?projeto=abc', '?maquina=123']) {
      const res = await listar(query);
      expect(res.status).toBe(400);
      expect(res.body.codigo).toBe('EX06');
    }
  });

  it('FE1 item inexistente → EX09', async () => {
    for (const id of [INEXISTENTE, 'nao-e-uuid']) {
      const res = await request(app).get(`/itens/${id}/recebimentos`).set(await comoUsuario('usuario'));
      expect(res.status).toBe(404);
      expect(res.body.codigo).toBe('EX09');
    }
  });

  it('FE2 sem token → EX03', async () => {
    for (const caminho of ['/itens', `/itens/${INEXISTENTE}/recebimentos`]) {
      const res = await request(app).get(caminho);
      expect(res.status).toBe(401);
      expect(res.body.codigo).toBe('EX03');
    }
  });
});
