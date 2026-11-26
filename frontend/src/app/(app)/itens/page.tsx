'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { HistoricoItem } from '@/components/tabelas/HistoricoItem';
import { useUsuario } from '@/components/ui/AreaLogada';
import { Alerta } from '@/components/ui/Alerta';
import { SeloStatusItem } from '@/components/ui/Indicadores';
import { dataBr } from '@/lib/formatos';
import { ErroApi } from '@/services/api';
import { itensService, type FiltroItens } from '@/services/itens';
import { projetosService } from '@/services/projetos';
import { ROTULO_STATUS_ITEM, StatusItem, TipoUsuario, type Item, type MaquinaResumo, type Projeto } from '@/types';

const campo = 'rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none';
const FILTRO_INICIAL: FiltroItens = { projeto: '', maquina: '', desenho: '', processo: '', status: '' };

/** UC08 — Consultar itens e baixas (todos os tipos). `?item=<id>` abre direto o histórico. */
export default function ItensPage() {
  const usuario = useUsuario();
  const router = useRouter();
  const rota = usePathname();
  const itemAberto = useSearchParams().get('item');

  const [filtro, setFiltro] = useState<FiltroItens>(FILTRO_INICIAL);
  const [itens, setItens] = useState<Item[] | null>(null);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [maquinas, setMaquinas] = useState<MaquinaResumo[]>([]);
  const [versao, setVersao] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  // Projetos para o filtro
  useEffect(() => {
    projetosService.listar().then(setProjetos).catch(() => setProjetos([]));
  }, []);

  // Máquinas do projeto escolhido
  useEffect(() => {
    if (!filtro.projeto) return;
    let ativo = true;
    projetosService
      .detalhar(filtro.projeto)
      .then((p) => ativo && setMaquinas(p.maquinas))
      .catch(() => ativo && setMaquinas([]));
    return () => {
      ativo = false;
    };
  }, [filtro.projeto]);

  // Passos 2–3: lista com filtros (espera um pouco enquanto digita)
  useEffect(() => {
    let ativo = true;
    const espera = setTimeout(() => {
      itensService
        .listar(filtro)
        .then((lista) => {
          if (!ativo) return;
          setItens(lista);
          setErro(null);
        })
        .catch((e) => ativo && setErro(e instanceof ErroApi ? e.message : 'Algo deu errado. Tente novamente.'));
    }, 300);
    return () => {
      ativo = false;
      clearTimeout(espera);
    };
  }, [filtro, versao]);

  function abrir(id: string | null) {
    router.replace(id ? `${rota}?item=${id}` : rota, { scroll: false });
  }

  const filtrando = Object.values(filtro).some(Boolean);

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Itens</h1>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Projeto
          <select
            className={campo}
            value={filtro.projeto}
            onChange={(e) => {
              setMaquinas([]);
              setFiltro({ ...filtro, projeto: e.target.value, maquina: '' });
            }}
          >
            <option value="">Todos</option>
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Máquina
          <select
            className={campo}
            value={filtro.maquina}
            disabled={!filtro.projeto}
            onChange={(e) => setFiltro({ ...filtro, maquina: e.target.value })}
          >
            <option value="">Todas</option>
            {maquinas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Desenho
          <input className={`${campo} w-40`} value={filtro.desenho} onChange={(e) => setFiltro({ ...filtro, desenho: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Processo
          <input className={`${campo} w-40`} value={filtro.processo} onChange={(e) => setFiltro({ ...filtro, processo: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select className={campo} value={filtro.status} onChange={(e) => setFiltro({ ...filtro, status: e.target.value as StatusItem | '' })}>
            <option value="">Todos</option>
            {Object.values(StatusItem).map((s) => (
              <option key={s} value={s}>
                {ROTULO_STATUS_ITEM[s]}
              </option>
            ))}
          </select>
        </label>
        {filtrando && (
          <button onClick={() => setFiltro(FILTRO_INICIAL)} className="px-2 py-2 text-sm text-zinc-600 underline hover:text-zinc-900">
            Limpar filtros
          </button>
        )}
      </div>

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      {itemAberto && (
        <HistoricoItem
          key={itemAberto}
          itemId={itemAberto}
          podeCorrigir={usuario.tipo === TipoUsuario.ENCARREGADO}
          aoFechar={() => abrir(null)}
          aoMudar={() => setVersao((v) => v + 1)}
        />
      )}

      {itens === null ? (
        <p className="text-sm text-zinc-500">Carregando…</p>
      ) : itens.length === 0 ? (
        <p className="rounded border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
          {filtrando ? 'Nenhum item encontrado com estes filtros.' : 'Nenhum item cadastrado.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
          <p className="border-b border-zinc-200 px-4 py-2 text-xs text-zinc-500">{itens.length} item(ns). Clique no desenho para ver o histórico de baixas.</p>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-2 font-medium">Projeto</th>
                <th className="px-4 py-2 font-medium">Máquina</th>
                <th className="px-4 py-2 font-medium">Desenho</th>
                <th className="px-4 py-2 font-medium">Processo</th>
                <th className="px-4 py-2 font-medium">Data</th>
                <th className="px-4 py-2 text-right font-medium">Solicitado</th>
                <th className="px-4 py-2 text-right font-medium">Recebido</th>
                <th className="px-4 py-2 text-right font-medium">Saldo</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id} className={`border-b border-zinc-100 last:border-0 ${item.id === itemAberto ? 'bg-zinc-100' : ''}`}>
                  <td className="px-4 py-2">{item.projeto}</td>
                  <td className="px-4 py-2">{item.maquina}</td>
                  <td className="px-4 py-2 font-medium">
                    <button onClick={() => abrir(item.id)} className="underline hover:text-zinc-600">
                      {item.desenho}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-zinc-600">{item.processo ?? '—'}</td>
                  <td className="px-4 py-2">{dataBr(item.dataSolicitacao)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{item.quantidadeSolicitada}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{item.quantidadeRecebida}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{item.saldo}</td>
                  <td className="px-4 py-2">
                    <SeloStatusItem status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
