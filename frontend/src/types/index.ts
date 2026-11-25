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

/** Usuário logado, como devolvido por GET /auth/me (UC02). */
export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
}
