'use client';

import { BaixaForm } from '@/components/formularios/BaixaForm';
import { Alerta } from '@/components/ui/Alerta';
import { SeloStatusItem } from '@/components/ui/Indicadores';
import { dataBr, numeroBr } from '@/lib/formatos';
import { StatusItem, type Item, type SimulacaoBaixaProjeto } from '@/types';

/** Um projeto dentro do card: as solicitações daquele desenho naquele projeto. */
export interface GrupoProjeto {
  projetoId: string;
  projeto: string;
  itens: Item[];
}

/** Um card = um desenho, com cada projeto em que ele aparece (quantidades separadas por projeto). */
export interface Desenho {
  chave: string;
  desenho: string;
  grupos: GrupoProjeto[];
}

/** Ação aberta na tela: baixa num item (por máquina) ou pelo projeto inteiro. */
export type Acao = { tipo: 'maquina'; item: Item } | { tipo: 'projeto'; projetoId: string; desenho: string } | null;

export type Previa = { simulacao: SimulacaoBaixaProjeto; quantidade: number; observacao: string | null };

interface Props {
  desenho: Desenho;
  acao: Acao;
  previa: Previa | null;
  confirmando: boolean;
  aoEscolher: (acao: Acao) => void;
  aoBaixarItem: (item: Item, quantidade: number, observacao: string | null) => Promise<void>;
  aoVerDistribuicao: (projetoId: string, desenho: string, quantidade: number, observacao: string | null) => Promise<void>;
  aoConfirmarProjeto: (projetoId: string) => void;
  aoVoltarDaPrevia: () => void;
}

/** Soma só para exibir (os números de cada item vêm calculados da API). */
function somar(itens: Item[]) {
  return itens.reduce(
    (t, i) => ({ solicitado: t.solicitado + i.quantidadeSolicitada, recebido: t.recebido + i.quantidadeRecebida, falta: t.falta + i.saldo }),
    { solicitado: 0, recebido: 0, falta: 0 },
  );
}

export function estaCompleto(itens: Item[]) {
  return itens.every((i) => i.status === StatusItem.COMPLETO);
}

/**
 * Card de um desenho na tela de recebimentos. Completo: verde, com o selo "Completo".
 * Ainda falta: linha vermelha com "Ainda falta receber X peça(s)".
 */
