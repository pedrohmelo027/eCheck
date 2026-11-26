'use client';

import { useEffect } from 'react';

const CORES = {
  sucesso: 'border-green-300 bg-green-50 text-green-900',
  aviso: 'border-amber-300 bg-amber-50 text-amber-900',
} as const;

interface Props {
  id: number;
  tipo: keyof typeof CORES;
  /** Linhas da mensagem; a primeira vem em destaque. */
  linhas: string[];
  /** Tempo na tela antes de sumir sozinha. */
  duracaoMs: number;
  /** Deve ser estável (useCallback): o cronômetro não reinicia quando a tela redesenha. */
  aoFechar: (id: number) => void;
}

/** Notificação temporária no canto da tela: some sozinha depois de `duracaoMs` ou no ×. */
export function Notificacao({ id, tipo, linhas, duracaoMs, aoFechar }: Props) {
  useEffect(() => {
    const espera = setTimeout(() => aoFechar(id), duracaoMs);
    return () => clearTimeout(espera);
  }, [id, duracaoMs, aoFechar]);

  return (
    <div role="status" aria-live="polite" className={`flex w-96 max-w-[calc(100vw-2rem)] items-start gap-3 rounded border px-4 py-3 text-sm shadow-lg ${CORES[tipo]}`}>
      <div className="flex-1">
        {linhas.map((linha, i) => (
          <p key={i} className={i === 0 ? 'font-medium' : ''}>
            {linha}
          </p>
        ))}
      </div>
      <button onClick={() => aoFechar(id)} aria-label="Fechar aviso" className="text-lg leading-none opacity-60 hover:opacity-100">
        ×
      </button>
    </div>
  );
}

/** Pilha de notificações no canto superior direito, acima do conteúdo. */
export function AreaNotificacoes({ children }: { children: React.ReactNode }) {
  return <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col items-end gap-2 [&>*]:pointer-events-auto">{children}</div>;
}
