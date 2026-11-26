import { ProjetoRepository, type ProjetoResumoLinha } from '../repositories/ProjetoRepository';
import { percentual } from './calculos';

/** Totais de peças e percentual recebido (RN20: soma recebida ÷ soma solicitada, sem estornos). */
export interface TotaisDTO {
  totalSolicitado: number;
  totalRecebido: number;
  totalFaltante: number;
  percentualRecebido: number;
}

export interface BarraProjetoDTO extends TotaisDTO {
  id: string;
  codigo: string;
  nome: string;
}

export interface PainelGeralDTO extends TotaisDTO {
  totalProjetos: number;
  /** Dados do gráfico: um projeto liberado por barra. */
  projetos: BarraProjetoDTO[];
}

function totais(solicitado: number, recebido: number): TotaisDTO {
  return {
    totalSolicitado: solicitado,
    totalRecebido: recebido,
    totalFaltante: solicitado - recebido,
    percentualRecebido: percentual(recebido, solicitado),
  };
}

/**
 * Painel (classe de controle do diagrama): calcula os totais a partir dos projetos, sem gravar
 * nada. gerarPorProjeto e listarFaltantes entram no UC10.
 */
export class Painel {
  readonly #projetos: ProjetoResumoLinha[];

  private constructor(projetos: ProjetoResumoLinha[]) {
    this.#projetos = projetos;
  }

  /** UC09 — painel geral: só projetos LIBERADOS (RN20). Sem nenhum, tudo zerado (FA1). */
  static async gerarGeral(): Promise<Painel> {
    return new Painel(await ProjetoRepository.listarResumoLiberados());
  }

  /** Percentual de cada projeto, para o gráfico. */
  dadosGrafico(): BarraProjetoDTO[] {
    return this.#projetos.map((p) => ({ id: p.id, codigo: p.codigo, nome: p.nome, ...totais(p.total_solicitado, p.total_recebido) }));
  }

  toJSON(): PainelGeralDTO {
    const solicitado = this.#projetos.reduce((soma, p) => soma + p.total_solicitado, 0);
    const recebido = this.#projetos.reduce((soma, p) => soma + p.total_recebido, 0);
    return { ...totais(solicitado, recebido), totalProjetos: this.#projetos.length, projetos: this.dadosGrafico() };
  }
}
