# eCheck — front-end

Telas do eCheck em **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind + Recharts**. É a View do MVC: mostra as telas e envia as ações para a API, **sem regra de negócio**. A especificação está em [`../CONTEXT.md`](../CONTEXT.md).

## Rodar

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000 (a API precisa estar em NEXT_PUBLIC_API_URL)
```

### Variáveis (`.env.local`)

| Variável | Para quê |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Endereço da API (padrão `http://localhost:3333`) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave **pública** (`sb_publishable_…`). A service role **nunca** vem para o front |

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build de produção e servidor |
| `npm run lint` | ESLint |
| `npm run typecheck` | Gera os tipos de rota do Next (`next typegen`) e checa os tipos |

## Telas

| Rota | Tela | Quem vê | UC |
| --- | --- | --- | --- |
| `/login` | Login, primeiro acesso (convite), esqueci a senha | Todos | UC02 |
| `/painel` | Painel geral (tela inicial) | Todos | UC09 |
| `/painel/[projetoId]` | Painel do projeto | Todos | UC10 |
| `/itens` | Consulta de itens e histórico (`?item=<id>` abre direto) | Todos | UC08 |
| `/recebimentos` | Pesquisa por desenho e baixa | Encarregado | UC07 |
| `/projetos`, `/projetos/[id]` | Projetos, máquinas, itens e liberação | Engenheiro | UC04–UC06 |
| `/importar` | Importação da planilha | Engenheiro | UC03 |
| `/usuarios` | Gestão de usuários | Administrador | UC01 |

## Estrutura

```text
src/
├── app/            # (app)/ = área logada (layout com menu e conferência do tipo); login/
├── components/     # ui (menu, alertas, indicadores), tabelas, formularios, graficos
├── services/       # chamadas à API (api.ts envia o JWT e transforma erros EX em ErroApi)
├── lib/            # supabaseClient.ts (só Auth), auth.ts (telas por tipo), formatos.ts
├── types/          # cópia dos tipos dos Models do back-end (atualizar junto)
└── proxy.ts        # manda para /login quem não tem sessão (o antigo middleware.ts)
```

## Login e permissões

- O login é feito direto no **Supabase Auth**. A sessão fica em **cookie** (`@supabase/ssr`), para o `proxy.ts` enxergar quem está logado.
- A área logada chama `GET /auth/me` para saber o tipo do usuário, monta o menu e manda para o painel quem abrir uma tela de outro tipo. **Quem decide a permissão é sempre a API** (RN24); o front só esconde o que não é do tipo.
- EX02 (desativado) ou EX03 (sessão expirada) em qualquer chamada encerram a sessão e voltam ao login com a mensagem.
- Os links de **convite** (token no `#hash`) e de **redefinição de senha** (`?code=`) são tratados na tela `/login`, que obriga a definir a senha antes de entrar.

## Particularidades do Next 16

- `middleware.ts` passou a se chamar **`proxy.ts`**.
- Com Cache Components, componentes que leem a URL precisam de `<Suspense>`: ele fica no layout da área logada.
- A validação de *instant navigation* está em `manual-warning` (`next.config.ts`), porque as telas buscam os dados da API no navegador depois do login.
- O selo do Next Dev Tools fica no canto direito, para não cobrir o "Sair" do menu.
