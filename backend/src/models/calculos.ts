/**
 * Percentual simples (RN20): peças recebidas ÷ peças solicitadas, sem estornos, com uma casa decimal.
 * Sem nada solicitado, o percentual é 0.
 */
export interface Distribuicao {
  /** Quanto vai para cada item, na mesma ordem recebida (0 para quem não recebe nada). */
  partes: { itemId: string; quantidade: number }[];
  registrada: number;
  excedente: number;
}

/**
 * RN14: a quantidade vai primeiro para a solicitação mais antiga e o restante segue para a próxima.
 * `itens` já vem na ordem (data da solicitação, depois ordem de cadastro). RN13: o que passar do
 * saldo somado não é registrado (excedente).
 */
export function distribuir(itens: { id: string; saldo: number }[], quantidade: number): Distribuicao {
  let restante = quantidade;
  const partes = itens.map((item) => {
    const parte = Math.min(Math.max(item.saldo, 0), restante);
    restante -= parte;
    return { itemId: item.id, quantidade: parte };
  });
  return { partes, registrada: quantidade - restante, excedente: restante };
}

export function percentual(recebido: number, solicitado: number): number {
  if (solicitado <= 0) return 0;
  return Math.round((recebido / solicitado) * 1000) / 10;
}
