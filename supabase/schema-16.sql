-- HospedaPrime — schema-16: status do atendimento de suporte (abrir / finalizar / reabrir)
-- Rode no Supabase (SQL Editor > New query > cole > Run). Seguro rodar mais de uma vez.

-- Uma linha por hotel com o estado atual do atendimento.
create table if not exists public.suporte_status (
  hotel_id uuid primary key references public.hoteis(id) on delete cascade,
  status text not null default 'aberto',   -- 'aberto' | 'finalizado'
  fechado_em timestamptz,
  fechado_por text,                         -- nome de quem finalizou
  atualizado_em timestamptz default now()
);

alter table public.suporte_status enable row level security;

-- SELECT: cliente ve o do proprio hotel; dono ve todos
drop policy if exists "sst_select" on public.suporte_status;
create policy "sst_select" on public.suporte_status
  for select using (hotel_id = public.meu_hotel_id() or public.sou_dono());

-- INSERT/UPDATE: cliente pode reabrir o proprio; dono gerencia todos
drop policy if exists "sst_insert" on public.suporte_status;
create policy "sst_insert" on public.suporte_status
  for insert with check (hotel_id = public.meu_hotel_id() or public.sou_dono());

drop policy if exists "sst_update" on public.suporte_status;
create policy "sst_update" on public.suporte_status
  for update using (hotel_id = public.meu_hotel_id() or public.sou_dono())
  with check (hotel_id = public.meu_hotel_id() or public.sou_dono());

-- Conferir:
select 'tabela suporte_status' as item, count(*) as ok from information_schema.tables
 where table_schema='public' and table_name='suporte_status';
