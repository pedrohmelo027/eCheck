import request from 'supertest';
import { criarApp } from '../src/app';
import { env } from '../src/config/env';
import { supabase } from '../src/config/supabase';
import { comoUsuario, prepararUsuarios } from './helpers/auth';
import { limparBanco } from './helpers/banco';
import { idDoItem, importarPlanilhaTeste, registrarRecebimentoDireto } from './helpers/cenarios';

// UC04 — Manter projetos (CONTEXT.md seção 9; plano seção 7).
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

async function cadastrar(corpo: object, quem: 'engenheiro' | 'encarregado' = 'engenheiro') {
  return request(app).post('/projetos').set(await comoUsuario(quem)).send(corpo);
}

async function contar(tabela: string) {
  const { count } = await supabase().from(tabela).select('*', { count: 'exact', head: true });
  return count;
}

describe('FP — cadastrar projeto', () => {
  it('cadastra PRJ-TESTE-03: 201, EM_CADASTRO, criadoPor = Engenheiro Teste, sem itens', async () => {
    const res = await cadastrar({ codigo: 'PRJ-TESTE-03', nome: 'Projeto Teste 3', descricao: 'Criado no teste' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      codigo: 'PRJ-TESTE-03',
      nome: 'Projeto Teste 3',
      descricao: 'Criado no teste',
      status: 'EM_CADASTRO',
      criadoPor: ids.engenheiro,
      liberadoPor: null,
      totalMaquinas: 0,
      totalItens: 0,
      percentualRecebido: 0,
    });
  });

  it('lista os projetos com código, nome, status, totais e percentual', async () => {
    const res = await request(app).get('/projetos').set(await comoUsuario('engenheiro'));
    expect(res.status).toBe(200);
    expect(res.body.map((p: { codigo: string }) => p.codigo)).toEqual(['PRJ-TESTE-01', 'PRJ-TESTE-02']);
    expect(res.body[0]).toMatchObject({ status: 'EM_CADASTRO', totalMaquinas: 2, totalItens: 5, totalSolicitado: 42, totalRecebido: 0, percentualRecebido: 0 });
    expect(res.body[1]).toMatchObject({ totalMaquinas: 1, totalItens: 3, totalSolicitado: 9 });
  });

  it('percentual simples sem estornos: 15 de 42 recebidas → 35,7%', async () => {
    const esteira = await idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-001');
    const alimentador = await idDoItem('PRJ-TESTE-01', 'Alimentador Teste B', 'TST-001', '2026-11-05');
    await registrarRecebimentoDireto(esteira, 10, ids.encarregado);
    await registrarRecebimentoDireto(alimentador, 5, ids.encarregado);
    // Remessa estornada não conta (RN17)
    const estornada = await registrarRecebimentoDireto(alimentador, 1, ids.encarregado);
    await supabase().from('recebimentos').update({ estornado: true, estornado_por: ids.encarregado, estornado_em: new Date().toISOString() }).eq('id', estornada);

    const res = await request(app).get(`/projetos/${projetos['PRJ-TESTE-01']}`).set(await comoUsuario('usuario'));
    expect(res.body).toMatchObject({ totalSolicitado: 42, totalRecebido: 15, percentualRecebido: 35.7 });
  });
});

describe('FA — fluxos alternativos', () => {
  it('FA1 alterar código, nome e descrição; o status não muda pelo PUT', async () => {
    const id = projetos['PRJ-TESTE-02'];
    const res = await request(app)
      .put(`/projetos/${id}`)
      .set(await comoUsuario('engenheiro'))
      .send({ codigo: 'PRJ-TESTE-02B', nome: 'Mesa renomeada', descricao: '', status: 'LIBERADO' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id, codigo: 'PRJ-TESTE-02B', nome: 'Mesa renomeada', descricao: null, status: 'EM_CADASTRO' });
  });

  it('FA1 manter o próprio código (só mudando maiúsculas) não é repetição', async () => {
    const res = await request(app)
      .put(`/projetos/${projetos['PRJ-TESTE-01']}`)
      .set(await comoUsuario('engenheiro'))
      .send({ codigo: 'prj-teste-01', nome: 'Esteiras' });
    expect(res.status).toBe(200);
    expect(res.body.codigo).toBe('prj-teste-01');
  });

  it('FA2 excluir projeto importado sem recebimentos: some com máquinas e itens', async () => {
    const res = await request(app).delete(`/projetos/${projetos['PRJ-TESTE-01']}`).set(await comoUsuario('engenheiro'));
    expect(res.status).toBe(204);

    const lista = await request(app).get('/projetos').set(await comoUsuario('engenheiro'));
    expect(lista.body.map((p: { codigo: string }) => p.codigo)).toEqual(['PRJ-TESTE-02']);
    expect(await contar('maquinas')).toBe(1);
    expect(await contar('itens_solicitados')).toBe(3);
  });

  it('FA3 detalhe do projeto com as máquinas, itens e totais de cada uma', async () => {
    const res = await request(app).get(`/projetos/${projetos['PRJ-TESTE-01']}`).set(await comoUsuario('engenheiro'));
    expect(res.status).toBe(200);
    expect(res.body.codigo).toBe('PRJ-TESTE-01');
    expect(res.body.maquinas).toEqual([
      expect.objectContaining({ nome: 'Esteira Teste A', totalItens: 2, totalSolicitado: 14, totalRecebido: 0, percentualRecebido: 0 }),
      expect.objectContaining({ nome: 'Alimentador Teste B', totalItens: 3, totalSolicitado: 28, totalRecebido: 0, percentualRecebido: 0 }),
    ]);
  });
});

