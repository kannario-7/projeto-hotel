-- HospedaPrime — Modelagem do banco (Supabase / PostgreSQL)
-- Multi-tenant: cada hotel é um "tenant". Todo dado tem hotel_id e é isolado por RLS.
-- Rode este script no Supabase: SQL Editor > New query > cole tudo > Run.

-- =========================================================
-- 1. TABELA DE HOTÉIS (tenants)
-- =========================================================
create table if not exists public.hoteis (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  telefone text,
  email text,
  plano text not null default 'trial',           -- trial | essencial | profissional
  status text not null default 'ativo',           -- ativo | suspenso | cancelado
  taxa_servico numeric default 10,
  checkin_horario text default '14:00',
  checkout_horario text default '12:00',
  formas_pagamento jsonb default '["dinheiro","cartao","debito","credito","pix"]'::jsonb,
  criado_em timestamptz default now()
);

-- =========================================================
-- 2. PERFIS DE USUÁRIO (liga auth.users ao hotel)
--    O login em si é gerenciado pelo Supabase Auth (auth.users).
--    Esta tabela guarda a qual hotel o usuário pertence e seu papel.
-- =========================================================
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  hotel_id uuid not null references public.hoteis(id) on delete cascade,
  nome text not null,
  papel text not null default 'operador',         -- admin | operador | recepcao
  turno text default '',
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- =========================================================
-- 3. DADOS OPERACIONAIS DO HOTEL (todos com hotel_id)
-- =========================================================
create table if not exists public.tipos_quarto (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hoteis(id) on delete cascade,
  nome text not null,
  capacidade int default 2,
  preco_diaria int default 0,                      -- em centavos
  ativo boolean default true
);

create table if not exists public.quartos (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hoteis(id) on delete cascade,
  numero text not null,
  andar int,
  tipo_quarto_id uuid references public.tipos_quarto(id) on delete set null,
  status text default 'disponivel',                -- disponivel|ocupado|reservado|limpeza|manutencao
  ativo boolean default true
);

create table if not exists public.hospedes (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hoteis(id) on delete cascade,
  nome text not null,
  documento text,
  telefone text,
  email text,
  endereco text,
  observacoes text,
  ativo boolean default true
);

create table if not exists public.servicos (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hoteis(id) on delete cascade,
  nome text not null,
  preco int default 0,                             -- em centavos
  categoria text,
  unidade text default 'unidade',
  ativo boolean default true
);

create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hoteis(id) on delete cascade,
  hospede_id uuid references public.hospedes(id) on delete set null,
  quarto_id uuid references public.quartos(id) on delete set null,
  tipo_quarto_id uuid references public.tipos_quarto(id) on delete set null,
  data_checkin date not null,
  data_checkout date not null,
  noites int,
  total int default 0,                             -- em centavos
  status text default 'pendente',                  -- pendente|confirmada|checkin|checkout|cancelada
  criado_em timestamptz default now()
);

create table if not exists public.consumos (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hoteis(id) on delete cascade,
  reserva_id uuid references public.reservas(id) on delete cascade,
  servico_id uuid references public.servicos(id) on delete set null,
  quantidade int default 1,
  preco_unit int default 0,
  total int default 0,
  data date default current_date
);

create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hoteis(id) on delete cascade,
  reserva_id uuid references public.reservas(id) on delete set null,
  hospede_id uuid references public.hospedes(id) on delete set null,
  valor int default 0,                             -- em centavos
  forma text,
  data date default current_date,
  observacoes text
);

create table if not exists public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hoteis(id) on delete cascade,
  nome text not null,
  cargo text,
  telefone text,
  email text,
  turno text,
  salario int default 0,
  ativo boolean default true
);

-- =========================================================
-- 4. FUNÇÃO AUXILIAR: hotel_id do usuário logado
-- =========================================================
create or replace function public.meu_hotel_id()
returns uuid
language sql stable security definer
as $$ select hotel_id from public.perfis where id = auth.uid() $$;

-- =========================================================
-- 5. ROW LEVEL SECURITY (isolamento por hotel)
--    Cada usuário só enxerga/edita dados do próprio hotel.
-- =========================================================
alter table public.hoteis        enable row level security;
alter table public.perfis        enable row level security;
alter table public.tipos_quarto  enable row level security;
alter table public.quartos       enable row level security;
alter table public.hospedes      enable row level security;
alter table public.servicos      enable row level security;
alter table public.reservas      enable row level security;
alter table public.consumos      enable row level security;
alter table public.pagamentos    enable row level security;
alter table public.funcionarios  enable row level security;

-- Hotéis: usuário vê só o seu hotel
create policy "hotel_proprio" on public.hoteis
  for select using (id = public.meu_hotel_id());

-- Perfis: usuário vê perfis do mesmo hotel
create policy "perfis_do_hotel" on public.perfis
  for select using (hotel_id = public.meu_hotel_id());
create policy "perfil_proprio_insert" on public.perfis
  for insert with check (id = auth.uid());

-- Macro de política padrão por tabela de dados (select/insert/update/delete do próprio hotel)
-- Repetimos para cada tabela:
create policy "tq_rw"  on public.tipos_quarto for all using (hotel_id = public.meu_hotel_id()) with check (hotel_id = public.meu_hotel_id());
create policy "q_rw"   on public.quartos      for all using (hotel_id = public.meu_hotel_id()) with check (hotel_id = public.meu_hotel_id());
create policy "h_rw"   on public.hospedes     for all using (hotel_id = public.meu_hotel_id()) with check (hotel_id = public.meu_hotel_id());
create policy "sv_rw"  on public.servicos     for all using (hotel_id = public.meu_hotel_id()) with check (hotel_id = public.meu_hotel_id());
create policy "r_rw"   on public.reservas     for all using (hotel_id = public.meu_hotel_id()) with check (hotel_id = public.meu_hotel_id());
create policy "os_rw"  on public.consumos     for all using (hotel_id = public.meu_hotel_id()) with check (hotel_id = public.meu_hotel_id());
create policy "pg_rw"  on public.pagamentos   for all using (hotel_id = public.meu_hotel_id()) with check (hotel_id = public.meu_hotel_id());
create policy "fa_rw"  on public.funcionarios for all using (hotel_id = public.meu_hotel_id()) with check (hotel_id = public.meu_hotel_id());

-- Fim do schema.
