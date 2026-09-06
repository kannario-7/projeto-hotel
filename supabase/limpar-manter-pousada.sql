-- HospedaPrime — LIMPEZA: manter APENAS "POUSADA GONCALVES LTDA" e seu Administrador
-- Rode no Supabase (SQL Editor > New query > cole > Run). Roda como admin (bypassa RLS).
--
-- O QUE FAZ:
--   1) Encontra o hotel "POUSADA GONCALVES LTDA".
--   2) Apaga TODOS os outros hoteis. Como todas as tabelas de dados tem
--      "hotel_id ... on delete cascade", isso remove em cascata reservas, quartos,
--      tarifas, pagamentos, suporte, auditoria, perfis, etc. dos hoteis de teste.
--   3) Apaga as CONTAS DE LOGIN (auth.users) que ficaram ORFAS (sem perfil) —
--      sao exatamente as contas de teste (e2e_/verifica_) cujos perfis sairam no passo 2.
--
-- SEGURANCA: se a Pousada nao for encontrada, o script ABORTA sem apagar nada.

do $$
declare
  hotel_pousada uuid;
  qtd_hoteis int;
  qtd_removidos int;
begin
  -- localiza o hotel a preservar (case-insensitive, tolera espacos)
  select id into hotel_pousada
  from public.hoteis
  where upper(trim(nome)) = 'POUSADA GONCALVES LTDA'
  limit 1;

  if hotel_pousada is null then
    raise exception 'ABORTADO: hotel "POUSADA GONCALVES LTDA" nao encontrado. Nada foi apagado. Confira o nome exato em public.hoteis.';
  end if;

  select count(*) into qtd_hoteis from public.hoteis;
  raise notice 'Hotel preservado: % (total de hoteis antes: %)', hotel_pousada, qtd_hoteis;

  -- 1) Apaga os demais hoteis (cascade limpa todos os dados e perfis vinculados)
  delete from public.hoteis where id <> hotel_pousada;
  get diagnostics qtd_removidos = row_count;
  raise notice 'Hoteis removidos: %', qtd_removidos;

  -- 2) Apaga contas de login orfas (sem perfil) - contas de teste
  delete from auth.users u
  where not exists (select 1 from public.perfis p where p.id = u.id);
  get diagnostics qtd_removidos = row_count;
  raise notice 'Contas de login (auth.users) orfas removidas: %', qtd_removidos;
end $$;

-- ============ CONFERIR o que sobrou ============
select 'hoteis restantes' as item, count(*) as qtd from public.hoteis
union all select 'perfis restantes', count(*) from public.perfis
union all select 'contas auth restantes', count(*) from auth.users;

-- Detalhe do que ficou (deve mostrar so a Pousada e o Administrador):
select h.nome as hotel, p.nome as usuario, p.papel, u.email
from public.hoteis h
join public.perfis p on p.hotel_id = h.id
join auth.users u on u.id = p.id
order by h.nome, p.nome;
