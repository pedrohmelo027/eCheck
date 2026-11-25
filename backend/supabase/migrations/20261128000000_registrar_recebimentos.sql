-- eCheck · UC07 — grava várias remessas numa única transação (baixa pelo projeto, RN14)
-- O Model calcula a distribuição (solicitação mais antiga primeiro) e esta função só grava.
-- A trava do banco da RN13 (gatilho conferir_saldo_recebimento) continua valendo em cada linha:
-- se outra baixa consumiu o saldo no meio do caminho, a transação inteira é desfeita.

create function public.registrar_recebimentos(
  p_itens       uuid[],
  p_quantidades integer[],
  p_observacao  text,
  p_usuario     uuid
)
returns setof public.recebimentos
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(array_length(p_itens, 1), 0) = 0
     or coalesce(array_length(p_itens, 1), 0) <> coalesce(array_length(p_quantidades, 1), 0) then
    raise exception 'itens e quantidades devem ter o mesmo tamanho' using errcode = 'invalid_parameter_value';
  end if;

  -- Uma remessa por item, na ordem da distribuição
  return query
    insert into public.recebimentos (item_id, quantidade, observacao, registrado_por)
    select t.item_id, t.quantidade, nullif(p_observacao, ''), p_usuario
      from unnest(p_itens, p_quantidades) with ordinality as t(item_id, quantidade, ordem)
     order by t.ordem
    returning *;
end $$;

-- Só a API (service role) chama
revoke all on function public.registrar_recebimentos(uuid[], integer[], text, uuid) from public, anon, authenticated;
