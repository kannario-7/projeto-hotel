-- HospedaPrime — Gerenciamento de plano por hotel (rode DEPOIS dos schemas anteriores)
-- SQL Editor > New query > cole tudo > Run.

-- Data de expiração do plano/assinatura do hotel
alter table public.hoteis add column if not exists plano_expira date;

-- Atualiza a função de listagem para incluir plano_expira e contatos
create or replace function public.listar_hoteis_admin()
returns table(id uuid, nome text, cnpj text, telefone text, email text, plano text, status text, plano_expira date, criado_em timestamptz, qtd_usuarios bigint)
language sql stable security definer
as $$
  select h.id, h.nome, h.cnpj, h.telefone, h.email, h.plano, h.status, h.plano_expira, h.criado_em,
         (select count(*) from public.perfis p where p.hotel_id = h.id) as qtd_usuarios
  from public.hoteis h
  where public.sou_dono()
  order by h.criado_em desc
$$;
grant execute on function public.listar_hoteis_admin() to authenticated;
