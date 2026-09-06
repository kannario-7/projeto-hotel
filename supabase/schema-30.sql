-- HospedaPrime — schema-30: suporte a sincronizacao AUTOMATICA (cron) dos calendarios iCal.
-- A funcao de cron (server-side) precisa listar TODOS os quartos que tem links .ics configurados,
-- de todos os hoteis, sem estar logada. Para isso NAO expomos isso ao publico: a RPC exige um
-- segredo compartilhado (o mesmo CRON_SECRET usado pela funcao /api/cron-ical na Vercel).
-- Rode no Supabase (SQL Editor). Idempotente.
--
-- IMPORTANTE: troque 'DEFINA_UM_SEGREDO_FORTE_AQUI' por um valor secreto proprio (uuid/senha longa)
-- e use EXATAMENTE o mesmo valor na variavel de ambiente CRON_SECRET da Vercel.

-- Guarda o segredo do cron numa tabela protegida (RLS sem policy = ninguem acessa por API).
create table if not exists public.config_cron (
  id int primary key default 1,
  cron_secret text not null,
  check (id = 1)
);
alter table public.config_cron enable row level security; -- sem policies: so security definer acessa

-- Define/atualiza o segredo (rode uma vez; troque o valor).
insert into public.config_cron (id, cron_secret) values (1, 'DEFINA_UM_SEGREDO_FORTE_AQUI')
  on conflict (id) do update set cron_secret = excluded.cron_secret;
-- OBS: ao rodar, use o segredo real (o mesmo do CRON_SECRET na Vercel). Nao commitamos o valor real.

-- Lista os quartos com links .ics, SO se o segredo bater. Retorna token + urls (nada sensivel).
create or replace function public.listar_quartos_ical(p_secret text)
returns jsonb language plpgsql stable security definer as $$
declare ok boolean; itens jsonb;
begin
  select (p_secret is not null and p_secret = c.cron_secret) into ok from public.config_cron c where c.id = 1;
  if not coalesce(ok, false) then
    return jsonb_build_object('ok', false);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('token', q.ical_token, 'urls', q.ical_urls)), '[]'::jsonb)
    into itens
    from public.quartos q
   where q.ativo is not false
     and q.ical_urls is not null
     and jsonb_array_length(q.ical_urls) > 0;
  return jsonb_build_object('ok', true, 'quartos', itens);
end $$;
grant execute on function public.listar_quartos_ical(text) to anon, authenticated;

-- Conferir:
select count(*) as quartos_com_ical from public.quartos where ical_urls is not null and jsonb_array_length(ical_urls) > 0;
