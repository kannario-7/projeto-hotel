-- HospedaPrime — schema-13: contas a pagar (vencimento e status nas despesas)
-- Permite marcar uma despesa como "a pagar" com data de vencimento e controlar se ja foi paga.
-- Contas a RECEBER sao calculadas a partir das reservas (saldo em aberto) - nao precisa de tabela.
-- Rode no Supabase (SQL Editor > New query > cole > Run). Seguro rodar mais de uma vez.

alter table public.despesas
  add column if not exists vencimento date,
  add column if not exists pago boolean default true,     -- por padrao, despesa lancada ja e considerada paga
  add column if not exists pago_em date;

-- Conferir:
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='despesas'
  and column_name in ('vencimento','pago','pago_em') order by column_name;
