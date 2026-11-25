import { supabase } from '../config/supabase';
import { AppError } from '../errors/AppError';
import { falhaBanco } from './util';

/** Linha da planilha já lida e classificada (guardada em importacoes.linhas). */
export interface LinhaPrevia {
  linha: number;
  projeto: string;
  maquina: string;
  desenho: string;
  processo: string | null;
  material: string | null;
  quantidade: number;
  dataSolicitacao: string; // AAAA-MM-DD
  situacao: 'NOVA' | 'JA_EXISTE' | 'POSSIVEL_CORRECAO';
  /** Quantidades dos itens já cadastrados com mesmo projeto, máquina, desenho e data (RN25). */
  quantidadesExistentes: number[];
}

export interface ImportacaoLinha {
  id: string;
  nome_arquivo: string;
  importado_por: string;
  importado_em: string;
  status: 'PREVIA' | 'CONFIRMADA';
  total_linhas: number;
  linhas_validas: number;
  linhas: LinhaPrevia[];
  confirmado_em: string | null;
}

export interface ResumoConfirmacao {
  projetosCriados: number;
  maquinasCriadas: number;
  itensCriados: number;
}

export const ImportacaoRepository = {
  async inserirPrevia(dados: { nomeArquivo: string; importadoPor: string; linhas: LinhaPrevia[] }): Promise<ImportacaoLinha> {
    const { data, error } = await supabase()
      .from('importacoes')
      .insert({
        nome_arquivo: dados.nomeArquivo,
        importado_por: dados.importadoPor,
        total_linhas: dados.linhas.length,
        linhas_validas: dados.linhas.length,
        linhas: dados.linhas,
      })
      .select('*')
      .single();
    if (error) falhaBanco(error);
    return data as ImportacaoLinha;
  },

  async buscarPorId(id: string): Promise<ImportacaoLinha | null> {
    const { data, error } = await supabase().from('importacoes').select('*').eq('id', id).maybeSingle();
    if (error) falhaBanco(error);
    return data as ImportacaoLinha | null;
  },

  /** Grava as linhas marcadas numa única transação (função confirmar_importacao, RN22). */
  async confirmar(id: string, linhas: number[], usuarioId: string): Promise<ResumoConfirmacao> {
    const { data, error } = await supabase().rpc('confirmar_importacao', {
      p_importacao: id,
      p_linhas: linhas,
      p_usuario: usuarioId,
    });
    if (error) {
      // Prévia sumiu, já foi confirmada ou é de outro engenheiro
      if (error.code === 'P0002') throw new AppError('EX09');
      falhaBanco(error);
    }
    return data as ResumoConfirmacao;
  },
};
