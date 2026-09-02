-- HospedaPrime — Aviso de vencimento do plano (rode DEPOIS do schema-fix)
-- SQL Editor > New query > cole > Run.

-- Retorna dados do plano do hotel do usuario logado:
-- dias_restantes (negativo = vencido), status e a data.
create or replace function public.meu_plano_status()
returns table(status text, plano text, plano_expira date, dias_restantes int)
language sql stable security definer
as $$
  select h.status, h.plano, h.plano_expira,
         case when h.plano_expira is null then null
              else (h.plano_expira - current_date) end as dias_restantes
  from public.hoteis h
  where h.id = public.meu_hotel_id()
$$;
grant execute on function public.meu_plano_status() to authenticated;
