import request from 'supertest';
import { criarApp } from '../src/app';
import { env } from '../src/config/env';
import { supabase } from '../src/config/supabase';
import { comoUsuario, prepararUsuarios } from './helpers/auth';
import { limparBanco } from './helpers/banco';
import { idDoItem, importarPlanilhaTeste, registrarRecebimentoDireto } from './helpers/cenarios';

// UC05 — Manter máquinas (CONTEXT.md seção 9; plano seção 8).
const app = criarApp(env().FRONTEND_URL);
const INEXISTENTE = '7d1a3c1e-0000-4000-8000-000000000000';
const ITEM_TST006 = { desenho: 'TST-006', processo: 'Corte Laser', material: 'SAE 1020', quantidadeSolicitada: 7, dataSolicitacao: '2026-11-10' };
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

const eng = () => comoUsuario('engenheiro');

async function novaMaquina(projetoId: string, nome: string) {
  return request(app).post(`/projetos/${projetoId}/maquinas`).set(await eng()).send({ nome });
}

async function novoItem(maquinaId: string, corpo: object = ITEM_TST006) {
  return request(app).post(`/maquinas/${maquinaId}/itens`).set(await eng()).send(corpo);
}

async function idDaMaquina(projeto: string, nome: string) {
  const { data } = await supabase().from('maquinas').select('id').eq('projeto_id', projetos[projeto]).eq('nome', nome).single();
  return data!.id as string;
}

describe('FP — cadastrar máquina e item', () => {
  it('em PRJ-TESTE-03: cria "Esteira Teste D" e o item TST-006 (7 peças, 10/11/2026) como PENDENTE', async () => {
    const projeto = await request(app).post('/projetos').set(await eng()).send({ codigo: 'PRJ-TESTE-03', nome: 'Projeto Teste 3' });

    const maquina = await novaMaquina(projeto.body.id, 'Esteira Teste D');
    expect(maquina.status).toBe(201);
    expect(maquina.body).toMatchObject({ projetoId: projeto.body.id, nome: 'Esteira Teste D', totalItens: 0, percentualRecebido: 0 });

    const item = await novoItem(maquina.body.id);
    expect(item.status).toBe(201);
    expect(item.body).toMatchObject({
      maquinaId: maquina.body.id,
      maquina: 'Esteira Teste D',
      projeto: 'PRJ-TESTE-03',
      desenho: 'TST-006',
      processo: 'Corte Laser',
      material: 'SAE 1020',
      quantidadeSolicitada: 7,
      dataSolicitacao: '2026-11-10',
      quantidadeRecebida: 0,
      saldo: 7,
      status: 'PENDENTE',
    });

    // Passo 1: a tela do projeto lista a máquina com a quantidade de itens e o percentual
    const detalhe = await request(app).get(`/projetos/${projeto.body.id}`).set(await eng());
    expect(detalhe.body.maquinas).toEqual([expect.objectContaining({ nome: 'Esteira Teste D', totalItens: 1, totalSolicitado: 7, percentualRecebido: 0 })]);
  });

  it('lista os itens da máquina com recebido, saldo e status (GET /itens?maquina=)', async () => {
    const maquina = await idDaMaquina('PRJ-TESTE-01', 'Alimentador Teste B');
    const res = await request(app).get(`/itens?maquina=${maquina}`).set(await comoUsuario('usuario'));
    expect(res.status).toBe(200);
    expect(res.body.map((i: { desenho: string; quantidadeSolicitada: number; dataSolicitacao: string }) => [i.desenho, i.quantidadeSolicitada, i.dataSolicitacao])).toEqual([
      ['TST-001', 6, '2026-11-05'],
      ['TST-003', 20, '2026-11-05'],
      ['TST-001', 2, '2026-11-07'],
    ]);
  });

  it('item sem processo e material (opcionais) e o mesmo desenho de novo na mesma máquina (RN09)', async () => {
    const maquina = await idDaMaquina('PRJ-TESTE-01', 'Esteira Teste A');
    const res = await novoItem(maquina, { desenho: 'TST-001', quantidadeSolicitada: 3, dataSolicitacao: '2026-11-20', processo: '' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ desenho: 'TST-001', processo: null, material: null });
  });
});

