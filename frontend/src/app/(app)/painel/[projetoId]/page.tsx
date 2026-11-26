'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { GraficoPercentual } from '@/components/graficos/GraficoPercentual';
import { Alerta } from '@/components/ui/Alerta';
import { CartaoNumero } from '@/components/ui/CartaoNumero';
import { SeloStatusItem, SeloStatusProjeto } from '@/components/ui/Indicadores';
import { dataBr, dataHoraBr, numeroBr, percentualBr } from '@/lib/formatos';
import { ErroApi } from '@/services/api';
import { painelService } from '@/services/painel';
import type { PainelProjeto } from '@/types';

/** UC10 — Painel por projeto: percentual do projeto e de cada máquina e o que ainda falta chegar. */
export default function PainelProjetoPage() {
  const { projetoId } = useParams<{ projetoId: string }>();
  const [painel, setPainel] = useState<PainelProjeto | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    painelService
      .porProjeto(projetoId)
      .then((p) => ativo && setPainel(p))
      .catch((e) => ativo && setErro(e instanceof ErroApi ? e.message : 'Algo deu errado. Tente novamente.'));
    return () => {
      ativo = false;
    };
  }, [projetoId]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <Link href="/painel" className="text-sm text-zinc-600 underline hover:text-zinc-900">
        ← Painel geral
      </Link>

      {/* FE1 — projeto não encontrado (EX09) */}
      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      {!painel && !erro && <p className="text-sm text-zinc-500">Carregando…</p>}

      {painel && (
        <>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{painel.projeto.codigo}</h1>
              <SeloStatusProjeto status={painel.projeto.status} />
            </div>
            <p className="text-zinc-700">{painel.projeto.nome}</p>
            {painel.projeto.liberadoEm && <p className="text-sm text-zinc-500">Liberado em {dataHoraBr(painel.projeto.liberadoEm)}</p>}
          </div>

          {/* FA1 — projeto em cadastro */}
          {!painel.liberado && <Alerta tipo="aviso">Projeto ainda não liberado. Ele não aceita baixas e não entra no painel geral.</Alerta>}

          {/* Passo 2 — percentual e totais do projeto */}
          <div className="flex flex-wrap gap-3">
            <CartaoNumero rotulo="Recebido" valor={percentualBr(painel.percentualRecebido)} destaque />
            <CartaoNumero rotulo="Peças solicitadas" valor={numeroBr(painel.totalSolicitado)} />
            <CartaoNumero rotulo="Peças recebidas" valor={numeroBr(painel.totalRecebido)} />
            <CartaoNumero rotulo="Peças faltantes" valor={numeroBr(painel.totalFaltante)} />
          </div>

          {/* Passo 3 — percentual de cada máquina */}
          {painel.maquinas.length > 0 ? (
            <GraficoPercentual titulo="Percentual recebido por máquina" linhas={painel.maquinas.map((m) => ({ ...m, rotulo: m.nome }))} />
          ) : (
            <p className="rounded border border-zinc-200 bg-white p-4 text-sm text-zinc-500">Nenhuma máquina cadastrada.</p>
          )}

          {painel.maquinas.length > 0 && (
            <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Máquinas com peças solicitadas, recebidas, faltantes e percentual</caption>
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">Máquina</th>
                    <th className="px-4 py-2 text-right font-medium">Solicitadas</th>
                    <th className="px-4 py-2 text-right font-medium">Recebidas</th>
                    <th className="px-4 py-2 text-right font-medium">Faltantes</th>
                    <th className="px-4 py-2 text-right font-medium">Recebido</th>
                  </tr>
                </thead>
                <tbody>
                  {painel.maquinas.map((m) => (
                    <tr key={m.id} className="border-b border-zinc-100 last:border-0">
                      <td className="px-4 py-2 font-medium">{m.nome}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{numeroBr(m.totalSolicitado)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{numeroBr(m.totalRecebido)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{numeroBr(m.totalFaltante)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{percentualBr(m.percentualRecebido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Passo 4 — itens faltantes; passo 5 — abrir o histórico (UC08) */}
          <h2 className="font-semibold">Itens faltantes</h2>
          {painel.faltantes.length === 0 ? (
            // FA2
            <p className="rounded border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              {painel.totalSolicitado > 0 ? 'Todos os itens foram recebidos.' : 'Nenhum item cadastrado.'}
            </p>
          ) : (
            <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
              <p className="border-b border-zinc-200 px-4 py-2 text-xs text-zinc-500">
                {painel.faltantes.length} item(ns). Clique no desenho para ver o histórico de baixas.
              </p>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">Desenho</th>
                    <th className="px-4 py-2 font-medium">Máquina</th>
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 text-right font-medium">Solicitado</th>
                    <th className="px-4 py-2 text-right font-medium">Recebido</th>
                    <th className="px-4 py-2 text-right font-medium">Saldo</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {painel.faltantes.map((item) => (
                    <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                      <td className="px-4 py-2 font-medium">
                        <Link href={`/itens?item=${item.id}`} className="underline hover:text-zinc-600">
                          {item.desenho}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{item.maquina}</td>
                      <td className="px-4 py-2">{dataBr(item.dataSolicitacao)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{numeroBr(item.quantidadeSolicitada)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{numeroBr(item.quantidadeRecebida)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{numeroBr(item.saldo)}</td>
                      <td className="px-4 py-2">
                        <SeloStatusItem status={item.status} />
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
