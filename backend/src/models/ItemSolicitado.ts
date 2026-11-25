import { AppError } from '../errors/AppError';
import { ItemRepository, type ItemSaldoLinha } from '../repositories/ItemRepository';
import { RecebimentoRepository } from '../repositories/RecebimentoRepository';
import { percentual } from './calculos';
import { StatusItem, StatusProjeto } from './enums';
import { avisoExcedente, Recebimento, type AvisoDTO } from './Recebimento';

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
  percentualRecebido: number;
  criadoEm: string;
}

/**
 * Item solicitado: um desenho pedido a Compras. Recebido, saldo e status são calculados a partir
 * das remessas não estornadas (RN17, RN19) e não são gravados.
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

  /** UC07 passo 2: onde o desenho aparece em projetos liberados; nenhum → EX19. */
  static async buscarPorDesenho(desenho: string): Promise<ItemSolicitado[]> {
    const linhas = await ItemRepository.buscarPorDesenhoEmLiberados(desenho);
    if (linhas.length === 0) throw new AppError('EX19');
    return linhas.map((l) => new ItemSolicitado(l));
  }

  get id() {
    return this.#linha.id;
  }

  estaLiberado(): boolean {
    return this.#linha.projeto_status === StatusProjeto.LIBERADO;
  }

  /**
   * UC07 baixa por máquina. RN10: só em projeto liberado (EX12). RN15: item completo não aceita
   * baixa (EX15). RN13: registra no máximo o saldo; o excedente volta como aviso EX16.
   */
  async registrarRecebimento(
    quantidade: number,
    encarregadoId: string,
    observacao: string | null,
  ): Promise<{ recebimento: Recebimento; aviso: AvisoDTO | null }> {
    if (!this.estaLiberado()) throw new AppError('EX12');
    if (this.status() === StatusItem.COMPLETO) throw new AppError('EX15');

    const registrar = Math.min(quantidade, this.saldo());
    const [linha] = await RecebimentoRepository.registrar([{ itemId: this.id, quantidade: registrar }], observacao, encarregadoId);
    return { recebimento: new Recebimento(linha), aviso: avisoExcedente(registrar, quantidade - registrar) };
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
      percentualRecebido: percentual(this.quantidadeRecebida(), l.quantidade_solicitada),
      criadoEm: l.criado_em,
    };
  }
}
