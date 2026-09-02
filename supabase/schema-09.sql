-- HospedaPrime — schema-09: senha-mestra segura (server-side) para acoes destrutivas
-- A senha NUNCA fica no codigo do app nem em texto: guardamos apenas o HASH (bcrypt).
-- Rode no Supabase (SQL Editor > New query > cole > Run).

-- Extensao de criptografia (Supabase ja costuma ter; if not exists e seguro)
create extension if not exists pgcrypto;

-- =========================================================
-- Tabela que guarda o hash da senha-mestra (uma linha, do dono)
-- =========================================================
create table if not exists public.config_seguranca (
  id int primary key default 1,
  senha_hash text,
  atualizado_em timestamptz default now(),
  constraint so_uma_linha check (id = 1)
);

alter table public.config_seguranca enable row level security;
-- Ninguem le/escreve direto por RLS (nem o dono). So via funcoes security definer abaixo.
-- (sem policies = acesso negado ao papel anon/authenticated)

-- =========================================================
-- Definir a senha-mestra (SO o dono). Guarda apenas o hash bcrypt.
-- Uso: select public.definir_senha_mestra('SUA_SENHA_AQUI');
-- =========================================================
create or replace function public.definir_senha_mestra(p_senha text)
returns text
language plpgsql security definer
as $$
begin
  if not public.sou_dono() then
    raise exception 'Apenas o dono pode definir a senha-mestra';
  end if;
  if p_senha is null or length(p_senha) < 6 then
    raise exception 'A senha deve ter ao menos 6 caracteres';
  end if;
  insert into public.config_seguranca (id, senha_hash, atualizado_em)
  values (1, crypt(p_senha, gen_salt('bf')), now())
  on conflict (id) do update set senha_hash = excluded.senha_hash, atualizado_em = now();
  return 'ok';
end;
$$;

-- =========================================================
-- Verificar a senha-mestra (qualquer usuario logado pode tentar validar).
-- Retorna true/false. Nao expoe o hash.
-- =========================================================
create or replace function public.verificar_senha_mestra(p_senha text)
returns boolean
language plpgsql security definer
as $$
declare h text;
begin
  select senha_hash into h from public.config_seguranca where id = 1;
  if h is null then return false; end if;      -- senha ainda nao definida
  return crypt(p_senha, h) = h;
end;
$$;

-- =========================================================
-- Restaurar (apagar) os dados do hotel do usuario logado, exigindo a senha-mestra.
-- Apaga apenas dados do PROPRIO hotel (multi-tenant preservado).
-- Nao apaga o hotel nem os perfis/usuarios.
-- =========================================================
create or replace function public.restaurar_dados_hotel(p_senha text)
returns text
language plpgsql security definer
as $$
declare h_id uuid;
begin
  if not public.verificar_senha_mestra(p_senha) then
    raise exception 'Senha-mestra incorreta';
  end if;
  h_id := public.meu_hotel_id();
  if h_id is null then
    raise exception 'Hotel nao identificado';
  end if;
  delete from public.consumos     where hotel_id = h_id;
  delete from public.pagamentos   where hotel_id = h_id;
  delete from public.reservas     where hotel_id = h_id;
  delete from public.quartos      where hotel_id = h_id;
  delete from public.tipos_quarto where hotel_id = h_id;
  delete from public.servicos     where hotel_id = h_id;
  delete from public.hospedes     where hotel_id = h_id;
  delete from public.funcionarios where hotel_id = h_id;
  return 'ok';
end;
$$;

grant execute on function public.definir_senha_mestra(text) to authenticated;
grant execute on function public.verificar_senha_mestra(text) to authenticated;
grant execute on function public.restaurar_dados_hotel(text) to authenticated;

-- =========================================================
-- >>> PASSO OBRIGATORIO: defina sua senha-mestra <<<
-- Troque 'MinhaSenhaForte123' pela senha que SO VOCE vai saber e rode a linha:
-- (precisa estar logado como o dono; no SQL Editor rode como abaixo apos ajustar)
--
-- select public.definir_senha_mestra('MinhaSenhaForte123');
--
-- OBS: no SQL Editor do Supabase a funcao roda como admin do banco, mas ela checa
-- public.sou_dono() pelo auth.uid(). Se o SQL Editor nao tiver sessao de usuario,
-- veja a ALTERNATIVA abaixo para definir a senha diretamente:
-- =========================================================
-- ALTERNATIVA (definir a senha direto, rodando no SQL Editor como admin):
-- insert into public.config_seguranca (id, senha_hash, atualizado_em)
-- values (1, crypt('MinhaSenhaForte123', gen_salt('bf')), now())
-- on conflict (id) do update set senha_hash = excluded.senha_hash, atualizado_em = now();
