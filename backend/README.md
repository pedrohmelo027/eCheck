# eCheck — back-end

API REST do eCheck em **Node.js + Express + TypeScript**, organizada em MVC. É a única parte que acessa o banco (Supabase, com a service role). A especificação completa está em [`../CONTEXT.md`](../CONTEXT.md).

## Rodar

```bash
npm install
cp .env.example .env
npm run seed:dev   # usuários fictícios (seção "Usuários fictícios" do README da raiz)
npm run dev        # http://localhost:3333
```

### Variáveis (`.env`)

| Variável | Para quê |
| --- | --- |
| `SUPABASE_URL` | URL do projeto Supabase de **desenvolvimento** |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta (`sb_secret_…`): só aqui, nunca no front nem no Git |
| `SUPABASE_ANON_KEY` | Chave pública (`sb_publishable_…`): usada só pelos testes e pelo seed, para fazer login com os usuários fictícios |
| `PORT` | Porta da API (padrão 3333) |
| `FRONTEND_URL` | Endereço do front: CORS e destino dos links de convite |

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | API com recarga automática (`tsx watch`) |
| `npm test` | Testes (Jest + Supertest) contra o Supabase de desenvolvimento |
| `npm run typecheck` | Checagem de tipos |
| `npm run build` / `npm start` | Compila para `dist/` e roda a versão compilada |
| `npm run seed:dev` | Cria ou atualiza os 5 usuários fictícios |

## Estrutura

```text
src/
├── config/        # env.ts (variáveis validadas com zod), supabase.ts (cliente service role)
├── routes/        # uma por recurso; todas com autenticar + autorizar(...tipos)
├── middlewares/   # autenticar (JWT no Supabase Auth, EX02/EX03), autorizar (EX04), tratarErros
├── controllers/   # validam a entrada (zod), chamam o Model e respondem JSON
├── models/        # classes do diagrama: Usuario, Administrador, Engenheiro, Encarregado,
│                  # Projeto, Maquina, ItemSolicitado, Recebimento, ImportacaoPlanilha, Painel
├── repositories/  # consultas ao banco (uma por tabela) e paginação acima de 1000 linhas
├── validators/    # schemas zod
└── errors/        # AppError + catálogo EX01–EX22 (código, mensagem, HTTP)
supabase/migrations/   # SQL, aplicado em ordem
scripts/               # usuários fictícios e seed
tests/                 # um arquivo por caso de uso (uc01 … uc10) + helpers e a planilha de teste
```

As **regras de negócio ficam nos Models**. Os controllers não têm regra; o banco tem só travas de segurança que não dependem da API: unicidades, `CHECK`s, liberação sem volta (RN11) e soma das remessas nunca acima do solicitado (RN13, inclusive com baixas simultâneas).

## Erros

Todo erro sai no formato `{ "codigo": "EX05", "mensagem": "...", "detalhes": [...] }`, com o HTTP do catálogo (`src/errors/catalogo.ts`, igual à seção 8.2 do `CONTEXT.md`). Erro inesperado vira EX22, sem expor detalhes técnicos.

## Endpoints

Os endpoints são os da seção 6.1 do `CONTEXT.md`. Rota pública só `GET /saude`. Diferenças e acréscimos em relação à especificação estão em [`../docs/DECISOES.md`](../docs/DECISOES.md).

## Testes

- `npm test` roda os 139 testes, **um arquivo por vez** (`maxWorkers: 1`), porque todos usam o mesmo banco.
- Cada teste parte de um banco limpo; os 5 usuários fictícios são mantidos. **Não rode os testes num banco com dados que você quer guardar.**
- O login nos testes é real (Supabase Auth). Os JWTs ficam num arquivo temporário (`/tmp/echeck-tokens-*.json`) e são reaproveitados por até 1 hora, para não estourar o limite de logins por IP do Supabase.
- O convite por e-mail é simulado (`mockarConvite`): nenhum e-mail é enviado.
- Helpers em `tests/helpers/`: `banco.ts` (limpeza), `auth.ts` (usuários e tokens), `planilha.ts` (variações da planilha em memória), `cenarios.ts` (importar a planilha de teste, achar itens, gravar recebimento direto).
