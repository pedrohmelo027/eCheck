# Decisões tomadas durante o desenvolvimento

O [`CONTEXT.md`](../CONTEXT.md) continua sendo a fonte da verdade. Este arquivo registra o que foi decidido **onde a especificação era omissa** ou precisou de ajuste técnico, caso de uso a caso de uso. As decisões de banco e de arquitetura marcadas com ✔ foram aprovadas pelo responsável antes de serem aplicadas.

## Estrutura e arquitetura

| Tema | Decisão |
| --- | --- |
| Repositório | ✔ Um único repositório com as pastas `backend/` e `frontend/` (o `CONTEXT.md` foi atualizado) |
| Banco de desenvolvimento | ✔ Projeto Supabase na nuvem (`echeck-dev`), em vez do Supabase local com Docker |
| Transações | ✔ Importação (RN22) e baixa pelo projeto (RN14) gravam por funções PL/pgSQL chamadas via `rpc()`; o cálculo da distribuição continua no Model |
| Travas no banco | ✔ Além das regras nos Models, o banco barra: liberação desfeita (RN11) e soma das remessas acima do solicitado (RN13), o que protege contra baixas simultâneas |
| Prévia da importação | ✔ Gravada em `importacoes` (status `PREVIA`, linhas em `jsonb`) até a confirmação |
| Unicidade | ✔ E-mail, código do projeto e nome da máquina são únicos **sem diferenciar maiúsculas** |
| `atualizado_por` | ✔ Incluído em `recebimentos` (o diagrama tinha só `atualizadoEm`; a RN18 pede quem) |
| Totais | ✔ Views `vw_itens_saldo`, `vw_resumo_maquinas` e `vw_resumo_projetos`; nada calculado é gravado |
| Horário de criação | ✔ `clock_timestamp()` em vez de `now()`: numa transação o `now()` repete o mesmo horário e a ordem de cadastro (desempate da RN14) se perdia |
| Proteção das telas | ✔ Sessão em cookie (`@supabase/ssr`) e `proxy.ts` (nome do `middleware.ts` no Next 16) |
| Percentual | Uma casa decimal (15 ÷ 42 = 35,7%), calculado no back-end |

## Por caso de uso

### UC01 — Manter usuários
- Alterar o e-mail muda também a conta no Supabase Auth (senão o usuário perderia o login).
- E-mails são gravados em minúsculas.
- O link do convite volta para `/login`, onde a senha é definida.
- Se gravar o usuário falhar depois do convite, a conta criada no Auth é apagada.
- Id que nem é UUID é tratado como inexistente (EX09).

### UC02 — Fazer login
- O link de convite chega com o token no `#hash`, e o cliente do navegador do `@supabase/ssr` só aceita PKCE; por isso a tela de login trata a URL manualmente.
- Quem chega por link de convite ou de redefinição fica na tela "defina sua senha" até salvar (senão entraria sem senha).
- Senha mínima: a do Supabase Auth (6 caracteres).

### UC03 — Importar planilha
- Projeto criado pela planilha tem **nome = código** (a planilha só traz o código).
- As 7 colunas são localizadas pelo nome, em qualquer ordem; a data pode ser data do Excel ou texto DD/MM/AAAA.
- A comparação da RN25 ignora maiúsculas, acentos e espaços extras.
- Planilha sem a aba "Itens" ou sem nenhuma linha de dados → EX10.
- Só o engenheiro que gerou a prévia pode confirmá-la, uma única vez (senão EX09); linha fora da prévia → EX06.
- Importação recusada com EX11 não fica registrada.

### UC04 a UC06 — Projetos, máquinas e liberação
- Item ou máquina com remessa **estornada** também não pode ser excluído: a remessa continua no histórico.
- `GET /itens?maquina=` foi adiantado no UC05 para a tela do projeto listar os itens de cada máquina (a rota completa é do UC08).
- A liberação é atômica: com duas liberações simultâneas só uma passa (a outra recebe EX13).
- O detalhe do projeto traz os nomes de quem criou e de quem liberou.

### UC07 — Manter recebimentos
- **Atualizar uma remessa acima do saldo → EX06** ("não pode passar de X peça(s)"); o plano diz só "recusa" e o EX16 é um aviso que não bloqueia.
- **Baixa com excedente responde 200 com o aviso EX16** no corpo; sem excedente, 201.
- Baixa por máquina: o aviso de excedente antes de confirmar usa o saldo mostrado na tela (não há rota de prévia para um item); o aviso oficial vem na resposta da API.
- Pelo projeto, o desenho é comparado inteiro, sem diferenciar maiúsculas; a busca da tela aceita trecho.
- Baixas simultâneas: a trava do banco recusa a que chegar por último e a API recalcula e registra só o que ainda cabe (ou responde EX15).
- Atualizar e estornar ficam no histórico do item (UC08, FA1).

### UC08 a UC10 — Consultas e painéis
- Filtros de itens: projeto e máquina pelo id; desenho e processo por trecho; status calculado.
- `/itens?item=<id>` abre direto o histórico (usado pelos faltantes do painel do projeto).
- Painel do projeto: "faltantes" são os itens pendentes e parciais; projeto em cadastro mostra aviso e 0%.
- Gráficos: barras horizontais de 0 a 100%, um tom (série única, sem legenda), valor escrito na barra e tabela com os mesmos números.

## Ferramentas de teste

- Os testes usam o mesmo Supabase de desenvolvimento e limpam o banco a cada teste.
- Os usuários fictícios recebem uma marca em `app_metadata` quando a senha padrão é definida, e os JWTs são reaproveitados entre arquivos de teste. Sem isso, a suíte estourava o limite de logins por IP do Supabase Auth e derrubava as sessões abertas no front.
