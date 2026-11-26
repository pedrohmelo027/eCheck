'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { telasDoTipo } from '@/lib/auth';
import { ROTULO_SETOR, type UsuarioLogado } from '@/types';

/** Menu lateral: mostra só as telas do tipo do usuário. */
export function Menu({ usuario, aoSair }: { usuario: UsuarioLogado; aoSair: () => void }) {
  const rotaAtual = usePathname();

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-zinc-200 bg-white p-4">
      <span className="mb-4 text-lg font-semibold text-zinc-900">eCheck</span>
      {telasDoTipo(usuario.tipo).map((tela) => {
        const ativa = rotaAtual === tela.rota || rotaAtual.startsWith(`${tela.rota}/`);
        return (
          <Link
            key={tela.rota}
            href={tela.rota}
            className={`rounded px-3 py-2 text-sm ${ativa ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'}`}
          >
            {tela.rotulo}
          </Link>
        );
      })}
      <div className="mt-auto border-t border-zinc-200 pt-4 text-sm">
        <p className="font-medium text-zinc-900">{usuario.nome}</p>
        <p className="text-zinc-500">{ROTULO_SETOR[usuario.tipo]}</p>
        <button onClick={aoSair} className="mt-2 text-zinc-700 underline hover:text-zinc-900">
          Sair
        </button>
      </div>
    </nav>
  );
}
