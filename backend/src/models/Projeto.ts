import { AppError } from '../errors/AppError';
import { MaquinaRepository, type MaquinaResumoLinha } from '../repositories/MaquinaRepository';
import { ProjetoRepository, type ProjetoResumoLinha } from '../repositories/ProjetoRepository';
import { percentual } from './calculos';
import { StatusProjeto } from './enums';

export interface ProjetoDTO {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  status: StatusProjeto;
  criadoPor: string;
  criadoEm: string;
  liberadoPor: string | null;
  liberadoEm: string | null;
  totalMaquinas: number;
  totalItens: number;
  totalSolicitado: number;
  totalRecebido: number;
  percentualRecebido: number;
}

export interface MaquinaResumoDTO {
  id: string;
  nome: string;
  totalItens: number;
  totalSolicitado: number;
  totalRecebido: number;
  percentualRecebido: number;
}

export interface ProjetoDetalheDTO extends ProjetoDTO {
  maquinas: MaquinaResumoDTO[];
}

function maquinaDTO(m: MaquinaResumoLinha): MaquinaResumoDTO {
  return {
    id: m.id,
    nome: m.nome,
    totalItens: m.total_itens,
    totalSolicitado: m.total_solicitado,
    totalRecebido: m.total_recebido,
    percentualRecebido: percentual(m.total_recebido, m.total_solicitado),
  };
}

/**
 * Projeto (UC04). Totais e percentual vêm dos recebimentos não estornados e não são gravados.
 * Os métodos adicionarMaquina, liberar e distribuirRecebimento entram nos UCs 05–07.
 */
export class Projeto {
  readonly #linha: ProjetoResumoLinha;

  constructor(linha: ProjetoResumoLinha) {
    this.#linha = linha;
  }

  /** Lista todos os projetos com totais (UC04 passo 2). Qualquer usuário logado. */
  static async listar(): Promise<Projeto[]> {
    return (await ProjetoRepository.listarResumo()).map((l) => new Projeto(l));
  }

  /** Projeto pelo id, ou EX09. */
  static async buscar(id: string): Promise<Projeto> {
    const linha = await ProjetoRepository.buscarResumo(id);
    if (!linha) throw new AppError('EX09');
    return new Projeto(linha);
  }

  get id() {
    return this.#linha.id;
  }
  get codigo() {
    return this.#linha.codigo;
  }
  get status() {
    return this.#linha.status;
  }

  estaLiberado(): boolean {
    return this.#linha.status === StatusProjeto.LIBERADO;
  }

  totalSolicitado(): number {
    return this.#linha.total_solicitado;
  }

  totalRecebido(): number {
    return this.#linha.total_recebido;
  }

  percentualRecebido(): number {
    return percentual(this.totalRecebido(), this.totalSolicitado());
  }

  /** Projeto com as máquinas e os totais de cada uma (UC04 FA3, UC05 passo 1). */
  async detalhar(): Promise<ProjetoDetalheDTO> {
    const maquinas = await MaquinaRepository.listarResumoDoProjeto(this.id);
    return { ...this.toJSON(), maquinas: maquinas.map(maquinaDTO) };
  }

  toJSON(): ProjetoDTO {
    const l = this.#linha;
    return {
      id: l.id,
      codigo: l.codigo,
      nome: l.nome,
      descricao: l.descricao,
      status: l.status,
      criadoPor: l.criado_por,
      criadoEm: l.criado_em,
      liberadoPor: l.liberado_por,
      liberadoEm: l.liberado_em,
      totalMaquinas: l.total_maquinas,
      totalItens: l.total_itens,
      totalSolicitado: l.total_solicitado,
      totalRecebido: l.total_recebido,
      percentualRecebido: this.percentualRecebido(),
    };
  }
}
