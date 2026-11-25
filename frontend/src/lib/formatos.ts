/** AAAA-MM-DD → DD/MM/AAAA, sem passar por Date (evita mudar o dia pelo fuso). */
export function dataBr(iso: string) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
