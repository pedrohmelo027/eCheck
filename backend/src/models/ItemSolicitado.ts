import { AppError } from '../errors/AppError';
import { ItemRepository, type ItemSaldoLinha } from '../repositories/ItemRepository';
import { StatusItem, StatusProjeto } from './enums';

export interface ItemDTO {
  id: string;
  maquinaId: string;
  maquina: string;
  projetoId: string;
  projeto: string;
  projetoStatus: StatusProjeto;
  desenho: string;
  processo: string | null;
  material: string | null;
  quantidadeSolicitada: number;
  dataSolicitacao: string; // AAAA-MM-DD
  quantidadeRecebida: number;
  saldo: number;
  status: StatusItem;
  criadoEm: string;
}

/**
 * Item solicitado: um desenho pedido a Compras. Recebido, saldo e status são calculados a partir
 * das remessas não estornadas (RN17, RN19) e não são gravados. registrarRecebimento entra no UC07.
 */
export class ItemSolicitado {
  readonly #linha: ItemSaldoLinha;

  constructor(linha: ItemSaldoLinha) {
    this.#linha = linha;
  }

  static async buscar(id: string): Promise<ItemSolicitado> {
    const linha = await ItemRepository.buscarSaldo(id);
    if (!linha) throw new AppError('EX09');
    return new ItemSolicitado(linha);
  }

  static async listar(filtro: { maquinaId?: string } = {}): Promise<ItemSolicitado[]> {
    return (await ItemRepository.listarSaldo(filtro)).map((l) => new ItemSolicitado(l));
  }

  get id() {
    return this.#linha.id;
  }

  quantidadeRecebida(): number {
    return this.#linha.quantidade_recebida;
  }

  saldo(): number {
    return this.#linha.quantidade_solicitada - this.quantidadeRecebida();
  }

  /** RN19: PENDENTE (nada recebido), PARCIAL (há saldo) ou COMPLETO (recebido = solicitado). */
  status(): StatusItem {
    const recebido = this.quantidadeRecebida();
    if (recebido === 0) return StatusItem.PENDENTE;
    return recebido < this.#linha.quantidade_solicitada ? StatusItem.PARCIAL : StatusItem.COMPLETO;
  }

  toJSON(): ItemDTO {
    const l = this.#linha;
    return {
      id: l.id,
      maquinaId: l.maquina_id,
      maquina: l.maquina_nome,
      projetoId: l.projeto_id,
      projeto: l.projeto_codigo,
      projetoStatus: l.projeto_status,
      desenho: l.desenho,
      processo: l.processo,
      material: l.material,
      quantidadeSolicitada: l.quantidade_solicitada,
      dataSolicitacao: l.data_solicitacao,
      quantidadeRecebida: this.quantidadeRecebida(),
      saldo: this.saldo(),
      status: this.status(),
      criadoEm: l.criado_em,
    };
  }
}
