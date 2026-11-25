import ExcelJS from 'exceljs';
import { AppError } from '../errors/AppError';
import type { ImportacaoLinha, LinhaPrevia, ResumoConfirmacao } from '../repositories/ImportacaoRepository';
import { ImportacaoRepository } from '../repositories/ImportacaoRepository';
import { ItemRepository } from '../repositories/ItemRepository';
import { MaquinaRepository, type MaquinaLinha } from '../repositories/MaquinaRepository';
import { ProjetoRepository, type ProjetoLinha } from '../repositories/ProjetoRepository';
import { StatusProjeto } from './enums';

/** Aba e colunas da planilha-modelo (CONTEXT.md, UC03). */
export const ABA_ITENS = 'Itens';
const COLUNAS = {
  projeto: 'Projeto',
  maquina: 'Máquina',
  desenho: 'Desenho',
  processo: 'Processo',
  material: 'Material',
  quantidade: 'Quantidade',
  data: 'Data da solicitação',
} as const;
type Coluna = keyof typeof COLUNAS;

export interface ErroLinha {
  linha: number;
  coluna: string;
  motivo: string;
}

type LinhaLida = Omit<LinhaPrevia, 'situacao' | 'quantidadesExistentes'>;

export interface Previa {
  id: string;
  nomeArquivo: string;
  totalLinhas: number;
  projetos: { codigo: string; existe: boolean; status: StatusProjeto | null }[];
  maquinas: { projeto: string; nome: string; existe: boolean }[];
  linhas: (LinhaPrevia & { marcada: boolean })[];
  resumo: { novas: number; jaExistem: number; possiveisCorrecoes: number };
}

/** Compara textos sem diferenciar maiúsculas, acentos e espaços extras. */
function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Texto de uma célula, qualquer que seja o tipo guardado pelo Excel. */
function textoDe(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === 'object') {
    if ('richText' in valor) return valor.richText.map((t) => t.text).join('').trim();
    if ('result' in valor) return textoDe(valor.result as ExcelJS.CellValue);
    if ('text' in valor) return String(valor.text).trim();
    if ('error' in valor) return '';
  }
  return String(valor).trim();
}

function valorBruto(valor: ExcelJS.CellValue): ExcelJS.CellValue {
  return valor && typeof valor === 'object' && !(valor instanceof Date) && 'result' in valor ? (valor.result as ExcelJS.CellValue) : valor;
}

/** Quantidade inteira > 0 (RN08). Aceita número ou texto só com dígitos. */
function lerQuantidade(valor: ExcelJS.CellValue): number | null {
  const v = valorBruto(valor);
  if (typeof v === 'number') return Number.isInteger(v) && v >= 1 ? v : null;
  const texto = textoDe(v);
  return /^\d+$/.test(texto) && Number(texto) >= 1 ? Number(texto) : null;
}

function dataIso(ano: number, mes: number, dia: number): string | null {
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null;
  if (ano < 2000 || ano > 2100) return null;
  return d.toISOString().slice(0, 10);
}

/** Data da solicitação: célula de data do Excel, texto DD/MM/AAAA ou número de série do Excel. */
function lerData(valor: ExcelJS.CellValue): string | null {
  const v = valorBruto(valor);
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? null : dataIso(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate());
  }
  if (typeof v === 'number' && Number.isInteger(v) && v > 0) {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86_400_000); // série do Excel
    return dataIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(textoDe(v));
  return m ? dataIso(Number(m[3]), Number(m[2]), Number(m[1])) : null;
}

/**
 * Importação da planilha-modelo (UC03). Lê, valida (RN08, RN21), compara com o que já existe (RN25)
 * e grava a prévia; a confirmação grava tudo numa transação (RN22).
 */
export class ImportacaoPlanilha {
  readonly #nomeArquivo: string;
  readonly #importadoPor: string;
  #linhas: LinhaLida[] = [];
  #erros: ErroLinha[] = [];

  constructor(nomeArquivo: string, importadoPor: string) {
    this.#nomeArquivo = nomeArquivo;
    this.#importadoPor = importadoPor;
  }

  get erros() {
    return this.#erros;
  }

