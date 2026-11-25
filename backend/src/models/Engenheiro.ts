import { AppError } from '../errors/AppError';
import { UsuarioRepository } from '../repositories/UsuarioRepository';
import type { ResumoConfirmacao } from '../repositories/ImportacaoRepository';
import { TipoUsuario } from './enums';
import { ImportacaoPlanilha, type Previa } from './ImportacaoPlanilha';
import { Usuario } from './Usuario';

/**
 * Engenheiro: importa a planilha (UC03), mantém projetos, máquinas e itens (UC04, UC05) e libera
 * projetos (UC06). Os métodos dos próximos UCs entram aqui.
 */
export class Engenheiro extends Usuario {
  /** Carrega o engenheiro logado (a rota já passou por autorizar(ENGENHEIRO)). */
  static async carregar(id: string): Promise<Engenheiro> {
    const linha = await UsuarioRepository.buscarPorId(id);
    if (!linha || linha.tipo !== TipoUsuario.ENGENHEIRO) throw new AppError('EX04');
    return new Engenheiro(linha);
  }

  /** UC03 passos 1–4: lê, valida e devolve a pré-visualização. Nada é criado ainda. */
  async importarPlanilha(nomeArquivo: string, conteudo: Buffer): Promise<Previa> {
    const importacao = new ImportacaoPlanilha(nomeArquivo, this.id);
    await importacao.lerArquivo(conteudo);
    importacao.validar();
    return importacao.gerarPrevia();
  }

  /** UC03 passos 5–7: grava as linhas marcadas numa transação. */
  async confirmarImportacao(importacaoId: string, linhasMarcadas: number[]): Promise<ResumoConfirmacao> {
    return ImportacaoPlanilha.confirmar(importacaoId, linhasMarcadas, this.id);
  }
}
