import { catalogo, CodigoErro, montarMensagem } from './catalogo';

/** Erro de negócio: sempre com um código EX do catálogo. */
export class AppError extends Error {
  readonly codigo: CodigoErro;
  readonly http: number;
  readonly detalhes?: unknown[];

  constructor(codigo: CodigoErro, parametros: Record<string, string | number> = {}, detalhes?: unknown[]) {
    super(montarMensagem(codigo, parametros));
    this.name = 'AppError';
    this.codigo = codigo;
    this.http = catalogo[codigo].http;
    this.detalhes = detalhes;
  }

  toJSON() {
    return {
      codigo: this.codigo,
      mensagem: this.message,
      ...(this.detalhes ? { detalhes: this.detalhes } : {}),
    };
  }
}
