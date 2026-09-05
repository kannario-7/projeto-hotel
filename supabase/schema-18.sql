-- HospedaPrime — schema-18: trilha de auditoria (registro de acoes por usuario)
-- Registra QUEM fez O QUE e QUANDO em acoes sensiveis (cancelar reserva, trocar quarto,
-- check-in/out, abrir/fechar caixa, apagar dados, gerir usuarios).
-- Rode no Supabase (SQL Editor > New query > cole > Run). Seguro rodar mais de uma vez.

create table if not exists public.auditoria (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hoteis(id) on delete cascade,
  usuario_id uuid,                 -- auth.uid() de quem fez (pode ser nulo)
  usuario_nome text,               -- nome amigavel de quem fez
  acao text not null,              -- ex: 'reserva.cancelar', 'caixa.fechar'
  detalhe text,                    -- descricao curta legivel
  criado_em timestamptz default now()
);

alter table public.auditoria enable row level security;

-- SELECT: usuarios do proprio hotel veem o historico do hotel; dono ve tudo
drop policy if exists "aud_select" on public.auditoria;
create policy "aud_select" on public.auditoria
  for select using (hotel_id = public.meu_hotel_id() or public.sou_dono());

-- INSERT: qualquer usuario do hotel registra acoes do proprio hotel
drop policy if exists "aud_insert" on public.auditoria;
create policy "aud_insert" on public.auditoria
  for insert with check (hotel_id = public.meu_hotel_id() or public.sou_dono());

-- Sem UPDATE/DELETE: trilha de auditoria e imutavel (nao ha policy = ninguem altera/apaga).

create index if not exists idx_auditoria_hotel_data on public.auditoria(hotel_id, criado_em desc);

-- Conferir:
select 'tabela auditoria' as item, count(*) as ok from information_schema.tables
 where table_schema='public' and table_name='auditoria';
