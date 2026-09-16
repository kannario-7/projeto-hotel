-- =====================================================================
-- schema-33.sql  —  BLINDAGEM DO TRIAL NO BANCO (RLS)
-- ---------------------------------------------------------------------
-- Rode no Supabase (SQL Editor > New query > cole tudo > Run).
-- PRÉ-REQUISITO: rode o schema-32.sql ANTES (ele define a regra de 7 dias
-- e a função meu_hotel_liberado). Este script depende dela existir.
-- Seguro rodar mais de uma vez (idempotente).
--
-- O QUE ESTE SCRIPT FAZ:
--   Hoje o bloqueio do trial vencido acontece só na tela de login (app).
--   Aqui levamos a MESMA regra para dentro do banco (RLS): quando o hotel
--   está vencido/suspenso, ele para de LER e ESCREVER nos dados operacionais
--   (quartos, reservas, hóspedes, serviços, consumos, pagamentos, tarifas,
--   despesas, caixa, funcionários). Assim, mesmo que alguém tente contornar
--   a interface, o banco não devolve nem aceita dados.
--
-- O QUE NÃO É CORTADO (de propósito):
--   - hoteis e perfis (senão login e o próprio check de plano quebram);
--   - suporte_mensagens / suporte_status / suporte_avaliacoes (o cliente
--     vencido PRECISA falar com o suporte para regularizar);
--   - mensalidades, convites, auditoria, config_* (gestão/SaaS).
--   - O DONO (is_owner) nunca é afetado por estas policies.
-- =====================================================================


-- 1) FUNÇÃO-CHAVE: retorna o hotel_id do usuário SOMENTE se o hotel estiver
--    liberado. Se vencido/suspenso, retorna NULL — e como todas as policies
--    operacionais comparam "hotel_id = meu_hotel_id_ok()", nada casa com NULL,
--    cortando leitura e escrita automaticamente.
--    A regra de liberação é embutida aqui (não chama meu_hotel_liberado para
--    evitar dependências e manter a checagem barata e explícita).
create or replace function public.meu_hotel_id_ok()
returns uuid
language sql
stable
security definer
as $$
  select p.hotel_id
  from public.perfis p
  join public.hoteis h on h.id = p.hotel_id
  where p.id = auth.uid()
    and h.status = 'ativo'
    and (
      case
        when h.plano = 'trial'
          then (h.plano_expira is not null and h.plano_expira >= current_date)
        else (h.plano_expira is null or h.plano_expira >= current_date)
      end
    )
$$;
grant execute on function public.meu_hotel_id_ok() to authenticated;


-- =====================================================================
-- 2) POLICIES OPERACIONAIS SIMPLES  (troca meu_hotel_id -> meu_hotel_id_ok)
--    Tabelas: tipos_quarto, quartos, hospedes, servicos, reservas,
--             consumos, pagamentos, tarifas.
-- =====================================================================

drop policy if exists "tq_rw" on public.tipos_quarto;
create policy "tq_rw" on public.tipos_quarto for all
  using (hotel_id = public.meu_hotel_id_ok())
  with check (hotel_id = public.meu_hotel_id_ok());

drop policy if exists "q_rw" on public.quartos;
create policy "q_rw" on public.quartos for all
  using (hotel_id = public.meu_hotel_id_ok())
  with check (hotel_id = public.meu_hotel_id_ok());

drop policy if exists "h_rw" on public.hospedes;
create policy "h_rw" on public.hospedes for all
  using (hotel_id = public.meu_hotel_id_ok())
  with check (hotel_id = public.meu_hotel_id_ok());

drop policy if exists "sv_rw" on public.servicos;
create policy "sv_rw" on public.servicos for all
  using (hotel_id = public.meu_hotel_id_ok())
  with check (hotel_id = public.meu_hotel_id_ok());

drop policy if exists "r_rw" on public.reservas;
create policy "r_rw" on public.reservas for all
  using (hotel_id = public.meu_hotel_id_ok())
  with check (hotel_id = public.meu_hotel_id_ok());

drop policy if exists "os_rw" on public.consumos;
create policy "os_rw" on public.consumos for all
  using (hotel_id = public.meu_hotel_id_ok())
  with check (hotel_id = public.meu_hotel_id_ok());

drop policy if exists "pg_rw" on public.pagamentos;
create policy "pg_rw" on public.pagamentos for all
  using (hotel_id = public.meu_hotel_id_ok())
  with check (hotel_id = public.meu_hotel_id_ok());

drop policy if exists "tarifas_rw" on public.tarifas;
create policy "tarifas_rw" on public.tarifas for all
  using (hotel_id = public.meu_hotel_id_ok())
  with check (hotel_id = public.meu_hotel_id_ok());


