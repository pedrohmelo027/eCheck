'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProjetoForm } from '@/components/formularios/ProjetoForm';
import { Alerta } from '@/components/ui/Alerta';
import { BarraPercentual, SeloStatusProjeto } from '@/components/ui/Indicadores';
import { ErroApi } from '@/services/api';
import { projetosService, type DadosProjeto } from '@/services/projetos';
import type { Projeto } from '@/types';

type Formulario = { modo: 'novo' } | { modo: 'editar'; projeto: Projeto } | null;

function mensagemDe(erro: unknown) {
  return erro instanceof ErroApi ? erro.message : 'Algo deu errado. Tente novamente.';
}

/** UC04 — Manter projetos (Engenheiro). As regras ficam na API. */
export default function ProjetosPage() {
  const router = useRouter();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [formulario, setFormulario] = useState<Formulario>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  /** Recarrega a lista depois de alterar ou excluir. */
  const carregar = useCallback(async () => {
    try {
      setProjetos(await projetosService.listar());
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    projetosService
      .listar()
      .then((lista) => ativo && setProjetos(lista))
      .catch((e) => ativo && setErro(mensagemDe(e)))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  function limparMensagens() {
    setErro(null);
    setSucesso(null);
  }

  async function salvar(dados: DadosProjeto) {
    limparMensagens();
    try {
      if (formulario?.modo === 'novo') {
        const criado = await projetosService.cadastrar(dados);
        // FP passo 6: abre o projeto para cadastrar as máquinas
        router.push(`/projetos/${criado.id}`);
        return;
      }
      if (formulario?.modo === 'editar') {
        await projetosService.alterar(formulario.projeto.id, dados);
        setSucesso('Projeto alterado.');
        setFormulario(null);
        await carregar();
      }
    } catch (e) {
      setErro(mensagemDe(e));
      throw e; // mantém o formulário preenchido
    }
  }

  async function excluir(projeto: Projeto) {
    const aviso =
      projeto.totalItens > 0
        ? `Excluir ${projeto.codigo} com ${projeto.totalMaquinas} máquina(s) e ${projeto.totalItens} item(ns)? Não pode ser desfeito.`
        : `Excluir ${projeto.codigo}? Não pode ser desfeito.`;
    if (!confirm(aviso)) return;
    limparMensagens();
    try {
      await projetosService.excluir(projeto.id);
      setSucesso(`${projeto.codigo} foi excluído.`);
      await carregar();
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projetos</h1>
        {!formulario && (
          <button
            onClick={() => {
              limparMensagens();
              setFormulario({ modo: 'novo' });
            }}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
          >
            Novo projeto
          </button>
        )}
      </div>

      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      {sucesso && <Alerta tipo="sucesso">{sucesso}</Alerta>}

      {formulario && (
        <div className="max-w-md">
          <ProjetoForm
            key={formulario.modo === 'editar' ? formulario.projeto.id : 'novo'}
            titulo={formulario.modo === 'novo' ? 'Novo projeto' : `Alterar ${formulario.projeto.codigo}`}
            inicial={formulario.modo === 'editar' ? formulario.projeto : undefined}
            textoBotao={formulario.modo === 'novo' ? 'Cadastrar e abrir' : 'Salvar'}
            aoEnviar={salvar}
            aoCancelar={() => setFormulario(null)}
          />
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando…</p>
      ) : projetos.length === 0 ? (
        <p className="rounded border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
          Nenhum projeto ainda. Cadastre um projeto ou <Link href="/importar" className="underline">importe a planilha</Link>.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-2 font-medium">Código</th>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Máquinas</th>
                <th className="px-4 py-2 text-right font-medium">Itens</th>
                <th className="px-4 py-2 font-medium">Recebido</th>
                <th className="px-4 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {projetos.map((p) => (
                <tr key={p.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-2 font-medium">
                    <Link href={`/projetos/${p.id}`} className="underline hover:text-zinc-600">
                      {p.codigo}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{p.nome}</td>
                  <td className="px-4 py-2">
                    <SeloStatusProjeto status={p.status} />
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{p.totalMaquinas}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{p.totalItens}</td>
                  <td className="px-4 py-2">
                    <BarraPercentual valor={p.percentualRecebido} />
                  </td>
                  <td className="flex gap-3 px-4 py-2">
                    <button
                      onClick={() => {
                        limparMensagens();
                        setFormulario({ modo: 'editar', projeto: p });
                      }}
                      className="text-zinc-700 underline hover:text-zinc-900"
                    >
                      Alterar
                    </button>
                    <button onClick={() => excluir(p)} className="text-red-700 underline hover:text-red-900">
                      Excluir
                    </button>
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
