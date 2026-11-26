'use client';

import { useEffect, useState } from 'react';
import { Alerta } from '@/components/ui/Alerta';
import { BarraPercentual, SeloStatusItem } from '@/components/ui/Indicadores';
import { dataBr, dataHoraBr } from '@/lib/formatos';
import { ErroApi } from '@/services/api';
import { itensService } from '@/services/itens';
import { recebimentosService } from '@/services/recebimentos';
import type { HistoricoItem as Historico, RecebimentoHistorico } from '@/types';

interface Props {
  itemId: string;
  /** Encarregado vê Atualizar e Estornar em cada remessa ativa (UC08 FA1 → UC07 FA3/FA4). */
  podeCorrigir: boolean;
  aoFechar: () => void;
  /** Avisa a lista para recarregar (recebido, saldo e status mudaram). */
  aoMudar: () => void;
}

function mensagemDe(erro: unknown) {
  return erro instanceof ErroApi ? erro.message : 'Algo deu errado. Tente novamente.';
}

/** UC08 passo 5 — histórico de remessas do item. Estornadas aparecem riscadas e não contam. */
export function HistoricoItem({ itemId, podeCorrigir, aoFechar, aoMudar }: Props) {
  const [historico, setHistorico] = useState<Historico | null>(null);
  const [versao, setVersao] = useState(0);
  const [editando, setEditando] = useState<{ id: string; quantidade: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    itensService
      .historico(itemId)
      .then((h) => ativo && setHistorico(h))
      .catch((e) => ativo && setErro(mensagemDe(e)));
    return () => {
      ativo = false;
    };
  }, [itemId, versao]);

  async function executar(acao: () => Promise<unknown>, mensagem: string) {
    setErro(null);
    setSucesso(null);
    try {
      await acao();
      setSucesso(mensagem);
      setEditando(null);
      setVersao((v) => v + 1);
      aoMudar();
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }

  function estornar(r: RecebimentoHistorico) {
    if (!confirm(`Estornar a remessa de ${r.quantidade} peça(s) de ${dataHoraBr(r.registradoEm)}? Ela continua no histórico, mas deixa de contar.`)) return;
    executar(() => recebimentosService.estornar(r.id), 'Remessa estornada.');
  }

  function salvar(evento: React.FormEvent, r: RecebimentoHistorico) {
    evento.preventDefault();
    if (!editando) return;
    executar(() => recebimentosService.atualizar(r.id, Number(editando.quantidade)), 'Remessa atualizada.');
  }

  if (!historico) {
    return <div className="rounded border border-zinc-200 bg-white p-4 text-sm">{erro ? <Alerta tipo="erro">{erro}</Alerta> : 'Carregando histórico…'}</div>;
  }

  const { item, recebimentos } = historico;
  return (
    <section aria-label={`Histórico de ${item.desenho}`} className="flex flex-col gap-3 rounded border border-zinc-300 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            {item.desenho} <SeloStatusItem status={item.status} />
          </h2>
          <p className="text-sm text-zinc-600">
            {item.projeto} · {item.maquina} · solicitado em {dataBr(item.dataSolicitacao)}
            {item.processo && <> · {item.processo}</>}
            {item.material && <> · {item.material}</>}
          </p>
        </div>
        <button onClick={aoFechar} className="text-sm text-zinc-600 underline hover:text-zinc-900">
          Fechar
        </button>
      </div>

      <div className="flex flex-wrap gap-6 text-sm">
        <span>
          Solicitado <strong className="tabular-nums">{item.quantidadeSolicitada}</strong>
        </span>
        <span>
          Recebido <strong className="tabular-nums">{item.quantidadeRecebida}</strong>
        </span>
        <span>
          Saldo <strong className="tabular-nums">{item.saldo}</strong>
        </span>
        <BarraPercentual valor={item.percentualRecebido} />
      </div>

      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      {sucesso && <Alerta tipo="sucesso">{sucesso}</Alerta>}

      {recebimentos.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma remessa registrada.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-zinc-600">
            <tr className="border-b border-zinc-200">
              <th className="py-2 pr-3 font-medium">Data e hora</th>
              <th className="py-2 pr-3 text-right font-medium">Quantidade</th>
              <th className="py-2 pr-3 font-medium">Registrado por</th>
              <th className="py-2 pr-3 font-medium">Observação</th>
              <th className="py-2 pr-3 font-medium">Alterações</th>
              {podeCorrigir && <th className="py-2 font-medium">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {recebimentos.map((r) => (
              <tr key={r.id} className={`border-b border-zinc-100 last:border-0 ${r.estornado ? 'text-zinc-400' : ''}`}>
                <td className={`py-2 pr-3 ${r.estornado ? 'line-through' : ''}`}>{dataHoraBr(r.registradoEm)}</td>
                <td className={`py-2 pr-3 text-right tabular-nums ${r.estornado ? 'line-through' : ''}`}>
                  {editando?.id === r.id ? (
                    <form onSubmit={(e) => salvar(e, r)} className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        autoFocus
                        aria-label="Nova quantidade"
                        value={editando.quantidade}
                        onChange={(e) => setEditando({ id: r.id, quantidade: e.target.value })}
                        className="w-20 rounded border border-zinc-300 px-2 py-1 text-right"
                        required
                      />
                      <button type="submit" className="rounded bg-zinc-900 px-2 py-1 text-xs text-white">
                        Salvar
                      </button>
                      <button type="button" onClick={() => setEditando(null)} className="px-1 text-xs underline">
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    r.quantidade
                  )}
                </td>
                <td className={`py-2 pr-3 ${r.estornado ? 'line-through' : ''}`}>{r.registradoPorNome ?? '—'}</td>
                <td className={`py-2 pr-3 ${r.estornado ? 'line-through' : ''}`}>{r.observacao ?? '—'}</td>
                <td className="py-2 pr-3 text-xs">
                  {r.atualizadoEm && (
                    <p>
                      Atualizada por {r.atualizadoPorNome ?? '—'} em {dataHoraBr(r.atualizadoEm)}
                    </p>
                  )}
                  {r.estornado && r.estornadoEm && (
                    <p className="font-medium text-red-700">
                      Estornada por {r.estornadoPorNome ?? '—'} em {dataHoraBr(r.estornadoEm)}
                    </p>
                  )}
                  {!r.atualizadoEm && !r.estornado && '—'}
                </td>
                {podeCorrigir && (
                  <td className="py-2">
                    {!r.estornado && editando?.id !== r.id && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => setEditando({ id: r.id, quantidade: String(r.quantidade) })}
                          className="text-zinc-700 underline hover:text-zinc-900"
                        >
                          Atualizar
                        </button>
                        <button onClick={() => estornar(r)} className="text-red-700 underline hover:text-red-900">
                          Estornar
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
