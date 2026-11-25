'use client';

import { useState } from 'react';

interface Props {
  titulo: string;
  /** Linha de contexto (ex.: projeto, máquina, saldo). */
  descricao: React.ReactNode;
  /** Saldo disponível, só para avisar do excedente antes de confirmar; quem decide é a API. */
  saldo?: number;
  textoBotao: string;
  aoEnviar: (quantidade: number, observacao: string | null) => Promise<void>;
  aoCancelar: () => void;
}

const campo = 'w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none';

/** Quantidade recebida e observação (UC07 passos 4–6). */
export function BaixaForm({ titulo, descricao, saldo, textoBotao, aoEnviar, aoCancelar }: Props) {
  const [quantidade, setQuantidade] = useState('');
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const numero = Number(quantidade);
  const excedente = saldo !== undefined && Number.isInteger(numero) && numero > saldo ? numero - saldo : 0;

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    try {
      await aoEnviar(numero, observacao.trim() || null);
    } catch {
      // A página já mostrou a mensagem EX; os dados ficam para corrigir.
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3 rounded border border-zinc-300 bg-white p-4">
      <div>
        <h3 className="font-semibold">{titulo}</h3>
        <p className="text-sm text-zinc-600">{descricao}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr]">
        <label className="flex flex-col gap-1 text-sm">
          Quantidade recebida
          <input
            className={campo}
            type="number"
            min={1}
            step={1}
            autoFocus
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Observação <span className="text-zinc-500">(opcional)</span>
          <input className={campo} value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={500} />
        </label>
      </div>
      {excedente > 0 && saldo !== undefined && (
        <p className="text-sm text-amber-800">
          Serão registradas {saldo} peça(s). {excedente} excedente(s) não serão registradas.
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {enviando ? 'Enviando…' : textoBotao}
        </button>
        <button type="button" onClick={aoCancelar} disabled={enviando} className="rounded px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
          Cancelar
        </button>
      </div>
    </form>
  );
}
