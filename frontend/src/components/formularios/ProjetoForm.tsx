'use client';

import { useState } from 'react';
import type { DadosProjeto } from '@/services/projetos';

interface Props {
  titulo: string;
  inicial?: Partial<DadosProjeto>;
  textoBotao: string;
  aoEnviar: (dados: DadosProjeto) => Promise<void>;
  aoCancelar: () => void;
}

const campo = 'w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none';

/** Cadastro e alteração de projeto (UC04). Se a API recusar (ex.: EX07), os dados ficam no formulário. */
export function ProjetoForm({ titulo, inicial, textoBotao, aoEnviar, aoCancelar }: Props) {
  const [dados, setDados] = useState({
    codigo: inicial?.codigo ?? '',
    nome: inicial?.nome ?? '',
    descricao: inicial?.descricao ?? '',
  });
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    try {
      await aoEnviar({ ...dados, descricao: dados.descricao.trim() || null });
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
        Código
        <input className={campo} value={dados.codigo} onChange={(e) => setDados({ ...dados, codigo: e.target.value })} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Nome
        <input className={campo} value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Descrição <span className="text-zinc-500">(opcional)</span>
        <textarea
          className={campo}
          rows={3}
          value={dados.descricao}
          onChange={(e) => setDados({ ...dados, descricao: e.target.value })}
        />
      </label>
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
