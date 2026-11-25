# PLANO-DE-DESENVOLVIMENTO.md — eCheck

> Plano de desenvolvimento para o Claude Code. Use junto com o **`CONTEXT.md`**, que é a fonte da verdade para regras (RN01–RN25), exceções (EX01–EX22), classes, endpoints e telas. Este plano diz **em que ordem** e **como** construir.

---

## 0. Regras de trabalho (valem para todas as fases)

1. **Um caso de uso por vez, na ordem UC01 → UC10.** Não comece o próximo antes de o atual estar implementado e com todos os testes passando.
2. **Ao terminar cada fase ou caso de uso, pare.** Apresente um resumo curto (o que foi feito, arquivos criados, resultado dos testes) e **aguarde a minha aprovação** antes de seguir.
3. **Nada de dados reais.**
   - **Não use** a planilha `controle-compras-rotex.xlsx` nem nenhum código de desenho, projeto ou fornecedor real da Rotex.
   - Todos os testes e a demonstração usam **somente** a planilha pequena **`planilha-teste-echeck.xlsx`** (8 linhas fictícias, seção 2) e os usuários fictícios da seção 3.
   - Casos de erro (linhas inválidas, arquivo fora do modelo, reimportação com mudança) são gerados **dentro do próprio teste**, copiando e alterando a planilha de teste em memória. Não crie planilhas grandes.
4. **Nunca teste contra o Supabase de produção.** Use o Supabase local (Supabase CLI + Docker) ou um projeto Supabase separado só para desenvolvimento.
5. Regras de negócio ficam **nos Models** do back-end. Controllers só validam entrada, chamam o Model e respondem. O front não tem regra de negócio.
6. Todo erro de negócio sai pela classe `AppError` com o código EX, a mensagem e o HTTP do `CONTEXT.md` (seção 8.2).
7. Se algo não estiver definido no `CONTEXT.md`, **pergunte antes de decidir**.

### Definição de pronto (vale para cada UC)

- [ ] Endpoints do UC implementados conforme o `CONTEXT.md` (seção 6.1), com `autenticar` + `autorizar`.
- [ ] Regras RN do UC aplicadas nos Models.
- [ ] Testes em `tests/ucXX.test.ts` cobrindo o **fluxo principal**, **cada FA** e **cada FE** da especificação (seção 9), todos passando.
- [ ] Tela(s) do front-end do UC funcionando contra a API local, mostrando as mensagens EX do back-end.
- [ ] Menu mostra a tela só para os tipos permitidos.
- [ ] Resumo entregue e aprovação recebida.

---

## 1. Fase 0 — Estrutura do projeto

**Objetivo:** deixar as duas pastas, o banco e a base de testes prontos para o UC01.

### 1.1 Back-end (`backend/`)
- Criar o projeto Node.js + TypeScript + Express com a estrutura de pastas do `CONTEXT.md` (seção 5).
- Dependências: `express`, `@supabase/supabase-js`, `zod`, `multer`, `exceljs`, `cors`, `dotenv`; dev: `typescript`, `ts-node-dev` (ou `tsx`), `jest`, `ts-jest`, `supertest`, tipos.
- `.env.example` com `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`, `FRONTEND_URL`. `.env` no `.gitignore`.
- `app.ts` com CORS liberado só para `FRONTEND_URL`, JSON, rotas e o middleware `tratarErros`.
- `errors/AppError.ts` + `errors/catalogo.ts` com EX01–EX22 (código, mensagem, HTTP).
- Middlewares `autenticar` (valida JWT no Supabase Auth, carrega o usuário de `usuarios`, recusa `ativo = false` com EX02, sem token → EX03) e `autorizar(...tipos)` (EX04).
- Rota `GET /saude` respondendo `{ ok: true }`.

### 1.2 Banco de dados (Supabase)
- Configurar o Supabase local (`supabase init`, `supabase start`).
- **Propor** as migrations a partir do `CONTEXT.md` (seção 10): enums `tipo_usuario` e `status_projeto`; tabelas `usuarios`, `projetos`, `maquinas`, `itens_solicitados`, `recebimentos`, `importacoes`; restrições de unicidade (RN02, RN06, RN07); `CHECK` de quantidade > 0; RLS ativo sem políticas públicas; view `vw_itens_saldo` (quantidade recebida, saldo e status calculados sem estornos).
- **Mostrar o SQL e aguardar minha aprovação antes de aplicar.** A modelagem do banco ainda está em validação.

