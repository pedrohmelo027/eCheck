-- eCheck · correção: horário de criação por linha, não por transação
-- now() devolve o mesmo horário durante toda a transação; numa gravação em lote (importação,
-- baixa pelo projeto) todas as linhas ficavam com o mesmo criado_em e a "ordem de cadastro"
-- usada como desempate na RN14 se perdia. clock_timestamp() avança a cada linha.
-- Só muda o valor padrão: estrutura e dados existentes ficam como estão.

alter table public.usuarios          alter column criado_em     set default clock_timestamp();
alter table public.projetos          alter column criado_em     set default clock_timestamp();
alter table public.maquinas          alter column criado_em     set default clock_timestamp();
alter table public.itens_solicitados alter column criado_em     set default clock_timestamp();
alter table public.recebimentos      alter column registrado_em set default clock_timestamp();
alter table public.importacoes       alter column importado_em  set default clock_timestamp();
