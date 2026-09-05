-- HospedaPrime — schema-15: ultimo acesso do hotel + avaliacao do atendimento de suporte
-- Rode no Supabase (SQL Editor > New query > cole > Run). Seguro rodar mais de uma vez.

-- =========================================================
-- 1) ULTIMO ACESSO DO HOTEL
-- =========================================================
alter table public.hoteis add column if not exists ultimo_acesso timestamptz;

-- Registra o acesso do hotel do usuario logado (chamado no login/restauracao de sessao)
create or replace function public.registrar_acesso()
returns void
language plpgsql security definer
as $$
begin
  update public.hoteis
     set ultimo_acesso = now()
   where id = public.meu_hotel_id();
end;
$$;
grant execute on function public.registrar_acesso() to authenticated;

-- Recria listar_hoteis_admin incluindo ultimo_acesso (retorno mudou -> drop antes)
drop function if exists public.listar_hoteis_admin();
create function public.listar_hoteis_admin()
returns table(id uuid, nome text, cnpj text, telefone text, email text, plano text, status text, plano_expira date, criado_em timestamptz, ultimo_acesso timestamptz, qtd_usuarios bigint)
language sql stable security definer
as $$
  select h.id, h.nome, h.cnpj, h.telefone, h.email, h.plano, h.status, h.plano_expira, h.criado_em, h.ultimo_acesso,
         (select count(*) from public.perfis p where p.hotel_id = h.id) as qtd_usuarios
  from public.hoteis h
  where public.sou_dono()
  order by h.criado_em desc
$$;
grant execute on function public.listar_hoteis_admin() to authenticated;

-- =========================================================
-- 2) AVALIACAO DO ATENDIMENTO DE SUPORTE
-- =========================================================
create table if not exists public.suporte_avaliacoes (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hoteis(id) on delete cascade,
  nota int not null check (nota between 1 and 5),
  comentario text,
  nome text,                                -- quem avaliou
  criado_em timestamptz default now()
);

alter table public.suporte_avaliacoes enable row level security;

-- SELECT: cliente ve as do proprio hotel; dono ve todas
drop policy if exists "sav_select" on public.suporte_avaliacoes;
create policy "sav_select" on public.suporte_avaliacoes
  for select using (hotel_id = public.meu_hotel_id() or public.sou_dono());

-- INSERT: cliente avalia o proprio hotel
drop policy if exists "sav_insert" on public.suporte_avaliacoes;
create policy "sav_insert" on public.suporte_avaliacoes
  for insert with check (hotel_id = public.meu_hotel_id() or public.sou_dono());

create index if not exists idx_sav_hotel_data on public.suporte_avaliacoes(hotel_id, criado_em);

-- Conferir:
select 'hoteis.ultimo_acesso' as item, count(*) as ok from information_schema.columns
 where table_schema='public' and table_name='hoteis' and column_name='ultimo_acesso'
union all
select 'tabela suporte_avaliacoes', count(*) from information_schema.tables
 where table_schema='public' and table_name='suporte_avaliacoes';
