'use client';

import { useState } from 'react';

interface Props {
  rotulo: string;
  inicial?: string;
  textoBotao: string;
  aoEnviar: (nome: string) => Promise<void>;
  aoCancelar: () => void;
}

/** Formulário de uma linha só (nome da máquina). Se a API recusar, o texto fica para corrigir. */
export function NomeForm({ rotulo, inicial = '', textoBotao, aoEnviar, aoCancelar }: Props) {
  const [nome, setNome] = useState(inicial);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    try {
      await aoEnviar(nome);
    } catch {
      // A página já mostrou a mensagem EX.
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        {rotulo}
        <input
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          className="w-72 rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
        />
      </label>
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
    </form>
  );
}
