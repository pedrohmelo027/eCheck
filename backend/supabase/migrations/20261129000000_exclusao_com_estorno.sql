-- eCheck · RN23 / RN12 — remessa estornada não bloqueia mais a exclusão
-- Antes de apagar um item (direto ou em cascata, ao excluir a máquina ou o projeto), apaga as
-- remessas ESTORNADAS dele. Se sobrar alguma remessa ativa, a chave estrangeira (on delete
-- restrict) continua barrando a exclusão (EX17) e a transação inteira é desfeita, inclusive as
-- remessas estornadas que este gatilho apagou.

create function public.apagar_remessas_estornadas() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.recebimentos where item_id = old.id and estornado;
  return old;
end $$;

create trigger itens_apagar_remessas_estornadas
  before delete on public.itens_solicitados
  for each row execute function public.apagar_remessas_estornadas();

revoke all on function public.apagar_remessas_estornadas() from public, anon, authenticated;
