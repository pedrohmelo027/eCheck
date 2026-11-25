'use client';

import { dataBr } from '@/lib/formatos';
import type { LinhaPrevia } from '@/types';

interface Props {
  titulo: string;
  descricao: string;
  linhas: LinhaPrevia[];
  marcadas: Set<number>;
  aoAlternar: (linha: number) => void;
  aoAlternarTodas: (linhas: number[], marcar: boolean) => void;
}

/** Um grupo da pré-visualização (novas, já existem, possível correção), com um checkbox por linha. */
export function LinhasImportacao({ titulo, descricao, linhas, marcadas, aoAlternar, aoAlternarTodas }: Props) {
  if (linhas.length === 0) return null;
  const numeros = linhas.map((l) => l.linha);
  const todasMarcadas = numeros.every((n) => marcadas.has(n));
  const correcao = linhas.some((l) => l.situacao === 'POSSIVEL_CORRECAO');

  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="font-semibold">
          {titulo} <span className="font-normal text-zinc-500">({linhas.length})</span>
        </h2>
        <p className="text-sm text-zinc-500">{descricao}</p>
      </div>
      <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  aria-label={`Marcar todas: ${titulo}`}
                  checked={todasMarcadas}
                  onChange={() => aoAlternarTodas(numeros, !todasMarcadas)}
                />
              </th>
              <th className="px-3 py-2 font-medium">Linha</th>
              <th className="px-3 py-2 font-medium">Projeto</th>
              <th className="px-3 py-2 font-medium">Máquina</th>
              <th className="px-3 py-2 font-medium">Desenho</th>
              <th className="px-3 py-2 font-medium">Processo</th>
              <th className="px-3 py-2 font-medium">Material</th>
              <th className="px-3 py-2 text-right font-medium">Qtd.</th>
              <th className="px-3 py-2 font-medium">Data</th>
              {correcao && <th className="px-3 py-2 font-medium">Já cadastrado</th>}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.linha} className="border-b border-zinc-100 last:border-0">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Importar linha ${l.linha}`}
                    checked={marcadas.has(l.linha)}
                    onChange={() => aoAlternar(l.linha)}
                  />
                </td>
                <td className="px-3 py-2 text-zinc-500">{l.linha}</td>
                <td className="px-3 py-2">{l.projeto}</td>
                <td className="px-3 py-2">{l.maquina}</td>
                <td className="px-3 py-2 font-medium">{l.desenho}</td>
                <td className="px-3 py-2 text-zinc-600">{l.processo ?? '—'}</td>
                <td className="px-3 py-2 text-zinc-600">{l.material ?? '—'}</td>
                <td className="px-3 py-2 text-right">{l.quantidade}</td>
                <td className="px-3 py-2">{dataBr(l.dataSolicitacao)}</td>
                {correcao && (
                  <td className="px-3 py-2 text-amber-700">
                    {l.quantidadesExistentes.length ? `${l.quantidadesExistentes.join(', ')} peça(s)` : ''}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
