'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CardDesenho, estaCompleto, type Acao, type Desenho, type Previa } from '@/components/tabelas/CardDesenho';
import { Alerta } from '@/components/ui/Alerta';
import { AreaNotificacoes, Notificacao } from '@/components/ui/Notificacao';
import { ErroApi } from '@/services/api';
import { itensService } from '@/services/itens';
import { recebimentosService } from '@/services/recebimentos';
import { ROTULO_STATUS_ITEM, type Item } from '@/types';

/**
 * "falta": o padrão da tela — só o que ainda falta receber; projeto que completou sai do card e
 * desenho completo em todos os projetos sai da tela. "completos": consulta do que já chegou.
 */
type Filtro = 'falta' | 'completos';

/** Tempo das notificações na tela. */
const DURACAO_SUCESSO_MS = 5000;
const DURACAO_AVISO_MS = 8000;

type Aviso = { id: number; tipo: 'sucesso' | 'aviso'; linhas: string[]; duracaoMs: number };

function mensagemDe(erro: unknown) {
  return erro instanceof ErroApi ? erro.message : 'Algo deu errado. Tente novamente.';
}

const chaveDesenho = (desenho: string) => desenho.trim().toLowerCase();

/**
 * Agrupa os itens por desenho (um card) e, dentro dele, por projeto: o mesmo desenho em vários
 * projetos fica junto, com as quantidades de cada projeto separadas.
 */
function agruparPorDesenho(itens: Item[]): Desenho[] {
  const desenhos = new Map<string, Desenho>();
  for (const item of itens) {
    const chave = chaveDesenho(item.desenho);
    const desenho = desenhos.get(chave) ?? { chave, desenho: item.desenho, grupos: [] };
    let grupo = desenho.grupos.find((g) => g.projetoId === item.projetoId);
    if (!grupo) {
      grupo = { projetoId: item.projetoId, projeto: item.projeto, itens: [] };
      desenho.grupos.push(grupo);
    }
    grupo.itens.push(item);
    desenhos.set(chave, desenho);
  }
  return [...desenhos.values()].sort((a, b) => a.desenho.localeCompare(b.desenho, 'pt-BR', { numeric: true }));
}

/** Cada projeto do card entra só se combinar com o filtro; card sem nenhum projeto sai. */
function filtrar(desenhos: Desenho[], filtro: Filtro): Desenho[] {
  return desenhos
    .map((d) => ({ ...d, grupos: d.grupos.filter((g) => (filtro === 'completos') === estaCompleto(g.itens)) }))
    .filter((d) => d.grupos.length > 0);
}

/** Resumo do item depois da baixa (UC07 passo 8). */
function resumoItem(item: Item) {
  return `${item.desenho} (${item.projeto} · ${item.maquina}): recebido ${item.quantidadeRecebida} de ${item.quantidadeSolicitada}, falta ${item.saldo}, ${ROTULO_STATUS_ITEM[item.status].toLowerCase()} (${item.percentualRecebido.toLocaleString('pt-BR')}%)`;
}

/** Depois da baixa: avisa se o projeto (ou o desenho inteiro) completou e saiu da lista. */
function avisoDeSaida(itens: Item[], desenho: string, projetoId: string, projeto: string): string | null {
  const doDesenho = itens.filter((i) => chaveDesenho(i.desenho) === chaveDesenho(desenho));
  if (doDesenho.length > 0 && estaCompleto(doDesenho)) return `${desenho} completo em todos os projetos: saiu da lista.`;
  const doProjeto = doDesenho.filter((i) => i.projetoId === projetoId);
  if (doProjeto.length > 0 && estaCompleto(doProjeto)) return `${desenho} completo no ${projeto}: saiu da lista.`;
  return null;
}

