'use client';

import { useState } from 'react';
import { ROTULO_TIPO, TipoUsuario } from '@/types';

export interface DadosUsuarioForm {
  nome: string;
  email: string;
  tipo: TipoUsuario;
}

interface Props {
  titulo: string;
  inicial?: Partial<DadosUsuarioForm>;
  /** Sem tipo na edição: o tipo muda por uma ação própria (FA2). */
  comTipo: boolean;
  textoBotao: string;
  aoEnviar: (dados: DadosUsuarioForm) => Promise<void>;
  aoCancelar: () => void;
}

const campo = 'w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none';

/**
 * Formulário de novo usuário e de alteração de dados.
 * Se a API recusar (ex.: EX05), o formulário continua preenchido (UC01 FE1).
 */
export function UsuarioForm({ titulo, inicial, comTipo, textoBotao, aoEnviar, aoCancelar }: Props) {
  const [dados, setDados] = useState<DadosUsuarioForm>({
    nome: inicial?.nome ?? '',
    email: inicial?.email ?? '',
    tipo: inicial?.tipo ?? TipoUsuario.USUARIO,
  });
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    try {
      await aoEnviar(dados);
    } catch {
      // A página já mostrou a mensagem EX; o formulário fica como está para corrigir.
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3 rounded border border-zinc-200 bg-white p-4">
      <h2 className="font-semibold">{titulo}</h2>
      <label className="flex flex-col gap-1 text-sm">
        Nome
        <input className={campo} value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          className={campo}
          type="email"
          value={dados.email}
          onChange={(e) => setDados({ ...dados, email: e.target.value })}
          required
        />
      </label>
      {comTipo && (
        <label className="flex flex-col gap-1 text-sm">
          Tipo
          <select className={campo} value={dados.tipo} onChange={(e) => setDados({ ...dados, tipo: e.target.value as TipoUsuario })}>
            {Object.values(TipoUsuario).map((tipo) => (
              <option key={tipo} value={tipo}>
                {ROTULO_TIPO[tipo]}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {enviando ? 'Salvando…' : textoBotao}
        </button>
        <button type="button" onClick={aoCancelar} className="rounded px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
          Cancelar
        </button>
      </div>
    </form>
  );
}
