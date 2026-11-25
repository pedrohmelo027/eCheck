'use client';

import { useState } from 'react';
import { BaixaForm } from '@/components/formularios/BaixaForm';
import { Alerta } from '@/components/ui/Alerta';
import { SeloStatusItem } from '@/components/ui/Indicadores';
import { dataBr } from '@/lib/formatos';
import { ErroApi } from '@/services/api';
import { recebimentosService } from '@/services/recebimentos';
import { ROTULO_STATUS_ITEM, StatusItem, type Item, type SimulacaoBaixaProjeto } from '@/types';

/** O que o Encarregado escolheu: uma linha da máquina (FP) ou o projeto inteiro (FA1). */
type Acao =
  | { tipo: 'maquina'; item: Item }
  | { tipo: 'projeto'; projetoId: string; projeto: string; desenho: string; saldo: number }
  | null;

/** Prévia da baixa pelo projeto, com os dados digitados para confirmar depois. */
type Previa = { simulacao: SimulacaoBaixaProjeto; quantidade: number; observacao: string | null };

interface Grupo {
  chave: string;
  projetoId: string;
  projeto: string;
  desenho: string;
  itens: Item[];
}

function mensagemDe(erro: unknown) {
  return erro instanceof ErroApi ? erro.message : 'Algo deu errado. Tente novamente.';
}

/** Agrupa o resultado da busca por projeto e desenho, para a baixa pelo projeto inteiro. */
function agrupar(itens: Item[]): Grupo[] {
  const grupos = new Map<string, Grupo>();
  for (const item of itens) {
    const chave = `${item.projetoId}|${item.desenho.trim().toLowerCase()}`;
    const grupo = grupos.get(chave) ?? { chave, projetoId: item.projetoId, projeto: item.projeto, desenho: item.desenho, itens: [] };
    grupo.itens.push(item);
    grupos.set(chave, grupo);
  }
  return [...grupos.values()];
}

/** Resumo do item depois da baixa (passo 8). */
function resumoItem(item: Item) {
  return `${item.desenho} (${item.maquina}): recebido ${item.quantidadeRecebida} de ${item.quantidadeSolicitada}, saldo ${item.saldo}, ${ROTULO_STATUS_ITEM[item.status].toLowerCase()} (${item.percentualRecebido.toLocaleString('pt-BR')}%)`;
}

