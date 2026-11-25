'use client';

import { useState } from 'react';
import { dataHoraBr } from '@/lib/formatos';
import { StatusProjeto, type ProjetoDetalhe } from '@/types';

interface Props {
  projeto: ProjetoDetalhe;
  /** Chama a API; a página mostra o resultado (EX13, EX14…) e recarrega o projeto. */
  aoLiberar: () => Promise<void>;
}

/**
 * UC06 — Liberar projeto para produção. Mostra o resumo (passo 2), avisa que não pode ser
 * desfeito (passo 3) e só libera depois da confirmação (passo 4). Cancelar = FA1.
 */
export function LiberarProjeto({ projeto, aoLiberar }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  if (projeto.status === StatusProjeto.LIBERADO) {
    return (
      <p className="text-sm text-zinc-600">
        Liberado para a produção
        {projeto.liberadoPorNome && <> por {projeto.liberadoPorNome}</>}
        {projeto.liberadoEm && <> em {dataHoraBr(projeto.liberadoEm)}</>}. Máquinas e itens novos já entram aceitando baixa.
      </p>
    );
  }

  async function confirmar() {
    setEnviando(true);
    try {
      await aoLiberar();
      setConfirmando(false);
    } catch {
      // A página já mostrou a mensagem EX.
    } finally {
      setEnviando(false);
    }
  }

  if (!confirmando) {
    return (
      <div>
        <button onClick={() => setConfirmando(true)} className="rounded bg-green-700 px-4 py-2 text-sm text-white hover:bg-green-800">
          Liberar para produção
        </button>
      </div>
    );
  }

  return (
    <div role="dialog" aria-labelledby="titulo-liberar" className="flex flex-col gap-3 rounded border border-green-300 bg-green-50 p-4">
      <h2 id="titulo-liberar" className="font-semibold">
        Liberar {projeto.codigo} para a produção?
      </h2>
      <ul className="text-sm text-zinc-700">
        <li>
          {projeto.totalMaquinas} máquina(s), {projeto.totalItens} item(ns), {projeto.totalSolicitado} peça(s) solicitada(s).
        </li>
      </ul>
      <p className="text-sm font-medium text-amber-800">
        A liberação não pode ser desfeita. O projeto passa a aceitar baixas e entra no painel geral.
      </p>
      <div className="flex gap-2">
        <button
          onClick={confirmar}
          disabled={enviando}
          className="rounded bg-green-700 px-4 py-2 text-sm text-white hover:bg-green-800 disabled:opacity-50"
        >
          {enviando ? 'Liberando…' : 'Confirmar liberação'}
        </button>
        <button
          onClick={() => setConfirmando(false)}
          disabled={enviando}
          className="rounded px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
