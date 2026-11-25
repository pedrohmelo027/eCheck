import { AppError } from '../errors/AppError';
import { MaquinaRepository, type MaquinaResumoLinha } from '../repositories/MaquinaRepository';
import { ProjetoRepository, type ProjetoResumoLinha } from '../repositories/ProjetoRepository';
import { UsuarioRepository } from '../repositories/UsuarioRepository';
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
  criadoPorNome: string | null;
  liberadoPorNome: string | null;
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

  /**
   * UC06: libera o projeto inteiro para receber material (RN10, RN11).
   * Já liberado → EX13; sem nenhum item → EX14. Não pode ser desfeito.
   */
  async liberar(engenheiroId: string): Promise<Projeto> {
    if (this.estaLiberado()) throw new AppError('EX13');
    if (this.#linha.total_itens === 0) throw new AppError('EX14');
    // Outro engenheiro pode ter liberado entre a leitura e a gravação
    if (!(await ProjetoRepository.liberar(this.id, engenheiroId))) throw new AppError('EX13');
    return Projeto.buscar(this.id);
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
    const l = this.#linha;
    const [maquinas, criador, liberador] = await Promise.all([
      MaquinaRepository.listarResumoDoProjeto(this.id),
      UsuarioRepository.buscarPorId(l.criado_por),
      l.liberado_por ? UsuarioRepository.buscarPorId(l.liberado_por) : Promise.resolve(null),
    ]);
    return {
      ...this.toJSON(),
      criadoPorNome: criador?.nome ?? null,
      liberadoPorNome: liberador?.nome ?? null,
      maquinas: maquinas.map(maquinaDTO),
    };
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