/** UC07 — Manter recebimentos (Encarregado): pesquisa por desenho e baixa. */
export default function RecebimentosPage() {
  const [busca, setBusca] = useState('');
  const [termo, setTermo] = useState('');
  const [itens, setItens] = useState<Item[] | null>(null);
  const [acao, setAcao] = useState<Acao>(null);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function limparMensagens() {
    setErro(null);
    setSucesso(null);
    setAviso(null);
  }

  async function pesquisar(desenho: string) {
    setBuscando(true);
    try {
      setItens(await recebimentosService.buscarPorDesenho(desenho));
      setTermo(desenho);
    } catch (e) {
      setItens(null);
      setErro(mensagemDe(e));
    } finally {
      setBuscando(false);
    }
  }

  // Passos 1–2
  async function enviarBusca(evento: React.FormEvent) {
    evento.preventDefault();
    if (!busca.trim()) return;
    limparMensagens();
    setAcao(null);
    setPrevia(null);
    await pesquisar(busca.trim());
  }

  function escolher(nova: Acao) {
    limparMensagens();
    setPrevia(null);
    setAcao(nova);
  }

  // FP passos 4–8: baixa por máquina
  async function baixaPorMaquina(item: Item, quantidade: number, observacao: string | null) {
    limparMensagens();
    try {
      const resultado = await recebimentosService.darBaixa(item.id, quantidade, observacao);
      setSucesso([`Registradas ${resultado.recebimento.quantidade} peça(s).`, resumoItem(resultado.item)]);
      setAviso(resultado.aviso?.mensagem ?? null);
      setAcao(null);
      await pesquisar(termo);
    } catch (e) {
      setErro(mensagemDe(e));
      throw e;
    }
  }

  // FA1: prévia da distribuição
  async function verDistribuicao(projetoId: string, desenho: string, quantidade: number, observacao: string | null) {
    limparMensagens();
    try {
      const simulacao = await recebimentosService.simularBaixaProjeto(projetoId, desenho, quantidade);
      setPrevia({ simulacao, quantidade, observacao });
    } catch (e) {
      setErro(mensagemDe(e));
      throw e;
    }
  }

  // FA1: confirma a distribuição mostrada
  async function confirmarProjeto(projetoId: string) {
    if (!previa) return;
    limparMensagens();
    setConfirmando(true);
    try {
      const resultado = await recebimentosService.darBaixaProjeto(projetoId, previa.simulacao.desenho, previa.quantidade, previa.observacao);
      setSucesso([
        `Registradas ${resultado.quantidadeRegistrada} peça(s) de ${resultado.desenho} em ${resultado.recebimentos?.length ?? 0} remessa(s).`,
        ...resultado.distribuicao.filter((d) => d.quantidade > 0).map((d) => `+${d.quantidade} → ${resumoItem(d.item)}`),
      ]);
      setAviso(resultado.aviso?.mensagem ?? null);
      setAcao(null);
      setPrevia(null);
      await pesquisar(termo);
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Recebimentos</h1>

      <form onSubmit={enviarBusca} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Número do desenho (completo ou parcial)
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="ex.: TST-001"
            className="w-72 rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
          />
        </label>
        <button type="submit" disabled={buscando} className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50">
          {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      {aviso && <Alerta tipo="aviso">{aviso}</Alerta>}
      {sucesso && (
        <Alerta tipo="sucesso">
          {sucesso.map((linha, i) => (
            <p key={i} className={i === 0 ? 'font-medium' : ''}>
              {linha}
            </p>
          ))}
        </Alerta>
      )}

      {itens &&
        agrupar(itens).map((grupo) => {
          const saldoGrupo = grupo.itens.reduce((soma, i) => soma + i.saldo, 0);
          const acaoProjeto = acao?.tipo === 'projeto' && acao.projetoId === grupo.projetoId && acao.desenho === grupo.desenho;
          return (
            <section key={grupo.chave} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">
                  {grupo.projeto} · {grupo.desenho}{' '}
                  <span className="font-normal text-zinc-500">
                    ({grupo.itens.length} solicitação(ões), saldo {saldoGrupo})
                  </span>
                </h2>
                <button
                  onClick={() => escolher({ tipo: 'projeto', projetoId: grupo.projetoId, projeto: grupo.projeto, desenho: grupo.desenho, saldo: saldoGrupo })}
                  className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100"
                >
                  Baixa pelo projeto
                </button>
              </div>

              <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                    <tr>
                      <th className="px-4 py-2 font-medium">Máquina</th>
                      <th className="px-4 py-2 font-medium">Data da solicitação</th>
                      <th className="px-4 py-2 text-right font-medium">Solicitado</th>
                      <th className="px-4 py-2 text-right font-medium">Recebido</th>
                      <th className="px-4 py-2 text-right font-medium">Saldo</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.itens.map((item) => (
                      <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                        <td className="px-4 py-2">{item.maquina}</td>
                        <td className="px-4 py-2">{dataBr(item.dataSolicitacao)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{item.quantidadeSolicitada}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{item.quantidadeRecebida}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{item.saldo}</td>
                        <td className="px-4 py-2">
                          <SeloStatusItem status={item.status} />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => escolher({ tipo: 'maquina', item })}
                            className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100"
                          >
                            Dar baixa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {acao?.tipo === 'maquina' && grupo.itens.some((i) => i.id === acao.item.id) && (
                <BaixaForm
                  key={acao.item.id}
                  titulo={`Baixa em ${acao.item.desenho} · ${acao.item.maquina}`}
                  descricao={`${acao.item.projeto}, solicitado em ${dataBr(acao.item.dataSolicitacao)} · saldo ${acao.item.saldo}${
                    acao.item.status === StatusItem.COMPLETO ? ' (já completo)' : ''
                  }`}
                  saldo={acao.item.saldo}
                  textoBotao="Confirmar baixa"
                  aoEnviar={(quantidade, observacao) => baixaPorMaquina(acao.item, quantidade, observacao)}
                  aoCancelar={() => setAcao(null)}
                />
              )}

              {acaoProjeto && !previa && (
                <BaixaForm
                  titulo={`Baixa de ${grupo.desenho} pelo projeto ${grupo.projeto}`}
                  descricao="A quantidade vai primeiro para a solicitação mais antiga; o restante segue para a próxima."
                  textoBotao="Ver distribuição"
                  aoEnviar={(quantidade, observacao) => verDistribuicao(grupo.projetoId, grupo.desenho, quantidade, observacao)}
                  aoCancelar={() => setAcao(null)}
                />
              )}

              {acaoProjeto && previa && (
                <div className="flex flex-col gap-3 rounded border border-zinc-300 bg-white p-4">
                  <h3 className="font-semibold">
                    Distribuição de {previa.quantidade} peça(s) de {previa.simulacao.desenho}
                  </h3>
                  {previa.simulacao.aviso && <Alerta tipo="aviso">{previa.simulacao.aviso.mensagem}</Alerta>}
                  <table className="w-full text-left text-sm">
                    <thead className="text-zinc-600">
                      <tr className="border-b border-zinc-200">
                        <th className="py-2 pr-3 font-medium">Máquina</th>
                        <th className="py-2 pr-3 font-medium">Data</th>
                        <th className="py-2 pr-3 text-right font-medium">Saldo</th>
                        <th className="py-2 pr-3 text-right font-medium">Vai receber</th>
                        <th className="py-2 text-right font-medium">Saldo depois</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previa.simulacao.distribuicao.map((d) => (
                        <tr key={d.item.id} className="border-b border-zinc-100 last:border-0">
                          <td className="py-2 pr-3">{d.item.maquina}</td>
                          <td className="py-2 pr-3">{dataBr(d.item.dataSolicitacao)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{d.item.saldo}</td>
                          <td className="py-2 pr-3 text-right font-semibold tabular-nums">{d.quantidade}</td>
                          <td className="py-2 text-right tabular-nums">{d.item.saldo - d.quantidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmarProjeto(grupo.projetoId)}
                      disabled={confirmando}
                      className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
                    >
                      {confirmando ? 'Registrando…' : `Confirmar baixa de ${previa.simulacao.quantidadeRegistrada} peça(s)`}
                    </button>
                    <button onClick={() => setPrevia(null)} disabled={confirmando} className="rounded px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
                      Voltar
                    </button>
                    <button onClick={() => escolher(null)} disabled={confirmando} className="rounded px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
    </main>
  );
}
