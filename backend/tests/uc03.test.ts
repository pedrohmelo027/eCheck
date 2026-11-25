import { readFileSync } from 'node:fs';
import request from 'supertest';
import { criarApp } from '../src/app';
import { env } from '../src/config/env';
import { supabase } from '../src/config/supabase';
import { comoUsuario, prepararUsuarios } from './helpers/auth';
import { limparBanco } from './helpers/banco';
import { CAMINHO_PLANILHA_TESTE, planilhaAlterada } from './helpers/planilha';

// UC03 — Importar planilha (CONTEXT.md seção 9; plano seção 6). Só com planilha-teste-echeck.xlsx.
const app = criarApp(env().FRONTEND_URL);
const PLANILHA = readFileSync(CAMINHO_PLANILHA_TESTE);
let ids: Awaited<ReturnType<typeof prepararUsuarios>>;

beforeAll(async () => {
  ids = await prepararUsuarios();
});

beforeEach(async () => {
  await limparBanco();
});

afterAll(async () => {
  await limparBanco();
});

async function enviar(conteudo: Buffer, nome = 'planilha-teste-echeck.xlsx', quem: 'engenheiro' | 'encarregado' = 'engenheiro') {
  return request(app).post('/importacoes').set(await comoUsuario(quem)).attach('arquivo', conteudo, nome);
}

async function confirmar(id: string, linhas: number[]) {
  return request(app).post(`/importacoes/${id}/confirmar`).set(await comoUsuario('engenheiro')).send({ linhas });
}

/** Importa e confirma as linhas marcadas por padrão (as novas). */
async function importarTudo(conteudo = PLANILHA) {
  const previa = await enviar(conteudo);
  const marcadas = previa.body.linhas.filter((l: { marcada: boolean }) => l.marcada).map((l: { linha: number }) => l.linha);
  return confirmar(previa.body.id, marcadas);
}

/** Estado do banco: projetos com máquinas e itens. */
async function banco() {
  const { data: projetos } = await supabase().from('projetos').select('id, codigo, nome, status, criado_por').order('codigo');
  const { data: maquinas } = await supabase().from('maquinas').select('id, projeto_id, nome');
  const { data: itens } = await supabase().from('vw_itens_saldo').select('*');
  return { projetos: projetos!, maquinas: maquinas!, itens: itens! };
}

const pecas = (itens: { projeto_codigo: string; quantidade_solicitada: number }[], codigo: string) =>
  itens.filter((i) => i.projeto_codigo === codigo).reduce((soma, i) => soma + i.quantidade_solicitada, 0);

describe('FP — importar a planilha de teste', () => {
  it('pré-visualização: 8 linhas novas marcadas, 2 projetos e 3 máquinas novos; nada gravado ainda', async () => {
    const res = await enviar(PLANILHA);

    expect(res.status).toBe(201);
    expect(res.body.totalLinhas).toBe(8);
    expect(res.body.resumo).toEqual({ novas: 8, jaExistem: 0, possiveisCorrecoes: 0 });
    expect(res.body.linhas.every((l: { marcada: boolean }) => l.marcada)).toBe(true);
    expect(res.body.projetos).toEqual([
      { codigo: 'PRJ-TESTE-01', existe: false, status: null },
      { codigo: 'PRJ-TESTE-02', existe: false, status: null },
    ]);
    expect(res.body.maquinas.map((m: { nome: string; existe: boolean }) => [m.nome, m.existe])).toEqual([
      ['Esteira Teste A', false],
      ['Alimentador Teste B', false],
      ['Mesa Teste C', false],
    ]);
    expect(res.body.linhas[0]).toMatchObject({
      linha: 2,
      projeto: 'PRJ-TESTE-01',
      maquina: 'Esteira Teste A',
      desenho: 'TST-001',
      processo: 'Corte Laser',
      material: 'SAE 1020',
      quantidade: 10,
      dataSolicitacao: '2026-11-03',
      situacao: 'NOVA',
    });
    expect((await banco()).projetos).toEqual([]);
  });

  it('confirmar: bate com o gabarito (2 projetos EM_CADASTRO, 3 máquinas, 8 itens PENDENTES, 42 e 9 peças)', async () => {
    const res = await importarTudo();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ projetosCriados: 2, maquinasCriadas: 3, itensCriados: 8 });

    const { projetos, maquinas, itens } = await banco();
    expect(projetos.map((p) => [p.codigo, p.nome, p.status, p.criado_por])).toEqual([
      ['PRJ-TESTE-01', 'PRJ-TESTE-01', 'EM_CADASTRO', ids.engenheiro],
      ['PRJ-TESTE-02', 'PRJ-TESTE-02', 'EM_CADASTRO', ids.engenheiro],
    ]);
    expect(maquinas).toHaveLength(3);
    expect(itens).toHaveLength(8);
    expect(itens.every((i) => i.status === 'PENDENTE')).toBe(true);
    expect(itens.filter((i) => i.projeto_codigo === 'PRJ-TESTE-01')).toHaveLength(5);
    expect(pecas(itens, 'PRJ-TESTE-01')).toBe(42);
    expect(pecas(itens, 'PRJ-TESTE-02')).toBe(9);
    // TST-001 aparece 4 vezes (RN09)
    expect(itens.filter((i) => i.desenho === 'TST-001').map((i) => i.quantidade_solicitada).sort((a, b) => a - b)).toEqual([2, 5, 6, 10]);
    // Linha 9 sem processo e material (RN08: opcionais)
    expect(itens.find((i) => i.desenho === 'TST-005')).toMatchObject({ processo: null, material: null });

    const { data: importacao } = await supabase().from('importacoes').select('*').single();
    expect(importacao).toMatchObject({ status: 'CONFIRMADA', importado_por: ids.engenheiro, total_linhas: 8, linhas_validas: 8 });
  });
});

