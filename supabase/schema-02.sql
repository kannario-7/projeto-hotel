-- HospedaPrime — Ajustes (rode DEPOIS do schema.sql)
-- SQL Editor > New query > cole tudo > Run.

-- 1. Coluna de formas de pagamento no hotel (se ainda não existir)
alter table public.hoteis
  add column if not exists formas_pagamento jsonb
  default '["dinheiro","cartao","debito","credito","pix"]'::jsonb;

-- 2. Função de onboarding: cria hotel + perfil admin para o usuário logado.
--    Roda com security definer para poder inserir o hotel e o perfil de forma atômica.
create or replace function public.criar_hotel_e_perfil(p_hotel_nome text, p_admin_nome text)
returns uuid
language plpgsql
security definer
as $$
declare novo_hotel uuid;
begin
  -- só permite se o usuário logado ainda não tem perfil (evita duplicar)
  if exists (select 1 from public.perfis where id = auth.uid()) then
    raise exception 'Usuario ja possui hotel';
  end if;

  insert into public.hoteis (nome, plano, status)
  values (p_hotel_nome, 'trial', 'ativo')
  returning id into novo_hotel;

  insert into public.perfis (id, hotel_id, nome, papel, ativo)
  values (auth.uid(), novo_hotel, p_admin_nome, 'admin', true);

  return novo_hotel;
end;
$$;

-- 3. Permite ao usuário autenticado executar a função de onboarding
grant execute on function public.criar_hotel_e_perfil(text, text) to authenticated;

-- 4. Garante que 'anon' e 'authenticated' possam chamar a função meu_hotel_id
grant execute on function public.meu_hotel_id() to authenticated, anon;
