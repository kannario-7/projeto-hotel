-- HospedaPrime — schema-22: diagnostico da trava de overbooking
-- Permite confirmar, a qualquer momento (inclusive pela aplicacao), se a trava
-- de banco 'reservas_sem_overbooking' (criada no schema-17) esta REALMENTE ativa,
-- e se existem reservas ativas sobrepostas no hotel do usuario logado.
-- Rode no Supabase (SQL Editor > New query > cole > Run). Seguro rodar mais de uma vez.

-- 1) A trava esta instalada no banco? (checa o catalogo pg_constraint)
--    Retorna true/false. security definer para poder ler o catalogo mesmo via anon/authenticated.
create or replace function public.trava_overbooking_ativa()
returns boolean
language sql stable security definer
as $$
  select exists(
    select 1 from pg_constraint
    where conname = 'reservas_sem_overbooking'
  );
$$;
grant execute on function public.trava_overbooking_ativa() to authenticated, anon;

-- 2) Ha reservas ATIVAS sobrepostas no hotel do usuario logado?
--    Se a trava estiver ativa, isso deve sempre retornar 0 linhas.
--    Util como diagnostico de sanidade (nao depende da trava para rodar).
create or replace function public.reservas_sobrepostas()
returns table(
  reserva_a uuid, reserva_b uuid, quarto_id uuid,
  a_in date, a_out date, b_in date, b_out date
)
language sql stable security definer
as $$
  select a.id, b.id, a.quarto_id,
         a.data_checkin, a.data_checkout,
         b.data_checkin, b.data_checkout
  from public.reservas a
  join public.reservas b
    on a.quarto_id = b.quarto_id
   and a.id < b.id
   and a.status in ('pendente','confirmada','checkin')
   and b.status in ('pendente','confirmada','checkin')
   and daterange(a.data_checkin, a.data_checkout, '[)') && daterange(b.data_checkin, b.data_checkout, '[)')
  where a.hotel_id = public.meu_hotel_id();
$$;
grant execute on function public.reservas_sobrepostas() to authenticated;

-- Conferir agora mesmo (no SQL Editor):
select public.trava_overbooking_ativa() as trava_ativa;
select * from public.reservas_sobrepostas();