describe('FA — fluxos alternativos', () => {
  it('FA1 renomear a máquina (mudar só maiúsculas do próprio nome também vale)', async () => {
    const maquina = await idDaMaquina('PRJ-TESTE-01', 'Esteira Teste A');
    const res = await request(app).put(`/maquinas/${maquina}`).set(await eng()).send({ nome: 'Esteira Principal' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: maquina, nome: 'Esteira Principal', totalItens: 2 });

    const mesmo = await request(app).put(`/maquinas/${maquina}`).set(await eng()).send({ nome: 'ESTEIRA PRINCIPAL' });
    expect(mesmo.status).toBe(200);
  });

  it('FA2 excluir máquina sem recebimento: some com os itens', async () => {
    const maquina = await idDaMaquina('PRJ-TESTE-01', 'Alimentador Teste B');
    const res = await request(app).delete(`/maquinas/${maquina}`).set(await eng());
    expect(res.status).toBe(204);

    const detalhe = await request(app).get(`/projetos/${projetos['PRJ-TESTE-01']}`).set(await eng());
    expect(detalhe.body).toMatchObject({ totalMaquinas: 1, totalItens: 2, totalSolicitado: 14 });
  });

  it('FA3 alterar item; com 4 recebidas, aceita 5 e recusa 3 (EX21)', async () => {
    const item = await idDoItem('PRJ-TESTE-01', 'Alimentador Teste B', 'TST-003');
    await registrarRecebimentoDireto(item, 4, ids.encarregado);
    const corpo = { desenho: 'TST-003', processo: 'Comerciais', material: 'Aço carbono', dataSolicitacao: '2026-11-05' };

    const aceita = await request(app).put(`/itens/${item}`).set(await eng()).send({ ...corpo, quantidadeSolicitada: 5 });
    expect(aceita.status).toBe(200);
    expect(aceita.body).toMatchObject({ quantidadeSolicitada: 5, quantidadeRecebida: 4, saldo: 1, status: 'PARCIAL' });

    const recusa = await request(app).put(`/itens/${item}`).set(await eng()).send({ ...corpo, quantidadeSolicitada: 3 });
    expect(recusa.status).toBe(422);
    expect(recusa.body).toEqual({ codigo: 'EX21', mensagem: 'A quantidade não pode ser menor que a já recebida (4).' });

    // Igual ao recebido vira COMPLETO
    const igual = await request(app).put(`/itens/${item}`).set(await eng()).send({ ...corpo, quantidadeSolicitada: 4 });
    expect(igual.body).toMatchObject({ saldo: 0, status: 'COMPLETO' });
  });

  it('FA3 corrigir desenho, processo, material e data de item sem recebimento', async () => {
    const item = await idDoItem('PRJ-TESTE-02', 'Mesa Teste C', 'TST-005');
    const res = await request(app)
      .put(`/itens/${item}`)
      .set(await eng())
      .send({ desenho: 'TST-005A', processo: 'Usinagem', material: 'Alumínio', quantidadeSolicitada: 2, dataSolicitacao: '2026-11-08' });
    expect(res.body).toMatchObject({ desenho: 'TST-005A', processo: 'Usinagem', material: 'Alumínio', quantidadeSolicitada: 2, dataSolicitacao: '2026-11-08' });
  });

  it('FA4 excluir item sem recebimento', async () => {
    const item = await idDoItem('PRJ-TESTE-02', 'Mesa Teste C', 'TST-004');
    expect((await request(app).delete(`/itens/${item}`).set(await eng())).status).toBe(204);
    expect((await request(app).get(`/projetos/${projetos['PRJ-TESTE-02']}`).set(await eng())).body.totalItens).toBe(2);
  });

  it('FA5 incluir máquina e item em projeto LIBERADO', async () => {
    // A liberação é do UC06; aqui ela é feita direto no banco
    await supabase()
      .from('projetos')
      .update({ status: 'LIBERADO', liberado_por: ids.engenheiro, liberado_em: new Date().toISOString() })
      .eq('id', projetos['PRJ-TESTE-01']);

    const maquina = await novaMaquina(projetos['PRJ-TESTE-01'], 'Transportador Teste E');
    expect(maquina.status).toBe(201);
    const item = await novoItem(maquina.body.id);
    expect(item.status).toBe(201);
    expect(item.body).toMatchObject({ projetoStatus: 'LIBERADO', status: 'PENDENTE' });
  });
});

