-- HospedaPrime — schema-08: permitir que o ADMIN do proprio hotel atualize os dados do seu hotel
-- (nome, documento, endereco, horarios, taxa, etc.).
--
-- Motivo: ate aqui so existia a policy "hotel_update_dono" (super-admin do SaaS).
-- O admin de cada hotel NAO conseguia salvar as Configuracoes do proprio hotel:
-- o UPDATE era aceito pelo PostgREST (HTTP 200) mas o RLS filtrava as linhas,
-- entao nada era gravado (campos voltavam vazios).
--
-- Rode no Supabase (SQL Editor > New query > cole > Run). Seguro rodar mais de uma vez.

drop policy if exists "hotel_update_admin" on public.hoteis;
create policy "hotel_update_admin" on public.hoteis
  for update
  using (id = public.meu_hotel_id() and public.meu_papel() = 'admin')
  with check (id = public.meu_hotel_id());

-- Conferir as policies de UPDATE existentes na tabela hoteis:
select policyname, cmd
from pg_policies
where schemaname='public' and tablename='hoteis'
order by policyname;
