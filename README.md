# eCheck

**Conferência de recebimento de materiais da Rotex Máquinas.**

O eCheck registra tudo o que a engenharia solicitou para Compras, organizado por projeto e máquina, e acompanha o que chega dos fornecedores. A cada remessa recebida, o sistema dá baixa e mostra o saldo, o status e o percentual recebido de cada item, máquina e projeto.

## O problema

A engenharia sabe exatamente o que pediu, mas não há controle do que foi entregue para a produção. Hoje a conferência é feita em planilhas, papel e de cabeça, em cargas de 2 a 3 mil peças. O resultado são peças faltando, atrasos e dificuldade para saber de qual projeto é cada peça.

## Como funciona

```
Projeto ──► Máquina ──► Item solicitado ──► Recebimentos (remessas)
projeto-x   esteira-z   desenho + quantidade   o que já chegou
```

1. O **Engenheiro** importa a planilha-modelo (ou cadastra à mão) com os projetos, as máquinas e os desenhos solicitados.
2. O Engenheiro **libera o projeto** para a produção.
3. O **Encarregado** pesquisa o número do desenho e dá baixa no que chegou, por máquina ou pelo projeto inteiro. Quando a baixa é pelo projeto, a solicitação mais antiga é atendida primeiro.
4. **Todos** acompanham os itens, as baixas e os painéis com o percentual recebido.

## Perfis de usuário

| Perfil | O que faz |
| --- | --- |
| Usuário | Faz login, consulta itens e baixas e vê os painéis |
| Administrador | Cadastra usuários (por convite por e-mail) e define o tipo de cada um |
| Engenheiro | Importa a planilha, mantém projetos, máquinas e itens e libera projetos |
| Encarregado | Dá baixa, atualiza e estorna recebimentos |

Administrador, Engenheiro e Encarregado também têm todas as permissões do Usuário.

## Casos de uso

| UC | Caso de uso | Ator |
| --- | --- | --- |
| UC01 | Manter usuários | Administrador |
| UC02 | Fazer login | Todos |
| UC03 | Importar planilha | Engenheiro |
| UC04 | Manter projetos (inclui UC05) | Engenheiro |
| UC05 | Manter máquinas (e itens) | Engenheiro |
| UC06 | Liberar projeto para produção | Engenheiro |
| UC07 | Manter recebimentos | Encarregado |
| UC08 | Consultar itens e baixas | Todos |
| UC09 | Visualizar painel geral | Todos |
| UC10 | Visualizar painel por projeto | Todos |

A numeração é também a ordem de desenvolvimento.

## Principais regras

- Só entra no sistema quem foi convidado pelo Administrador, pelo link enviado por e-mail.
- Só projetos **liberados** aceitam baixas, e a liberação não pode ser desfeita.
- A baixa nunca passa da quantidade solicitada: o excedente não é registrado.
- Um item pode chegar em várias remessas; cada remessa pode ser atualizada ou estornada, e o estorno fica registrado no histórico.
- O status do item é calculado: **PENDENTE**, **PARCIAL** ou **COMPLETO**.
- O percentual é simples: peças recebidas ÷ peças solicitadas.
- A importação é tudo ou nada. Na pré-visualização, linhas já existentes ou parecidas aparecem desmarcadas para o Engenheiro decidir.

## Arquitetura

MVC em três partes separadas. O front só conversa com a API, e só a API acessa o banco.

| Parte | Tecnologia | Papel no MVC |
| --- | --- | --- |
| Front-end | Next.js + React + TypeScript + Tailwind + Recharts | View |
| Back-end | Node.js + Express + TypeScript (API REST) | Controller e Model |
| Banco | Supabase (PostgreSQL + Auth) | Dados e autenticação |

```
Next.js (View) ──HTTPS + JWT──► Express: rotas → middlewares → controllers → models → repositories ──► Supabase PostgreSQL
      └───────────── login ─────────────────────────────────────────────────────────────────────► Supabase Auth
```

## Estrutura do repositório

O projeto fica num único repositório, dividido em duas pastas independentes (cada uma com o próprio `package.json` e `.env`):

```text
backend/    # API REST: routes, middlewares, controllers, models, repositories, migrations, testes
frontend/   # Next.js: app (telas), components, services (chamadas à API), types
```

