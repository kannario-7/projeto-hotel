-- HospedaPrime — LIMPAR DADOS DE TESTE (rode no SQL Editor)
-- Apaga TODOS os dados operacionais e de teste, preservando a ESTRUTURA
-- (tabelas, funcoes, politicas RLS continuam intactas).
--
-- ATENCAO: isto apaga TODOS os hoteis e seus dados. Use so antes de ir para producao.
--
-- IMPORTANTE SOBRE USUARIOS (Auth):
-- Este script apaga os PERFIS (public.perfis), mas NAO apaga as contas de login
-- (auth.users). Para remover as contas de teste, va em:
--   Supabase > Authentication > Users > selecione e delete as contas de teste.
-- Como o e-mail do dono (kannariodev@gmail.com) tambem tera o perfil apagado aqui,
-- voce precisara: (a) recadastrar o hotel do dono OU (b) NAO apagar o perfil dele.
-- Se quiser PRESERVAR o dono, use a versao comentada mais abaixo.

begin;

-- Ordem respeita as dependencias (filhos antes dos pais)
truncate table public.consumos       cascade;
truncate table public.pagamentos     cascade;
truncate table public.reservas       cascade;
truncate table public.mensalidades   cascade;
truncate table public.convites       cascade;
truncate table public.quartos        cascade;
truncate table public.tipos_quarto   cascade;
truncate table public.servicos       cascade;
truncate table public.hospedes       cascade;
truncate table public.funcionarios   cascade;
truncate table public.perfis         cascade;
truncate table public.hoteis         cascade;

commit;

-- Conferir que tudo esta vazio (todas devem retornar 0):
select 'hoteis' as tabela, count(*) from public.hoteis
union all select 'perfis', count(*) from public.perfis
union all select 'reservas', count(*) from public.reservas
union all select 'mensalidades', count(*) from public.mensalidades
union all select 'convites', count(*) from public.convites;

-- ============================================================
-- ALTERNATIVA: limpar tudo MENOS o hotel do dono (kannariodev)
-- Se preferir manter sua conta/hotel de dono, NAO rode o bloco acima.
-- Em vez disso, rode este bloco (descomente):
-- ============================================================
-- do $$
-- declare hotel_dono uuid;
-- begin
--   select p.hotel_id into hotel_dono from public.perfis p
--     join auth.users u on u.id=p.id where u.email='kannariodev@gmail.com' limit 1;
--   delete from public.consumos     where hotel_id <> hotel_dono;
--   delete from public.pagamentos   where hotel_id <> hotel_dono;
--   delete from public.reservas     where hotel_id <> hotel_dono;
--   delete from public.mensalidades where hotel_id <> hotel_dono;
--   delete from public.convites     where hotel_id <> hotel_dono;
--   delete from public.quartos      where hotel_id <> hotel_dono;
--   delete from public.tipos_quarto where hotel_id <> hotel_dono;
--   delete from public.servicos     where hotel_id <> hotel_dono;
--   delete from public.hospedes     where hotel_id <> hotel_dono;
--   delete from public.funcionarios where hotel_id <> hotel_dono;
--   delete from public.perfis       where hotel_id <> hotel_dono;
--   delete from public.hoteis       where id <> hotel_dono;
-- end $$;
