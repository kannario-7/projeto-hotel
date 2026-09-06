-- HospedaPrime — schema-19: tarifas por temporada e por dia da semana
-- Permite que a diaria de um tipo de quarto varie por periodo (alta/baixa temporada, feriados)
-- ou por dias da semana (ex.: sexta e sabado mais caros), em vez do valor fixo do tipo.
-- Rode no Supabase (SQL Editor > New query > cole > Run). Seguro rodar mais de uma vez.

create table if not exists public.tarifas (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hoteis(id) on delete cascade,
  tipo_quarto_id uuid not null references public.tipos_quarto(id) on delete cascade,
  nome text,                          -- ex: "Alta temporada", "Fim de semana"
  tipo_regra text not null default 'periodo',  -- 'periodo' | 'semana'
  data_inicio date,                   -- usado quando tipo_regra='periodo'
  data_fim date,                      -- usado quando tipo_regra='periodo'
  dias_semana int[],                  -- usado quando tipo_regra='semana' (0=Dom ... 6=Sab)
  preco int not null default 0,       -- em centavos (preco da diaria nessa regra)
  prioridade int default 0,           -- maior vence quando duas regras batem no mesmo dia
  ativo boolean default true,
  criado_em timestamptz default now()
);

alter table public.tarifas enable row level security;

-- RLS: cada hotel gerencia so as proprias tarifas
drop policy if exists "tarifas_rw" on public.tarifas;
create policy "tarifas_rw" on public.tarifas
  for all using (hotel_id = public.meu_hotel_id())
  with check (hotel_id = public.meu_hotel_id());

create index if not exists idx_tarifas_hotel_tipo on public.tarifas(hotel_id, tipo_quarto_id);

-- Conferir:
select 'tabela tarifas' as item, count(*) as ok from information_schema.tables
 where table_schema='public' and table_name='tarifas';
