-- HospedaPrime — schema-27: permitir excluir (apagar) um perfil de usuario do hotel
-- Hoje so era possivel DESATIVAR (perfis.ativo=false). Esta policy permite o DELETE do perfil,
-- restrito ao ADMIN do proprio hotel ou ao DONO do SaaS. Remove o vinculo/acesso do usuario ao hotel.
-- (A conta de login em auth.users nao e removida por aqui — exige service_role; o perfil apagado
--  ja tira todo o acesso e o vinculo ao hotel.)
-- Rode no Supabase (SQL Editor). Idempotente e reversivel.

drop policy if exists "perfis_delete_admin" on public.perfis;
create policy "perfis_delete_admin" on public.perfis
  for delete using (
    (hotel_id = public.meu_hotel_id() and public.meu_papel() = 'admin')
    or public.sou_dono()
  );

-- Conferir:
select policyname, cmd from pg_policies
 where schemaname='public' and tablename='perfis' order by policyname;
