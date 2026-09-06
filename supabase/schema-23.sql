-- HospedaPrime — schema-23: prestacao de contas por caixa/turno
-- Adiciona a hora real do pagamento (criado_em) e quem registrou (usuario_id/nome),
-- para o Caixa por Turno somar pela JANELA REAL da sessao (abertura->fechamento) e
-- para atribuir o recebido a cada operador/turno.
-- Rode no Supabase (SQL Editor > New query > cole > Run). Seguro rodar mais de uma vez.

-- 1) Carimbo de hora real do pagamento (ate agora so havia "data" = dia).
alter table public.pagamentos add column if not exists criado_em timestamptz default now();

-- 2) Quem registrou o pagamento (operador). usuario_id aponta para o perfil; nome fica desnormalizado
--    para o historico continuar legivel mesmo se o usuario for removido.
alter table public.pagamentos add column if not exists usuario_id uuid;
alter table public.pagamentos add column if not exists usuario_nome text;

-- 3) Backfill: pagamentos antigos sem criado_em recebem o meio-dia da sua "data"
--    (aproximacao segura para nao cairem no dia anterior por fuso). Só afeta linhas nulas.
update public.pagamentos
   set criado_em = (data::timestamp + interval '12 hours')
 where criado_em is null and data is not null;

-- Conferir:
select column_name, data_type from information_schema.columns
 where table_schema='public' and table_name='pagamentos'
   and column_name in ('criado_em','usuario_id','usuario_nome')
 order by column_name;
