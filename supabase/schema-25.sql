-- HospedaPrime — schema-25: motor de reservas PUBLICO (base segura)
-- Visitante sem login ve disponibilidade/precos de UM hotel (que ativou o recurso) e envia
-- uma SOLICITACAO que entra como reserva 'pendente' para o hotel confirmar.
-- Seguranca: NENHUMA policy nova to anon nas tabelas. Todo acesso publico passa SO por estas
-- 3 funcoes security definer, que recebem o hotel por parametro e retornam apenas a "vitrine".
-- A trava de overbooking (schema-17) protege o insert. Rode no Supabase (SQL Editor). Idempotente.

-- =========================================================
-- 1) Colunas: slug publico + opt-in do motor de reservas
-- =========================================================
alter table public.hoteis add column if not exists slug text;
alter table public.hoteis add column if not exists reservas_publicas_ativas boolean default false;

-- Gera um slug base a partir de um texto (minusculo, sem acento, hifens).
create or replace function public.gerar_slug(p_txt text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(p_txt,''),
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
    '[^a-z0-9]+', '-', 'g'));
$$;

-- Backfill: hoteis sem slug recebem slug do nome, com sufixo numerico se colidir.
do $$
declare h record; base text; cand text; n int;
begin
  for h in select id, nome from public.hoteis where slug is null or slug='' loop
    base := public.gerar_slug(h.nome);
    if base is null or base='' then base := 'hotel'; end if;
    cand := base; n := 1;
    while exists(select 1 from public.hoteis where slug = cand) loop
      n := n + 1; cand := base || '-' || n;
    end loop;
    update public.hoteis set slug = cand where id = h.id;
  end loop;
end $$;

-- Indice unico do slug (agora que todos tem valor)
create unique index if not exists idx_hoteis_slug on public.hoteis(slug);

-- =========================================================
-- 2) Preco de uma diaria numa data (porte da regra do front para SQL)
--    Prioridade: regra de periodo vigente > regra de dia-da-semana > preco base do tipo.
-- =========================================================
create or replace function public.preco_diaria_data(p_tipo uuid, p_data date)
returns int language plpgsql stable security definer as $$
declare base int; dow int; preco int;
begin
  select preco_diaria into base from public.tipos_quarto where id = p_tipo;
  if base is null then return 0; end if;
  dow := extract(dow from p_data); -- 0=Dom..6=Sab
  -- melhor regra: periodo tem preferencia (prioridade), depois semana; desempate por prioridade e maior preco
  select t.preco into preco
    from public.tarifas t
   where t.tipo_quarto_id = p_tipo and t.ativo is not false
     and (
       (t.tipo_regra='periodo' and t.data_inicio is not null and t.data_fim is not null and p_data between t.data_inicio and t.data_fim)
       or
       (t.tipo_regra='semana' and t.dias_semana is not null and dow = ANY(t.dias_semana))
     )
   order by (case when t.tipo_regra='periodo' then 1 else 0 end) desc,
            coalesce(t.prioridade,0) desc, coalesce(t.preco,0) desc
   limit 1;
  return coalesce(preco, base);
end $$;

-- Soma das diarias de [checkin, checkout) aplicando a tarifa vigente de cada noite.
create or replace function public.total_periodo(p_tipo uuid, p_checkin date, p_checkout date)
returns int language plpgsql stable security definer as $$
declare d date; total int := 0; guarda int := 0;
begin
  if p_checkin is null or p_checkout is null or p_checkout <= p_checkin then return 0; end if;
  d := p_checkin;
  while d < p_checkout and guarda < 800 loop
    total := total + public.preco_diaria_data(p_tipo, d);
    d := d + 1; guarda := guarda + 1;
  end loop;
  return total;
end $$;

-- =========================================================
-- 3) RPC PUBLICA: catalogo do hotel (vitrine) — SO se o motor estiver ativo
-- =========================================================
create or replace function public.catalogo_publico(p_slug text)
returns jsonb language plpgsql stable security definer as $$
declare h record; tipos jsonb;
begin
  select id, nome, cidade, uf, checkin_horario, checkout_horario, reservas_publicas_ativas
    into h from public.hoteis where slug = p_slug;
  if not found or h.reservas_publicas_ativas is not true then
    return jsonb_build_object('ok', false, 'motivo', 'indisponivel');
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', t.id, 'nome', t.nome, 'capacidade', t.capacidade, 'preco_diaria', t.preco_diaria
         ) order by t.preco_diaria), '[]'::jsonb)
    into tipos
    from public.tipos_quarto t
   where t.hotel_id = h.id and t.ativo is not false;
  return jsonb_build_object(
    'ok', true,
    'hotel', jsonb_build_object('nome', h.nome, 'cidade', h.cidade, 'uf', h.uf,
             'checkin', h.checkin_horario, 'checkout', h.checkout_horario),
    'tipos', tipos
  );
end $$;
grant execute on function public.catalogo_publico(text) to anon, authenticated;

