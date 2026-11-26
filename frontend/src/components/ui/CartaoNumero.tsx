/** Cartão de número (stat tile): rótulo e valor; o principal do painel vem em destaque. */
export function CartaoNumero({ rotulo, valor, destaque = false }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex min-w-36 flex-col gap-1 rounded border border-zinc-200 bg-white px-4 py-3">
      <span className="text-sm text-zinc-500">{rotulo}</span>
      <span className={`font-semibold tabular-nums text-zinc-900 ${destaque ? 'text-4xl' : 'text-2xl'}`}>{valor}</span>
    </div>
  );
}