describe('FE — fluxos de exceção', () => {
  it('FE1 código "PRJ-TESTE-01" repetido (mesmo com outras maiúsculas) → EX07', async () => {
    for (const codigo of ['PRJ-TESTE-01', 'prj-teste-01']) {
      const res = await cadastrar({ codigo, nome: 'Repetido' });
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ codigo: 'EX07', mensagem: 'Já existe um projeto com este código.' });
    }
    const alterar = await request(app)
      .put(`/projetos/${projetos['PRJ-TESTE-02']}`)
      .set(await comoUsuario('engenheiro'))
      .send({ codigo: 'PRJ-TESTE-01', nome: 'X' });
    expect(alterar.body.codigo).toBe('EX07');
  });

  it.each([
    ['código vazio', { codigo: '  ', nome: 'X' }, 'codigo'],
    ['nome vazio', { codigo: 'PRJ-X', nome: '' }, 'nome'],
    ['sem nome', { codigo: 'PRJ-X' }, 'nome'],
  ])('FE2 %s → EX06', async (_caso, corpo, campo) => {
    const res = await cadastrar(corpo);
    expect(res.status).toBe(400);
    expect(res.body.codigo).toBe('EX06');
    expect(res.body.mensagem).toContain(`campo ${campo}`);
  });

  it('FE3 excluir projeto com recebimento → EX17 e nada é excluído', async () => {
    const item = await idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-002');
    await registrarRecebimentoDireto(item, 1, ids.encarregado);

    const res = await request(app).delete(`/projetos/${projetos['PRJ-TESTE-01']}`).set(await comoUsuario('engenheiro'));
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ codigo: 'EX17', mensagem: 'Não é possível excluir: há recebimentos registrados.' });
    expect(await contar('projetos')).toBe(2);
    expect(await contar('maquinas')).toBe(3);
    expect(await contar('itens_solicitados')).toBe(8);
  });

  it('remessas só estornadas não bloqueiam: exclui o projeto com máquinas, itens e as remessas estornadas', async () => {
    const item = await idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-002');
    const remessa = await registrarRecebimentoDireto(item, 3, ids.encarregado);
    await supabase().from('recebimentos').update({ estornado: true, estornado_por: ids.encarregado, estornado_em: new Date().toISOString() }).eq('id', remessa);

    const res = await request(app).delete(`/projetos/${projetos['PRJ-TESTE-01']}`).set(await comoUsuario('engenheiro'));
    expect(res.status).toBe(204);
    expect(await contar('projetos')).toBe(1);
    expect(await contar('itens_solicitados')).toBe(3);
    expect(await contar('recebimentos')).toBe(0);
  });

  it('remessa ativa em um item e estornada em outro → EX17 e a estornada continua gravada', async () => {
    await registrarRecebimentoDireto(await idDoItem('PRJ-TESTE-01', 'Esteira Teste A', 'TST-002'), 1, ids.encarregado);
    const estornada = await registrarRecebimentoDireto(await idDoItem('PRJ-TESTE-01', 'Alimentador Teste B', 'TST-003'), 2, ids.encarregado);
    await supabase().from('recebimentos').update({ estornado: true, estornado_por: ids.encarregado, estornado_em: new Date().toISOString() }).eq('id', estornada);

    const res = await request(app).delete(`/projetos/${projetos['PRJ-TESTE-01']}`).set(await comoUsuario('engenheiro'));
    expect(res.body.codigo).toBe('EX17');
    expect(await contar('itens_solicitados')).toBe(8);
    expect(await contar('recebimentos')).toBe(2);
  });

  it('FE4 id inexistente → EX09 (ver, alterar e excluir)', async () => {
    const engenheiro = await comoUsuario('engenheiro');
    const respostas = [
      await request(app).get(`/projetos/${INEXISTENTE}`).set(engenheiro),
      await request(app).put(`/projetos/${INEXISTENTE}`).set(engenheiro).send({ codigo: 'X', nome: 'X' }),
      await request(app).delete(`/projetos/${INEXISTENTE}`).set(engenheiro),
      await request(app).get('/projetos/nao-e-uuid').set(engenheiro),
    ];
    for (const res of respostas) {
      expect(res.status).toBe(404);
      expect(res.body.codigo).toBe('EX09');
    }
  });

  it('FE5 Encarregado não cadastra, altera nem exclui (EX04); Usuário Teste consegue listar e ver', async () => {
    const encarregado = await comoUsuario('encarregado');
    const id = projetos['PRJ-TESTE-01'];
    const respostas = [
      await cadastrar({ codigo: 'PRJ-ENC', nome: 'X' }, 'encarregado'),
      await request(app).put(`/projetos/${id}`).set(encarregado).send({ codigo: 'X', nome: 'X' }),
      await request(app).delete(`/projetos/${id}`).set(encarregado),
    ];
    for (const res of respostas) expect(res.body.codigo).toBe('EX04');

    const usuario = await comoUsuario('usuario');
    expect((await request(app).get('/projetos').set(usuario)).status).toBe(200);
    expect((await request(app).get(`/projetos/${id}`).set(usuario)).status).toBe(200);
  });
});
