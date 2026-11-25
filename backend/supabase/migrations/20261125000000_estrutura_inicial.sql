-- eCheck · estrutura inicial (Fase 0) — aprovada em 25/11/2026
-- Fonte: CONTEXT.md seções 7, 8 e 10.
-- Saldo, status do item e percentuais NÃO são gravados: saem da view vw_itens_saldo.

-- ───────────────────────────── Enumerações ─────────────────────────────
create type public.tipo_usuario as enum ('ADMINISTRADOR', 'ENGENHEIRO', 'ENCARREGADO', 'USUARIO');
create type public.status_projeto as enum ('EM_CADASTRO', 'LIBERADO');
create type public.status_importacao as enum ('PREVIA', 'CONFIRMADA');

-- ───────────────────────────── usuarios ─────────────────────────────
-- Herança (Administrador, Engenheiro, Encarregado) vira a coluna tipo. id = id da conta no Supabase Auth.
-- Usuários não são excluídos, só desativados (RN04): sem cascade a partir de auth.users.
create table public.usuarios (
  id         uuid primary key references auth.users (id),
  nome       text not null check (btrim(nome) <> ''),
  email      text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  tipo       public.tipo_usuario not null default 'USUARIO',
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);
-- RN02: e-mail único, sem diferenciar maiúsculas
create unique index usuarios_email_unico on public.usuarios (lower(email));

-- ───────────────────────────── projetos ─────────────────────────────
create table public.projetos (
  id           uuid primary key default gen_random_uuid(),
  codigo       text not null check (btrim(codigo) <> ''),
  nome         text not null check (btrim(nome) <> ''),
  descricao    text,
  status       public.status_projeto not null default 'EM_CADASTRO',
  criado_por   uuid not null references public.usuarios (id),
  criado_em    timestamptz not null default now(),
  liberado_por uuid references public.usuarios (id),
  liberado_em  timestamptz,
  -- LIBERADO sempre com quem e quando; EM_CADASTRO sem esses dados
  constraint projetos_liberacao_coerente check (
    (status = 'LIBERADO' and liberado_por is not null and liberado_em is not null)
    or (status = 'EM_CADASTRO' and liberado_por is null and liberado_em is null)
  )
);
-- RN06: código único, sem diferenciar maiúsculas
create unique index projetos_codigo_unico on public.projetos (lower(codigo));

-- RN11: a liberação não pode ser desfeita
create function public.impedir_desfazer_liberacao() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status = 'LIBERADO' and new.status <> 'LIBERADO' then
    raise exception 'RN11: a liberação do projeto não pode ser desfeita' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger projetos_impedir_desfazer_liberacao
  before update of status on public.projetos
  for each row execute function public.impedir_desfazer_liberacao();

-- ───────────────────────────── maquinas ─────────────────────────────
create table public.maquinas (
  id          uuid primary key default gen_random_uuid(),
  projeto_id  uuid not null references public.projetos (id) on delete cascade,
  nome        text not null check (btrim(nome) <> ''),
  criado_em   timestamptz not null default now()
);
-- RN07: nome único dentro do projeto, sem diferenciar maiúsculas
create unique index maquinas_nome_unico_no_projeto on public.maquinas (projeto_id, lower(nome));

-- ───────────────────────────── itens_solicitados ─────────────────────────────
-- RN08: desenho, quantidade inteira > 0 e data obrigatórios; processo e material opcionais.
-- RN09: sem unicidade de desenho (o mesmo desenho pode repetir, até na mesma máquina).
create table public.itens_solicitados (
  id                     uuid primary key default gen_random_uuid(),
  maquina_id             uuid not null references public.maquinas (id) on delete cascade,
  desenho                text not null check (btrim(desenho) <> ''),
  processo               text,
  material               text,
  quantidade_solicitada  integer not null check (quantidade_solicitada > 0),
  data_solicitacao       date not null,
  criado_em              timestamptz not null default now()  -- desempate da RN14 (ordem de cadastro)
);
create index itens_maquina on public.itens_solicitados (maquina_id);
create index itens_desenho on public.itens_solicitados (lower(desenho));