describe('FA — fluxos alternativos', () => {
  it('FA1 projeto já existe: a prévia indica e os itens vão para ele', async () => {
    const { data: existente } = await supabase()
      .from('projetos')
      .insert({ codigo: 'prj-teste-01', nome: 'Projeto já cadastrado', criado_por: ids.engenheiro })
      .select()
      .single();

    const previa = await enviar(PLANILHA);
    expect(previa.body.projetos[0]).toEqual({ codigo: 'prj-teste-01', existe: true, status: 'EM_CADASTRO' });

    const res = await confirmar(previa.body.id, previa.body.linhas.map((l: { linha: number }) => l.linha));
    expect(res.body).toEqual({ projetosCriados: 1, maquinasCriadas: 3, itensCriados: 8 });

    const { projetos, itens } = await banco();
    expect(projetos).toHaveLength(2);
    expect(itens.filter((i) => i.projeto_id === existente!.id)).toHaveLength(5);
  });

  it('FA2 reimportar o mesmo arquivo: 8 linhas "já existe" desmarcadas; confirmar sem marcar não cria nada', async () => {
    await importarTudo();

    const previa = await enviar(PLANILHA);
    expect(previa.body.resumo).toEqual({ novas: 0, jaExistem: 8, possiveisCorrecoes: 0 });
    expect(previa.body.linhas.every((l: { marcada: boolean }) => !l.marcada)).toBe(true);
    expect(previa.body.projetos.every((p: { existe: boolean }) => p.existe)).toBe(true);
    expect(previa.body.maquinas.every((m: { existe: boolean }) => m.existe)).toBe(true);

    const res = await confirmar(previa.body.id, []);
    expect(res.body).toEqual({ projetosCriados: 0, maquinasCriadas: 0, itensCriados: 0 });
    expect((await banco()).itens).toHaveLength(8);
  });

  it('FA2 linha 3 com 5 peças: "possível correção" desmarcada; marcada e confirmada cria item novo', async () => {
    await importarTudo();

    const previa = await enviar(await planilhaAlterada((aba) => (aba.getCell('F3').value = 5)));
    const linha3 = previa.body.linhas.find((l: { linha: number }) => l.linha === 3);
    expect(linha3).toMatchObject({ desenho: 'TST-002', quantidade: 5, situacao: 'POSSIVEL_CORRECAO', marcada: false, quantidadesExistentes: [4] });
    expect(previa.body.resumo).toEqual({ novas: 0, jaExistem: 7, possiveisCorrecoes: 1 });

    const res = await confirmar(previa.body.id, [3]);
    expect(res.body).toEqual({ projetosCriados: 0, maquinasCriadas: 0, itensCriados: 1 });
    const tst002 = (await banco()).itens.filter((i) => i.desenho === 'TST-002').map((i) => i.quantidade_solicitada);
    expect(tst002.sort()).toEqual([4, 5]);
  });

  it('FA3 pré-visualização sem confirmar: banco intacto', async () => {
    await enviar(PLANILHA);
    const { projetos, maquinas, itens } = await banco();
    expect([projetos, maquinas, itens]).toEqual([[], [], []]);
  });

  it('aceita colunas em outra ordem, data como texto DD/MM/AAAA e linhas em branco', async () => {
    const conteudo = await planilhaAlterada((aba) => {
      aba.getCell('G2').value = '03/11/2026';
      aba.spliceColumns(1, 1); // tira "Projeto" do começo…
      aba.spliceColumns(7, 0, ['Projeto', ...Array(8).fill('PRJ-TESTE-01')]); // …e põe no fim
      aba.getRow(12).getCell(1).value = '   '; // linha só com espaços
    });
    const res = await enviar(conteudo);
    expect(res.status).toBe(201);
    expect(res.body.totalLinhas).toBe(8);
    expect(res.body.linhas[0]).toMatchObject({ projeto: 'PRJ-TESTE-01', dataSolicitacao: '2026-11-03' });
  });
});

