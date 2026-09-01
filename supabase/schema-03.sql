-- HospedaPrime — Painel do Dono + Multi-usuário (rode DEPOIS dos schemas 01 e 02)
-- SQL Editor > New query > cole tudo > Run.

-- =========================================================
-- 1. SUPER-ADMIN (dono do SaaS)
-- =========================================================
alter table public.perfis add column if not exists is_owner boolean default false;

-- Marca o dono pelo e-mail (kannariodev@gmail.com).
-- Roda quando o usuário ja existe em auth.users; se ainda nao criou a conta,
-- rode este UPDATE novamente depois de se cadastrar.
update public.perfis p
set is_owner = true
from auth.users u
where u.id = p.id and u.email = 'kannariodev@gmail.com';

-- Função: o usuário logado é dono?
create or replace function public.sou_dono()
returns boolean language sql stable security definer
as $$ select coalesce((select is_owner from public.perfis where id = auth.uid()), false) $$;

-- Função: papel do usuário logado (evita recursao em policies)
create or replace function public.meu_papel()
returns text language sql stable security definer
as $$ select papel from public.perfis where id = auth.uid() $$;

grant execute on function public.sou_dono() to authenticated;
grant execute on function public.meu_papel() to authenticated;

-- =========================================================
-- 2. POLÍTICAS: o DONO vê e gerencia todos os hotéis
-- =========================================================
drop policy if exists "hotel_proprio" on public.hoteis;
create policy "hotel_select" on public.hoteis
  for select using (id = public.meu_hotel_id() or public.sou_dono());
create policy "hotel_update_dono" on public.hoteis
  for update using (public.sou_dono()) with check (public.sou_dono());

-- =========================================================
-- 3. MULTI-USUÁRIO: admin do hotel gerencia perfis do proprio hotel
-- =========================================================
drop policy if exists "perfis_do_hotel" on public.perfis;
create policy "perfis_select" on public.perfis
  for select using (hotel_id = public.meu_hotel_id() or id = auth.uid() or public.sou_dono());
-- admin do hotel pode atualizar/desativar perfis do proprio hotel
create policy "perfis_update_admin" on public.perfis
  for update using (hotel_id = public.meu_hotel_id() and public.meu_papel() = 'admin')
  with check (hotel_id = public.meu_hotel_id());

-- =========================================================
-- 4. CONVITES (multi-usuário por link)
-- =========================================================
create table if not exists public.convites (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hoteis(id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  nome text not null,
  papel text not null default 'operador',
  turno text default '',
  usado boolean default false,
  criado_em timestamptz default now()
);
alter table public.convites enable row level security;

-- admin do hotel cria/le/gerencia convites do proprio hotel
create policy "convites_rw" on public.convites
  for all using (hotel_id = public.meu_hotel_id() and public.meu_papel()='admin')
  with check (hotel_id = public.meu_hotel_id() and public.meu_papel()='admin');

-- Função publica: buscar convite valido por token (para a tela de aceitar)
create or replace function public.buscar_convite(p_token uuid)
returns table(hotel_nome text, nome text, papel text, valido boolean)
language sql stable security definer
as $$
  select h.nome, c.nome, c.papel, (not c.usado) as valido
  from public.convites c join public.hoteis h on h.id = c.hotel_id
  where c.token = p_token
$$;
grant execute on function public.buscar_convite(uuid) to anon, authenticated;

-- Função: aceitar convite (cria o perfil do usuario logado no hotel do convite)
create or replace function public.aceitar_convite(p_token uuid)
returns uuid language plpgsql security definer
as $$
declare c record;
begin
  select * into c from public.convites where token = p_token and usado = false;
  if not found then raise exception 'Convite invalido ou ja utilizado'; end if;
  if exists (select 1 from public.perfis where id = auth.uid()) then
    raise exception 'Usuario ja pertence a um hotel';
  end if;
  insert into public.perfis (id, hotel_id, nome, papel, turno, ativo)
  values (auth.uid(), c.hotel_id, c.nome, c.papel, c.turno, true);
  update public.convites set usado = true where id = c.id;
  return c.hotel_id;
end;
$$;
grant execute on function public.aceitar_convite(uuid) to authenticated;

-- =========================================================
-- 5. Função para o dono listar hoteis com contagem (conveniencia)
-- =========================================================
create or replace function public.listar_hoteis_admin()
returns table(id uuid, nome text, plano text, status text, criado_em timestamptz, qtd_usuarios bigint)
language sql stable security definer
as $$
  select h.id, h.nome, h.plano, h.status, h.criado_em,
         (select count(*) from public.perfis p where p.hotel_id = h.id) as qtd_usuarios
  from public.hoteis h
  where public.sou_dono()
  order by h.criado_em desc
$$;
grant execute on function public.listar_hoteis_admin() to authenticated;
