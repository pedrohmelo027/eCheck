'use client';

import { useState } from 'react';
import type { DadosItem } from '@/services/maquinas';

interface Props {
  titulo: string;
  inicial?: Partial<DadosItem>;
  /** Mostrado ao alterar item que já tem recebimento (RN12). */
  aviso?: string;
  textoBotao: string;
  aoEnviar: (dados: DadosItem) => Promise<void>;
  aoCancelar: () => void;
}

const campo = 'w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none';

/** Cadastro e alteração de item (UC05). Validação de verdade fica na API (RN08, RN12). */
export function ItemForm({ titulo, inicial, aviso, textoBotao, aoEnviar, aoCancelar }: Props) {
  const [dados, setDados] = useState({
    desenho: inicial?.desenho ?? '',
    processo: inicial?.processo ?? '',
    material: inicial?.material ?? '',
    quantidade: inicial?.quantidadeSolicitada ? String(inicial.quantidadeSolicitada) : '',
    data: inicial?.dataSolicitacao ?? '',
  });
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    try {
      await aoEnviar({
        desenho: dados.desenho,
        processo: dados.processo.trim() || null,
        material: dados.material.trim() || null,
        quantidadeSolicitada: Number(dados.quantidade),
        dataSolicitacao: dados.data,
      });
    } catch {
      // A página já mostrou a mensagem EX; os dados ficam para corrigir.
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3 rounded border border-zinc-200 bg-zinc-50 p-4">
      <h3 className="font-medium">{titulo}</h3>
      {aviso && <p className="text-sm text-amber-700">{aviso}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm">
          Desenho
          <input className={campo} value={dados.desenho} onChange={(e) => setDados({ ...dados, desenho: e.target.value })} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Processo <span className="text-zinc-500">(opcional)</span>
          <input className={campo} value={dados.processo} onChange={(e) => setDados({ ...dados, processo: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Material <span className="text-zinc-500">(opcional)</span>
          <input className={campo} value={dados.material} onChange={(e) => setDados({ ...dados, material: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Quantidade
          <input
            className={campo}
            type="number"
            min={1}
            step={1}
            value={dados.quantidade}
            onChange={(e) => setDados({ ...dados, quantidade: e.target.value })}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Data da solicitação
          <input className={campo} type="date" value={dados.data} onChange={(e) => setDados({ ...dados, data: e.target.value })} required />
        </label>
      </div>
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
