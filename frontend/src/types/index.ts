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
