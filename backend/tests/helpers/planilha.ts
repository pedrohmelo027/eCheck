import path from 'node:path';
import ExcelJS from 'exceljs';

export const CAMINHO_PLANILHA_TESTE = path.join(__dirname, '..', 'fixtures', 'planilha-teste-echeck.xlsx');

/**
 * Copia a planilha de teste em memória, aplica a alteração na aba "Itens" e devolve o .xlsx.
 * Usado para gerar os casos de erro e de reimportação sem criar planilhas novas (plano, seção 2).
 */
export async function planilhaAlterada(alterar: (aba: ExcelJS.Worksheet) => void = () => {}): Promise<Buffer> {
  const pasta = new ExcelJS.Workbook();
  await pasta.xlsx.readFile(CAMINHO_PLANILHA_TESTE);
  alterar(pasta.getWorksheet('Itens')!);
  return Buffer.from(await pasta.xlsx.writeBuffer());
}
