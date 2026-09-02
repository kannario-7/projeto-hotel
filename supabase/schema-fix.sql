-- HospedaPrime — CORREÇÃO CONSOLIDADA (rode este UNICO script no SQL Editor)
-- Resolve: coluna plano_expira ausente + funcoes que dependem dela.
-- E seguro rodar mesmo que parte ja exista.

-- 1) Coluna de expiracao do plano
alter table public.hoteis add column if not exists plano_expira date;

-- 2) Recria listar_hoteis_admin (retorno mudou -> precisa drop antes)
drop function if exists public.listar_hoteis_admin();
create function public.listar_hoteis_admin()
returns table(id uuid, nome text, cnpj text, telefone text, email text, plano text, status text, plano_expira date, criado_em timestamptz, qtd_usuarios bigint)
language sql stable security definer
as $$
  select h.id, h.nome, h.cnpj, h.telefone, h.email, h.plano, h.status, h.plano_expira, h.criado_em,
         (select count(*) from public.perfis p where p.hotel_id = h.id) as qtd_usuarios
  from public.hoteis h
  where public.sou_dono()
  order by h.criado_em desc
$$;
grant execute on function public.listar_hoteis_admin() to authenticated;

-- 3) Tabela de mensalidades (caso ainda nao exista)
create table if not exists public.mensalidades (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hoteis(id) on delete cascade,
  referencia text not null,
  valor int not null default 0,
  vencimento date not null,
  status text not null default 'pendente',
  pago_em date,
  forma text,
  observacoes text,
  criado_em timestamptz default now()
);
alter table public.mensalidades enable row level security;
drop policy if exists "mensalidades_dono" on public.mensalidades;
create policy "mensalidades_dono" on public.mensalidades
  for all using (public.sou_dono()) with check (public.sou_dono());

-- 4) Funcoes de mensalidade (recriadas para garantir versao correta)
create or replace function public.gerar_mensalidade(p_hotel uuid, p_referencia text, p_valor int, p_vencimento date)
returns uuid language plpgsql security definer as $$
declare novo uuid;
begin
  if not public.sou_dono() then raise exception 'Apenas o dono'; end if;
  if exists (select 1 from public.mensalidades where hotel_id=p_hotel and referencia=p_referencia) then
    raise exception 'Ja existe mensalidade para % neste hotel', p_referencia;
  end if;
  insert into public.mensalidades (hotel_id, referencia, valor, vencimento, status)
  values (p_hotel, p_referencia, p_valor, p_vencimento, 'pendente') returning id into novo;
  return novo;
end; $$;
grant execute on function public.gerar_mensalidade(uuid, text, int, date) to authenticated;

create or replace function public.registrar_pagamento_mensalidade(p_mensalidade uuid, p_forma text)
returns void language plpgsql security definer as $$
declare m record; base date;
begin
  if not public.sou_dono() then raise exception 'Apenas o dono'; end if;
  select * into m from public.mensalidades where id = p_mensalidade;
  if not found then raise exception 'Mensalidade nao encontrada'; end if;
  update public.mensalidades set status='pago', pago_em=current_date, forma=p_forma where id = p_mensalidade;
  select greatest(coalesce((select plano_expira from public.hoteis where id=m.hotel_id), current_date), current_date) into base;
  update public.hoteis set plano_expira = (base + interval '1 month')::date, status='ativo' where id = m.hotel_id;
end; $$;
grant execute on function public.registrar_pagamento_mensalidade(uuid, text) to authenticated;

create or replace function public.listar_mensalidades(p_hotel uuid)
returns setof public.mensalidades language sql stable security definer as $$
  select * from public.mensalidades where hotel_id = p_hotel and public.sou_dono() order by referencia desc
$$;
grant execute on function public.listar_mensalidades(uuid) to authenticated;

create or replace function public.resumo_saas()
returns table(recebido_mes bigint, a_receber bigint, qtd_atraso bigint)
language sql stable security definer as $$
  select
    coalesce((select sum(valor) from public.mensalidades where status='pago' and to_char(pago_em,'YYYY-MM')=to_char(current_date,'YYYY-MM') and public.sou_dono()),0),
    coalesce((select sum(valor) from public.mensalidades where status<>'pago' and public.sou_dono()),0),
    coalesce((select count(*) from public.mensalidades where status<>'pago' and vencimento < current_date and public.sou_dono()),0)
$$;
grant execute on function public.resumo_saas() to authenticated;

-- 5) BLOQUEIO AUTOMATICO: funcao que diz se o hotel do usuario esta com acesso liberado
--    (ativo E plano nao vencido). Usada pelo app para bloquear login de hotel vencido/suspenso.
create or replace function public.meu_hotel_liberado()
returns boolean language sql stable security definer as $$
  select coalesce((
    select (h.status = 'ativo') and (h.plano_expira is null or h.plano_expira >= current_date)
    from public.hoteis h where h.id = public.meu_hotel_id()
  ), true)
$$;
grant execute on function public.meu_hotel_liberado() to authenticated;
