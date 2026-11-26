/** AAAA-MM-DD → DD/MM/AAAA, sem passar por Date (evita mudar o dia pelo fuso). */
export function dataBr(iso: string) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Data e hora no fuso do navegador, ex.: 25/11/2026 17:42. */
export function dataHoraBr(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Número em pt-BR (12.345) ou percentual com até uma casa (35,7%). */
export function numeroBr(valor: number) {
  return valor.toLocaleString('pt-BR');
}

export function percentualBr(valor: number) {
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}