export function CardDesenho({ desenho, acao, previa, confirmando, aoEscolher, aoBaixarItem, aoVerDistribuicao, aoConfirmarProjeto, aoVoltarDaPrevia }: Props) {
  const todos = desenho.grupos.flatMap((g) => g.itens);
  const total = somar(todos);
  const completo = estaCompleto(todos);

  return (
    <article
      aria-label={`Desenho ${desenho.desenho}`}
      className={`flex flex-col overflow-hidden rounded border bg-white ${completo ? 'border-green-300' : 'border-zinc-200'}`}
    >
      {/* Linha de estado: vermelha enquanto falta receber, verde quando completo */}
      <div className={`h-1.5 ${completo ? 'bg-green-600' : 'bg-red-600'}`} aria-hidden="true" />

      <div className="flex flex-col gap-3 p-4">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">{desenho.desenho}</h3>
            <p className="text-sm text-zinc-500">
              {desenho.grupos.length === 1 ? '1 projeto' : `${desenho.grupos.length} projetos`} · {numeroBr(total.recebido)} de{' '}
              {numeroBr(total.solicitado)} peça(s) recebida(s)
            </p>
          </div>
          {completo ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">✓ Completo</span>
          ) : (
            <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
              Ainda falta receber {numeroBr(total.falta)} peça(s)
            </span>
          )}
        </header>

        {desenho.grupos.map((grupo) => {
          const soma = somar(grupo.itens);
          const grupoCompleto = estaCompleto(grupo.itens);
          const acaoProjeto = acao?.tipo === 'projeto' && acao.projetoId === grupo.projetoId && acao.desenho === desenho.desenho;
          const itemAberto = acao?.tipo === 'maquina' ? grupo.itens.find((i) => i.id === acao.item.id) : undefined;

          return (
            <section key={grupo.projetoId} className="flex flex-col gap-2 rounded border border-zinc-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="text-sm">
                  <span className="font-semibold">{grupo.projeto}</span>
                  <span className="text-zinc-600">
                    {' '}
                    · solicitado {numeroBr(soma.solicitado)} · recebido {numeroBr(soma.recebido)}
                  </span>
                  {soma.falta > 0 ? (
                    <span className="font-medium text-red-700"> · falta {numeroBr(soma.falta)}</span>
                  ) : (
                    <span className="font-medium text-green-700"> · completo</span>
                  )}
                </div>
                {!grupoCompleto && (
                  <button
                    onClick={() => aoEscolher({ tipo: 'projeto', projetoId: grupo.projetoId, desenho: desenho.desenho })}
                    className="whitespace-nowrap rounded border-2 border-blue-600 bg-white px-3 py-1 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    Baixa pelo projeto
                  </button>
                )}
              </div>

              <table className="mx-3 text-left text-sm">
                <thead className="text-xs text-zinc-500">
                  <tr>
                    <th className="pb-1 pr-3 font-medium">Máquina</th>
                    <th className="pb-1 pr-3 font-medium">Data</th>
                    <th className="pb-1 pr-3 text-right font-medium">Recebido</th>
                    <th className="pb-1 pr-3 text-right font-medium">Falta</th>
                    <th className="pb-1 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {grupo.itens.map((item) => (
                    <tr key={item.id} className="border-t border-zinc-100">
                      <td className="py-1.5 pr-3">{item.maquina}</td>
                      <td className="py-1.5 pr-3">{dataBr(item.dataSolicitacao)}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">
                        {numeroBr(item.quantidadeRecebida)} / {numeroBr(item.quantidadeSolicitada)}
                      </td>
                      <td className={`py-1.5 pr-3 text-right tabular-nums ${item.saldo > 0 ? 'font-medium text-red-700' : 'text-zinc-400'}`}>
                        {numeroBr(item.saldo)}
                      </td>
                      <td className="py-1.5 text-right">
                        {item.status === StatusItem.COMPLETO ? (
                          <SeloStatusItem status={item.status} />
                        ) : (
                          <button
                            onClick={() => aoEscolher({ tipo: 'maquina', item })}
                            aria-label={`Dar baixa em ${item.desenho} · ${item.maquina} · ${dataBr(item.dataSolicitacao)}`}
                            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                          >
                            <span aria-hidden="true">↓</span> Dar baixa
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {itemAberto && (
                <div className="px-3 pb-3">
                  <BaixaForm
                    key={itemAberto.id}
                    titulo={`Baixa em ${itemAberto.desenho} · ${itemAberto.maquina}`}
                    descricao={`${itemAberto.projeto}, solicitado em ${dataBr(itemAberto.dataSolicitacao)} · falta ${itemAberto.saldo}`}
                    saldo={itemAberto.saldo}
                    textoBotao="Confirmar baixa"
                    aoEnviar={(quantidade, observacao) => aoBaixarItem(itemAberto, quantidade, observacao)}
                    aoCancelar={() => aoEscolher(null)}
                  />
                </div>
              )}

              {acaoProjeto && !previa && (
                <div className="px-3 pb-3">
                  <BaixaForm
                    titulo={`Baixa de ${desenho.desenho} pelo projeto ${grupo.projeto}`}
                    descricao="A quantidade vai primeiro para a solicitação mais antiga; o restante segue para a próxima."
                    textoBotao="Ver distribuição"
                    aoEnviar={(quantidade, observacao) => aoVerDistribuicao(grupo.projetoId, desenho.desenho, quantidade, observacao)}
                    aoCancelar={() => aoEscolher(null)}
                  />
                </div>
              )}

              {acaoProjeto && previa && (
                <div className="mx-3 mb-3 flex flex-col gap-3 rounded border border-zinc-300 p-3">
                  <h4 className="font-semibold">
                    Distribuição de {previa.quantidade} peça(s) de {previa.simulacao.desenho}
                  </h4>
                  {previa.simulacao.aviso && <Alerta tipo="aviso">{previa.simulacao.aviso.mensagem}</Alerta>}
                  <table className="w-full text-left text-sm">
                    <thead className="text-zinc-600">
                      <tr className="border-b border-zinc-200">
                        <th className="py-1 pr-3 font-medium">Máquina</th>
                        <th className="py-1 pr-3 font-medium">Data</th>
                        <th className="py-1 pr-3 text-right font-medium">Falta</th>
                        <th className="py-1 pr-3 text-right font-medium">Vai receber</th>
                        <th className="py-1 text-right font-medium">Falta depois</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previa.simulacao.distribuicao.map((d) => (
                        <tr key={d.item.id} className="border-b border-zinc-100 last:border-0">
                          <td className="py-1 pr-3">{d.item.maquina}</td>
                          <td className="py-1 pr-3">{dataBr(d.item.dataSolicitacao)}</td>
                          <td className="py-1 pr-3 text-right tabular-nums">{d.item.saldo}</td>
                          <td className="py-1 pr-3 text-right font-semibold tabular-nums">{d.quantidade}</td>
                          <td className="py-1 text-right tabular-nums">{d.item.saldo - d.quantidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex gap-2">
                    <button
                      onClick={() => aoConfirmarProjeto(grupo.projetoId)}
                      disabled={confirmando}
                      className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
                    >
                      {confirmando ? 'Registrando…' : `Confirmar baixa de ${previa.simulacao.quantidadeRegistrada} peça(s)`}
                    </button>
                    <button onClick={aoVoltarDaPrevia} disabled={confirmando} className="rounded px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
                      Voltar
                    </button>
                    <button onClick={() => aoEscolher(null)} disabled={confirmando} className="rounded px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </article>
  );
}
