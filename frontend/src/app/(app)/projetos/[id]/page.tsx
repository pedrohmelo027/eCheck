'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { NomeForm } from '@/components/formularios/NomeForm';
import { ItensMaquina } from '@/components/tabelas/ItensMaquina';
import { Alerta } from '@/components/ui/Alerta';
import { BarraPercentual, SeloStatusProjeto } from '@/components/ui/Indicadores';
import { ErroApi } from '@/services/api';
import { maquinasService } from '@/services/maquinas';
import { projetosService } from '@/services/projetos';
import { StatusProjeto, type MaquinaResumo, type ProjetoDetalhe } from '@/types';

function mensagemDe(erro: unknown) {
  return erro instanceof ErroApi ? erro.message : 'Algo deu errado. Tente novamente.';
}

/**
 * Projeto com as máquinas e os itens (UC04 FA3, UC05). A liberação (UC06) entra nesta tela.
 * Regras (nome único, recebimentos, quantidade mínima) ficam na API.
 */
export default function ProjetoPage() {
  const { id } = useParams<{ id: string }>();
  const [projeto, setProjeto] = useState<ProjetoDetalhe | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [novaMaquina, setNovaMaquina] = useState(false);
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setProjeto(await projetosService.detalhar(id));
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }, [id]);

  useEffect(() => {
    let ativo = true;
    projetosService
      .detalhar(id)
      .then((p) => ativo && setProjeto(p))
      .catch((e) => ativo && setErro(mensagemDe(e)));
    return () => {
      ativo = false;
    };
  }, [id]);

  /** Executa uma ação, mostra o resultado e relança o erro (para formulários manterem os dados). */
  const executar = useCallback(async (acao: () => Promise<unknown>, mensagemSucesso: string) => {
    setErro(null);
    setSucesso(null);
    try {
      await acao();
      setSucesso(mensagemSucesso);
    } catch (e) {
      setErro(mensagemDe(e));
      throw e;
    }
  }, []);

  async function cadastrarMaquina(nome: string) {
    await executar(() => maquinasService.cadastrar(id, nome), `Máquina ${nome} cadastrada.`);
    setNovaMaquina(false);
    await recarregar();
  }

  async function renomear(maquina: MaquinaResumo, nome: string) {
    await executar(() => maquinasService.renomear(maquina.id, nome), `Máquina renomeada para ${nome}.`);
    setRenomeando(null);
    await recarregar();
  }

  async function excluirMaquina(maquina: MaquinaResumo) {
    const aviso = maquina.totalItens
      ? `Excluir a máquina ${maquina.nome} com ${maquina.totalItens} item(ns)? Não pode ser desfeito.`
      : `Excluir a máquina ${maquina.nome}?`;
    if (!confirm(aviso)) return;
    try {
      await executar(() => maquinasService.excluir(maquina.id), `Máquina ${maquina.nome} excluída.`);
      if (aberta === maquina.id) setAberta(null);
      await recarregar();
    } catch {
      // mensagem já exibida
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <Link href="/projetos" className="text-sm text-zinc-600 underline hover:text-zinc-900">
        ← Projetos
      </Link>

      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      {sucesso && <Alerta tipo="sucesso">{sucesso}</Alerta>}
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
            {projeto.status === StatusProjeto.LIBERADO && (
              <p className="text-sm text-zinc-500">Projeto liberado: máquinas e itens novos já entram aceitando baixa.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-6 rounded border border-zinc-200 bg-white p-4 text-sm">
            {[
              ['Máquinas', projeto.totalMaquinas],
              ['Itens', projeto.totalItens],
              ['Peças solicitadas', projeto.totalSolicitado],
              ['Peças recebidas', projeto.totalRecebido],
            ].map(([rotulo, valor]) => (
              <div key={rotulo}>
                <p className="text-zinc-500">{rotulo}</p>
                <p className="text-lg font-semibold tabular-nums">{valor}</p>
              </div>
            ))}
            <div>
              <p className="text-zinc-500">Recebido</p>
              <BarraPercentual valor={projeto.percentualRecebido} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Máquinas</h2>
            {!novaMaquina && (
              <button
                onClick={() => setNovaMaquina(true)}
                className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
              >
                Nova máquina
              </button>
            )}
          </div>

          {novaMaquina && (
            <div className="rounded border border-zinc-200 bg-white p-4">
              <NomeForm rotulo="Nome da máquina" textoBotao="Cadastrar" aoEnviar={cadastrarMaquina} aoCancelar={() => setNovaMaquina(false)} />
            </div>
          )}

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
                    <th className="px-4 py-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {projeto.maquinas.map((m) => (
                    <Fragment key={m.id}>
                      <tr className="border-b border-zinc-100">
                        <td className="px-4 py-2 font-medium">
                          {renomeando === m.id ? (
                            <NomeForm
                              rotulo="Novo nome"
                              inicial={m.nome}
                              textoBotao="Salvar"
                              aoEnviar={(nome) => renomear(m, nome)}
                              aoCancelar={() => setRenomeando(null)}
                            />
                          ) : (
                            <button
                              onClick={() => setAberta(aberta === m.id ? null : m.id)}
                              aria-expanded={aberta === m.id}
                              className="text-left underline hover:text-zinc-600"
                            >
                              {aberta === m.id ? '▾' : '▸'} {m.nome}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">{m.totalItens}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{m.totalSolicitado}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{m.totalRecebido}</td>
                        <td className="px-4 py-2">
                          <BarraPercentual valor={m.percentualRecebido} />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-3">
                            <button onClick={() => setRenomeando(m.id)} className="text-zinc-700 underline hover:text-zinc-900">
                              Renomear
                            </button>
                            <button onClick={() => excluirMaquina(m)} className="text-red-700 underline hover:text-red-900">
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                      {aberta === m.id && (
                        <tr className="border-b border-zinc-200 bg-zinc-50/50">
                          <td colSpan={6}>
                            <ItensMaquina maquina={m} executar={executar} aoMudar={recarregar} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
