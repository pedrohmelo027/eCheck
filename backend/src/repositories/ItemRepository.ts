import { supabase } from '../config/supabase';
import { AppError } from '../errors/AppError';
import { StatusItem, StatusProjeto } from '../models/enums';
import { buscarTodas, emBlocos, escaparLike, falhaBanco } from './util';

export interface ItemLinha {
  id: string;
  maquina_id: string;
  desenho: string;
  processo: string | null;
  material: string | null;
  quantidade_solicitada: number;
  data_solicitacao: string; // AAAA-MM-DD
  criado_em: string;
}

/** Item com recebido, saldo e status calculados (view vw_itens_saldo). */
export interface ItemSaldoLinha extends ItemLinha {
  maquina_nome: string;
  projeto_id: string;
  projeto_codigo: string;
  projeto_nome: string;
  projeto_status: StatusProjeto;
  quantidade_recebida: number;
  saldo: number;
  status: StatusItem;
}

export interface FiltroItens {
  /** Só itens de projetos com este status (ex.: LIBERADO, para a tela de recebimentos). */
  projetoStatus?: StatusProjeto;
  projetoId?: string;
  maquinaId?: string;
  desenho?: string;
  processo?: string;
  status?: StatusItem;
}

export type DadosItem = Pick<ItemLinha, 'desenho' | 'processo' | 'material' | 'quantidade_solicitada' | 'data_solicitacao'>;

const VIOLACAO_CHAVE_ESTRANGEIRA = '23503';

export const ItemRepository = {
  async listarPorMaquinas(maquinaIds: string[]): Promise<ItemLinha[]> {
    const blocos = await Promise.all(
      emBlocos(maquinaIds).map((ids) =>
        buscarTodas<ItemLinha>((de, ate) =>
          supabase().from('itens_solicitados').select('*').in('maquina_id', ids).order('criado_em').range(de, ate),
        ),
      ),
    );
    return blocos.flat();
  },

  /** Itens com saldo, na ordem de solicitação (data e depois ordem de cadastro). */
  /**
   * Itens com saldo (UC05, UC08). Projeto e máquina pelo id; desenho e processo por trecho, sem
   * diferenciar maiúsculas; status calculado (RN19). Ordem: projeto, data da solicitação, cadastro.
   */
  async listarSaldo(filtro: FiltroItens = {}): Promise<ItemSaldoLinha[]> {
    return buscarTodas<ItemSaldoLinha>((de, ate) => {
      let consulta = supabase().from('vw_itens_saldo').select('*');
      if (filtro.projetoStatus) consulta = consulta.eq('projeto_status', filtro.projetoStatus);
      if (filtro.projetoId) consulta = consulta.eq('projeto_id', filtro.projetoId);
      if (filtro.maquinaId) consulta = consulta.eq('maquina_id', filtro.maquinaId);
      if (filtro.desenho) consulta = consulta.ilike('desenho', `%${escaparLike(filtro.desenho)}%`);
      if (filtro.processo) consulta = consulta.ilike('processo', `%${escaparLike(filtro.processo)}%`);
      if (filtro.status) consulta = consulta.eq('status', filtro.status);
      return consulta.order('projeto_codigo').order('data_solicitacao').order('criado_em').range(de, ate);
    });
  },

  /** UC07 passo 2: onde o desenho (completo ou parcial) aparece em projetos LIBERADOS (RN10). */
  async buscarPorDesenhoEmLiberados(desenho: string): Promise<ItemSaldoLinha[]> {
    return buscarTodas<ItemSaldoLinha>((de, ate) =>
      supabase()
        .from('vw_itens_saldo')
        .select('*')
        .eq('projeto_status', StatusProjeto.LIBERADO)
        .ilike('desenho', `%${escaparLike(desenho)}%`)
        .order('projeto_codigo')
        .order('desenho')
        .order('data_solicitacao')
        .order('criado_em')
        .range(de, ate),
    );
  },

  /**
   * Solicitações de um desenho (exato, sem diferenciar maiúsculas) no projeto, da mais antiga
   * para a mais nova; em datas iguais, pela ordem de cadastro (RN14).
   */
  async listarDoProjetoPorDesenho(projetoId: string, desenho: string): Promise<ItemSaldoLinha[]> {
    return buscarTodas<ItemSaldoLinha>((de, ate) =>
      supabase()
        .from('vw_itens_saldo')
        .select('*')
        .eq('projeto_id', projetoId)
        .ilike('desenho', escaparLike(desenho))
        .order('data_solicitacao')
        .order('criado_em')
        .range(de, ate),
    );
  },

  async buscarSaldo(id: string): Promise<ItemSaldoLinha | null> {
    const { data, error } = await supabase().from('vw_itens_saldo').select('*').eq('id', id).maybeSingle();
    if (error) falhaBanco(error);
    return data as ItemSaldoLinha | null;
  },

  async inserir(maquinaId: string, dados: DadosItem): Promise<ItemLinha> {
    const { data, error } = await supabase()
      .from('itens_solicitados')
      .insert({ maquina_id: maquinaId, ...dados })
      .select('*')
      .single();
    if (error) falhaBanco(error);
    return data as ItemLinha;
  },

  async atualizar(id: string, dados: DadosItem): Promise<void> {
    const { error } = await supabase().from('itens_solicitados').update(dados).eq('id', id);
    if (error) falhaBanco(error);
  },

  /**
   * Item com remessa ativa não pode ser excluído (RN12 → EX17). Remessas estornadas não bloqueiam:
   * o gatilho itens_apagar_remessas_estornadas as apaga junto com o item.
   */
  async excluir(id: string): Promise<void> {
    const { error } = await supabase().from('itens_solicitados').delete().eq('id', id);
    if (error?.code === VIOLACAO_CHAVE_ESTRANGEIRA) throw new AppError('EX17');
    if (error) falhaBanco(error);
  },
};