## Como rodar

### Pré-requisitos

- Node.js 24 (LTS) e npm
- Um projeto no [Supabase](https://supabase.com) **só para desenvolvimento** (nunca o de produção)

### 1. Banco (Supabase)

Aplique as migrations de `backend/supabase/migrations/`, **em ordem**, no projeto de desenvolvimento (SQL Editor do Supabase ou `supabase db push` com o Supabase CLI):

| Migration | O que faz |
| --- | --- |
| `20261125000000_estrutura_inicial.sql` | Tabelas, RLS sem políticas, view `vw_itens_saldo`, travas RN11 e RN13 |
| `20261126000000_confirmar_importacao.sql` | Função da importação numa transação (UC03) |
| `20261127000000_resumos_projeto_maquina.sql` | Views de totais por máquina e por projeto (UC04) |
| `20261127000100_horario_por_linha.sql` | `clock_timestamp()` nas datas de criação (ordem de cadastro da RN14) |
| `20261128000000_registrar_recebimentos.sql` | Função da baixa pelo projeto numa transação (UC07) |

Em **Authentication → URL Configuration**, coloque o endereço do front (ex.: `http://localhost:3000`) em *Site URL* e `http://localhost:3000/**` em *Redirect URLs*: é para lá que voltam os links de convite e de redefinição de senha.

### 2. Back-end

```bash
cd backend
npm install
cp .env.example .env    # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, PORT, FRONTEND_URL
npm run seed:dev        # cria os 5 usuários fictícios
npm run dev             # API em http://localhost:3333 (GET /saude responde { ok: true })
```

### 3. Front-end

```bash
cd frontend
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:3000
```

> A `SUPABASE_SERVICE_ROLE_KEY` fica **somente** no back-end. Nunca a coloque no front-end nem a envie para o repositório. Os arquivos `.env` e `.env.local` já estão no `.gitignore`.

Detalhes de cada parte: [`backend/README.md`](./backend/README.md) e [`frontend/README.md`](./frontend/README.md).

## Usuários fictícios

Criados por `npm run seed:dev` (e pelos testes). Senha de todos: `Senha-Teste-123`. O domínio `.test` é reservado e nunca recebe e-mail.

| Nome | E-mail | Tipo | Situação |
| --- | --- | --- | --- |
| Admin Teste | `admin@echeck.test` | Administrador | Ativo |
| Engenheiro Teste | `engenheiro@echeck.test` | Engenheiro | Ativo |
| Encarregado Teste | `encarregado@echeck.test` | Encarregado | Ativo |
| Usuário Teste | `usuario@echeck.test` | Usuário | Ativo |
| Inativo Teste | `inativo@echeck.test` | Usuário | Desativado (não entra: EX02) |

## Testes

```bash
cd backend
npm test        # 135 testes (Jest + Supertest), um arquivo por caso de uso: tests/uc01.test.ts … uc10.test.ts
```

- Os testes rodam contra o Supabase de **desenvolvimento** e **limpam o banco** (projetos, máquinas, itens, recebimentos e importações). Os 5 usuários fictícios são mantidos.
- Usam só a planilha `docs/planilha-teste-echeck.xlsx` (8 linhas fictícias); os casos de erro são gerados em memória a partir dela.
- O convite por e-mail é simulado (mock): nenhum e-mail é enviado.

### Roteiro manual pelo front

Com o banco vazio (só os usuários fictícios), siga a carga de teste de ponta a ponta. Os números esperados são os do gabarito (`docs/PLANO-DE-DESENVOLVIMENTO.md`, seção 2):

1. **Admin Teste** → Usuários: os 5 fictícios aparecem com tipo e situação.
2. **Engenheiro Teste** → Importar planilha → `docs/planilha-teste-echeck.xlsx` → 8 linhas novas → importar: 2 projetos, 3 máquinas, 8 itens. Projetos → PRJ-TESTE-01 → Liberar para produção (resumo: 2 máquinas, 5 itens, 42 peças).
3. **Encarregado Teste** → Recebimentos → busca `TST-00` (só o PRJ-TESTE-01 aparece) → TST-002 "Dar baixa" de 3 peças (parcial, saldo 1) → TST-001 "Baixa pelo projeto" de 15 peças (distribuição 10 / 5 / 0).
4. **Encarregado Teste** → Itens → TST-002 → Estornar a remessa de 3 (volta a pendente; a remessa fica riscada no histórico).
5. **Usuário Teste** → Painel: 35,7% (15 de 42), faltantes 27 → PRJ-TESTE-01: Esteira Teste A 10 de 14 (71,4%), Alimentador Teste B 5 de 28 (17,9%) e 4 itens faltantes.

## Planilha de importação

A importação lê a aba **"Itens"** de um `.xlsx`, com uma linha por desenho solicitado. As colunas são localizadas pelo nome (em qualquer ordem):

| Projeto | Máquina | Desenho | Processo | Material | Quantidade | Data da solicitação |
| --- | --- | --- | --- | --- | --- | --- |
| projeto-x | Esteira ET024 | ET024-MC-003 | Corte e Dobra | SAE 1020 | 16 | 16/11/2026 |

Processo e Material são opcionais. A data pode ser uma data do Excel ou o texto DD/MM/AAAA.

- **Planilha-modelo vazia:** `docs/planilha-echeck.xlsx` (só a aba "Itens" com o cabeçalho). O Engenheiro baixa pelo botão **"Baixar planilha-modelo"** na tela Importar planilha; o front copia o arquivo de `docs/` para `frontend/public/` ao subir (`npm run dev` / `npm run build`).
- **Exemplo preenchido:** `docs/planilha-teste-echeck.xlsx`, a planilha de teste com 8 linhas fictícias.

## Documentação

| Arquivo | Conteúdo |
| --- | --- |
| [`CONTEXT.md`](./CONTEXT.md) | **Fonte da verdade**: casos de uso, diagrama de classes, regras de negócio (RN) e de exceção (EX), arquitetura, endpoints e telas |
| [`docs/PLANO-DE-DESENVOLVIMENTO.md`](./docs/PLANO-DE-DESENVOLVIMENTO.md) | Ordem de desenvolvimento, planilha de teste e gabarito, testes de cada UC |
| [`docs/DECISOES.md`](./docs/DECISOES.md) | Decisões tomadas durante o desenvolvimento onde a especificação era omissa |
| [`docs/USUARIOS-DE-TESTE.md`](./docs/USUARIOS-DE-TESTE.md) | Logins de teste: e-mail, senha, tipo e o que cada um pode testar |
| `docs/*.png`, `docs/*.jpeg` | Diagramas de arquitetura, casos de uso e classes |

## Status

✅ **Os 10 casos de uso (UC01 → UC10) estão implementados**, com back-end, testes e telas, e passaram pelo roteiro manual acima.

## Fora do escopo e próximos passos

**Fora do escopo desta versão** (decidido na especificação, `CONTEXT.md` seção 3.3):

- **Fornecedor e nota fiscal** das remessas não são registrados.
- **Excedente** não é tratado: a baixa é limitada ao solicitado e o que passar é descartado (com aviso EX16).
- **Percentual com peso por processo**: o percentual é simples (peças recebidas ÷ solicitadas); o processo é só informativo.
- **Liberação por máquina**: a liberação é sempre do projeto inteiro.

**Próximos passos sugeridos** (não pedidos na especificação nem no plano):

- **Produção:** projeto Supabase próprio, deploy do back-end e do front, CORS e *Redirect URLs* com o domínio real, e um script para criar o **primeiro Administrador** (não há autocadastro, RN01).
- **E-mail:** configurar um SMTP próprio no Supabase. O SMTP padrão tem limite de poucos e-mails por hora e serve só para testes.
- **Segurança do Auth:** ligar a proteção contra senhas vazadas (Authentication → Password security; depende do plano Pro do Supabase).
- **Usuários:** indicar "convite pendente" e permitir reenviar o convite a quem ainda não definiu a senha.
- **Importações:** tela com o histórico de importações (já registradas na tabela `importacoes`).
- **Volume:** paginar a tela de Itens no front; hoje ela mostra todos os itens filtrados de uma vez.
- **Testes:** testes automatizados do front (ponta a ponta) e um projeto Supabase separado só para os testes, para não apagar os dados de quem testa pelo front.
- **Não testado de ponta a ponta:** o e-mail real de "Esqueci a senha" (link com `?code=`); o fluxo com o token no link foi testado.
