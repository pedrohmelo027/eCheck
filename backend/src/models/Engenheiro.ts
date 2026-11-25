import { AppError } from '../errors/AppError';
import { UsuarioRepository } from '../repositories/UsuarioRepository';
import type { ResumoConfirmacao } from '../repositories/ImportacaoRepository';
import { ProjetoRepository, type DadosProjeto } from '../repositories/ProjetoRepository';
import { TipoUsuario } from './enums';
import { ImportacaoPlanilha, type Previa } from './ImportacaoPlanilha';
import { Projeto } from './Projeto';
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

  /** UC04 FP: novo projeto entra EM_CADASTRO, com este engenheiro em criadoPor. RN06: código único. */
  async cadastrarProjeto(dados: DadosProjeto): Promise<Projeto> {
    if (await ProjetoRepository.buscarPorCodigo(dados.codigo)) throw new AppError('EX07');
    const criado = await ProjetoRepository.inserir({ ...dados, criado_por: this.id });
    return Projeto.buscar(criado.id);
  }

  /** UC04 FA1: altera código, nome e descrição. O status só muda pelo UC06. */
  async alterarProjeto(id: string, dados: DadosProjeto): Promise<Projeto> {
    await Projeto.buscar(id);
    const dono = await ProjetoRepository.buscarPorCodigo(dados.codigo);
    if (dono && dono.id !== id) throw new AppError('EX07');
    await ProjetoRepository.atualizar(id, dados);
    return Projeto.buscar(id);
  }

  /** UC04 FA2: exclui o projeto com máquinas e itens, só se nenhum item tiver recebimento (RN23). */
  async excluirProjeto(id: string): Promise<void> {
    await Projeto.buscar(id);
    await ProjetoRepository.excluir(id);
  }
}
