-- HospedaPrime — schema-21: governanca / limpeza (housekeeping)
-- Adiciona metadados de limpeza ao quarto: quem esta responsavel e quando entrou na fila.
-- NAO altera o ciclo de status existente (checkout->limpeza->disponivel); apenas anexa dados.
-- Rode no Supabase (SQL Editor > New query > cole > Run). Seguro rodar mais de uma vez.

alter table public.quartos add column if not exists limpeza_responsavel uuid references public.funcionarios(id) on delete set null;
alter table public.quartos add column if not exists limpeza_atualizado_em timestamptz;

-- Conferir:
select column_name, data_type from information_schema.columns
 where table_schema='public' and table_name='quartos'
   and column_name in ('limpeza_responsavel','limpeza_atualizado_em')
 order by column_name;