-- ───────────────────────────── recebimentos ─────────────────────────────
-- on delete restrict: item com recebimento não pode ser excluído; como máquina e projeto excluem
-- os itens em cascata, a exclusão deles também é barrada (RN12, RN23 → EX17).
create table public.recebimentos (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid not null references public.itens_solicitados (id) on delete restrict,
  quantidade      integer not null check (quantidade > 0),   -- RN13 / RN16
  observacao      text,
  registrado_por  uuid not null references public.usuarios (id),
  registrado_em   timestamptz not null default now(),
  atualizado_por  uuid references public.usuarios (id),      -- RN18 (falta no diagrama de classes)
  atualizado_em   timestamptz,
  estornado       boolean not null default false,            -- RN17: estorno lógico
  estornado_por   uuid references public.usuarios (id),
  estornado_em    timestamptz,
  constraint recebimentos_estorno_coerente check (
    (estornado and estornado_por is not null and estornado_em is not null)
    or (not estornado and estornado_por is null and estornado_em is null)
  ),
  constraint recebimentos_atualizacao_coerente check ((atualizado_por is null) = (atualizado_em is null))
);
create index recebimentos_item on public.recebimentos (item_id) where not estornado;

-- Proteção no banco da RN13: a soma das remessas não estornadas nunca passa do solicitado.
-- O Model já limita a quantidade ao saldo; esta trava trava a linha do item e evita que
-- duas baixas simultâneas passem do total. Não substitui a regra no Model.
create function public.conferir_saldo_recebimento() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_solicitado integer;
  v_recebido   integer;
begin
  if new.estornado then
    return new;
  end if;

  select quantidade_solicitada into v_solicitado
    from public.itens_solicitados where id = new.item_id for update;

  select coalesce(sum(quantidade), 0) into v_recebido
    from public.recebimentos
   where item_id = new.item_id and not estornado and id <> new.id;

  if v_recebido + new.quantidade > v_solicitado then
    raise exception 'RN13: remessa passa do solicitado (solicitado %, já recebido %, remessa %)',
      v_solicitado, v_recebido, new.quantidade using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger recebimentos_conferir_saldo
  before insert or update of quantidade, estornado on public.recebimentos
  for each row execute function public.conferir_saldo_recebimento();

-- ───────────────────────────── importacoes ─────────────────────────────
-- A prévia fica gravada (status PREVIA, linhas em jsonb) até POST /importacoes/:id/confirmar.
create table public.importacoes (
  id              uuid primary key default gen_random_uuid(),
  nome_arquivo    text not null,
  importado_por   uuid not null references public.usuarios (id),
  importado_em    timestamptz not null default now(),
  status          public.status_importacao not null default 'PREVIA',
  total_linhas    integer not null default 0 check (total_linhas >= 0),
  linhas_validas  integer not null default 0 check (linhas_validas >= 0),
  linhas          jsonb not null default '[]'::jsonb,  -- linhas lidas e classificação RN25
  erros           jsonb not null default '[]'::jsonb,  -- [{ linha, coluna, motivo }]
  confirmado_em   timestamptz
);

-- ───────────────────────────── view de saldo ─────────────────────────────
-- Usada por UC07, UC08, UC09 e UC10. Recebido = soma das remessas não estornadas (RN17, RN19).
create view public.vw_itens_saldo with (security_invoker = true) as
select
  i.id,
  i.maquina_id,
  m.nome               as maquina_nome,
  m.projeto_id,
  p.codigo             as projeto_codigo,
  p.nome               as projeto_nome,
  p.status             as projeto_status,
  i.desenho,
  i.processo,
  i.material,
  i.quantidade_solicitada,
  i.data_solicitacao,
  i.criado_em,
  coalesce(r.recebido, 0)                          as quantidade_recebida,
  i.quantidade_solicitada - coalesce(r.recebido, 0) as saldo,
  case
    when coalesce(r.recebido, 0) = 0                       then 'PENDENTE'
    when coalesce(r.recebido, 0) < i.quantidade_solicitada then 'PARCIAL'
    else 'COMPLETO'
  end                                              as status
from public.itens_solicitados i
join public.maquinas m on m.id = i.maquina_id
join public.projetos p on p.id = m.projeto_id
left join (
  select item_id, sum(quantidade)::integer as recebido
    from public.recebimentos
   where not estornado
   group by item_id
) r on r.item_id = i.id;

-- ───────────────────────────── Segurança ─────────────────────────────
-- RLS ativo em todas as tabelas e nenhuma política: só a API (service role) lê e grava.
alter table public.usuarios          enable row level security;
alter table public.projetos          enable row level security;
alter table public.maquinas          enable row level security;
alter table public.itens_solicitados enable row level security;
alter table public.recebimentos      enable row level security;
alter table public.importacoes       enable row level security;

-- Reforço: nada acessível para anon/authenticated nem pela API REST pública.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;
