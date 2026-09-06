-- HospedaPrime — schema-20: tipo do pagamento (sinal / final / avulso)
-- Permite distinguir o sinal (entrada) do pagamento final no check-out, para relatorios.
-- A tabela pagamentos ja aceita varios lancamentos por reserva; esta coluna e apenas um rotulo.
-- Rode no Supabase (SQL Editor > New query > cole > Run). Seguro rodar mais de uma vez.

alter table public.pagamentos add column if not exists tipo text default 'avulso';
-- valores usados pelo app: 'sinal' (entrada), 'final' (saldo no check-out), 'avulso' (pagamento comum)

-- Conferir:
select column_name, data_type from information_schema.columns
 where table_schema='public' and table_name='pagamentos' and column_name='tipo';
