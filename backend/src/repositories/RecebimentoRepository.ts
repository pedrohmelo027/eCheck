import { supabase } from '../config/supabase';
import { AppError } from '../errors/AppError';
import { buscarTodas, falhaBanco } from './util';

export interface RecebimentoLinha {
  id: string;
  item_id: string;
  quantidade: number;
  observacao: string | null;
  registrado_por: string;
  registrado_em: string;
  atualizado_por: string | null;
  atualizado_em: string | null;
  estornado: boolean;
  estornado_por: string | null;
  estornado_em: string | null;
}

/** A trava do banco (RN13) recusou: outra baixa consumiu o saldo antes desta. */
export class SaldoConcorrente extends Error {}

const VIOLACAO_CHECK = '23514';

function falha(error: { message: string; code?: string }): never {
  if (error.code === VIOLACAO_CHECK && error.message.includes('RN13')) throw new SaldoConcorrente(error.message);
  falhaBanco(error);
}

export const RecebimentoRepository = {
  async buscarPorId(id: string): Promise<RecebimentoLinha | null> {
    const { data, error } = await supabase().from('recebimentos').select('*').eq('id', id).maybeSingle();
    if (error) falha(error);
    return data as RecebimentoLinha | null;
  },

  async listarDoItem(itemId: string): Promise<RecebimentoLinha[]> {
    return buscarTodas<RecebimentoLinha>((de, ate) =>
      supabase().from('recebimentos').select('*').eq('item_id', itemId).order('registrado_em').range(de, ate),
    );
  },

  /** Grava uma remessa por item numa única transação (função registrar_recebimentos). */
  async registrar(
    remessas: { itemId: string; quantidade: number }[],
    observacao: string | null,
    usuarioId: string,
  ): Promise<RecebimentoLinha[]> {
    const { data, error } = await supabase().rpc('registrar_recebimentos', {
      p_itens: remessas.map((r) => r.itemId),
      p_quantidades: remessas.map((r) => r.quantidade),
      p_observacao: observacao,
      p_usuario: usuarioId,
    });
    if (error) falha(error);
    return data as RecebimentoLinha[];
  },

  /** Só muda remessa ativa (atômico: uma remessa estornada no meio do caminho não é alterada). */
  async atualizarQuantidade(id: string, quantidade: number, usuarioId: string): Promise<RecebimentoLinha> {
    const { data, error } = await supabase()
      .from('recebimentos')
      .update({ quantidade, atualizado_por: usuarioId, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .eq('estornado', false)
      .select('*');
    if (error) falha(error);
    if (!data || data.length === 0) throw new AppError('EX18');
    return data[0] as RecebimentoLinha;
  },

  /** Estorno lógico (RN17): a remessa continua gravada e deixa de contar. */
  async estornar(id: string, usuarioId: string): Promise<RecebimentoLinha> {
    const { data, error } = await supabase()
      .from('recebimentos')
      .update({ estornado: true, estornado_por: usuarioId, estornado_em: new Date().toISOString() })
      .eq('id', id)
      .eq('estornado', false)
      .select('*');
    if (error) falha(error);
    if (!data || data.length === 0) throw new AppError('EX18');
    return data[0] as RecebimentoLinha;
  },
};