-- =========================================================
-- 4) RPC PUBLICA: disponibilidade por tipo num periodo (qtd livre + preco do periodo)
--    Nunca expoe reservas, hospedes ou numero de quarto.
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
        -- quartos ativos do tipo
        (select count(*) from public.quartos q where q.tipo_quarto_id = t.id and q.hotel_id = h.id and q.ativo is not false)
        -- menos quartos com reserva ativa sobreposta ao periodo
        - (select count(distinct r.quarto_id) from public.reservas r
             join public.quartos q2 on q2.id = r.quarto_id
            where q2.tipo_quarto_id = t.id and r.hotel_id = h.id
              and r.status in ('pendente','confirmada','checkin')
              and daterange(r.data_checkin, r.data_checkout, '[)') && daterange(p_checkin, p_checkout, '[)'))
      )
    ) as x
    from public.tipos_quarto t
    where t.hotel_id = h.id and t.ativo is not false
  ) sub;
  return jsonb_build_object('ok', true, 'itens', itens);
end $$;
grant execute on function public.disponibilidade_publica(text, date, date) to anon, authenticated;

-- =========================================================
-- 5) RPC PUBLICA: criar solicitacao de reserva (entra como 'pendente')
--    Cria hospede + reserva atomicamente. Anti-spam por email/telefone.
--    A constraint reservas_sem_overbooking impede duplicidade fisica.
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
  -- validacoes basicas
  if coalesce(trim(p_nome),'')='' or (coalesce(trim(p_email),'')='' and coalesce(trim(p_tel),'')='') then
    return jsonb_build_object('ok', false, 'motivo', 'dados_incompletos');
  end if;
  if p_checkin is null or p_checkout is null or p_checkout <= p_checkin or p_checkin < current_date then
    return jsonb_build_object('ok', false, 'motivo', 'datas_invalidas');
  end if;
  -- o tipo pertence a este hotel?
  if not exists(select 1 from public.tipos_quarto where id = p_tipo and hotel_id = h.id and ativo is not false) then
    return jsonb_build_object('ok', false, 'motivo', 'tipo_invalido');
  end if;
  -- anti-spam: no maximo 3 reservas pendentes por email OU telefone neste hotel
  select count(*) into v_pend
    from public.reservas r join public.hospedes g on g.id = r.hospede_id
   where r.hotel_id = h.id and r.status='pendente'
     and ( (coalesce(trim(p_email),'')<>'' and lower(g.email)=lower(trim(p_email)))
        or (coalesce(trim(p_tel),'')<>'' and g.telefone=trim(p_tel)) );
  if v_pend >= 3 then
    return jsonb_build_object('ok', false, 'motivo', 'muitas_solicitacoes');
  end if;
  -- escolhe um quarto do tipo LIVRE no periodo (nao sobreposto por reserva ativa)
  select q.id into v_quarto
    from public.quartos q
   where q.tipo_quarto_id = p_tipo and q.hotel_id = h.id and q.ativo is not false
     and not exists(
       select 1 from public.reservas r
        where r.quarto_id = q.id and r.status in ('pendente','confirmada','checkin')
          and daterange(r.data_checkin, r.data_checkout, '[)') && daterange(p_checkin, p_checkout, '[)'))
   order by q.numero
   limit 1;
  if v_quarto is null then
    return jsonb_build_object('ok', false, 'motivo', 'sem_disponibilidade');
  end if;
  v_total := public.total_periodo(p_tipo, p_checkin, p_checkout);
  v_noites := (p_checkout - p_checkin);
  -- cria o hospede (origem publica) e a reserva pendente
  insert into public.hospedes (hotel_id, nome, documento, telefone, email, observacoes, ativo)
    values (h.id, trim(p_nome), nullif(trim(p_doc),''), nullif(trim(p_tel),''), nullif(trim(p_email),''),
            'Reserva online (site do hotel)', true)
    returning id into v_hospede;
  begin
    insert into public.reservas (hotel_id, hospede_id, quarto_id, tipo_quarto_id, data_checkin, data_checkout, noites, total, status)
      values (h.id, v_hospede, v_quarto, p_tipo, p_checkin, p_checkout, v_noites, v_total, 'pendente')
      returning id into v_reserva;
  exception when exclusion_violation then
    -- alguem reservou o mesmo quarto no periodo entre a checagem e o insert
    delete from public.hospedes where id = v_hospede; -- desfaz o hospede orfao
    return jsonb_build_object('ok', false, 'motivo', 'sem_disponibilidade');
  end;
  return jsonb_build_object('ok', true, 'protocolo', substring(v_reserva::text, 1, 8), 'total', v_total, 'noites', v_noites);
end $$;
grant execute on function public.criar_reserva_publica(text, uuid, date, date, text, text, text, text) to anon, authenticated;

-- Conferir:
select slug, reservas_publicas_ativas from public.hoteis order by criado_em;
