// Copia a planilha-modelo vazia de docs/ para public/, de onde a tela /importar oferece o download.
// A fonte é docs/planilha-echeck.xlsx; a cópia em public/ não vai para o Git.
import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const origem = fileURLToPath(new URL('../../docs/planilha-echeck.xlsx', import.meta.url));
const destino = fileURLToPath(new URL('../public/planilha-echeck.xlsx', import.meta.url));

if (existsSync(origem)) {
  copyFileSync(origem, destino);
  console.log('planilha-modelo copiada para public/planilha-echeck.xlsx');
} else {
  console.warn(`aviso: ${origem} não encontrado; o download da planilha-modelo não vai funcionar`);
}
