-- =====================================================================
-- schema-32.sql  —  TESTE GRÁTIS DE 7 DIAS COM BLOQUEIO AUTOMÁTICO
-- ---------------------------------------------------------------------
-- Rode no Supabase (SQL Editor > New query > cole tudo > Run).
-- Seguro rodar mais de uma vez (idempotente).
--
-- O QUE ESTE SCRIPT FAZ:
--  1) Ao cadastrar um hotel novo, grava plano_expira = hoje + 7 dias.
--     (antes o trial nascia SEM data e por isso nunca bloqueava).
--  2) Endurece meu_hotel_liberado(): um hotel em 'trial' sem data ou com
--     data vencida deixa de ter acesso. Planos pagos sem data continuam
--     liberados (você controla manualmente no Painel do Dono).
--  3) Backfill: hotéis que já estão em 'trial' e sem data ganham +7 dias
--     a partir de hoje, para não serem bloqueados de imediato.
--
-- CONSTANTE: para mudar a duração do teste, troque os dois "7" abaixo.
-- =====================================================================


-- 1) ONBOARDING: cria hotel + perfil admin e JÁ define o fim do teste.
--    Mantém a mesma assinatura (2 parâmetros), então o app não muda.
create or replace function public.criar_hotel_e_perfil(p_hotel_nome text, p_admin_nome text)
returns uuid
language plpgsql
security definer
as $$
declare novo_hotel uuid;
begin
  -- só permite se o usuário logado ainda não tem perfil (evita duplicar)
  if exists (select 1 from public.perfis where id = auth.uid()) then
    raise exception 'Usuario ja possui hotel';
  end if;

  -- plano 'trial', ativo, expirando em 7 dias a partir de hoje
  insert into public.hoteis (nome, plano, status, plano_expira)
  values (p_hotel_nome, 'trial', 'ativo', current_date + interval '7 days')
  returning id into novo_hotel;

  insert into public.perfis (id, hotel_id, nome, papel, ativo)
  values (auth.uid(), novo_hotel, p_admin_nome, 'admin', true);

  return novo_hotel;
end;
$$;

grant execute on function public.criar_hotel_e_perfil(text, text) to authenticated;


-- 2) BLOQUEIO AUTOMÁTICO endurecido.
--    Regras de acesso liberado:
--      - status precisa ser 'ativo'; E
--      - se o plano é 'trial': precisa ter plano_expira E não estar vencido
--        (trial sem data NÃO é mais liberado — evita brecha do NULL);
--      - se o plano é pago (essencial/profissional/etc.): liberado quando
--        não há data OU a data ainda não venceu (mantém controle manual).
create or replace function public.meu_hotel_liberado()
returns boolean language sql stable security definer as $$
  select coalesce((
    select
      (h.status = 'ativo')
      and (
        case
          when h.plano = 'trial'
            then (h.plano_expira is not null and h.plano_expira >= current_date)
          else (h.plano_expira is null or h.plano_expira >= current_date)
        end
      )
    from public.hoteis h
    where h.id = public.meu_hotel_id()
  ), true)
$$;

grant execute on function public.meu_hotel_liberado() to authenticated;


-- 3) BACKFILL: hotéis em trial que ainda estão sem data de expiração
--    recebem 7 dias a partir de hoje (evita bloqueá-los de surpresa).
--    Se preferir aplicar o vencimento de imediato a testes antigos,
--    comente este bloco.
update public.hoteis
set plano_expira = current_date + interval '7 days'
where plano = 'trial'
  and status = 'ativo'
  and plano_expira is null;


-- =====================================================================
-- VERIFICAÇÃO RÁPIDA (opcional) — rode separadamente se quiser conferir:
--
--   -- ver planos/vencimentos atuais:
--   select nome, plano, status, plano_expira,
--          (plano_expira - current_date) as dias_restantes
--   from public.hoteis order by plano_expira nulls last;
--
--   -- simular um trial JÁ vencido para testar o bloqueio no login
--   -- (troque 'NOME DO HOTEL' pelo hotel de teste):
--   -- update public.hoteis
--   --   set plano='trial', status='ativo', plano_expira = current_date - 1
--   -- where nome = 'NOME DO HOTEL';
-- =====================================================================
