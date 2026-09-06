-- HospedaPrime — schema-28: exportacao de calendario iCal por quarto (integracao Airbnb/Booking)
-- Cada quarto ganha um token secreto. Um link publico /api/ical?t=<token> devolve um calendario
-- .ics com as DATAS OCUPADAS daquele quarto, para as OTAs bloquearem essas datas.
-- Seguranca: o link e secreto (token aleatorio); a RPC retorna SO datas (NUNCA nome de hospede
-- nem valores). Nenhuma policy nova nas tabelas. Rode no Supabase (SQL Editor). Idempotente.

-- 1) Token secreto por quarto (link do calendario)
alter table public.quartos add column if not exists ical_token uuid default gen_random_uuid();
-- backfill para quartos que ja existiam sem token
update public.quartos set ical_token = gen_random_uuid() where ical_token is null;
create unique index if not exists idx_quartos_ical_token on public.quartos(ical_token);

-- 2) RPC publica: reservas (apenas datas) de um quarto identificado pelo token.
--    Retorna hotel/numero do quarto + eventos ocupados (sem dados do hospede).
create or replace function public.ical_reservas(p_token uuid)
returns jsonb language plpgsql stable security definer as $$
declare q record; eventos jsonb;
begin
  select id, numero, hotel_id into q from public.quartos where ical_token = p_token and ativo is not false;
  if not found then
    return jsonb_build_object('ok', false);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', r.id, 'inicio', r.data_checkin, 'fim', r.data_checkout
         ) order by r.data_checkin), '[]'::jsonb)
    into eventos
    from public.reservas r
   where r.quarto_id = q.id
     and r.status in ('pendente','confirmada','checkin','checkout')
     and r.data_checkout >= current_date;  -- nao exporta reservas ja encerradas no passado
  return jsonb_build_object('ok', true, 'quarto', q.numero, 'eventos', eventos);
end $$;
grant execute on function public.ical_reservas(uuid) to anon, authenticated;

-- Conferir:
select numero, ical_token from public.quartos order by numero;
