-- =====================================================================
-- schema-34.sql  —  CRM / CAPTAÇÃO DE LEADS (Painel do Dono)
-- ---------------------------------------------------------------------
-- Rode no Supabase (SQL Editor > New query > cole tudo > Run).
-- Seguro rodar mais de uma vez (idempotente).
--
-- O QUE ESTE SCRIPT FAZ:
--   1) Cria a tabela public.leads (interessados no HospedaPrime).
--   2) RLS: só o DONO (is_owner) vê, edita e apaga leads. Ninguém mais.
--   3) RPC pública captar_lead(): usada pelo formulário da landing e por
--      integrações externas (webhook /api/lead) para inserir um lead SEM
--      precisar abrir a tabela para o público. Faz validação básica e
--      normaliza os dados. Roda como security definer.
-- =====================================================================


-- 1) TABELA DE LEADS
create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  email        text,
  telefone     text,
  mensagem     text,
  origem       text not null default 'landing',   -- landing | api | manual | outro
  status       text not null default 'novo',       -- novo | contatado | negociando | ganho | perdido
  notas        text default '',                    -- anotações internas do dono
  criado_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_leads_status_data on public.leads(status, criado_em desc);

alter table public.leads enable row level security;


-- 2) POLICIES: acesso EXCLUSIVO do dono do SaaS.
--    (A captação pública NÃO passa por policy de insert — usa a RPC abaixo,
--     que é security definer. Assim o anon não consegue ler/listar leads.)
drop policy if exists "leads_dono_select" on public.leads;
create policy "leads_dono_select" on public.leads
  for select using (public.sou_dono());

drop policy if exists "leads_dono_update" on public.leads;
create policy "leads_dono_update" on public.leads
  for update using (public.sou_dono()) with check (public.sou_dono());

drop policy if exists "leads_dono_delete" on public.leads;
create policy "leads_dono_delete" on public.leads
  for delete using (public.sou_dono());

-- (opcional) o dono também pode inserir manualmente pela interface
drop policy if exists "leads_dono_insert" on public.leads;
create policy "leads_dono_insert" on public.leads
  for insert with check (public.sou_dono());


-- 3) RPC PÚBLICA DE CAPTAÇÃO
--    Qualquer visitante (anon) pode ENVIAR um lead, mas não pode ler nada.
--    Validações: nome obrigatório; precisa de pelo menos e-mail OU telefone;
--    limita tamanhos para evitar abuso; normaliza origem/status.
create or replace function public.captar_lead(
  p_nome text,
  p_email text default null,
  p_telefone text default null,
  p_mensagem text default null,
  p_origem text default 'landing'
)
returns uuid
language plpgsql
security definer
as $$
declare
  novo uuid;
  v_nome text := btrim(coalesce(p_nome,''));
  v_email text := nullif(btrim(coalesce(p_email,'')),'');
  v_tel text := nullif(btrim(coalesce(p_telefone,'')),'');
  v_msg text := nullif(btrim(coalesce(p_mensagem,'')),'');
  v_origem text := lower(btrim(coalesce(p_origem,'landing')));
begin
  -- validações mínimas
  if length(v_nome) < 2 then
    raise exception 'Informe um nome válido';
  end if;
  if v_email is null and v_tel is null then
    raise exception 'Informe e-mail ou telefone';
  end if;

  -- limites de tamanho (proteção contra payloads gigantes)
  v_nome := left(v_nome, 120);
  if v_email is not null then v_email := left(v_email, 160); end if;
  if v_tel   is not null then v_tel   := left(v_tel, 40);   end if;
  if v_msg   is not null then v_msg   := left(v_msg, 1000); end if;

  -- origem só pode ser um dos valores conhecidos
  if v_origem not in ('landing','api','manual','outro') then
    v_origem := 'outro';
  end if;

  insert into public.leads (nome, email, telefone, mensagem, origem, status)
  values (v_nome, v_email, v_tel, v_msg, v_origem, 'novo')
  returning id into novo;

  return novo;
end;
$$;

-- Permite chamada pública (formulário da landing) e autenticada.
grant execute on function public.captar_lead(text, text, text, text, text) to anon, authenticated;


-- 4) RPC DO DONO: atualizar status/notas de um lead (opcional; o update via
--    tabela já funciona pela policy, mas isto centraliza e carimba a data).
create or replace function public.lead_atualizar(
  p_id uuid,
  p_status text default null,
  p_notas text default null
)
returns void
language plpgsql
security definer
as $$
begin
  if not public.sou_dono() then
    raise exception 'Apenas o administrador do sistema pode alterar leads';
  end if;
  update public.leads
     set status = coalesce(nullif(btrim(p_status),''), status),
         notas  = coalesce(p_notas, notas),
         atualizado_em = now()
   where id = p_id;
end;
$$;
grant execute on function public.lead_atualizar(uuid, text, text) to authenticated;


-- =====================================================================
-- CONFERÊNCIA (opcional):
--   select id, nome, email, telefone, origem, status, criado_em
--   from public.leads order by criado_em desc;
--
--   -- simular uma captação pública:
--   select public.captar_lead('Fulano Teste','fulano@ex.com','11999999999','Quero uma demo','landing');
-- =====================================================================
