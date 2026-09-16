-- =====================================================================
-- schema-35.sql  —  PROSPECÇÃO: campos extras no lead + importação
-- ---------------------------------------------------------------------
-- Rode no Supabase (SQL Editor > New query > cole tudo > Run).
-- Pré-requisito: schema-34.sql (tabela leads) já rodado.
-- Seguro rodar mais de uma vez (idempotente).
--
-- O QUE FAZ:
--   1) Adiciona colunas à tabela leads: site, cidade, avaliacao, place_id.
--   2) place_id ganha índice ÚNICO parcial: o mesmo estabelecimento do Google
--      não entra duas vezes no CRM.
--   3) RPC importar_prospecto(): o DONO salva um resultado da busca como lead.
--      Se o place_id já existe, não duplica (retorna o id existente).
-- =====================================================================

-- 1) Colunas novas (todas opcionais)
alter table public.leads add column if not exists site text;
alter table public.leads add column if not exists cidade text;
alter table public.leads add column if not exists avaliacao numeric;
alter table public.leads add column if not exists place_id text;

-- 2) Impede duplicar o mesmo estabelecimento (quando place_id não é nulo)
create unique index if not exists uidx_leads_place_id
  on public.leads(place_id) where place_id is not null;

-- 3) RPC: importar um prospecto para o CRM (uso exclusivo do dono)
create or replace function public.importar_prospecto(
  p_nome text,
  p_telefone text default null,
  p_email text default null,
  p_site text default null,
  p_cidade text default null,
  p_endereco text default null,
  p_avaliacao numeric default null,
  p_place_id text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  novo uuid;
  v_nome text := left(btrim(coalesce(p_nome,'')), 120);
  v_msg text;
begin
  if not public.sou_dono() then
    raise exception 'Apenas o administrador do sistema pode importar prospectos';
  end if;
  if length(v_nome) < 2 then
    raise exception 'Prospecto sem nome válido';
  end if;

  -- se já existe pelo place_id, não duplica
  if p_place_id is not null and p_place_id <> '' then
    select id into novo from public.leads where place_id = p_place_id limit 1;
    if novo is not null then
      return novo;
    end if;
  end if;

  -- guarda o endereço na mensagem, para aparecer no card do CRM
  v_msg := nullif(btrim(coalesce(p_endereco,'')),'');

  insert into public.leads (nome, telefone, email, site, cidade, mensagem, avaliacao, place_id, origem, status)
  values (
    v_nome,
    nullif(btrim(coalesce(p_telefone,'')),''),
    nullif(btrim(coalesce(p_email,'')),''),
    nullif(btrim(coalesce(p_site,'')),''),
    nullif(btrim(coalesce(p_cidade,'')),''),
    v_msg,
    p_avaliacao,
    nullif(btrim(coalesce(p_place_id,'')),''),
    'prospeccao',
    'novo'
  )
  returning id into novo;

  return novo;
end;
$$;
grant execute on function public.importar_prospecto(text, text, text, text, text, text, numeric, text) to authenticated;

-- =====================================================================
-- Observação: 'prospeccao' é uma nova origem. O CRM já exibe qualquer
-- valor de origem, então não precisa de mais nada no banco.
-- =====================================================================