-- =====================================================================
-- 3) POLICIES OPERACIONAIS COM PERMISSÃO POR MÓDULO
--    Mantém EXATAMENTE as condições tem_permissao(...) já existentes,
--    apenas troca meu_hotel_id -> meu_hotel_id_ok.
--    Tabelas: despesas, sessoes_caixa, funcionarios.
-- =====================================================================

-- DESPESAS (leitura: Financeiro OU Relatorios; escrita: Financeiro)
drop policy if exists "ds_select" on public.despesas;
drop policy if exists "ds_insert" on public.despesas;
drop policy if exists "ds_update" on public.despesas;
drop policy if exists "ds_delete" on public.despesas;
create policy "ds_select" on public.despesas for select
  using (hotel_id = public.meu_hotel_id_ok() and (public.tem_permissao('f') or public.tem_permissao('rl')));
create policy "ds_insert" on public.despesas for insert
  with check (hotel_id = public.meu_hotel_id_ok() and public.tem_permissao('f'));
create policy "ds_update" on public.despesas for update
  using (hotel_id = public.meu_hotel_id_ok() and public.tem_permissao('f'))
  with check (hotel_id = public.meu_hotel_id_ok() and public.tem_permissao('f'));
create policy "ds_delete" on public.despesas for delete
  using (hotel_id = public.meu_hotel_id_ok() and public.tem_permissao('f'));

-- SESSOES_CAIXA (mesma regra das despesas)
drop policy if exists "sc_select" on public.sessoes_caixa;
drop policy if exists "sc_insert" on public.sessoes_caixa;
drop policy if exists "sc_update" on public.sessoes_caixa;
drop policy if exists "sc_delete" on public.sessoes_caixa;
create policy "sc_select" on public.sessoes_caixa for select
  using (hotel_id = public.meu_hotel_id_ok() and (public.tem_permissao('f') or public.tem_permissao('rl')));
create policy "sc_insert" on public.sessoes_caixa for insert
  with check (hotel_id = public.meu_hotel_id_ok() and public.tem_permissao('f'));
create policy "sc_update" on public.sessoes_caixa for update
  using (hotel_id = public.meu_hotel_id_ok() and public.tem_permissao('f'))
  with check (hotel_id = public.meu_hotel_id_ok() and public.tem_permissao('f'));
create policy "sc_delete" on public.sessoes_caixa for delete
  using (hotel_id = public.meu_hotel_id_ok() and public.tem_permissao('f'));

-- FUNCIONARIOS (leitura: Funcionarios OU Limpeza; escrita: Funcionarios)
drop policy if exists "fa_select" on public.funcionarios;
drop policy if exists "fa_insert" on public.funcionarios;
drop policy if exists "fa_update" on public.funcionarios;
drop policy if exists "fa_delete" on public.funcionarios;
create policy "fa_select" on public.funcionarios for select
  using (hotel_id = public.meu_hotel_id_ok() and (public.tem_permissao('fu') or public.tem_permissao('gov')));
create policy "fa_insert" on public.funcionarios for insert
  with check (hotel_id = public.meu_hotel_id_ok() and public.tem_permissao('fu'));
create policy "fa_update" on public.funcionarios for update
  using (hotel_id = public.meu_hotel_id_ok() and public.tem_permissao('fu'))
  with check (hotel_id = public.meu_hotel_id_ok() and public.tem_permissao('fu'));
create policy "fa_delete" on public.funcionarios for delete
  using (hotel_id = public.meu_hotel_id_ok() and public.tem_permissao('fu'));


-- =====================================================================
-- 4) CONFERÊNCIA (opcional) — rode separadamente para ver as policies:
--
--   select tablename, policyname, cmd
--   from pg_policies
--   where schemaname='public'
--     and tablename in ('tipos_quarto','quartos','hospedes','servicos',
--                       'reservas','consumos','pagamentos','tarifas',
--                       'despesas','sessoes_caixa','funcionarios')
--   order by tablename, policyname;
--
-- TESTE DE BLOQUEIO NO BANCO (com um hotel de teste):
--   1) Deixe o trial vencido:
--        update public.hoteis
--          set plano='trial', status='ativo', plano_expira = current_date - 1
--        where nome = 'NOME DO HOTEL DE TESTE';
--   2) Logado como usuário (não-dono) desse hotel, uma leitura das reservas
--      deve voltar VAZIA e qualquer insert deve ser recusado pela RLS.
--   3) Para liberar de novo:
--        update public.hoteis
--          set status='ativo', plano_expira = current_date + interval '7 days'
--        where nome = 'NOME DO HOTEL DE TESTE';
-- =====================================================================
