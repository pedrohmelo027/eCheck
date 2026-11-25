-- eCheck · UC04 — totais por máquina e por projeto (CONTEXT.md 7.2: valores calculados não são gravados)
-- Recebido = soma das remessas não estornadas (vem de vw_itens_saldo, RN17/RN20).
-- O percentual (recebido ÷ solicitado) é calculado no Model.

create view public.vw_resumo_maquinas with (security_invoker = true) as
select
  m.id,
  m.projeto_id,
  m.nome,
  m.criado_em,
  count(s.id)::integer                              as total_itens,
  coalesce(sum(s.quantidade_solicitada), 0)::integer as total_solicitado,
  coalesce(sum(s.quantidade_recebida), 0)::integer   as total_recebido
from public.maquinas m
left join public.vw_itens_saldo s on s.maquina_id = m.id
group by m.id;

create view public.vw_resumo_projetos with (security_invoker = true) as
select
  p.*,
  count(rm.id)::integer                          as total_maquinas,
  coalesce(sum(rm.total_itens), 0)::integer      as total_itens,
  coalesce(sum(rm.total_solicitado), 0)::integer as total_solicitado,
  coalesce(sum(rm.total_recebido), 0)::integer   as total_recebido
from public.projetos p
left join public.vw_resumo_maquinas rm on rm.projeto_id = p.id
group by p.id;

-- Só a API (service role) lê
revoke all on public.vw_resumo_maquinas from anon, authenticated;
revoke all on public.vw_resumo_projetos from anon, authenticated;
