-- HospedaPrime — schema-11: tabela de DESPESAS (financeiro completo)
-- Permite registrar saidas/custos do hotel para calcular o resultado (receita - despesa = lucro).
-- Rode no Supabase (SQL Editor > New query > cole > Run). Seguro rodar mais de uma vez.

create table if not exists public.despesas (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hoteis(id) on delete cascade,
  descricao text not null,
  categoria text,                                  -- Folha, Fornecedores, Contas, Manutencao, Impostos, Outros
  valor int default 0,                             -- em centavos
  forma text,                                      -- dinheiro | cartao | pix | boleto | transferencia
  data date default current_date,
  observacoes text,
  criado_em timestamptz default now()
);

alter table public.despesas enable row level security;

-- Isolamento por hotel (mesmo padrao das demais tabelas)
drop policy if exists "ds_rw" on public.despesas;
create policy "ds_rw" on public.despesas
  for all using (hotel_id = public.meu_hotel_id()) with check (hotel_id = public.meu_hotel_id());

-- Conferir:
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='despesas' order by ordinal_position;
