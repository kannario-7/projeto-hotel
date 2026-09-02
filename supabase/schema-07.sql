-- HospedaPrime — schema-07: dados de localizacao e documento do hotel
-- Rode no Supabase (SQL Editor > New query > cole > Run). Seguro rodar mais de uma vez.

alter table public.hoteis
  add column if not exists razao_social text,
  add column if not exists tipo_doc text,            -- 'cnpj' | 'cpf'
  add column if not exists cep text,
  add column if not exists endereco text,            -- logradouro
  add column if not exists numero text,
  add column if not exists complemento text,
  add column if not exists bairro text,
  add column if not exists cidade text,
  add column if not exists uf text;                  -- sigla do estado (2 letras)

-- Conferir as colunas novas:
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='hoteis'
  and column_name in ('razao_social','tipo_doc','cep','endereco','numero','complemento','bairro','cidade','uf')
order by column_name;
