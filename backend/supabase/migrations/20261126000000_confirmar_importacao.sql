-- eCheck · UC03 — confirmação da importação numa única transação (RN22)
-- Lê as linhas da prévia gravada em importacoes.linhas e cria, para as linhas marcadas:
-- projetos que não existem (EM_CADASTRO, nome = código), máquinas que não existem no projeto
-- e um item por linha (RN09, RN21). Se qualquer passo falhar, nada é gravado.

create function public.confirmar_importacao(p_importacao uuid, p_linhas integer[], p_usuario uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_imp          public.importacoes%rowtype;
  v_linha        jsonb;
  v_projeto_id   uuid;
  v_maquina_id   uuid;
  v_projetos     integer := 0;
  v_maquinas     integer := 0;
  v_itens        integer := 0;
begin
  -- Trava a prévia: duas confirmações simultâneas não gravam em dobro
  select * into v_imp from public.importacoes where id = p_importacao for update;
  if not found or v_imp.status <> 'PREVIA' or v_imp.importado_por <> p_usuario then
    raise exception 'importacao_indisponivel' using errcode = 'no_data_found';
  end if;

  for v_linha in
    select l from jsonb_array_elements(v_imp.linhas) l
     where (l ->> 'linha')::integer = any (coalesce(p_linhas, '{}'))
     order by (l ->> 'linha')::integer
  loop
    -- Projeto (RN06: código único sem diferenciar maiúsculas)
    select id into v_projeto_id from public.projetos where lower(codigo) = lower(v_linha ->> 'projeto');
    if v_projeto_id is null then
      insert into public.projetos (codigo, nome, criado_por)
      values (v_linha ->> 'projeto', v_linha ->> 'projeto', p_usuario)
      returning id into v_projeto_id;
      v_projetos := v_projetos + 1;
    end if;

    -- Máquina (RN07: nome único dentro do projeto)
    select id into v_maquina_id from public.maquinas
     where projeto_id = v_projeto_id and lower(nome) = lower(v_linha ->> 'maquina');
    if v_maquina_id is null then
      insert into public.maquinas (projeto_id, nome)
      values (v_projeto_id, v_linha ->> 'maquina')
      returning id into v_maquina_id;
      v_maquinas := v_maquinas + 1;
    end if;

    -- Item (uma linha = uma solicitação, RN09)
    insert into public.itens_solicitados (maquina_id, desenho, processo, material, quantidade_solicitada, data_solicitacao)
    values (
      v_maquina_id,
      v_linha ->> 'desenho',
      nullif(v_linha ->> 'processo', ''),
      nullif(v_linha ->> 'material', ''),
      (v_linha ->> 'quantidade')::integer,
      (v_linha ->> 'dataSolicitacao')::date
    );
    v_itens := v_itens + 1;
  end loop;

  update public.importacoes
     set status = 'CONFIRMADA', confirmado_em = now(), linhas_validas = v_itens
   where id = p_importacao;

  return jsonb_build_object('projetosCriados', v_projetos, 'maquinasCriadas', v_maquinas, 'itensCriados', v_itens);
end $$;

-- Só a API (service role) chama
revoke all on function public.confirmar_importacao(uuid, integer[], uuid) from public, anon, authenticated;
