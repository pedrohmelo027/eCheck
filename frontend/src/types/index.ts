// Cópia dos enums e tipos do back-end (backend/src/models). Atualizar junto quando um Model mudar.

export enum TipoUsuario {
  ADMINISTRADOR = 'ADMINISTRADOR',
  ENGENHEIRO = 'ENGENHEIRO',
  ENCARREGADO = 'ENCARREGADO',
  USUARIO = 'USUARIO',
}

export enum StatusProjeto {
  EM_CADASTRO = 'EM_CADASTRO',
  LIBERADO = 'LIBERADO',
}

export enum StatusItem {
  PENDENTE = 'PENDENTE',
  PARCIAL = 'PARCIAL',
  COMPLETO = 'COMPLETO',
}

/** Formato padrão de erro da API: { codigo: "EX05", mensagem, detalhes? }. */
export interface RespostaErro {
  codigo: string;
  mensagem: string;
  detalhes?: unknown[];
}

/** Usuário como a API devolve em /usuarios (UC01). Espelha UsuarioDTO do back-end. */
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  ativo: boolean;
  criadoEm: string;
}

export const ROTULO_TIPO: Record<TipoUsuario, string> = {
  [TipoUsuario.ADMINISTRADOR]: 'Administrador',
  [TipoUsuario.ENGENHEIRO]: 'Engenheiro',
  [TipoUsuario.ENCARREGADO]: 'Encarregado',
  [TipoUsuario.USUARIO]: 'Usuário',
};

/** Setor mostrado abaixo do nome no menu (o tipo continua definindo as permissões). */
export const ROTULO_SETOR: Record<TipoUsuario, string> = {
  [TipoUsuario.ADMINISTRADOR]: 'Administrador',
  [TipoUsuario.ENGENHEIRO]: 'Engenharia',
  [TipoUsuario.ENCARREGADO]: 'Produção',
  [TipoUsuario.USUARIO]: 'Usuário',
};

/** UC04 — projeto com totais. Espelha ProjetoDTO do back-end. */
export interface Projeto {
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

export interface MaquinaResumo {
  id: string;
  nome: string;
  totalItens: number;
  totalSolicitado: number;
  totalRecebido: number;
  percentualRecebido: number;
}

export interface ProjetoDetalhe extends Projeto {
  criadoPorNome: string | null;
  liberadoPorNome: string | null;
  maquinas: MaquinaResumo[];
}

/** UC05 — item com recebido, saldo e status. Espelha ItemDTO do back-end. */
export interface Item {
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

/** UC07 — uma remessa. Espelha RecebimentoDTO do back-end. */
export interface Recebimento {
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

/** UC08 — remessa no histórico, com os nomes de quem registrou, atualizou e estornou. */
export interface RecebimentoHistorico extends Recebimento {
  registradoPorNome: string | null;
  atualizadoPorNome: string | null;
  estornadoPorNome: string | null;
}

export interface HistoricoItem {
  item: Item;
  recebimentos: RecebimentoHistorico[];
}

/** Aviso que não bloqueia: quantidade acima do saldo (EX16). */
export interface Aviso {
  codigo: 'EX16';
  mensagem: string;
}

export interface ResultadoBaixa {
  recebimento: Recebimento;
  item: Item;
  aviso: Aviso | null;
}

/** Prévia (e resultado) da baixa pelo projeto inteiro (RN14). */
export interface SimulacaoBaixaProjeto {
  desenho: string;
  quantidadeInformada: number;
  quantidadeRegistrada: number;
  excedente: number;
  distribuicao: { item: Item; quantidade: number }[];
  aviso: Aviso | null;
  recebimentos?: Recebimento[];
}

export const ROTULO_STATUS_ITEM: Record<StatusItem, string> = {
  [StatusItem.PENDENTE]: 'Pendente',
  [StatusItem.PARCIAL]: 'Parcial',
  [StatusItem.COMPLETO]: 'Completo',
};

export const ROTULO_STATUS_PROJETO: Record<StatusProjeto, string> = {
  [StatusProjeto.EM_CADASTRO]: 'Em cadastro',
  [StatusProjeto.LIBERADO]: 'Liberado',
};

/** UC09/UC10 — totais de peças e percentual (RN20). */
export interface Totais {
  totalSolicitado: number;
  totalRecebido: number;
  totalFaltante: number;
  percentualRecebido: number;
}

export interface BarraProjeto extends Totais {
  id: string;
  codigo: string;
  nome: string;
}

/** UC09 — painel geral (só projetos liberados). Espelha PainelGeralDTO do back-end. */
export interface PainelGeral extends Totais {
  totalProjetos: number;
  projetos: BarraProjeto[];
}

/** UC10 — painel de um projeto. Espelha PainelProjetoDTO do back-end. */
export interface PainelProjeto extends Totais {
  projeto: { id: string; codigo: string; nome: string; status: StatusProjeto; liberadoEm: string | null };
  liberado: boolean;
  maquinas: (Totais & { id: string; nome: string })[];
  faltantes: Item[];
}

/** UC03 — classificação de cada linha da planilha (RN25). */
export type SituacaoLinha = 'NOVA' | 'JA_EXISTE' | 'POSSIVEL_CORRECAO';

export interface LinhaPrevia {
  linha: number;
  projeto: string;
  maquina: string;
  desenho: string;
  processo: string | null;
  material: string | null;
  quantidade: number;
  dataSolicitacao: string; // AAAA-MM-DD
  situacao: SituacaoLinha;
  quantidadesExistentes: number[];
  marcada: boolean;
}

/** Pré-visualização devolvida por POST /importacoes. Espelha Previa do back-end. */
export interface PreviaImportacao {
  id: string;
  nomeArquivo: string;
  totalLinhas: number;
  projetos: { codigo: string; existe: boolean; status: StatusProjeto | null }[];
  maquinas: { projeto: string; nome: string; existe: boolean }[];
  linhas: LinhaPrevia[];
  resumo: { novas: number; jaExistem: number; possiveisCorrecoes: number };
}

export interface ResumoImportacao {
  projetosCriados: number;
  maquinasCriadas: number;
  itensCriados: number;
}

/** Erro de linha da planilha (detalhes do EX11). */
export interface ErroLinhaPlanilha {
  linha: number;
  coluna: string;
  motivo: string;
}

/** Usuário logado, como devolvido por GET /auth/me (UC02). */
export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
}