  /** Lê a aba "Itens". Arquivo que não é .xlsx, sem a aba, sem alguma das 7 colunas ou sem linhas → EX10. */
  async lerArquivo(conteudo: Buffer): Promise<void> {
    if (!this.#nomeArquivo.toLowerCase().endsWith('.xlsx')) throw new AppError('EX10');

    const pasta = new ExcelJS.Workbook();
    try {
      await pasta.xlsx.load(conteudo as unknown as ArrayBuffer);
    } catch {
      throw new AppError('EX10');
    }

    const aba = pasta.worksheets.find((a) => normalizar(a.name) === normalizar(ABA_ITENS));
    if (!aba) throw new AppError('EX10');

    // Cabeçalho: localiza cada coluna pelo nome, em qualquer ordem
    const posicao = {} as Record<Coluna, number>;
    aba.getRow(1).eachCell((celula, numero) => {
      const nome = normalizar(textoDe(celula.value));
      const coluna = (Object.keys(COLUNAS) as Coluna[]).find((c) => normalizar(COLUNAS[c]) === nome);
      if (coluna && !posicao[coluna]) posicao[coluna] = numero;
    });
    if ((Object.keys(COLUNAS) as Coluna[]).some((c) => !posicao[c])) throw new AppError('EX10');

    this.#linhas = [];
    this.#erros = [];
    for (let numero = 2; numero <= aba.rowCount; numero++) {
      const linha = aba.getRow(numero);
      const celula = (c: Coluna) => linha.getCell(posicao[c]).value;
      const textos = (Object.keys(COLUNAS) as Coluna[]).map((c) => textoDe(celula(c)));
      if (textos.every((t) => t === '')) continue; // linha em branco

      const erro = (c: Coluna, motivo: string) => this.#erros.push({ linha: numero, coluna: COLUNAS[c], motivo });
      const projeto = textoDe(celula('projeto'));
      const maquina = textoDe(celula('maquina'));
      const desenho = textoDe(celula('desenho'));
      const quantidade = lerQuantidade(celula('quantidade'));
      const data = lerData(celula('data'));

      if (!projeto) erro('projeto', 'não pode ficar vazio');
      if (!maquina) erro('maquina', 'não pode ficar vazio');
      if (!desenho) erro('desenho', 'não pode ficar vazio');
      if (quantidade === null) erro('quantidade', 'deve ser um número inteiro maior que zero');
      if (data === null) erro('data', 'data inválida (use DD/MM/AAAA)');

      if (projeto && maquina && desenho && quantidade !== null && data !== null) {
        this.#linhas.push({
          linha: numero,
          projeto,
          maquina,
          desenho,
          processo: textoDe(celula('processo')) || null,
          material: textoDe(celula('material')) || null,
          quantidade,
          dataSolicitacao: data,
        });
      }
    }

    if (this.#linhas.length === 0 && this.#erros.length === 0) throw new AppError('EX10');
  }

