# Usuários de teste

Logins fictícios do eCheck, para testar pelo front (http://localhost:3000) no Supabase de **desenvolvimento**. Não existem em produção.

**Senha de todos:** `Senha-Teste-123`

| Nome | E-mail (login) | Tipo | Situação | O que vê no menu | O que dá para testar |
| --- | --- | --- | --- | --- | --- |
| Admin Teste | `admin@echeck.test` | Administrador | Ativo | Painel, Itens, Usuários | **Usuários (UC01):** cadastrar (com convite), alterar dados, mudar o tipo, desativar e reativar |
| Engenheiro Teste | `engenheiro@echeck.test` | Engenheiro | Ativo | Painel, Itens, Projetos, Importar planilha | **Importar planilha (UC03); Projetos, máquinas e itens (UC04, UC05); Liberar para produção (UC06)** |
| Encarregado Teste | `encarregado@echeck.test` | Encarregado | Ativo | Painel, Itens, Recebimentos | **Recebimentos (UC07):** baixa por máquina e pelo projeto; **Itens:** atualizar e estornar remessas no histórico |
| Usuário Teste | `usuario@echeck.test` | Usuário | Ativo | Painel, Itens | Só consulta: **Painel geral (UC09), painel do projeto (UC10) e Itens com histórico (UC08)** |
| Inativo Teste | `inativo@echeck.test` | Usuário | Desativado | — | Não entra: mostra "Seu acesso está desativado. Procure o administrador." (EX02) |

Todos os tipos também têm as permissões do Usuário: login, consulta de itens e baixas e os painéis.

## Como esses usuários são criados

- `npm run seed:dev` (pasta `backend/`) cria ou atualiza os 5 usuários no Supabase Auth e na tabela `usuarios`, com o tipo e a situação acima.
- Os testes automatizados (`npm test`) usam os mesmos 5 usuários e os mantêm. Usuários criados pela tela de Usuários (UC01) **são apagados** na próxima vez que os testes rodarem.
- O domínio `.test` é reservado e nunca recebe e-mail. Para testar o convite de verdade pela tela de Usuários, use um e-mail seu: o convite é enviado pelo Supabase, que tem limite de poucos e-mails por hora no plano de desenvolvimento.

## Erros que dá para provocar com eles

| Teste | Usuário | Resultado esperado |
| --- | --- | --- |
| Entrar com senha errada | qualquer um | "E-mail ou senha incorretos." (EX01) |
| Entrar com o usuário desativado | `inativo@echeck.test` | "Seu acesso está desativado. Procure o administrador." (EX02) |
| Abrir uma tela de outro tipo pelo endereço (ex.: `/usuarios` como Engenheiro) | qualquer um, exceto o dono da tela | Volta para o Painel; a API recusa com EX04 |
| O Admin tenta mudar o próprio tipo ou se desativar | `admin@echeck.test` | "Você não pode alterar o próprio tipo nem se desativar." (EX20) |
