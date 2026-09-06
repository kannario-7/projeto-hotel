-- HospedaPrime — schema-26: reforco de RLS por modulo (escopo seguro)
-- Alem do isolamento por hotel que ja existe, protege NO BANCO tres tabelas sensiveis e
-- exclusivas de modulo: despesas, sessoes_caixa (financeiro) e funcionarios (RH/salarios).
-- Um operador SEM o modulo nao le/escreve essas tabelas nem chamando a API direto.
--
-- SEGURANCA/RETROCOMPAT: a checagem so BLOQUEIA quando a permissao do usuario existe e e
-- explicitamente false. Se o perfil nao tem 'permissoes' definido (null) ou nao tem a chave,
-- o acesso e MANTIDO (ninguem perde acesso com esta migration). Admin/dono sempre passam.
-- Nao mexe em pagamentos, quartos, reservas, consumos, tipos_quarto, tarifas, hospedes, servicos.
-- Rode no Supabase (SQL Editor). Idempotente e reversivel.

-- =========================================================
-- 1) Funcao: o usuario logado tem acesso ao modulo?
-- =========================================================
create or replace function public.tem_permissao(p_mod text)
returns boolean
language sql stable security definer
as $$
  select
    coalesce(public.sou_dono(), false)                                   -- dono do SaaS
    or public.meu_papel() = 'admin'                                      -- admin do hotel
    or coalesce(
         -- se a chave existe em permissoes, usa o valor; senao (null) -> true (nao trava)
         (select case
                   when p.permissoes ? p_mod then (p.permissoes ->> p_mod)::boolean
                   else true
                 end
            from public.perfis p where p.id = auth.uid()),
         true)
$$;
grant execute on function public.tem_permissao(text) to authenticated;

-- =========================================================
-- 2) DESPESAS — leitura para quem tem Financeiro OU Relatorios; escrita so Financeiro
-- =========================================================
drop policy if exists "ds_rw" on public.despesas;
drop policy if exists "ds_select" on public.despesas;
drop policy if exists "ds_insert" on public.despesas;
drop policy if exists "ds_update" on public.despesas;
drop policy if exists "ds_delete" on public.despesas;

create policy "ds_select" on public.despesas for select
  using (hotel_id = public.meu_hotel_id() and (public.tem_permissao('f') or public.tem_permissao('rl')));
create policy "ds_insert" on public.despesas for insert
  with check (hotel_id = public.meu_hotel_id() and public.tem_permissao('f'));
create policy "ds_update" on public.despesas for update
  using (hotel_id = public.meu_hotel_id() and public.tem_permissao('f'))
  with check (hotel_id = public.meu_hotel_id() and public.tem_permissao('f'));
create policy "ds_delete" on public.despesas for delete
  using (hotel_id = public.meu_hotel_id() and public.tem_permissao('f'));

-- =========================================================
-- 3) SESSOES_CAIXA — mesma regra das despesas (financeiro; leitura tambem p/ relatorios)
-- =========================================================
drop policy if exists "sc_rw" on public.sessoes_caixa;
drop policy if exists "sc_select" on public.sessoes_caixa;
drop policy if exists "sc_insert" on public.sessoes_caixa;
drop policy if exists "sc_update" on public.sessoes_caixa;
drop policy if exists "sc_delete" on public.sessoes_caixa;

create policy "sc_select" on public.sessoes_caixa for select
  using (hotel_id = public.meu_hotel_id() and (public.tem_permissao('f') or public.tem_permissao('rl')));
create policy "sc_insert" on public.sessoes_caixa for insert
  with check (hotel_id = public.meu_hotel_id() and public.tem_permissao('f'));
create policy "sc_update" on public.sessoes_caixa for update
  using (hotel_id = public.meu_hotel_id() and public.tem_permissao('f'))
  with check (hotel_id = public.meu_hotel_id() and public.tem_permissao('f'));
create policy "sc_delete" on public.sessoes_caixa for delete
  using (hotel_id = public.meu_hotel_id() and public.tem_permissao('f'));

-- =========================================================
-- 4) FUNCIONARIOS — leitura p/ Funcionarios OU Limpeza (atribuir camareira); escrita so Funcionarios
-- =========================================================
drop policy if exists "fa_rw" on public.funcionarios;
drop policy if exists "fa_select" on public.funcionarios;
drop policy if exists "fa_insert" on public.funcionarios;
drop policy if exists "fa_update" on public.funcionarios;
drop policy if exists "fa_delete" on public.funcionarios;

create policy "fa_select" on public.funcionarios for select
  using (hotel_id = public.meu_hotel_id() and (public.tem_permissao('fu') or public.tem_permissao('gov')));
create policy "fa_insert" on public.funcionarios for insert
  with check (hotel_id = public.meu_hotel_id() and public.tem_permissao('fu'));
create policy "fa_update" on public.funcionarios for update
  using (hotel_id = public.meu_hotel_id() and public.tem_permissao('fu'))
  with check (hotel_id = public.meu_hotel_id() and public.tem_permissao('fu'));
create policy "fa_delete" on public.funcionarios for delete
  using (hotel_id = public.meu_hotel_id() and public.tem_permissao('fu'));

-- =========================================================
-- 5) Conferir: policies criadas nas 3 tabelas
-- =========================================================
select tablename, policyname, cmd from pg_policies
 where schemaname='public' and tablename in ('despesas','sessoes_caixa','funcionarios')
 order by tablename, policyname;
