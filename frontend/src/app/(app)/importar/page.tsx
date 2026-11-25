'use client';

import { useRef, useState } from 'react';
import { LinhasImportacao } from '@/components/tabelas/LinhasImportacao';
import { Alerta } from '@/components/ui/Alerta';
import { ErroApi } from '@/services/api';
import { importacoesService } from '@/services/importacoes';
import type { ErroLinhaPlanilha, PreviaImportacao, ResumoImportacao } from '@/types';

const botao = 'rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50';
const botaoSecundario = 'rounded px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50';

function plural(n: number, singular: string, pluralTexto: string) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

/** UC03 — Importar planilha (Engenheiro). Validação e gravação ficam na API. */
export default function ImportarPage() {
  const entrada = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<PreviaImportacao | null>(null);
  const [marcadas, setMarcadas] = useState<Set<number>>(new Set());
  const [resumo, setResumo] = useState<ResumoImportacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [errosLinhas, setErrosLinhas] = useState<ErroLinhaPlanilha[]>([]);
  const [processando, setProcessando] = useState(false);

  function recomecar() {
    setArquivo(null);
    setPrevia(null);
    setMarcadas(new Set());
    setResumo(null);
    setErro(null);
    setErrosLinhas([]);
    if (entrada.current) entrada.current.value = '';
  }

  // Passos 1–4: envia e mostra a pré-visualização
  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!arquivo) return;
    setErro(null);
    setErrosLinhas([]);
    setResumo(null);
    setProcessando(true);
    try {
      const resposta = await importacoesService.enviar(arquivo);
      setPrevia(resposta);
      setMarcadas(new Set(resposta.linhas.filter((l) => l.marcada).map((l) => l.linha)));
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Algo deu errado. Tente novamente.');
      if (e instanceof ErroApi && e.codigo === 'EX11') setErrosLinhas((e.detalhes ?? []) as ErroLinhaPlanilha[]);
    } finally {
      setProcessando(false);
    }
  }

  // Passos 5–7: grava as linhas marcadas
  async function confirmar() {
    if (!previa) return;
    setErro(null);
    setProcessando(true);
    try {
      setResumo(await importacoesService.confirmar(previa.id, [...marcadas].sort((a, b) => a - b)));
      setPrevia(null);
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Algo deu errado. Tente novamente.');
    } finally {
      setProcessando(false);
    }
  }

  function alternar(linha: number) {
    setMarcadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(linha)) nova.delete(linha);
      else nova.add(linha);
      return nova;
    });
  }

  function alternarTodas(linhas: number[], marcar: boolean) {
    setMarcadas((atual) => {
      const nova = new Set(atual);
      linhas.forEach((l) => (marcar ? nova.add(l) : nova.delete(l)));
      return nova;
    });
  }

  const grupo = (situacao: string) => previa?.linhas.filter((l) => l.situacao === situacao) ?? [];

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Importar planilha</h1>

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      {errosLinhas.length > 0 && (
        <div className="overflow-x-auto rounded border border-red-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-red-200 bg-red-50 text-red-800">
              <tr>
                <th className="px-3 py-2 font-medium">Linha</th>
                <th className="px-3 py-2 font-medium">Coluna</th>
                <th className="px-3 py-2 font-medium">Problema</th>
              </tr>
            </thead>
            <tbody>
              {errosLinhas.map((e, i) => (
                <tr key={i} className="border-b border-zinc-100 last:border-0">
                  <td className="px-3 py-2">{e.linha}</td>
                  <td className="px-3 py-2">{e.coluna}</td>
                  <td className="px-3 py-2">{e.motivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resumo && (
        <div className="flex flex-col gap-3">
          <Alerta tipo="sucesso">
            Importação concluída: {plural(resumo.projetosCriados, 'projeto criado', 'projetos criados')},{' '}
            {plural(resumo.maquinasCriadas, 'máquina criada', 'máquinas criadas')} e{' '}
            {plural(resumo.itensCriados, 'item criado', 'itens criados')}.
          </Alerta>
          <div>
            <button onClick={recomecar} className={botao}>
              Importar outra planilha
            </button>
          </div>
        </div>
      )}

      {!previa && !resumo && (
        <form onSubmit={enviar} className="flex flex-col gap-3 rounded border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-600">
            Envie a planilha-modelo do eCheck (.xlsx, aba &quot;Itens&quot;) com as colunas Projeto, Máquina, Desenho, Processo,
            Material, Quantidade e Data da solicitação. Nada é gravado antes da sua confirmação.
          </p>
          <input
            ref={entrada}
            type="file"
            aria-label="Planilha .xlsx"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <div>
            <button type="submit" disabled={!arquivo || processando} className={botao}>
              {processando ? 'Lendo planilha…' : 'Pré-visualizar'}
            </button>
          </div>
        </form>
      )}

      {previa && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-6 rounded border border-zinc-200 bg-white p-4 text-sm">
            <div>
              <p className="font-medium">Arquivo</p>
              <p className="text-zinc-600">
                {previa.nomeArquivo} · {plural(previa.totalLinhas, 'linha', 'linhas')}
              </p>
            </div>
            <div>
              <p className="font-medium">Projetos</p>
              <ul className="text-zinc-600">
                {previa.projetos.map((p) => (
                  <li key={p.codigo}>
                    {p.codigo} —{' '}
                    {p.existe ? `já existe (${p.status === 'LIBERADO' ? 'liberado' : 'em cadastro'})` : 'novo, será criado'}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium">Máquinas</p>
              <ul className="text-zinc-600">
                {previa.maquinas.map((m) => (
                  <li key={`${m.projeto}|${m.nome}`}>
                    {m.nome} ({m.projeto}) — {m.existe ? 'já existe' : 'nova, será criada'}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <LinhasImportacao
            titulo="Novas"
            descricao="Serão criadas como itens pendentes."
            linhas={grupo('NOVA')}
            marcadas={marcadas}
            aoAlternar={alternar}
            aoAlternarTodas={alternarTodas}
          />
          <LinhasImportacao
            titulo="Possível correção"
            descricao="Mesmo projeto, máquina, desenho e data de um item já cadastrado, mas com outra quantidade. Marque só se for um pedido novo; se for correção, deixe desmarcada e corrija o item no projeto."
            linhas={grupo('POSSIVEL_CORRECAO')}
            marcadas={marcadas}
            aoAlternar={alternar}
            aoAlternarTodas={alternarTodas}
          />
          <LinhasImportacao
            titulo="Já existem"
            descricao="Idênticas a itens já cadastrados. Marque só se for mesmo um pedido repetido."
            linhas={grupo('JA_EXISTE')}
            marcadas={marcadas}
            aoAlternar={alternar}
            aoAlternarTodas={alternarTodas}
          />

          <div className="flex items-center gap-2">
            <button onClick={confirmar} disabled={processando} className={botao}>
              {processando
                ? 'Importando…'
                : marcadas.size > 0
                  ? `Importar ${plural(marcadas.size, 'linha marcada', 'linhas marcadas')}`
                  : 'Concluir sem importar linhas'}
            </button>
            <button onClick={recomecar} disabled={processando} className={botaoSecundario}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
