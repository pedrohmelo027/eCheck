'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraficoPercentual } from '@/components/graficos/GraficoPercentual';
import { Alerta } from '@/components/ui/Alerta';
import { CartaoNumero } from '@/components/ui/CartaoNumero';
import { numeroBr, percentualBr } from '@/lib/formatos';
import { ErroApi } from '@/services/api';
import { painelService } from '@/services/painel';
import type { PainelGeral } from '@/types';

/** UC09 — Painel geral (tela inicial depois do login). Só projetos liberados (RN20). */
export default function PainelPage() {
  const router = useRouter();
  const [painel, setPainel] = useState<PainelGeral | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    painelService
      .geral()
      .then((p) => {
        if (!ativo) return;
        setPainel(p);
        setErro(null);
      })
      .catch((e) => ativo && setErro(e instanceof ErroApi ? e.message : 'Algo deu errado. Tente novamente.'));
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  const abrirProjeto = useCallback((id: string) => router.push(`/painel/${id}`), [router]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">Painel geral</h1>
        <p className="text-sm text-zinc-500">Recebimento de todos os projetos liberados para a produção.</p>
      </div>

      {/* FE1 — falha ao calcular: mensagem e opção de tentar de novo */}
      {erro && (
        <div className="flex flex-col items-start gap-2">
          <Alerta tipo="erro">{erro}</Alerta>
          <button onClick={() => setTentativa((t) => t + 1)} className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100">
            Tentar de novo
          </button>
        </div>
      )}

      {!painel && !erro && <p className="text-sm text-zinc-500">Carregando…</p>}

      {painel && (
        <>
          {/* Passo 2 — percentual geral e totais */}
          <div className="flex flex-wrap gap-3">
            <CartaoNumero rotulo="Recebido" valor={percentualBr(painel.percentualRecebido)} destaque />
            <CartaoNumero rotulo="Peças solicitadas" valor={numeroBr(painel.totalSolicitado)} />
            <CartaoNumero rotulo="Peças recebidas" valor={numeroBr(painel.totalRecebido)} />
            <CartaoNumero rotulo="Peças faltantes" valor={numeroBr(painel.totalFaltante)} />
            <CartaoNumero rotulo="Projetos liberados" valor={numeroBr(painel.totalProjetos)} />
          </div>

          {painel.projetos.length === 0 ? (
            // FA1
            <p className="rounded border border-zinc-200 bg-white p-4 text-sm text-zinc-500">Nenhum projeto liberado ainda.</p>
          ) : (
            <>
              {/* Passo 3 — percentual de cada projeto; passo 4 — escolher um projeto (UC10) */}
              <GraficoPercentual
                titulo="Percentual recebido por projeto"
                linhas={painel.projetos.map((p) => ({ ...p, rotulo: p.codigo }))}
                aoEscolher={abrirProjeto}
              />

              <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Projetos liberados com peças solicitadas, recebidas, faltantes e percentual</caption>
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                    <tr>
                      <th className="px-4 py-2 font-medium">Projeto</th>
                      <th className="px-4 py-2 font-medium">Nome</th>
                      <th className="px-4 py-2 text-right font-medium">Solicitadas</th>
                      <th className="px-4 py-2 text-right font-medium">Recebidas</th>
                      <th className="px-4 py-2 text-right font-medium">Faltantes</th>
                      <th className="px-4 py-2 text-right font-medium">Recebido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {painel.projetos.map((p) => (
                      <tr key={p.id} className="border-b border-zinc-100 last:border-0">
                        <td className="px-4 py-2 font-medium">
                          <Link href={`/painel/${p.id}`} className="underline hover:text-zinc-600">
                            {p.codigo}
                          </Link>
                        </td>
                        <td className="px-4 py-2">{p.nome}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{numeroBr(p.totalSolicitado)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{numeroBr(p.totalRecebido)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{numeroBr(p.totalFaltante)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{percentualBr(p.percentualRecebido)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
