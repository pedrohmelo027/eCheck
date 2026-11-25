import { TipoUsuario } from './enums';
import type { UsuarioLinha } from '../repositories/UsuarioRepository';

/** Dados do usuário como a API devolve (camelCase). */
export interface UsuarioDTO {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  ativo: boolean;
  criadoEm: string;
}

/**
 * Usuário do eCheck. A senha fica no Supabase Auth; `id` é o id da conta no Auth.
 * Os métodos de consulta e painéis (consultarItens, visualizarPainelGeral…) entram nos UCs 08–10.
 */
export class Usuario {
  readonly #id: string;
  readonly #nome: string;
  readonly #email: string;
  readonly #tipo: TipoUsuario;
  readonly #ativo: boolean;
  readonly #criadoEm: string;

  constructor(linha: UsuarioLinha) {
    this.#id = linha.id;
    this.#nome = linha.nome;
    this.#email = linha.email;
    this.#tipo = linha.tipo;
    this.#ativo = linha.ativo;
    this.#criadoEm = linha.criado_em;
  }

  get id() {
    return this.#id;
  }
  get nome() {
    return this.#nome;
  }
  get email() {
    return this.#email;
  }
  get tipo() {
    return this.#tipo;
  }
  get ativo() {
    return this.#ativo;
  }
  get criadoEm() {
    return this.#criadoEm;
  }

  toJSON(): UsuarioDTO {
    return { id: this.#id, nome: this.#nome, email: this.#email, tipo: this.#tipo, ativo: this.#ativo, criadoEm: this.#criadoEm };
  }
}
