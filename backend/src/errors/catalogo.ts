/** Catálogo das regras de exceção (CONTEXT.md, seção 8.2). */
export const catalogo = {
  EX01: { http: 401, mensagem: 'E-mail ou senha incorretos.' },
  EX02: { http: 403, mensagem: 'Seu acesso está desativado. Procure o administrador.' },
  EX03: { http: 401, mensagem: 'Sua sessão expirou. Entre novamente.' },
  EX04: { http: 403, mensagem: 'Você não tem permissão para esta ação.' },
  EX05: { http: 409, mensagem: 'Já existe um usuário com este e-mail.' },
  EX06: { http: 400, mensagem: 'Verifique o campo {campo}: {motivo}.' },
  EX07: { http: 409, mensagem: 'Já existe um projeto com este código.' },
  EX08: { http: 409, mensagem: 'Este projeto já tem uma máquina com este nome.' },
  EX09: { http: 404, mensagem: 'Registro não encontrado.' },
  EX10: { http: 400, mensagem: 'O arquivo não segue a planilha-modelo do eCheck.' },
  EX11: { http: 422, mensagem: 'A planilha tem {n} linha(s) com erro. Corrija e envie de novo.' },
  EX12: { http: 422, mensagem: 'Este projeto ainda não foi liberado para a produção.' },
  EX13: { http: 409, mensagem: 'Este projeto já está liberado.' },
  EX14: { http: 422, mensagem: 'Cadastre ao menos um item antes de liberar o projeto.' },
  EX15: { http: 422, mensagem: 'Este item já foi recebido por completo.' },
  EX16: { http: 200, mensagem: 'Serão registradas {x} peça(s). {y} excedente(s) não serão registradas.' },
  EX17: { http: 409, mensagem: 'Não é possível excluir: há recebimentos registrados.' },
  EX18: { http: 409, mensagem: 'Esta remessa já foi estornada.' },
  EX19: { http: 404, mensagem: 'Nenhum item com este desenho em projetos liberados.' },
  EX20: { http: 422, mensagem: 'Você não pode alterar o próprio tipo nem se desativar.' },
  EX21: { http: 422, mensagem: 'A quantidade não pode ser menor que a já recebida ({r}).' },
  EX22: { http: 500, mensagem: 'Algo deu errado. Tente novamente.' },
} as const;

export type CodigoErro = keyof typeof catalogo;

/** Troca {chave} pelos valores informados. */
export function montarMensagem(codigo: CodigoErro, parametros: Record<string, string | number> = {}): string {
  return catalogo[codigo].mensagem.replace(/\{(\w+)\}/g, (trecho, chave: string) =>
    chave in parametros ? String(parametros[chave]) : trecho,
  );
}
