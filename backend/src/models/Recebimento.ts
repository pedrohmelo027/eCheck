import { AppError } from '../errors/AppError';
import { RecebimentoRepository, type RecebimentoLinha } from '../repositories/RecebimentoRepository';

export interface RecebimentoDTO {
  id: string;
  itemId: string;
  quantidade: number;
  observacao: string | null;
  registradoPor: string;
  registradoEm: string;
  atualizadoPor: string | null;
  atualizadoEm: string | null;
  estornado: boolean;
  estornadoPor: string | null;
  estornadoEm: string | null;
}

/** Aviso que não bloqueia (EX16): parte da quantidade passou do saldo e não foi registrada. */
export interface AvisoDTO {
  codigo: 'EX16';
  mensagem: string;
}

export function avisoExcedente(registradas: number, excedentes: number): AvisoDTO | null {
  if (excedentes <= 0) return null;
  return { codigo: 'EX16', mensagem: new AppError('EX16', { x: registradas, y: excedentes }).message };
}

/**
 * Uma remessa de um item (UC07). Guarda quem e quando registrou, atualizou ou estornou (RN18).
 * O estorno é lógico (RN17): a remessa fica gravada e deixa de contar no recebido.
 */
export class Recebimento {
  readonly #linha: RecebimentoLinha;

  constructor(linha: RecebimentoLinha) {
    this.#linha = linha;
  }

  static async buscar(id: string): Promise<Recebimento> {
    const linha = await RecebimentoRepository.buscarPorId(id);
    if (!linha) throw new AppError('EX09');
    return new Recebimento(linha);
  }

  get id() {
    return this.#linha.id;
  }
  get itemId() {
    return this.#linha.item_id;
  }
  get quantidade() {
    return this.#linha.quantidade;
  }
  get estornado() {
    return this.#linha.estornado;
  }

  /** RN16: nova quantidade > 0 e dentro do saldo (quem valida o saldo é o Encarregado, que conhece o item). */
  async atualizarQuantidade(novaQuantidade: number, encarregadoId: string): Promise<Recebimento> {
    if (this.estornado) throw new AppError('EX18');
    return new Recebimento(await RecebimentoRepository.atualizarQuantidade(this.id, novaQuantidade, encarregadoId));
  }

  /** RN17: não pode ser estornada de novo (EX18). */
  async estornar(encarregadoId: string): Promise<Recebimento> {
    if (this.estornado) throw new AppError('EX18');
    return new Recebimento(await RecebimentoRepository.estornar(this.id, encarregadoId));
  }

  toJSON(): RecebimentoDTO {
    const l = this.#linha;
    return {
      id: l.id,
      itemId: l.item_id,
      quantidade: l.quantidade,
      observacao: l.observacao,
      registradoPor: l.registrado_por,
      registradoEm: l.registrado_em,
      atualizadoPor: l.atualizado_por,
      atualizadoEm: l.atualizado_em,
      estornado: l.estornado,
      estornadoPor: l.estornado_por,
      estornadoEm: l.estornado_em,
    };
  }
}
