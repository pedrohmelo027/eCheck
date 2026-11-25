import { obterToken } from '@/lib/auth';
import type { RespostaErro } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

/** Erro devolvido pela API, já com o código EX e a mensagem para mostrar ao usuário. */
export class ErroApi extends Error {
  readonly codigo: string;
  readonly http: number;
  readonly detalhes?: unknown[];

  constructor(http: number, corpo: RespostaErro) {
    super(corpo.mensagem);
    this.name = 'ErroApi';
    this.http = http;
    this.codigo = corpo.codigo;
    this.detalhes = corpo.detalhes;
  }
}

const ERRO_INESPERADO: RespostaErro = { codigo: 'EX22', mensagem: 'Algo deu errado. Tente novamente.' };

interface Opcoes {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Objeto enviado como JSON. */
  corpo?: unknown;
  /** Para upload (multipart), ex.: a planilha do UC03. */
  formulario?: FormData;
}

/**
 * Chama a API com o JWT da sessão no header Authorization.
 * Em erro, lança ErroApi com o código EX e a mensagem do back-end.
 */
export async function api<T = unknown>(caminho: string, { metodo = 'GET', corpo, formulario }: Opcoes = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = await obterToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (corpo !== undefined) headers['Content-Type'] = 'application/json';

  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: metodo,
      headers,
      body: formulario ?? (corpo !== undefined ? JSON.stringify(corpo) : undefined),
    });
  } catch {
    throw new ErroApi(0, ERRO_INESPERADO);
  }

  const texto = await resposta.text();
  const dados = texto ? safeJson(texto) : undefined;

  if (!resposta.ok) {
    const erro = isRespostaErro(dados) ? dados : ERRO_INESPERADO;
    throw new ErroApi(resposta.status, erro);
  }
  return dados as T;
}

function safeJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return undefined;
  }
}

function isRespostaErro(valor: unknown): valor is RespostaErro {
  return typeof valor === 'object' && valor !== null && 'codigo' in valor && 'mensagem' in valor;
}