### 1.3 Front-end (`frontend/`)
- Criar o projeto Next.js (App Router) + TypeScript + Tailwind, com a estrutura do `CONTEXT.md` (seção 5).
- Dependências: `@supabase/supabase-js`, `recharts`.
- `.env.example` com `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `lib/supabaseClient.ts` (só Auth), `services/api.ts` (fetch com o JWT e tratamento do JSON de erro EX), layout base com menu por tipo.

### 1.4 Dados de teste
- Copiar `planilha-teste-echeck.xlsx` para `backend/tests/fixtures/`.
- Criar `tests/helpers/` com: limpeza do banco entre testes, criação dos usuários fictícios (seção 3) e geração de JWT de teste para cada tipo.
- Script `npm run seed:dev` que cria **só** os usuários fictícios no Supabase local, para eu testar pelo front.

**Pronto quando:** `npm test` roda (mesmo sem testes de UC), `GET /saude` responde, o front sobe e as migrations foram aprovadas e aplicadas no Supabase local.

---

## 2. Planilha de teste — `planilha-teste-echeck.xlsx`

Pequena, fictícia, no formato da planilha-modelo. O eCheck lê **apenas a aba "Itens"**; a aba "Gabarito" é só para conferência.

| Linha | Projeto | Máquina | Desenho | Processo | Material | Qtd | Data |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | PRJ-TESTE-01 | Esteira Teste A | TST-001 | Corte Laser | SAE 1020 | 10 | 03/11/2026 |
| 3 | PRJ-TESTE-01 | Esteira Teste A | TST-002 | Corte e Dobra | SAE 1020 | 4 | 03/11/2026 |
| 4 | PRJ-TESTE-01 | Alimentador Teste B | TST-001 | Corte Laser | SAE 1020 | 6 | 05/11/2026 |
| 5 | PRJ-TESTE-01 | Alimentador Teste B | TST-003 | Comerciais | Aço carbono | 20 | 05/11/2026 |
| 6 | PRJ-TESTE-01 | Alimentador Teste B | TST-001 | Corte Laser | SAE 1020 | 2 | 07/11/2026 |
| 7 | PRJ-TESTE-02 | Mesa Teste C | TST-001 | Corte Laser | SAE 1020 | 5 | 04/11/2026 |
| 8 | PRJ-TESTE-02 | Mesa Teste C | TST-004 | Oxicorte | SAE 1045 | 3 | 04/11/2026 |
| 9 | PRJ-TESTE-02 | Mesa Teste C | TST-005 | *(vazio)* | *(vazio)* | 1 | 06/11/2026 |

**Valores esperados (gabarito):**
- Importação: 2 projetos novos (EM_CADASTRO), 3 máquinas, 8 itens PENDENTES.
- PRJ-TESTE-01: 2 máquinas, 5 itens, **42 peças**. PRJ-TESTE-02: 1 máquina, 3 itens, **9 peças**.
- TST-001 aparece 4 vezes (10 + 6 + 2 no PRJ-TESTE-01; 5 no PRJ-TESTE-02): testa RN09 e RN14.
- Linha 9 sem Processo e Material: testa campos opcionais (RN08).
- Baixa pelo projeto PRJ-TESTE-01, TST-001, **15 peças** → 10 (03/11), 5 (05/11), 0 (07/11).
- Mesma baixa com **20 peças** → 10 + 6 + 2 = 18 registradas e aviso EX16 de 2 excedentes.
- Reimportar o mesmo arquivo → as 8 linhas aparecem desmarcadas como "já existe" (RN25).
- Reimportar com a linha 3 mudando de 4 para 5 peças → linha desmarcada como "possível correção" (RN25).

**Variações geradas dentro dos testes (em memória, a partir desta planilha):**
- Desenho vazio, quantidade 0, quantidade 2,5, data inválida, Projeto vazio → EX11 com linha, coluna e motivo.
- Arquivo .csv ou .xlsx sem a coluna "Quantidade" → EX10.

---

## 3. Usuários fictícios de teste

| Nome | E-mail | Tipo |
| --- | --- | --- |
| Admin Teste | admin@echeck.test | ADMINISTRADOR |
| Engenheiro Teste | engenheiro@echeck.test | ENGENHEIRO |
| Encarregado Teste | encarregado@echeck.test | ENCARREGADO |
| Usuário Teste | usuario@echeck.test | USUARIO |
| Inativo Teste | inativo@echeck.test | USUARIO (ativo = false) |

O domínio `.test` é reservado e nunca recebe e-mail de verdade. Nos testes automatizados, o envio de convite do Supabase Auth deve ser **mockado**.

---

## 4. Fase 1 — UC01 Manter usuários

**Back-end:** `UsuarioRepository`, Models `Usuario` e `Administrador`, `UsuarioController`, rotas `/usuarios` (GET, POST, PUT `/:id`, PATCH `/:id/tipo`, `/:id/desativar`, `/:id/reativar`), só ADMINISTRADOR. Cadastro cria a conta pelo convite do Supabase Auth (`inviteUserByEmail`) e grava em `usuarios`.
**Front-end:** `/usuarios` com lista, filtro por nome e tipo, formulário de novo usuário, alterar dados, alterar tipo, desativar e reativar.
**Regras:** RN01, RN02, RN03, RN04, RN05, RN24.

**Testes (`tests/uc01.test.ts`):**
- FP: Admin cadastra "Novo Teste" → 201, convite (mock) chamado, aparece na lista como ativo.
- FA1 alterar dados · FA2 tornar Engenheiro Teste ADMINISTRADOR · FA3 desativar · FA4 reativar · FA5 filtrar por tipo.
- FE1 e-mail repetido → EX05 · FE2 e-mail inválido → EX06 · FE3 Admin altera o próprio tipo ou se desativa → EX20 · FE4 id inexistente → EX09 · FE5 Engenheiro chama `/usuarios` → EX04.
- Usuário desativado tenta usar a API → EX02.

---

## 5. Fase 2 — UC02 Fazer login

**Back-end:** `GET /auth/me` (todos) devolvendo nome e tipo.
**Front-end:** `/login`, tela de definir senha pelo link do convite, "Esqueci a senha", "Sair", `middleware.ts` protegendo as telas, redirecionamento para `/painel` (pode ser uma página vazia até o UC09) e menu por tipo.
**Regras:** RN01, RN03, RN04.

**Testes (`tests/uc02.test.ts`):**
- FP: JWT válido de cada tipo → `/auth/me` devolve o tipo certo.
- FE2 usuário inativo → EX02 · FE3 sem token ou token inválido → EX03.
- Login com senha errada (EX01) é do Supabase Auth: testar pela tela, manualmente, com os usuários fictícios.

---

## 6. Fase 3 — UC03 Importar planilha

**Back-end:** `ImportacaoPlanilha` (Model), `ImportacaoRepository`, `ImportacaoController`. `POST /importacoes` (multipart, só ENGENHEIRO): lê **a aba "Itens"** com exceljs, valida (RN21, RN08), compara com os itens existentes (RN25) e devolve a pré-visualização sem gravar. `POST /importacoes/:id/confirmar`: recebe as linhas marcadas e grava tudo **numa transação** (RN22): projetos novos como EM_CADASTRO, máquinas novas e um item por linha marcada.
**Front-end:** `/importar` com upload, pré-visualização em três grupos (novas marcadas; já existem e possível correção desmarcadas) com checkbox por linha, lista de erros por linha e resumo após confirmar.
**Regras:** RN06, RN07, RN08, RN09, RN12, RN21, RN22, RN25.

**Testes (`tests/uc03.test.ts`)** — **somente com `planilha-teste-echeck.xlsx`**:
- FP: importar a planilha de teste → bate com o gabarito (2 projetos, 3 máquinas, 8 itens, 42 e 9 peças).
- FA1: com PRJ-TESTE-01 já existente, os itens vão para ele.
- FA2: reimportar o mesmo arquivo → 8 linhas "já existe" desmarcadas; confirmar sem marcar → nada criado. Linha 3 com 5 peças → "possível correção"; marcar e confirmar → cria item novo.
- FA3: pré-visualização sem confirmar → banco intacto.
- FE1 arquivo .csv ou sem coluna → EX10 · FE2 variações inválidas → EX11 e **nada gravado** · FE4 Encarregado tenta importar → EX04.

---

## 7. Fase 4 — UC04 Manter projetos

**Back-end:** Model `Projeto`, `ProjetoRepository`, `ProjetoController`. `GET /projetos` e `GET /projetos/:id` (todos); POST, PUT, DELETE (só ENGENHEIRO). Exclusão em cascata só sem recebimentos (RN23).
**Front-end:** `/projetos` com lista (código, nome, status, percentual), cadastro, edição, exclusão e link para `/projetos/[id]`.
**Regras:** RN06, RN11, RN23, RN24.

**Testes (`tests/uc04.test.ts`):**
- FP: cadastrar "PRJ-TESTE-03" → EM_CADASTRO, `criadoPor` = Engenheiro Teste.
- FA1 alterar · FA2 excluir projeto importado sem recebimentos → some com máquinas e itens · FA3 detalhe com máquinas.
- FE1 código "PRJ-TESTE-01" repetido → EX07 · FE2 código vazio → EX06 · FE3 excluir projeto com recebimento → EX17 (criar o recebimento direto pelo repository no teste) · FE4 id inexistente → EX09 · FE5 Encarregado tenta criar → EX04; Usuário Teste consegue listar.

---

## 8. Fase 5 — UC05 Manter máquinas

**Back-end:** Models `Maquina` e `ItemSolicitado`, repositories, `MaquinaController` e `ItemController`. `POST /projetos/:id/maquinas`, `PUT/DELETE /maquinas/:id`, `POST /maquinas/:id/itens`, `PUT/DELETE /itens/:id` (só ENGENHEIRO).
**Front-end:** `/projetos/[id]` com as máquinas (quantidade de itens e percentual), cadastro e edição de máquina e de item, exclusão.
**Regras:** RN07, RN08, RN09, RN12, RN23, RN24.

**Testes (`tests/uc05.test.ts`):**
- FP: em PRJ-TESTE-03, criar "Esteira Teste D" e o item TST-006, 7 peças, 10/11/2026 → PENDENTE.
- FA1 renomear · FA2 excluir máquina sem recebimento · FA3 alterar item; com 4 recebidas, aceitar 5 e recusar 3 · FA4 excluir item sem recebimento · FA5 incluir item em projeto LIBERADO.
- FE1 "Esteira Teste A" repetida no PRJ-TESTE-01 → EX08 · FE2 quantidade 0 → EX06 · FE3 excluir com recebimento → EX17 · FE4 reduzir abaixo do recebido → EX21 · FE5 Usuário Teste → EX04.

---

## 9. Fase 6 — UC06 Liberar projeto

**Back-end:** `Projeto.liberar()`, `PATCH /projetos/:id/liberar` (só ENGENHEIRO), grava `liberadoPor` e `liberadoEm`.
**Front-end:** botão "Liberar para produção" em `/projetos/[id]`, com resumo e aviso de que não pode ser desfeito.
**Regras:** RN10, RN11, RN20.

**Testes (`tests/uc06.test.ts`):**
- FP: liberar PRJ-TESTE-01 → LIBERADO com quem e quando.
- FE1 projeto sem itens → EX14 · FE2 liberar de novo → EX13 · FE3 Encarregado → EX04.

---

## 10. Fase 7 — UC07 Manter recebimentos

**Back-end:** Model `Recebimento`, `ItemSolicitado.registrarRecebimento()`, `Projeto.distribuirRecebimento()`, `RecebimentoRepository`, `RecebimentoController`. Rotas: `GET /itens/busca?desenho=`, `POST /itens/:id/recebimentos`, `POST /projetos/:id/recebimentos/previa`, `POST /projetos/:id/recebimentos`, `PUT /recebimentos/:id`, `PATCH /recebimentos/:id/estornar` (escritas só ENCARREGADO). A baixa pelo projeto roda numa transação.
**Front-end:** `/recebimentos` com busca por desenho, tabela de onde ele aparece, escolha por máquina ou pelo projeto, prévia da distribuição, aviso de excedente e confirmação.
**Regras:** RN09, RN10, RN13, RN14, RN15, RN16, RN17, RN18, RN19.

**Testes (`tests/uc07.test.ts`)** — partir da planilha de teste importada e de PRJ-TESTE-01 liberado:
- FP: TST-002 (Esteira Teste A), 3 peças → PARCIAL, saldo 1; mais 1 → COMPLETO.
- FA1: pelo projeto, TST-001, 15 peças → 10 / 5 / 0 (gabarito); prévia e gravação batem.
- FA2: pelo projeto, TST-001, 20 peças → 18 registradas + aviso EX16 de 2. Por máquina: TST-002 com 6 → 4 registradas + EX16 de 2.
- FA3: atualizar uma remessa de 3 para 2 → saldo recalculado; atualizar acima do saldo → recusa.
- FA4: estornar → item volta a PENDENTE; histórico mantém a remessa marcada.
- FE1 desenho "TST-999" → EX19 · FE2 baixa no PRJ-TESTE-02 (não liberado) → EX12 · FE3 baixa em item COMPLETO → EX15 · FE4 quantidade 0 ou 1,5 → EX06 · FE5 estornar duas vezes → EX18 · FE6 Engenheiro tenta dar baixa → EX04.

---

## 11. Fase 8 — UC08 Consultar itens e baixas

**Back-end:** `GET /itens` com filtros (projeto, máquina, desenho parcial, processo, status) e `GET /itens/:id/recebimentos` (todos).
**Front-end:** `/itens` com tabela e filtros e detalhe com histórico (estornadas riscadas). Para o Encarregado, botões Atualizar e Estornar em cada remessa ativa.
**Regras:** RN17, RN18, RN19.

**Testes (`tests/uc08.test.ts`):**
- FP: Usuário Teste lista os 8 itens; filtro `status=PENDENTE`, `desenho=TST-00`, `maquina=...` retornam o esperado.
- FP: histórico com quem e quando registrou, atualizou e estornou.
- FA2: filtro sem resultado → lista vazia · FE1 item inexistente → EX09 · FE2 sem token → EX03.

---

## 12. Fase 9 — UC09 Painel geral

**Back-end:** Model `Painel.gerarGeral()`, `GET /painel` (todos), só projetos LIBERADOS (RN20), percentual simples sem estornos.
**Front-end:** `/painel` como tela inicial: indicadores (percentual, solicitado, recebido, faltante) e gráfico de barras por projeto (Recharts).
**Regras:** RN17, RN20.

**Testes (`tests/uc09.test.ts`):**
- FA1: sem projetos liberados → totais zerados.
- FP: com PRJ-TESTE-01 liberado (42 peças) e 15 recebidas → 35,7% (15 ÷ 42), solicitado 42, recebido 15, faltante 27; PRJ-TESTE-02 (não liberado) fica de fora.
- Estornar uma remessa e conferir que o percentual cai.

---

## 13. Fase 10 — UC10 Painel por projeto

**Back-end:** `Painel.gerarPorProjeto()`, `GET /painel/projetos/:id` (todos).
**Front-end:** `/painel/[projetoId]` com indicadores, gráfico por máquina e lista de faltantes com link para o histórico (UC08).
**Regras:** RN17, RN19, RN20.

**Testes (`tests/uc10.test.ts`):**
- FP: PRJ-TESTE-01 com 15 peças de TST-001 recebidas → percentual por máquina (Esteira Teste A: 10 de 14; Alimentador Teste B: 5 de 28) e faltantes corretos.
- FA1: PRJ-TESTE-02 em cadastro → aviso e 0% · FA2: projeto completo → sem faltantes · FE1: id inexistente → EX09.

---

## 14. Fechamento

- Rodar todos os testes (UC01–UC10) juntos e corrigir o que quebrar.
- Fazer um roteiro manual pelo front, com a planilha de teste e os usuários fictícios: importar → liberar → dar baixa por máquina e por projeto → estornar → conferir os painéis.
- Atualizar o `README.md` (raiz e de cada pasta) com como rodar e testar.
- Listar o que ficou fora do escopo (ex.: fornecedor e nota fiscal) para as próximas versões.
