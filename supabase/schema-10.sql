-- HospedaPrime — schema-10: registro de consentimento LGPD do hospede
-- Guarda a data/hora em que o hospede consentiu com o tratamento dos dados.
-- Rode no Supabase (SQL Editor > New query > cole > Run). Seguro rodar mais de uma vez.

alter table public.hospedes
  add column if not exists consentimento_em timestamptz;

-- Conferir:
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='hospedes' and column_name='consentimento_em';
