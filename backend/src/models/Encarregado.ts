import { AppError } from '../errors/AppError';
import { SaldoConcorrente } from '../repositories/RecebimentoRepository';
import { UsuarioRepository } from '../repositories/UsuarioRepository';
import { TipoUsuario } from './enums';
import { ItemSolicitado, type ItemDTO } from './ItemSolicitado';
import { Projeto, type SimulacaoRecebimento } from './Projeto';
import { Recebimento, type AvisoDTO, type RecebimentoDTO } from './Recebimento';
import { Usuario } from './Usuario';

/** Quantas vezes refazer a conta se outra baixa consumir o saldo no meio do caminho. */
const TENTATIVAS = 3;

/**
 * Refaz a operação quando a trava do banco (RN13) recusa por concorrência: a nova tentativa
 * lê o saldo atualizado e registra só o que ainda cabe (ou responde EX15 se nada couber).
 */
async function comNovaTentativa<T>(operacao: () => Promise<T>): Promise<T> {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await operacao();
    } catch (erro) {
      if (!(erro instanceof SaldoConcorrente) || tentativa >= TENTATIVAS) {
        if (erro instanceof SaldoConcorrente) throw new AppError('EX22', {}, [erro.message]);
        throw erro;
      }
    }
  }
}

export interface ResultadoBaixa {
  recebimento: RecebimentoDTO;
  item: ItemDTO;
  aviso: AvisoDTO | null;
}

export interface ResultadoRemessa {
  recebimento: RecebimentoDTO;
  item: ItemDTO;
}

/** Encarregado: mantém os recebimentos (UC07) — dá baixa, atualiza e estorna. */
export class Encarregado extends Usuario {
  /** Carrega o encarregado logado (a rota já passou por autorizar(ENCARREGADO)). */
  static async carregar(id: string): Promise<Encarregado> {
    const linha = await UsuarioRepository.buscarPorId(id);
    if (!linha || linha.tipo !== TipoUsuario.ENCARREGADO) throw new AppError('EX04');
    return new Encarregado(linha);
  }

  /** UC07 FP — baixa por máquina, num item. */
  async darBaixa(itemId: string, quantidade: number, observacao: string | null): Promise<ResultadoBaixa> {
    return comNovaTentativa(async () => {
      const item = await ItemSolicitado.buscar(itemId);
      const { recebimento, aviso } = await item.registrarRecebimento(quantidade, this.id, observacao);
      return { recebimento: recebimento.toJSON(), item: (await ItemSolicitado.buscar(itemId)).toJSON(), aviso };
    });
  }

  /** UC07 FA1 — mostra quanto vai para cada solicitação antes de confirmar. */
  async simularBaixaProjeto(projetoId: string, desenho: string, quantidade: number): Promise<SimulacaoRecebimento> {
    return (await Projeto.buscar(projetoId)).simularRecebimento(desenho, quantidade);
  }

  /** UC07 FA1 — baixa pelo projeto inteiro (RN14), numa transação. */
  async darBaixaProjeto(projetoId: string, desenho: string, quantidade: number, observacao: string | null) {
    return comNovaTentativa(async () =>
      (await Projeto.buscar(projetoId)).distribuirRecebimento(desenho, quantidade, this.id, observacao),
    );
  }

  /**
   * UC07 FA3 — corrige a quantidade de uma remessa (RN16): > 0 e sem passar do saldo do item
   * (o saldo conta a própria remessa). Remessa estornada → EX18.
   */
  async atualizarRecebimento(id: string, novaQuantidade: number): Promise<ResultadoRemessa> {
    const recebimento = await Recebimento.buscar(id);
    if (recebimento.estornado) throw new AppError('EX18');

    const item = await ItemSolicitado.buscar(recebimento.itemId);
    const maximo = item.saldo() + recebimento.quantidade;
    const acimaDoSaldo = () =>
      new AppError('EX06', { campo: 'quantidade', motivo: `não pode passar de ${maximo} peça(s) (saldo do item)` });
    if (novaQuantidade > maximo) throw acimaDoSaldo();

    try {
      const atualizado = await recebimento.atualizarQuantidade(novaQuantidade, this.id);
      return { recebimento: atualizado.toJSON(), item: (await ItemSolicitado.buscar(item.id)).toJSON() };
    } catch (erro) {
      if (erro instanceof SaldoConcorrente) throw acimaDoSaldo();
      throw erro;
    }
  }

  /** UC07 FA4 — estorno lógico (RN17); o item volta a contar só as remessas ativas. */
  async estornarRecebimento(id: string): Promise<ResultadoRemessa> {
    const estornado = await (await Recebimento.buscar(id)).estornar(this.id);
    return { recebimento: estornado.toJSON(), item: (await ItemSolicitado.buscar(estornado.itemId)).toJSON() };
  }
}
