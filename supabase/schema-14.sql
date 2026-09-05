-- HospedaPrime — schema-14: mensagens de suporte (chat interno cliente <-> dono)
-- Cliente envia/ve mensagens do proprio hotel; o DONO ve e responde de todos os hoteis.
-- Rode no Supabase (SQL Editor > New query > cole > Run). Seguro rodar mais de uma vez.

create table if not exists public.suporte_mensagens (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hoteis(id) on delete cascade,
  autor text not null default 'cliente',   -- 'cliente' | 'suporte'
  nome text,                                -- nome de quem escreveu
  texto text not null,
  lida boolean default false,               -- lida pelo destinatario
  criado_em timestamptz default now()
);

alter table public.suporte_mensagens enable row level security;

-- SELECT: cliente ve do proprio hotel; dono ve todos
drop policy if exists "sup_select" on public.suporte_mensagens;
create policy "sup_select" on public.suporte_mensagens
  for select using (hotel_id = public.meu_hotel_id() or public.sou_dono());

-- INSERT: cliente insere no proprio hotel; dono insere em qualquer hotel (resposta)
drop policy if exists "sup_insert" on public.suporte_mensagens;
create policy "sup_insert" on public.suporte_mensagens
  for insert with check (hotel_id = public.meu_hotel_id() or public.sou_dono());

-- UPDATE: marcar como lida - proprio hotel ou dono
drop policy if exists "sup_update" on public.suporte_mensagens;
create policy "sup_update" on public.suporte_mensagens
  for update using (hotel_id = public.meu_hotel_id() or public.sou_dono())
  with check (hotel_id = public.meu_hotel_id() or public.sou_dono());

-- indice para ordenar por data
create index if not exists idx_suporte_hotel_data on public.suporte_mensagens(hotel_id, criado_em);

-- Conferir:
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='suporte_mensagens' order by ordinal_position;
