'use client';

import { useEffect, useState } from 'react';
import { ItemForm } from '@/components/formularios/ItemForm';
import { SeloStatusItem } from '@/components/ui/Indicadores';
import { dataBr } from '@/lib/formatos';
import { maquinasService, type DadosItem } from '@/services/maquinas';
import type { Item, MaquinaResumo } from '@/types';

type Formulario = { modo: 'novo' } | { modo: 'editar'; item: Item } | null;

interface Props {
  maquina: MaquinaResumo;
  /** Executa uma ação da API mostrando o resultado na página; relança o erro. */
  executar: (acao: () => Promise<unknown>, sucesso: string) => Promise<void>;
  /** Avisa a página para recarregar os totais do projeto. */
  aoMudar: () => void;
}

/** Itens de uma máquina com cadastro, alteração e exclusão (UC05 passos 4–6, FA3, FA4). */
export function ItensMaquina({ maquina, executar, aoMudar }: Props) {
  const [itens, setItens] = useState<Item[] | null>(null);
  const [formulario, setFormulario] = useState<Formulario>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    maquinasService
      .listarItens(maquina.id)
      .then((lista) => ativo && setItens(lista))
      .catch(() => ativo && setItens([]));
    return () => {
      ativo = false;
    };
  }, [maquina.id, versao]);

  function recarregar() {
    setVersao((v) => v + 1);
    aoMudar();
  }

  async function salvar(dados: DadosItem) {
    if (formulario?.modo === 'novo') {
      await executar(() => maquinasService.cadastrarItem(maquina.id, dados), `Item ${dados.desenho} cadastrado.`);
    } else if (formulario?.modo === 'editar') {
      await executar(() => maquinasService.alterarItem(formulario.item.id, dados), `Item ${dados.desenho} alterado.`);
    }
    setFormulario(null);
    recarregar();
  }

  async function excluir(item: Item) {
    if (!confirm(`Excluir o item ${item.desenho} (${item.quantidadeSolicitada} peça(s))?`)) return;
    try {
      await executar(() => maquinasService.excluirItem(item.id), `Item ${item.desenho} excluído.`);
      recarregar();
    } catch {
      // mensagem já exibida
    }
  }

  if (itens === null) return <p className="px-4 py-3 text-sm text-zinc-500">Carregando itens…</p>;

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {itens.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum item nesta máquina.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-zinc-600">
            <tr className="border-b border-zinc-200">
              <th className="py-2 pr-3 font-medium">Desenho</th>
              <th className="py-2 pr-3 font-medium">Processo</th>
              <th className="py-2 pr-3 font-medium">Material</th>
              <th className="py-2 pr-3 text-right font-medium">Solicitado</th>
              <th className="py-2 pr-3 text-right font-medium">Recebido</th>
              <th className="py-2 pr-3 text-right font-medium">Saldo</th>
              <th className="py-2 pr-3 font-medium">Data</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                <td className="py-2 pr-3 font-medium">{item.desenho}</td>
                <td className="py-2 pr-3 text-zinc-600">{item.processo ?? '—'}</td>
                <td className="py-2 pr-3 text-zinc-600">{item.material ?? '—'}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{item.quantidadeSolicitada}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{item.quantidadeRecebida}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{item.saldo}</td>
                <td className="py-2 pr-3">{dataBr(item.dataSolicitacao)}</td>
                <td className="py-2 pr-3">
                  <SeloStatusItem status={item.status} />
                </td>
                <td className="flex gap-3 py-2">
                  <button onClick={() => setFormulario({ modo: 'editar', item })} className="text-zinc-700 underline hover:text-zinc-900">
                    Alterar
                  </button>
                  <button onClick={() => excluir(item)} className="text-red-700 underline hover:text-red-900">
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {formulario ? (
        <ItemForm
          key={formulario.modo === 'editar' ? formulario.item.id : 'novo'}
          titulo={formulario.modo === 'novo' ? `Novo item em ${maquina.nome}` : `Alterar item ${formulario.item.desenho}`}
          inicial={formulario.modo === 'editar' ? formulario.item : undefined}
          aviso={
            formulario.modo === 'editar' && formulario.item.quantidadeRecebida > 0
              ? `Já chegaram ${formulario.item.quantidadeRecebida} peça(s): a quantidade não pode ficar abaixo disso.`
              : undefined
          }
          textoBotao={formulario.modo === 'novo' ? 'Cadastrar item' : 'Salvar'}
          aoEnviar={salvar}
          aoCancelar={() => setFormulario(null)}
        />
      ) : (
        <div>
          <button
            onClick={() => setFormulario({ modo: 'novo' })}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100"
          >
            Novo item
          </button>
        </div>
      )}
    </div>
  );
}