describe('FE — fluxos de exceção', () => {
  it('FE1 "Esteira Teste A" repetida no PRJ-TESTE-01 (também ao renomear) → EX08', async () => {
    for (const nome of ['Esteira Teste A', 'esteira teste a']) {
      const res = await novaMaquina(projetos['PRJ-TESTE-01'], nome);
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ codigo: 'EX08', mensagem: 'Este projeto já tem uma máquina com este nome.' });
    }
    const alimentador = await idDaMaquina('PRJ-TESTE-01', 'Alimentador Teste B');
    const renomear = await request(app).put(`/maquinas/${alimentador}`).set(await eng()).send({ nome: 'Esteira Teste A' });
    expect(renomear.body.codigo).toBe('EX08');

    // O mesmo nome em outro projeto pode
    expect((await novaMaquina(projetos['PRJ-TESTE-02'], 'Esteira Teste A')).status).toBe(201);
  });

  it.each([
    ['quantidade 0', { ...ITEM_TST006, quantidadeSolicitada: 0 }, 'quantidadeSolicitada'],
    ['quantidade 1,5', { ...ITEM_TST006, quantidadeSolicitada: 1.5 }, 'quantidadeSolicitada'],
    ['desenho vazio', { ...ITEM_TST006, desenho: ' ' }, 'desenho'],
    ['data inválida', { ...ITEM_TST006, dataSolicitacao: '2026-02-31' }, 'dataSolicitacao'],
    ['sem data', { desenho: 'X', quantidadeSolicitada: 1 }, 'dataSolicitacao'],
  ])('FE2 %s → EX06', async (_caso, corpo, campo) => {
    const maquina = await idDaMaquina('PRJ-TESTE-01', 'Esteira Teste A');
    const res = await novoItem(maquina, corpo);
    expect(res.status).toBe(400);
    expect(res.body.codigo).toBe('EX06');
    expect(res.body.mensagem).toContain(`campo ${campo}`);
  });

  it('FE2 nome de máquina vazio → EX06', async () => {
    const res = await novaMaquina(projetos['PRJ-TESTE-01'], '');
    expect(res.body.codigo).toBe('EX06');
  });

  it('FE3 excluir máquina ou item com recebimento (mesmo estornado) → EX17 e nada é excluído', async () => {
    const item = await idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-002');
    const remessa = await registrarRecebimentoDireto(item, 1, ids.encarregado);
    await supabase().from('recebimentos').update({ estornado: true, estornado_por: ids.encarregado, estornado_em: new Date().toISOString() }).eq('id', remessa);

    const maquina = await idDaMaquina('PRJ-TESTE-01', 'Esteira Teste A');
    for (const res of [await request(app).delete(`/maquinas/${maquina}`).set(await eng()), await request(app).delete(`/itens/${item}`).set(await eng())]) {
      expect(res.status).toBe(409);
      expect(res.body.codigo).toBe('EX17');
    }
    expect((await request(app).get(`/projetos/${projetos['PRJ-TESTE-01']}`).set(await eng())).body).toMatchObject({ totalMaquinas: 2, totalItens: 5 });
  });

  it('FE4 reduzir abaixo do recebido → EX21 com a quantidade recebida', async () => {
    const item = await idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-001');
    await registrarRecebimentoDireto(item, 8, ids.encarregado);
    const res = await request(app)
      .put(`/itens/${item}`)
      .set(await eng())
      .send({ desenho: 'TST-001', quantidadeSolicitada: 7, dataSolicitacao: '2026-11-03' });
    expect(res.body).toEqual({ codigo: 'EX21', mensagem: 'A quantidade não pode ser menor que a já recebida (8).' });
  });

  it('FE5 Usuário Teste não cadastra, altera nem exclui (EX04)', async () => {
    const usuario = await comoUsuario('usuario');
    const maquina = await idDaMaquina('PRJ-TESTE-01', 'Esteira Teste A');
    const item = await idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-002');
    const respostas = [
      await request(app).post(`/projetos/${projetos['PRJ-TESTE-01']}/maquinas`).set(usuario).send({ nome: 'X' }),
      await request(app).put(`/maquinas/${maquina}`).set(usuario).send({ nome: 'X' }),
      await request(app).delete(`/maquinas/${maquina}`).set(usuario),
      await request(app).post(`/maquinas/${maquina}/itens`).set(usuario).send(ITEM_TST006),
      await request(app).put(`/itens/${item}`).set(usuario).send(ITEM_TST006),
      await request(app).delete(`/itens/${item}`).set(usuario),
    ];
    for (const res of respostas) {
      expect(res.status).toBe(403);
      expect(res.body.codigo).toBe('EX04');
    }
  });

  it('projeto, máquina ou item inexistente → EX09', async () => {
    const respostas = [
      await novaMaquina(INEXISTENTE, 'X'),
      await request(app).put(`/maquinas/${INEXISTENTE}`).set(await eng()).send({ nome: 'X' }),
      await request(app).delete(`/maquinas/${INEXISTENTE}`).set(await eng()),
      await novoItem(INEXISTENTE),
      await request(app).put(`/itens/${INEXISTENTE}`).set(await eng()).send(ITEM_TST006),
      await request(app).delete(`/itens/${INEXISTENTE}`).set(await eng()),
    ];
    for (const res of respostas) expect(res.body.codigo).toBe('EX09');
  });
});
