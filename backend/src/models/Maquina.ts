import { AppError } from '../errors/AppError';
import { MaquinaRepository, type MaquinaResumoLinha } from '../repositories/MaquinaRepository';
import { percentual } from './calculos';
import { ItemSolicitado } from './ItemSolicitado';

export interface MaquinaDTO {
  id: string;
  projetoId: string;
  nome: string;
  criadoEm: string;
  totalItens: number;
  totalSolicitado: number;
  totalRecebido: number;
  percentualRecebido: number;
}

/** Máquina de um projeto (UC05). Totais e percentual vêm das remessas não estornadas. */
export class Maquina {
  readonly #linha: MaquinaResumoLinha;

  constructor(linha: MaquinaResumoLinha) {
    this.#linha = linha;
  }

  static async buscar(id: string): Promise<Maquina> {
    const linha = await MaquinaRepository.buscarResumo(id);
    if (!linha) throw new AppError('EX09');
    return new Maquina(linha);
  }

  get id() {
    return this.#linha.id;
  }
  get projetoId() {
    return this.#linha.projeto_id;
  }

  listarItens(): Promise<ItemSolicitado[]> {
    return ItemSolicitado.listar({ maquinaId: this.id });
  }

  percentualRecebido(): number {
    return percentual(this.#linha.total_recebido, this.#linha.total_solicitado);
  }

  toJSON(): MaquinaDTO {
    const l = this.#linha;
    return {
      id: l.id,
      projetoId: l.projeto_id,
      nome: l.nome,
      criadoEm: l.criado_em,
      totalItens: l.total_itens,
      totalSolicitado: l.total_solicitado,
      totalRecebido: l.total_recebido,
      percentualRecebido: this.percentualRecebido(),
    };
  }
}
