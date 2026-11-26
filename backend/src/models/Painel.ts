import { AppError } from '../errors/AppError';
import { MaquinaRepository } from '../repositories/MaquinaRepository';
import { ProjetoRepository } from '../repositories/ProjetoRepository';
import { percentual } from './calculos';
import { StatusItem, StatusProjeto } from './enums';
import { ItemSolicitado, type ItemDTO } from './ItemSolicitado';

/** Totais de peças e percentual recebido (RN20: soma recebida ÷ soma solicitada, sem estornos). */
export interface TotaisDTO {
  totalSolicitado: number;
  totalRecebido: number;
  totalFaltante: number;
  percentualRecebido: number;
}

/** Uma barra do gráfico: um projeto (UC09) ou uma máquina (UC10). */
export interface BarraDTO extends TotaisDTO {
  id: string;
  codigo?: string;
  nome: string;
}

export interface PainelGeralDTO extends TotaisDTO {
  totalProjetos: number;
  projetos: BarraDTO[];
}

export interface PainelProjetoDTO extends TotaisDTO {
  projeto: { id: string; codigo: string; nome: string; status: StatusProjeto; liberadoEm: string | null };
  /** FA1: projeto em cadastro aparece com aviso e 0%. */
  liberado: boolean;
  maquinas: BarraDTO[];
  /** Itens com saldo (pendentes ou parciais), da solicitação mais antiga para a mais nova. */
  faltantes: ItemDTO[];
}

interface Linha {
  id: string;
  codigo?: string;
  nome: string;
  total_solicitado: number;
  total_recebido: number;
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
 * Painel (classe de controle do diagrama): calcula totais, dados do gráfico e faltantes a partir
 * dos dados gravados, sem gravar nada. `projeto` nulo = painel geral.
 */
export class Painel {
  readonly #projeto: PainelProjetoDTO['projeto'] | null;
  readonly #linhas: Linha[];
  readonly #faltantes: ItemSolicitado[];

  private constructor(projeto: PainelProjetoDTO['projeto'] | null, linhas: Linha[], faltantes: ItemSolicitado[] = []) {
    this.#projeto = projeto;
    this.#linhas = linhas;
    this.#faltantes = faltantes;
  }

  /** UC09 — painel geral: só projetos LIBERADOS (RN20). Sem nenhum, tudo zerado (FA1). */
  static async gerarGeral(): Promise<Painel> {
    return new Painel(null, await ProjetoRepository.listarResumoLiberados());
  }

  /** UC10 — painel de um projeto (liberado ou não). Inexistente → EX09. */
  static async gerarPorProjeto(projetoId: string): Promise<Painel> {
    const projeto = await ProjetoRepository.buscarResumo(projetoId);
    if (!projeto) throw new AppError('EX09');
    const [maquinas, itens] = await Promise.all([
      MaquinaRepository.listarResumoDoProjeto(projetoId),
      ItemSolicitado.listar({ projetoId }),
    ]);
    return new Painel(
      { id: projeto.id, codigo: projeto.codigo, nome: projeto.nome, status: projeto.status, liberadoEm: projeto.liberado_em },
      maquinas,
      itens,
    );
  }

  /** Percentual de cada linha (projeto ou máquina), para o gráfico. */
  dadosGrafico(): BarraDTO[] {
    return this.#linhas.map((l) => ({
      id: l.id,
      ...(l.codigo !== undefined ? { codigo: l.codigo } : {}),
      nome: l.nome,
      ...totais(l.total_solicitado, l.total_recebido),
    }));
  }

  /** UC10 passo 4 — itens que ainda faltam chegar (RN19: pendentes e parciais). */
  listarFaltantes(): ItemSolicitado[] {
    return this.#faltantes.filter((i) => i.status() !== StatusItem.COMPLETO);
  }

  #totais(): TotaisDTO {
    const solicitado = this.#linhas.reduce((soma, l) => soma + l.total_solicitado, 0);
    const recebido = this.#linhas.reduce((soma, l) => soma + l.total_recebido, 0);
    return totais(solicitado, recebido);
  }

  toJSON(): PainelGeralDTO | PainelProjetoDTO {
    if (!this.#projeto) {
      return { ...this.#totais(), totalProjetos: this.#linhas.length, projetos: this.dadosGrafico() };
    }
    return {
      projeto: this.#projeto,
      liberado: this.#projeto.status === StatusProjeto.LIBERADO,
      ...this.#totais(),
      maquinas: this.dadosGrafico(),
      faltantes: this.listarFaltantes().map((i) => i.toJSON()),
    };
  }
}
