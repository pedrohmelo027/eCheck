'use client';

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { numeroBr, percentualBr } from '@/lib/formatos';
import type { Totais } from '@/types';

/**
 * Percentual recebido por linha (projeto no UC09, máquina no UC10): barras horizontais de 0 a
 * 100%, um tom só (série única, sem legenda; o título nomeia), trilho no mesmo tom mais claro e
 * o valor escrito ao lado de cada barra. Os mesmos números ficam na tabela da página.
 * Cor validada pelo validate_palette.js da skill dataviz (contraste ≥ 3:1 na superfície branca).
 */
const COR = {
  barra: '#2a78d6',
  trilho: '#e3ecf9',
  texto: '#52514e',
  grade: '#e7e5e4',
  foco: '#f4f4f5',
};

export interface LinhaGrafico extends Totais {
  id: string;
  rotulo: string;
}

interface Props {
  titulo: string;
  linhas: LinhaGrafico[];
  /** Clique na barra (ex.: abrir o painel do projeto). */
  aoEscolher?: (id: string) => void;
}

function Dica({ active, payload }: { active?: boolean; payload?: { payload: LinhaGrafico }[] }) {
  if (!active || !payload?.length) return null;
  const linha = payload[0].payload;
  // Texto vem da API: o React escapa o conteúdo (equivale a textContent)
  return (
    <div className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-zinc-900">{linha.rotulo}</p>
      <p className="text-zinc-600">
        {percentualBr(linha.percentualRecebido)} recebido · {numeroBr(linha.totalRecebido)} de {numeroBr(linha.totalSolicitado)} peça(s)
      </p>
      <p className="text-zinc-600">Faltam {numeroBr(linha.totalFaltante)}</p>
    </div>
  );
}

export function GraficoPercentual({ titulo, linhas, aoEscolher }: Props) {
  const altura = Math.max(120, linhas.length * 40 + 48);

  return (
    <figure className="flex flex-col gap-2 rounded border border-zinc-200 bg-white p-4">
      <figcaption className="font-semibold text-zinc-900">{titulo}</figcaption>
      <div style={{ height: altura }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={linhas} layout="vertical" margin={{ top: 4, right: 64, bottom: 4, left: 8 }} barCategoryGap={12}>
            <CartesianGrid horizontal={false} stroke={COR.grade} />
            <XAxis
              type="number"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fill: COR.texto, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="rotulo"
              width={140}
              tick={{ fill: COR.texto, fontSize: 13 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip cursor={{ fill: COR.foco }} content={<Dica />} />
            <Bar
              dataKey="percentualRecebido"
              name="Percentual recebido"
              fill={COR.barra}
              barSize={16}
              radius={[0, 4, 4, 0]}
              background={{ fill: COR.trilho, radius: 4 }}
              isAnimationActive={false}
              cursor={aoEscolher ? 'pointer' : undefined}
              onClick={aoEscolher ? (dado: { payload?: LinhaGrafico }) => dado.payload && aoEscolher(dado.payload.id) : undefined}
            >
              <LabelList
                dataKey="percentualRecebido"
                position="right"
                formatter={(v: unknown) => percentualBr(Number(v))}
                fill={COR.texto}
                fontSize={13}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