/** UC07 — Manter recebimentos (Encarregado): o que falta receber dos projetos liberados, em cards. */
export default function RecebimentosPage() {
  const [itens, setItens] = useState<Item[] | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('falta');
  const [acao, setAcao] = useState<Acao>(null);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const notificar = useCallback((tipo: Aviso['tipo'], linhas: string[]) => {
    setAvisos((atuais) => [
      ...atuais,
      { id: Date.now() + Math.random(), tipo, linhas, duracaoMs: tipo === 'aviso' ? DURACAO_AVISO_MS : DURACAO_SUCESSO_MS },
    ]);
  }, []);

  const fecharAviso = useCallback((id: number) => setAvisos((atuais) => atuais.filter((a) => a.id !== id)), []);

  /** Recarrega a lista e devolve os itens atualizados. */
  const carregar = useCallback(async (): Promise<Item[]> => {
    const lista = await itensService.listar({ liberados: true });
    setItens(lista);
    return lista;
  }, []);

  useEffect(() => {
    let ativo = true;
    itensService
      .listar({ liberados: true })
      .then((lista) => ativo && setItens(lista))
      .catch((e) => ativo && setErro(mensagemDe(e)));
    return () => {
      ativo = false;
    };
  }, []);

  const desenhos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return agruparPorDesenho((itens ?? []).filter((i) => !termo || i.desenho.toLowerCase().includes(termo)));
  }, [itens, busca]);

  const porFiltro = useMemo(() => ({ falta: filtrar(desenhos, 'falta'), completos: filtrar(desenhos, 'completos') }), [desenhos]);
  const visiveis = porFiltro[filtro];

  function escolher(nova: Acao) {
    setErro(null);
    setPrevia(null);
    setAcao(nova);
  }

  // Baixa por máquina (UC07 FP)
  async function baixarItem(item: Item, quantidade: number, observacao: string | null) {
    setErro(null);
    try {
      const resultado = await recebimentosService.darBaixa(item.id, quantidade, observacao);
      setAcao(null);
      const lista = await carregar();
      const saida = avisoDeSaida(lista, item.desenho, item.projetoId, item.projeto);
      notificar('sucesso', [`Registradas ${resultado.recebimento.quantidade} peça(s).`, resumoItem(resultado.item), ...(saida ? [saida] : [])]);
      if (resultado.aviso) notificar('aviso', [resultado.aviso.mensagem]);
    } catch (e) {
      setErro(mensagemDe(e));
      throw e;
    }
  }

  // Baixa pelo projeto (UC07 FA1): prévia
  async function verDistribuicao(projetoId: string, desenho: string, quantidade: number, observacao: string | null) {
    setErro(null);
    try {
      setPrevia({ simulacao: await recebimentosService.simularBaixaProjeto(projetoId, desenho, quantidade), quantidade, observacao });
    } catch (e) {
      setErro(mensagemDe(e));
      throw e;
    }
  }

  // Baixa pelo projeto: confirma a distribuição mostrada
  async function confirmarProjeto(projetoId: string) {
    if (!previa) return;
    setErro(null);
    setConfirmando(true);
    try {
      const resultado = await recebimentosService.darBaixaProjeto(projetoId, previa.simulacao.desenho, previa.quantidade, previa.observacao);
      setAcao(null);
      setPrevia(null);
      const lista = await carregar();
      const projeto = resultado.distribuicao[0]?.item.projeto ?? '';
      const saida = avisoDeSaida(lista, resultado.desenho, projetoId, projeto);
      notificar('sucesso', [
        `Registradas ${resultado.quantidadeRegistrada} peça(s) de ${resultado.desenho} em ${resultado.recebimentos?.length ?? 0} remessa(s).`,
        ...resultado.distribuicao.filter((d) => d.quantidade > 0).map((d) => `+${d.quantidade} → ${resumoItem(d.item)}`),
        ...(saida ? [saida] : []),
      ]);
      if (resultado.aviso) notificar('aviso', [resultado.aviso.mensagem]);
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setConfirmando(false);
    }
  }

  const abas: { valor: Filtro; rotulo: string }[] = [
    { valor: 'falta', rotulo: 'Falta receber' },
    { valor: 'completos', rotulo: 'Completos' },
  ];

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">Recebimentos</h1>
        <p className="text-sm text-zinc-500">
          {filtro === 'falta'
            ? 'O que ainda falta receber dos projetos liberados. Ao completar, o projeto sai do card e o desenho completo sai da lista.'
            : 'Desenhos já recebidos por completo, por projeto.'}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div role="tablist" aria-label="Filtrar desenhos" className="flex rounded border border-zinc-300 bg-white p-0.5">
          {abas.map((aba) => (
            <button
              key={aba.valor}
              role="tab"
              aria-selected={filtro === aba.valor}
              onClick={() => {
                setFiltro(aba.valor);
                escolher(null);
              }}
              className={`rounded px-3 py-1.5 text-sm ${filtro === aba.valor ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'}`}
            >
              {aba.rotulo} <span className={filtro === aba.valor ? 'text-zinc-300' : 'text-zinc-400'}>({porFiltro[aba.valor].length})</span>
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Desenho (completo ou parcial)
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="ex.: TST-001"
            className="w-64 rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
          />
        </label>
      </div>

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      {itens === null && !erro && <p className="text-sm text-zinc-500">Carregando…</p>}

      {itens !== null && visiveis.length === 0 && (
        <p className="rounded border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
          {itens.length === 0
            ? 'Nenhum projeto liberado ainda.'
            : busca.trim()
              ? filtro === 'falta'
                ? 'Nada falta receber para esta busca.'
                : 'Nenhum desenho completo para esta busca.'
              : filtro === 'falta'
                ? 'Nada falta receber: todos os desenhos estão completos.'
                : 'Nenhum desenho completo ainda.'}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {visiveis.map((d) => (
          <CardDesenho
            key={d.chave}
            desenho={d}
            acao={acao}
            previa={previa}
            confirmando={confirmando}
            aoEscolher={escolher}
            aoBaixarItem={baixarItem}
            aoVerDistribuicao={verDistribuicao}
            aoConfirmarProjeto={confirmarProjeto}
            aoVoltarDaPrevia={() => setPrevia(null)}
          />
        ))}
      </div>

      <AreaNotificacoes>
        {avisos.map((a) => (
          <Notificacao key={a.id} id={a.id} tipo={a.tipo} linhas={a.linhas} duracaoMs={a.duracaoMs} aoFechar={fecharAviso} />
        ))}
      </AreaNotificacoes>
    </main>
  );
}
