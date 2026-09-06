-- HospedaPrime — schema-24: permissoes por operador
-- Cada usuario (perfil) pode ter um override de acesso por modulo, alem do padrao do papel.
-- permissoes = jsonb no formato {"f":false,"rl":true,...}. Vazio/null => usa o padrao do papel.
-- Rode no Supabase (SQL Editor > New query > cole > Run). Seguro rodar mais de uma vez.

-- 1) Coluna de permissoes no perfil e no convite (para ja nascer com as permissoes escolhidas)
alter table public.perfis   add column if not exists permissoes jsonb;
alter table public.convites  add column if not exists permissoes jsonb;

-- 2) aceitar_convite passa a copiar as permissoes do convite para o perfil criado.
--    Recriamos a function (mesma assinatura) incluindo o campo permissoes no insert.
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
  insert into public.perfis (id, hotel_id, nome, papel, turno, permissoes, ativo)
  values (auth.uid(), c.hotel_id, c.nome, c.papel, c.turno, c.permissoes, true);
  update public.convites set usado = true where id = c.id;
  return c.hotel_id;
end;
$$;
grant execute on function public.aceitar_convite(uuid) to authenticated;

-- Conferir:
select column_name, data_type from information_schema.columns
 where table_schema='public' and table_name in ('perfis','convites') and column_name='permissoes'
 order by table_name;
