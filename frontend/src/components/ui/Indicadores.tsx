import { ROTULO_STATUS_ITEM, ROTULO_STATUS_PROJETO, StatusItem, StatusProjeto } from '@/types';

const CORES_STATUS_ITEM: Record<StatusItem, string> = {
  [StatusItem.PENDENTE]: 'bg-zinc-200 text-zinc-700',
  [StatusItem.PARCIAL]: 'bg-amber-100 text-amber-800',
  [StatusItem.COMPLETO]: 'bg-green-100 text-green-800',
};

export function SeloStatusItem({ status }: { status: StatusItem }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs ${CORES_STATUS_ITEM[status]}`}>{ROTULO_STATUS_ITEM[status]}</span>;
}

/** Barra do percentual recebido. O número vem calculado da API. */
export function BarraPercentual({ valor }: { valor: number }) {
  const largura = Math.min(Math.max(valor, 0), 100);
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 w-24 overflow-hidden rounded-full bg-zinc-200"
        role="progressbar"
        aria-valuenow={valor}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Percentual recebido"
      >
        <div className={`h-full ${valor >= 100 ? 'bg-green-600' : 'bg-zinc-900'}`} style={{ width: `${largura}%` }} />
      </div>
      <span className="tabular-nums text-zinc-700">{valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
    </div>
  );
}

export function SeloStatusProjeto({ status }: { status: StatusProjeto }) {
  const cores = status === StatusProjeto.LIBERADO ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800';
  return <span className={`rounded-full px-2 py-0.5 text-xs ${cores}`}>{ROTULO_STATUS_PROJETO[status]}</span>;
}
