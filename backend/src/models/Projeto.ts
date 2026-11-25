import { AppError } from '../errors/AppError';
import { MaquinaRepository, type MaquinaResumoLinha } from '../repositories/MaquinaRepository';
import { ProjetoRepository, type ProjetoResumoLinha } from '../repositories/ProjetoRepository';
import { ItemRepository } from '../repositories/ItemRepository';
import { RecebimentoRepository } from '../repositories/RecebimentoRepository';
import { UsuarioRepository } from '../repositories/UsuarioRepository';
import { distribuir, percentual } from './calculos';
import { StatusItem, StatusProjeto } from './enums';
import { ItemSolicitado, type ItemDTO } from './ItemSolicitado';
import { avisoExcedente, Recebimento, type AvisoDTO, type RecebimentoDTO } from './Recebimento';

export interface SimulacaoRecebimento {
  desenho: string;
  quantidadeInformada: number;
  quantidadeRegistrada: number;
  excedente: number;
  /** Todas as solicitações do desenho no projeto, em ordem, com a parte de cada uma (0 = não recebe). */
  distribuicao: { item: ItemDTO; quantidade: number }[];
  aviso: AvisoDTO | null;
}

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

  /** Solicitações deste desenho no projeto, da mais antiga para a mais nova (RN14). */
  async buscarItensPorDesenho(desenho: string): Promise<ItemSolicitado[]> {
    return (await ItemRepository.listarDoProjetoPorDesenho(this.id, desenho)).map((l) => new ItemSolicitado(l));
  }

  /**
   * UC07 FA1 — simula a baixa pelo projeto inteiro: quanto vai para cada solicitação (RN14) e o
   * excedente (RN13, EX16). Não grava nada. Desenho fora do projeto → EX19; projeto não
   * liberado → EX12; todas as solicitações completas → EX15.
   */
  async simularRecebimento(desenho: string, quantidade: number): Promise<SimulacaoRecebimento> {
    const itens = await this.buscarItensPorDesenho(desenho);
    if (itens.length === 0) throw new AppError('EX19');
    if (!this.estaLiberado()) throw new AppError('EX12');
    if (itens.every((i) => i.status() === StatusItem.COMPLETO)) throw new AppError('EX15');

    const { partes, registrada, excedente } = distribuir(
      itens.map((i) => ({ id: i.id, saldo: i.saldo() })),
      quantidade,
    );
    return {
      desenho: itens[0].toJSON().desenho,
      quantidadeInformada: quantidade,
      quantidadeRegistrada: registrada,
      excedente,
      distribuicao: itens.map((item, n) => ({ item: item.toJSON(), quantidade: partes[n].quantidade })),
      aviso: avisoExcedente(registrada, excedente),
    };
  }

  /**
   * UC07 FA1 — baixa pelo projeto: grava uma remessa por solicitação que recebe algo, tudo numa
   * transação, e devolve a distribuição com os itens já atualizados.
   */
  async distribuirRecebimento(
    desenho: string,
    quantidade: number,
    encarregadoId: string,
    observacao: string | null,
  ): Promise<SimulacaoRecebimento & { recebimentos: RecebimentoDTO[] }> {
    const simulacao = await this.simularRecebimento(desenho, quantidade);
    const remessas = simulacao.distribuicao
      .filter((d) => d.quantidade > 0)
      .map((d) => ({ itemId: d.item.id, quantidade: d.quantidade }));
    const gravadas = await RecebimentoRepository.registrar(remessas, observacao, encarregadoId);

    const atualizados = new Map(
      (await this.buscarItensPorDesenho(desenho)).map((i) => [i.id, i.toJSON()] as const),
    );
    return {
      ...simulacao,
      distribuicao: simulacao.distribuicao.map((d) => ({ ...d, item: atualizados.get(d.item.id) ?? d.item })),
      recebimentos: gravadas.map((l) => new Recebimento(l).toJSON()),
    };
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
