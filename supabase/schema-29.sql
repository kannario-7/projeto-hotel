-- HospedaPrime — schema-29: importacao de calendarios iCal (Airbnb/Booking) -> BLOQUEIOS
-- Um "bloqueio" e uma reserva com status='bloqueio' e SEM hospede, que ocupa as datas do quarto.
-- A sincronizacao le os .ics externos (feita por /api/sync-ical) e chama sync_bloqueios_quarto,
-- que substitui os bloqueios externos daquele quarto pelos eventos importados, SEM jamais tocar
-- reservas reais (de hospede). Rode no Supabase (SQL Editor). Idempotente e reversivel.

-- =========================================================
-- 1) Coluna: links .ics externos por quarto (Airbnb/Booking)
-- =========================================================
alter table public.quartos add column if not exists ical_urls jsonb default '[]'::jsonb;

-- =========================================================
-- 2) Trava de overbooking passa a considerar tambem 'bloqueio'
--    (dois bloqueios ou bloqueio x reserva no mesmo periodo nao coexistem)
-- =========================================================
alter table public.reservas drop constraint if exists reservas_sem_overbooking;
alter table public.reservas add constraint reservas_sem_overbooking
  exclude using gist (
    quarto_id with =,
    daterange(data_checkin, data_checkout, '[)') with &&
  )
  where (status in ('pendente','confirmada','checkin','bloqueio') and quarto_id is not null);

-- =========================================================
-- 3) RPC auxiliar: dado o ical_token do quarto, retorna id do quarto + urls externas.
--    Usada pela funcao /api/sync-ical (nao logada) para saber o que baixar.
-- =========================================================
create or replace function public.ical_urls_do_quarto(p_token uuid)
returns jsonb language plpgsql stable security definer as $$
declare q record;
begin
  select id, hotel_id, coalesce(ical_urls,'[]'::jsonb) as urls into q
    from public.quartos where ical_token = p_token and ativo is not false;
  if not found then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'quarto_id', q.id, 'urls', q.urls);
end $$;
grant execute on function public.ical_urls_do_quarto(uuid) to anon, authenticated;

-- =========================================================
-- 4) RPC de sincronizacao: substitui os bloqueios externos do quarto pelos eventos importados.
--    p_token identifica o quarto (mesmo token do calendario). p_eventos = [{inicio,fim}] (yyyy-mm-dd).
--    - Remove os bloqueios externos atuais do quarto (status='bloqueio').
--    - Insere um bloqueio por evento; se colidir com reserva real (exclusion_violation), PULA.
--    - NUNCA toca reservas de hospede (status != 'bloqueio').
-- =========================================================
create or replace function public.sync_bloqueios_quarto(p_token uuid, p_eventos jsonb)
returns jsonb language plpgsql security definer as $$
declare q record; ev jsonb; d_ini date; d_fim date; v_criados int := 0; v_pulados int := 0;
begin
  select id, hotel_id into q from public.quartos where ical_token = p_token and ativo is not false;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'quarto_invalido'); end if;

  -- limpa bloqueios externos anteriores deste quarto (idempotencia)
  delete from public.reservas where quarto_id = q.id and status = 'bloqueio';

  -- insere os novos bloqueios
  if p_eventos is not null then
    for ev in select * from jsonb_array_elements(p_eventos) loop
      begin
        d_ini := (ev->>'inicio')::date;
        d_fim := (ev->>'fim')::date;
        if d_ini is null or d_fim is null or d_fim <= d_ini then
          v_pulados := v_pulados + 1;
          continue;
        end if;
        insert into public.reservas (hotel_id, quarto_id, hospede_id, tipo_quarto_id, data_checkin, data_checkout, noites, total, status)
          values (q.hotel_id, q.id, null, null, d_ini, d_fim, (d_fim - d_ini), 0, 'bloqueio');
        v_criados := v_criados + 1;
      exception
        when exclusion_violation then
          -- colide com uma reserva real (ou outro bloqueio ja inserido): pula, nao quebra
          v_pulados := v_pulados + 1;
        when others then
          v_pulados := v_pulados + 1;
      end;
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'criados', v_criados, 'pulados', v_pulados);
end $$;
grant execute on function public.sync_bloqueios_quarto(uuid, jsonb) to anon, authenticated;

-- =========================================================
-- 5) As RPCs publicas de disponibilidade ja filtram status in
--    ('pendente','confirmada','checkin') — precisamos incluir 'bloqueio' para o bloqueio
--    OCUPAR a data no motor publico. Recriamos disponibilidade_publica e criar_reserva_publica
--    incluindo 'bloqueio' na checagem de sobreposicao. (ical_reservas ja inclui bloqueio? ver abaixo)
-- =========================================================
create or replace function public.disponibilidade_publica(p_slug text, p_checkin date, p_checkout date)
returns jsonb language plpgsql stable security definer as $$
declare h record; itens jsonb;
begin
  select id, reservas_publicas_ativas into h from public.hoteis where slug = p_slug;
  if not found or h.reservas_publicas_ativas is not true then
    return jsonb_build_object('ok', false, 'motivo', 'indisponivel');
  end if;
  if p_checkin is null or p_checkout is null or p_checkout <= p_checkin or p_checkin < current_date then
    return jsonb_build_object('ok', false, 'motivo', 'datas_invalidas');
  end if;
  select coalesce(jsonb_agg(x order by x->>'nome'), '[]'::jsonb) into itens from (
    select jsonb_build_object(
      'tipoId', t.id, 'nome', t.nome, 'capacidade', t.capacidade,
      'preco', public.total_periodo(t.id, p_checkin, p_checkout),
      'qtd_disponivel', (
        (select count(*) from public.quartos q where q.tipo_quarto_id = t.id and q.hotel_id = h.id and q.ativo is not false)
        - (select count(distinct r.quarto_id) from public.reservas r
             join public.quartos q2 on q2.id = r.quarto_id
            where q2.tipo_quarto_id = t.id and r.hotel_id = h.id
              and r.status in ('pendente','confirmada','checkin','bloqueio')
              and daterange(r.data_checkin, r.data_checkout, '[)') && daterange(p_checkin, p_checkout, '[)'))
      )
    ) as x
    from public.tipos_quarto t
    where t.hotel_id = h.id and t.ativo is not false
  ) sub;
  return jsonb_build_object('ok', true, 'itens', itens);
