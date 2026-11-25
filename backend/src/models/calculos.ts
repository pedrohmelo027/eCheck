/**
 * Percentual simples (RN20): peças recebidas ÷ peças solicitadas, sem estornos, com uma casa decimal.
 * Sem nada solicitado, o percentual é 0.
 */
export function percentual(recebido: number, solicitado: number): number {
  if (solicitado <= 0) return 0;
  return Math.round((recebido / solicitado) * 1000) / 10;
}
