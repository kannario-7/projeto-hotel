-- HospedaPrime — schema-12: fechamento de caixa por turno/recepcionista
-- Registra abertura e fechamento de caixa, valores contados vs sistema e a diferenca (sobra/falta).
-- Rode no Supabase (SQL Editor > New query > cole > Run). Seguro rodar mais de uma vez.

create table if not exists public.sessoes_caixa (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hoteis(id) on delete cascade,
  usuario_abertura text,                 -- nome de quem abriu
  usuario_fechamento text,               -- nome de quem fechou
  aberto_em timestamptz default now(),
  fechado_em timestamptz,
  valor_abertura int default 0,          -- fundo de troco inicial (centavos)
  -- valores CONTADOS no fechamento (o que o operador contou fisicamente), em centavos
  contado_dinheiro int default 0,
  contado_cartao int default 0,
  contado_pix int default 0,
  contado_outros int default 0,
  -- valor que o SISTEMA registrou no periodo (soma dos pagamentos), em centavos
  valor_sistema int default 0,
  diferenca int default 0,               -- (contado_total - valor_abertura) - valor_sistema; + sobra / - falta
  observacoes text,
  status text default 'aberto',          -- aberto | fechado
  criado_em timestamptz default now()
);

alter table public.sessoes_caixa enable row level security;

drop policy if exists "sc_rw" on public.sessoes_caixa;
create policy "sc_rw" on public.sessoes_caixa
  for all using (hotel_id = public.meu_hotel_id()) with check (hotel_id = public.meu_hotel_id());

-- Conferir:
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='sessoes_caixa' order by ordinal_position;
