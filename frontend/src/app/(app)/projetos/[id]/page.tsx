'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Alerta } from '@/components/ui/Alerta';
import { BarraPercentual, SeloStatusProjeto } from '@/components/ui/Indicadores';
import { ErroApi } from '@/services/api';
import { projetosService } from '@/services/projetos';
import type { ProjetoDetalhe } from '@/types';

/**
 * Projeto com as máquinas (UC04 FA3). O cadastro de máquinas e itens (UC05) e a liberação (UC06)
 * entram nesta tela.
 */
export default function ProjetoPage() {
  const { id } = useParams<{ id: string }>();
  const [projeto, setProjeto] = useState<ProjetoDetalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    projetosService
      .detalhar(id)
      .then(setProjeto)
      .catch((e) => setErro(e instanceof ErroApi ? e.message : 'Algo deu errado. Tente novamente.'));
  }, [id]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <Link href="/projetos" className="text-sm text-zinc-600 underline hover:text-zinc-900">
        ← Projetos
      </Link>

      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      {!projeto && !erro && <p className="text-sm text-zinc-500">Carregando…</p>}

      {projeto && (
        <>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{projeto.codigo}</h1>
              <SeloStatusProjeto status={projeto.status} />
            </div>
            <p className="text-zinc-700">{projeto.nome}</p>
            {projeto.descricao && <p className="text-sm text-zinc-500">{projeto.descricao}</p>}
          </div>

          <div className="flex flex-wrap gap-6 rounded border border-zinc-200 bg-white p-4 text-sm">
            <div>
              <p className="text-zinc-500">Máquinas</p>
              <p className="text-lg font-semibold tabular-nums">{projeto.totalMaquinas}</p>
            </div>
            <div>
              <p className="text-zinc-500">Itens</p>
              <p className="text-lg font-semibold tabular-nums">{projeto.totalItens}</p>
            </div>
            <div>
              <p className="text-zinc-500">Peças solicitadas</p>
              <p className="text-lg font-semibold tabular-nums">{projeto.totalSolicitado}</p>
            </div>
            <div>
              <p className="text-zinc-500">Peças recebidas</p>
              <p className="text-lg font-semibold tabular-nums">{projeto.totalRecebido}</p>
            </div>
            <div>
              <p className="text-zinc-500">Recebido</p>
              <BarraPercentual valor={projeto.percentualRecebido} />
            </div>
          </div>

          <h2 className="font-semibold">Máquinas</h2>
          {projeto.maquinas.length === 0 ? (
            <p className="rounded border border-zinc-200 bg-white p-4 text-sm text-zinc-500">Nenhuma máquina cadastrada.</p>
          ) : (
            <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">Máquina</th>
                    <th className="px-4 py-2 text-right font-medium">Itens</th>
                    <th className="px-4 py-2 text-right font-medium">Solicitadas</th>
                    <th className="px-4 py-2 text-right font-medium">Recebidas</th>
                    <th className="px-4 py-2 font-medium">Recebido</th>
                  </tr>
                </thead>
                <tbody>
                  {projeto.maquinas.map((m) => (
                    <tr key={m.id} className="border-b border-zinc-100 last:border-0">
                      <td className="px-4 py-2 font-medium">{m.nome}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{m.totalItens}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{m.totalSolicitado}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{m.totalRecebido}</td>
                      <td className="px-4 py-2">
                        <BarraPercentual valor={m.percentualRecebido} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
