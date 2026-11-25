import { readFileSync } from 'node:fs';
import type { Express } from 'express';
import request from 'supertest';
import { supabase } from '../../src/config/supabase';
import { comoUsuario } from './auth';
import { CAMINHO_PLANILHA_TESTE } from './planilha';

/** Importa a planilha de teste pela API (UC03) e devolve o id de cada projeto pelo código. */
export async function importarPlanilhaTeste(app: Express): Promise<Record<string, string>> {
  const engenheiro = await comoUsuario('engenheiro');
  const previa = await request(app)
    .post('/importacoes')
    .set(engenheiro)
    .attach('arquivo', readFileSync(CAMINHO_PLANILHA_TESTE), 'planilha-teste-echeck.xlsx');
  if (previa.status !== 201) throw new Error(`Importação falhou: ${JSON.stringify(previa.body)}`);
  const linhas = previa.body.linhas.map((l: { linha: number }) => l.linha);
  await request(app).post(`/importacoes/${previa.body.id}/confirmar`).set(engenheiro).send({ linhas });

  const { data } = await supabase().from('projetos').select('id, codigo');
  return Object.fromEntries((data ?? []).map((p) => [p.codigo, p.id]));
}

/** Id do item pelo projeto, máquina e desenho (e data, quando o desenho repete na máquina). */
export async function idDoItem(projeto: string, maquina: string, desenho: string, data?: string): Promise<string> {
  let consulta = supabase()
    .from('vw_itens_saldo')
    .select('id')
    .eq('projeto_codigo', projeto)
    .eq('maquina_nome', maquina)
    .eq('desenho', desenho);
  if (data) consulta = consulta.eq('data_solicitacao', data);
  const { data: itens, error } = await consulta;
  if (error || !itens || itens.length !== 1) throw new Error(`Item não encontrado ou ambíguo: ${projeto}/${maquina}/${desenho}`);
  return itens[0].id;
}

/**
 * Grava um recebimento direto no banco (sem passar pela API do UC07, que ainda não existe
 * nos UCs anteriores). Usado para testar bloqueios de exclusão e totais.
 */
export async function registrarRecebimentoDireto(itemId: string, quantidade: number, registradoPor: string): Promise<string> {
  const { data, error } = await supabase()
    .from('recebimentos')
    .insert({ item_id: itemId, quantidade, registrado_por: registradoPor })
    .select('id')
    .single();
  if (error) throw new Error(`Recebimento direto falhou: ${error.message}`);
  return data.id;
}