  /** RN22: com qualquer linha inválida, nada segue → EX11 com linha, coluna e motivo. */
  validar(): boolean {
    if (this.#erros.length > 0) {
      const linhasComErro = new Set(this.#erros.map((e) => e.linha)).size;
      throw new AppError('EX11', { n: linhasComErro }, this.#erros);
    }
    return true;
  }

  /** Compara cada linha com os itens existentes (RN25), grava a prévia e devolve o que vai ser criado. */
  async gerarPrevia(): Promise<Previa> {
    const projetos = await ProjetoRepository.buscarPorCodigos(this.#linhas.map((l) => l.projeto));
    const projetoPorCodigo = new Map(projetos.map((p) => [normalizar(p.codigo), p]));

    const maquinas = await MaquinaRepository.listarPorProjetos(projetos.map((p) => p.id));
    const maquinaPorChave = new Map(maquinas.map((m) => [`${m.projeto_id}|${normalizar(m.nome)}`, m]));

    const itens = await ItemRepository.listarPorMaquinas(maquinas.map((m) => m.id));
    const quantidadesPorChave = new Map<string, number[]>();
    for (const item of itens) {
      const chave = `${item.maquina_id}|${normalizar(item.desenho)}|${item.data_solicitacao}`;
      quantidadesPorChave.set(chave, [...(quantidadesPorChave.get(chave) ?? []), item.quantidade_solicitada]);
    }

    const linhas: LinhaPrevia[] = this.#linhas.map((l) => {
      const projeto = projetoPorCodigo.get(normalizar(l.projeto));
      const maquina = projeto && maquinaPorChave.get(`${projeto.id}|${normalizar(l.maquina)}`);
      const quantidadesExistentes = maquina
        ? (quantidadesPorChave.get(`${maquina.id}|${normalizar(l.desenho)}|${l.dataSolicitacao}`) ?? [])
        : [];
      const situacao = quantidadesExistentes.includes(l.quantidade)
        ? 'JA_EXISTE'
        : quantidadesExistentes.length > 0
          ? 'POSSIVEL_CORRECAO'
          : 'NOVA';
      return { ...l, situacao, quantidadesExistentes };
    });

    const registro = await ImportacaoRepository.inserirPrevia({
      nomeArquivo: this.#nomeArquivo,
      importadoPor: this.#importadoPor,
      linhas,
    });
    return ImportacaoPlanilha.montarPrevia(registro, projetoPorCodigo, maquinaPorChave);
  }

  /** Grava as linhas marcadas pelo Engenheiro numa única transação (RN22). */
  static async confirmar(importacaoId: string, linhasMarcadas: number[], engenheiroId: string): Promise<ResumoConfirmacao> {
    const importacao = await ImportacaoRepository.buscarPorId(importacaoId);
    if (!importacao || importacao.status !== 'PREVIA' || importacao.importado_por !== engenheiroId) throw new AppError('EX09');

    const existentes = new Set(importacao.linhas.map((l) => l.linha));
    const fora = linhasMarcadas.filter((n) => !existentes.has(n));
    if (fora.length > 0) {
      throw new AppError('EX06', { campo: 'linhas', motivo: `linha(s) ${fora.join(', ')} fora da pré-visualização` });
    }
    return ImportacaoRepository.confirmar(importacaoId, [...new Set(linhasMarcadas)], engenheiroId);
  }

  private static montarPrevia(
    registro: ImportacaoLinha,
    projetoPorCodigo: Map<string, ProjetoLinha>,
    maquinaPorChave: Map<string, MaquinaLinha>,
  ): Previa {
    const projetosVistos = new Map<string, Previa['projetos'][number]>();
    const maquinasVistas = new Map<string, Previa['maquinas'][number]>();

    for (const l of registro.linhas) {
      const chaveProjeto = normalizar(l.projeto);
      const existente = projetoPorCodigo.get(chaveProjeto);
      if (!projetosVistos.has(chaveProjeto)) {
        projetosVistos.set(chaveProjeto, {
          codigo: existente?.codigo ?? l.projeto,
          existe: Boolean(existente),
          status: existente?.status ?? null,
        });
      }
      const chaveMaquina = `${chaveProjeto}|${normalizar(l.maquina)}`;
      if (!maquinasVistas.has(chaveMaquina)) {
        const existeMaquina = Boolean(existente && maquinaPorChave.has(`${existente.id}|${normalizar(l.maquina)}`));
        maquinasVistas.set(chaveMaquina, { projeto: projetosVistos.get(chaveProjeto)!.codigo, nome: l.maquina, existe: existeMaquina });
      }
    }

    const linhas = registro.linhas.map((l) => ({ ...l, marcada: l.situacao === 'NOVA' }));
    return {
      id: registro.id,
      nomeArquivo: registro.nome_arquivo,
      totalLinhas: registro.total_linhas,
      projetos: [...projetosVistos.values()],
      maquinas: [...maquinasVistas.values()],
      linhas,
      resumo: {
        novas: linhas.filter((l) => l.situacao === 'NOVA').length,
        jaExistem: linhas.filter((l) => l.situacao === 'JA_EXISTE').length,
        possiveisCorrecoes: linhas.filter((l) => l.situacao === 'POSSIVEL_CORRECAO').length,
      },
    };
  }
}