describe('FE — fluxos de exceção', () => {
  it('FE1 arquivo .csv → EX10', async () => {
    const res = await enviar(Buffer.from('Projeto;Máquina\nPRJ;M'), 'planilha.csv');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ codigo: 'EX10', mensagem: 'O arquivo não segue a planilha-modelo do eCheck.' });
  });

  it('FE1 .xlsx sem a coluna "Quantidade" → EX10', async () => {
    const res = await enviar(await planilhaAlterada((aba) => aba.spliceColumns(6, 1)));
    expect(res.status).toBe(400);
    expect(res.body.codigo).toBe('EX10');
  });

  it('FE1 .xlsx corrompido, sem aba "Itens" ou sem arquivo → EX10', async () => {
    const semAba = await planilhaAlterada((aba) => (aba.name = 'Outra'));
    const respostas = [
      await enviar(Buffer.from('não é um xlsx'), 'falso.xlsx'),
      await enviar(semAba),
      await request(app).post('/importacoes').set(await comoUsuario('engenheiro')),
    ];
    for (const res of respostas) expect(res.body.codigo).toBe('EX10');
  });

  it('FE2 desenho vazio, quantidade 0, quantidade 2,5, data inválida e projeto vazio → EX11 com linha, coluna e motivo; nada gravado', async () => {
    const conteudo = await planilhaAlterada((aba) => {
      aba.getCell('C2').value = null; //        linha 2: desenho vazio
      aba.getCell('F3').value = 0; //           linha 3: quantidade 0
      aba.getCell('F4').value = 2.5; //         linha 4: quantidade 2,5
      aba.getCell('G5').value = '31/02/2026'; // linha 5: data inválida
      aba.getCell('A6').value = ''; //          linha 6: projeto vazio
    });

    const res = await enviar(conteudo);
    expect(res.status).toBe(422);
    expect(res.body.codigo).toBe('EX11');
    expect(res.body.mensagem).toBe('A planilha tem 5 linha(s) com erro. Corrija e envie de novo.');
    expect(res.body.detalhes).toEqual([
      { linha: 2, coluna: 'Desenho', motivo: 'não pode ficar vazio' },
      { linha: 3, coluna: 'Quantidade', motivo: 'deve ser um número inteiro maior que zero' },
      { linha: 4, coluna: 'Quantidade', motivo: 'deve ser um número inteiro maior que zero' },
      { linha: 5, coluna: 'Data da solicitação', motivo: 'data inválida (use DD/MM/AAAA)' },
      { linha: 6, coluna: 'Projeto', motivo: 'não pode ficar vazio' },
    ]);

    const { projetos } = await banco();
    const { data: importacoes } = await supabase().from('importacoes').select('id');
    expect(projetos).toEqual([]);
    expect(importacoes).toEqual([]);
  });

  it('FE4 Encarregado tenta importar → EX04', async () => {
    const res = await enviar(PLANILHA, undefined, 'encarregado');
    expect(res.status).toBe(403);
    expect(res.body.codigo).toBe('EX04');
  });

  it('confirmar prévia inexistente, já confirmada ou de outro engenheiro → EX09', async () => {
    const previa = await enviar(PLANILHA);
    await confirmar(previa.body.id, []);

    const jaConfirmada = await confirmar(previa.body.id, []);
    const inexistente = await confirmar('7d1a3c1e-0000-4000-8000-000000000000', []);
    for (const res of [jaConfirmada, inexistente]) {
      expect(res.status).toBe(404);
      expect(res.body.codigo).toBe('EX09');
    }

    // Prévia gerada por outro engenheiro
    const { data: alheia } = await supabase()
      .from('importacoes')
      .insert({ nome_arquivo: 'x.xlsx', importado_por: ids.admin, linhas: [] })
      .select()
      .single();
    expect((await confirmar(alheia!.id, [])).body.codigo).toBe('EX09');
  });

  it('confirmar com linha fora da prévia ou lista inválida → EX06', async () => {
    const previa = await enviar(PLANILHA);
    const fora = await confirmar(previa.body.id, [2, 99]);
    expect(fora.status).toBe(400);
    expect(fora.body.mensagem).toBe('Verifique o campo linhas: linha(s) 99 fora da pré-visualização.');

    const invalida = await request(app)
      .post(`/importacoes/${previa.body.id}/confirmar`)
      .set(await comoUsuario('engenheiro'))
      .send({ linhas: 'todas' });
    expect(invalida.body.codigo).toBe('EX06');
    expect((await banco()).projetos).toEqual([]);
  });
});
