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

## Repositórios

O projeto é dividido em duas pastas independentes, cada uma com o próprio repositório:

```text
echeck-backend/    # API REST: routes, middlewares, controllers, models, repositories, migrations, testes
echeck-frontend/   # Next.js: app (telas), components, services (chamadas à API), types
```

## Como rodar

### Pré-requisitos

- Node.js (LTS)
- Um projeto no [Supabase](https://supabase.com)

### Back-end

```bash
cd echeck-backend
npm install
cp .env.example .env   # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORT, FRONTEND_URL
npm run dev
```

### Front-end

```bash
cd echeck-frontend
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

> A `SUPABASE_SERVICE_ROLE_KEY` fica **somente** no back-end. Nunca a coloque no front-end nem a envie para o repositório.

## Planilha de importação

A importação usa a planilha-modelo `modelo-importacao-echeck.xlsx`, com uma linha por desenho:

| Projeto | Máquina | Desenho | Processo | Material | Quantidade | Data da solicitação |
| --- | --- | --- | --- | --- | --- | --- |
| projeto-x | Esteira ET024 | ET024-MC-003 | Corte e Dobra | SAE 1020 | 16 | 16/11/2026 |

## Documentação

A especificação completa (casos de uso, diagrama de classes, regras de negócio, regras de exceção e arquitetura) está em [`CONTEXT.md`](./CONTEXT.md).

## Status

🚧 Em desenvolvimento, um caso de uso por vez (UC01 → UC10).