end $$;

-- criar_reserva_publica: a escolha de quarto livre deve evitar quartos com bloqueio no periodo
create or replace function public.criar_reserva_publica(
  p_slug text, p_tipo uuid, p_checkin date, p_checkout date,
  p_nome text, p_email text, p_tel text, p_doc text
) returns jsonb language plpgsql security definer as $$
declare h record; v_quarto uuid; v_hospede uuid; v_reserva uuid; v_total int; v_noites int; v_pend int;
begin
  select id, reservas_publicas_ativas into h from public.hoteis where slug = p_slug;
  if not found or h.reservas_publicas_ativas is not true then
    return jsonb_build_object('ok', false, 'motivo', 'indisponivel');
  end if;
  if coalesce(trim(p_nome),'')='' or (coalesce(trim(p_email),'')='' and coalesce(trim(p_tel),'')='') then
    return jsonb_build_object('ok', false, 'motivo', 'dados_incompletos');
  end if;
  if p_checkin is null or p_checkout is null or p_checkout <= p_checkin or p_checkin < current_date then
    return jsonb_build_object('ok', false, 'motivo', 'datas_invalidas');
  end if;
  if not exists(select 1 from public.tipos_quarto where id = p_tipo and hotel_id = h.id and ativo is not false) then
    return jsonb_build_object('ok', false, 'motivo', 'tipo_invalido');
  end if;
  select count(*) into v_pend
    from public.reservas r join public.hospedes g on g.id = r.hospede_id
   where r.hotel_id = h.id and r.status='pendente'
     and ( (coalesce(trim(p_email),'')<>'' and lower(g.email)=lower(trim(p_email)))
        or (coalesce(trim(p_tel),'')<>'' and g.telefone=trim(p_tel)) );
  if v_pend >= 3 then
    return jsonb_build_object('ok', false, 'motivo', 'muitas_solicitacoes');
  end if;
  select q.id into v_quarto
    from public.quartos q
   where q.tipo_quarto_id = p_tipo and q.hotel_id = h.id and q.ativo is not false
     and not exists(
       select 1 from public.reservas r
        where r.quarto_id = q.id and r.status in ('pendente','confirmada','checkin','bloqueio')
          and daterange(r.data_checkin, r.data_checkout, '[)') && daterange(p_checkin, p_checkout, '[)'))
   order by q.numero
   limit 1;
  if v_quarto is null then
    return jsonb_build_object('ok', false, 'motivo', 'sem_disponibilidade');
  end if;
  v_total := public.total_periodo(p_tipo, p_checkin, p_checkout);
  v_noites := (p_checkout - p_checkin);
  insert into public.hospedes (hotel_id, nome, documento, telefone, email, observacoes, ativo)
    values (h.id, trim(p_nome), nullif(trim(p_doc),''), nullif(trim(p_tel),''), nullif(trim(p_email),''),
            'Reserva online (site do hotel)', true)
    returning id into v_hospede;
  begin
    insert into public.reservas (hotel_id, hospede_id, quarto_id, tipo_quarto_id, data_checkin, data_checkout, noites, total, status)
      values (h.id, v_hospede, v_quarto, p_tipo, p_checkin, p_checkout, v_noites, v_total, 'pendente')
      returning id into v_reserva;
  exception when exclusion_violation then
    delete from public.hospedes where id = v_hospede;
    return jsonb_build_object('ok', false, 'motivo', 'sem_disponibilidade');
  end;
  return jsonb_build_object('ok', true, 'protocolo', substring(v_reserva::text, 1, 8), 'total', v_total, 'noites', v_noites);
end $$;

-- ical_reservas ja inclui 'bloqueio'? Recriamos incluindo, para o calendario exportado tambem
-- refletir bloqueios importados (evita loop: um bloqueio importado do Airbnb nao precisa voltar pro Airbnb,
-- mas para o Booking ver a data ocupada pelo Airbnb, SIM). Mantemos todos os status ativos.
create or replace function public.ical_reservas(p_token uuid)
returns jsonb language plpgsql stable security definer as $$
declare q record; eventos jsonb;
begin
  select id, numero, hotel_id into q from public.quartos where ical_token = p_token and ativo is not false;
  if not found then return jsonb_build_object('ok', false); end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', r.id, 'inicio', r.data_checkin, 'fim', r.data_checkout
         ) order by r.data_checkin), '[]'::jsonb)
    into eventos
    from public.reservas r
   where r.quarto_id = q.id
     and r.status in ('pendente','confirmada','checkin','checkout','bloqueio')
     and r.data_checkout >= current_date;
  return jsonb_build_object('ok', true, 'quarto', q.numero, 'eventos', eventos);
end $$;

-- Conferir:
select conname from pg_constraint where conname='reservas_sem_overbooking';
