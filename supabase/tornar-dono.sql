-- HospedaPrime — Tornar o dono do SaaS
-- Rode DEPOIS de criar a conta com o e-mail abaixo no sistema (Cadastrar meu hotel).
-- SQL Editor > New query > cole > Run.

update public.perfis p
set is_owner = true
from auth.users u
where u.id = p.id and u.email = 'kannariodev@gmail.com';

-- Conferir (deve retornar 1 linha com is_owner = true):
select p.nome, u.email, p.is_owner
from public.perfis p join auth.users u on u.id = p.id
where u.email = 'kannariodev@gmail.com';
