-- HospedaPrime — Mensalidades / cobranças por hotel (rode DEPOIS dos schemas anteriores)
-- SQL Editor > New query > cole tudo > Run.

-- =========================================================
-- 1. TABELA DE MENSALIDADES (cobranças do SaaS por hotel)
-- =========================================================
create table if not exists public.mensalidades (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hoteis(id) on delete cascade,
  referencia text not null,            -- mes de referencia, ex: '2026-09'
  valor int not null default 0,        -- em centavos
  vencimento date not null,
  status text not null default 'pendente',  -- pendente | pago | atrasado
  pago_em date,
  forma text,
  observacoes text,
  criado_em timestamptz default now()
);

alter table public.mensalidades enable row level security;

-- Apenas o dono do SaaS acessa as mensalidades
create policy "mensalidades_dono" on public.mensalidades
  for all using (public.sou_dono()) with check (public.sou_dono());

-- =========================================================
-- 2. Gerar cobrança do mês para um hotel (evita duplicar a mesma referencia)
-- =========================================================
create or replace function public.gerar_mensalidade(p_hotel uuid, p_referencia text, p_valor int, p_vencimento date)
returns uuid language plpgsql security definer
as $$
declare novo uuid;
begin
  if not public.sou_dono() then raise exception 'Apenas o dono'; end if;
  if exists (select 1 from public.mensalidades where hotel_id=p_hotel and referencia=p_referencia) then
    raise exception 'Ja existe mensalidade para % neste hotel', p_referencia;
  end if;
  insert into public.mensalidades (hotel_id, referencia, valor, vencimento, status)
  values (p_hotel, p_referencia, p_valor, p_vencimento, 'pendente')
  returning id into novo;
  return novo;
end;
$$;
grant execute on function public.gerar_mensalidade(uuid, text, int, date) to authenticated;

-- =========================================================
-- 3. Registrar pagamento de uma mensalidade
--    Marca como paga e estende o plano do hotel em +1 mês a partir da maior data (hoje ou expiracao atual).
-- =========================================================
create or replace function public.registrar_pagamento_mensalidade(p_mensalidade uuid, p_forma text)
returns void language plpgsql security definer
as $$
declare m record; base date;
begin
  if not public.sou_dono() then raise exception 'Apenas o dono'; end if;
  select * into m from public.mensalidades where id = p_mensalidade;
  if not found then raise exception 'Mensalidade nao encontrada'; end if;

  update public.mensalidades
    set status='pago', pago_em=current_date, forma=p_forma
    where id = p_mensalidade;

  -- estende expiracao do plano em +1 mes
  select greatest(coalesce((select plano_expira from public.hoteis where id=m.hotel_id), current_date), current_date)
    into base;
  update public.hoteis
    set plano_expira = (base + interval '1 month')::date,
        status = 'ativo'
    where id = m.hotel_id;
end;
$$;
grant execute on function public.registrar_pagamento_mensalidade(uuid, text) to authenticated;

-- =========================================================
-- 4. Listar mensalidades de um hotel (dono)
-- =========================================================
create or replace function public.listar_mensalidades(p_hotel uuid)
returns setof public.mensalidades
language sql stable security definer
as $$
  select * from public.mensalidades
  where hotel_id = p_hotel and public.sou_dono()
  order by referencia desc
$$;
grant execute on function public.listar_mensalidades(uuid) to authenticated;

-- =========================================================
-- 5. Resumo financeiro do SaaS (dono): recebido no mes, a receber, em atraso
-- =========================================================
create or replace function public.resumo_saas()
returns table(recebido_mes bigint, a_receber bigint, qtd_atraso bigint)
language sql stable security definer
as $$
  select
    coalesce((select sum(valor) from public.mensalidades where status='pago' and to_char(pago_em,'YYYY-MM')=to_char(current_date,'YYYY-MM') and public.sou_dono()),0) as recebido_mes,
    coalesce((select sum(valor) from public.mensalidades where status<>'pago' and public.sou_dono()),0) as a_receber,
    coalesce((select count(*) from public.mensalidades where status<>'pago' and vencimento < current_date and public.sou_dono()),0) as qtd_atraso
$$;
grant execute on function public.resumo_saas() to authenticated;
