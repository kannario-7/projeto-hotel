-- HospedaPrime — schema-17: PREVENCAO DE OVERBOOKING (trava no banco)
-- Impede fisicamente duas reservas ATIVAS no mesmo quarto com periodos sobrepostos,
-- mesmo com dois usuarios salvando ao mesmo tempo (o que o front sozinho nao garante).
-- Rode no Supabase (SQL Editor > New query > cole > Run). Seguro rodar mais de uma vez.

-- 1) Extensao necessaria para EXCLUDE com igualdade (uuid) + range (datas)
create extension if not exists btree_gist;

-- 2) Diagnostico: mostra reservas ATIVAS ja sobrepostas hoje (precisam ser resolvidas
--    manualmente ANTES da trava pegar, senao a criacao da constraint falha).
--    Se retornar linhas, ajuste/cancele uma das reservas conflitantes e rode de novo.
select a.id as reserva_a, b.id as reserva_b, a.quarto_id,
       a.data_checkin as a_in, a.data_checkout as a_out,
       b.data_checkin as b_in, b.data_checkout as b_out
from public.reservas a
join public.reservas b
  on a.quarto_id = b.quarto_id
 and a.id < b.id
 and a.status in ('pendente','confirmada','checkin')
 and b.status in ('pendente','confirmada','checkin')
 and daterange(a.data_checkin, a.data_checkout, '[)') && daterange(b.data_checkin, b.data_checkout, '[)');

-- 3) A trava. EXCLUDE garante que nao existam duas linhas com:
--    mesmo quarto_id E periodos [checkin,checkout) que se sobrepoem,
--    considerando apenas reservas ativas (index parcial via WHERE).
--    checkout de um dia = checkin de outro NAO conflita (intervalo aberto no fim).
alter table public.reservas drop constraint if exists reservas_sem_overbooking;
alter table public.reservas add constraint reservas_sem_overbooking
  exclude using gist (
    quarto_id with =,
    daterange(data_checkin, data_checkout, '[)') with &&
  )
  where (status in ('pendente','confirmada','checkin') and quarto_id is not null);

-- Conferir se a constraint foi criada:
select conname, contype from pg_constraint where conname = 'reservas_sem_overbooking';
