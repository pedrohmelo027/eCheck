import { AppError } from '../errors/AppError';
import { UsuarioRepository } from '../repositories/UsuarioRepository';
import type { ResumoConfirmacao } from '../repositories/ImportacaoRepository';
import { ItemRepository, type DadosItem } from '../repositories/ItemRepository';
import { MaquinaRepository } from '../repositories/MaquinaRepository';
import { ProjetoRepository, type DadosProjeto } from '../repositories/ProjetoRepository';
import { TipoUsuario } from './enums';
import { ImportacaoPlanilha, type Previa } from './ImportacaoPlanilha';
import { ItemSolicitado } from './ItemSolicitado';
import { Maquina } from './Maquina';
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

  /** UC05 FP passos 2–3. RN07: nome único no projeto. RN12: vale também para projeto liberado. */
  async cadastrarMaquina(projetoId: string, nome: string): Promise<Maquina> {
    await Projeto.buscar(projetoId);
    if (await MaquinaRepository.buscarPorNome(projetoId, nome)) throw new AppError('EX08');
    const criada = await MaquinaRepository.inserir(projetoId, nome);
    return Maquina.buscar(criada.id);
  }

  /** UC05 FA1: renomeia, repetindo a conferência do nome (RN07). */
  async alterarMaquina(id: string, nome: string): Promise<Maquina> {
    const maquina = await Maquina.buscar(id);
    const dona = await MaquinaRepository.buscarPorNome(maquina.projetoId, nome);
    if (dona && dona.id !== id) throw new AppError('EX08');
    await MaquinaRepository.renomear(id, nome);
    return Maquina.buscar(id);
  }

  /** UC05 FA2: exclui a máquina com os itens, só se nenhum tiver recebimento (RN23). */
  async excluirMaquina(id: string): Promise<void> {
    await Maquina.buscar(id);
    await MaquinaRepository.excluir(id);
  }

  /** UC05 FP passos 4–6: item novo entra PENDENTE. RN08 validado na entrada; RN09: desenho pode repetir. */
  async cadastrarItem(maquinaId: string, dados: DadosItem): Promise<ItemSolicitado> {
    await Maquina.buscar(maquinaId);
    const criado = await ItemRepository.inserir(maquinaId, dados);
    return ItemSolicitado.buscar(criado.id);
  }

  /** UC05 FA3: corrige o item. RN12: a quantidade não pode ficar abaixo do já recebido (EX21). */
  async alterarItem(id: string, dados: DadosItem): Promise<ItemSolicitado> {
    const item = await ItemSolicitado.buscar(id);
    const recebido = item.quantidadeRecebida();
    if (dados.quantidade_solicitada < recebido) throw new AppError('EX21', { r: recebido });
    await ItemRepository.atualizar(id, dados);
    return ItemSolicitado.buscar(id);
  }

  /** UC05 FA4: só exclui item sem recebimento (RN12 → EX17). */
  async excluirItem(id: string): Promise<void> {
    await ItemSolicitado.buscar(id);
    await ItemRepository.excluir(id);
  }
}
