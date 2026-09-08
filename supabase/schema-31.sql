-- HospedaPrime — schema-31: CORRECAO. Garante que o status 'bloqueio' (calendarios iCal
-- importados do Airbnb/Booking) OCUPE a data no motor de reservas publico.
--
-- Contexto do bug: no teste em producao, ao criar um bloqueio (status='bloqueio') o calendario
-- exportado (ical_reservas) passou a mostrar a data ocupada, MAS a disponibilidade_publica
-- continuou retornando o quarto como livre — ou seja, um hospede conseguiria reservar por cima
-- de uma data ja bloqueada por uma OTA (overbooking). Isso indica que a versao de
-- disponibilidade_publica / criar_reserva_publica ativa no banco ainda NAO inclui 'bloqueio'
-- no filtro de sobreposicao. Este script recria as duas com o filtro correto. Idempotente.
--
-- Rode no Supabase (SQL Editor).

-- =========================================================
-- disponibilidade_publica: contar tambem 'bloqueio' como ocupado
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

-- =========================================================
-- criar_reserva_publica: nao escolher quarto que tenha bloqueio no periodo
-- =========================================================
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

-- Conferir: as duas funcoes devem existir
select proname from pg_proc where proname in ('disponibilidade_publica','criar_reserva_publica') order by proname;
