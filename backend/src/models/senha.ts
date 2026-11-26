import { randomInt } from 'node:crypto';

/** Sem letras e números que se confundem ao ler ou digitar (0/O, 1/l/I). */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function trecho(tamanho: number) {
  return Array.from({ length: tamanho }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
}

/**
 * Senha provisória forte e única (ex.: eCheck-7Kp4-Qm2z), gerada com o gerador criptográfico.
 * O Administrador repassa à pessoa, que é obrigada a trocá-la no primeiro login.
 */
export function gerarSenhaProvisoria(): string {
  return `eCheck-${trecho(4)}-${trecho(4)}`;
}
