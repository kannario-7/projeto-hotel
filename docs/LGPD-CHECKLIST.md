# Checklist de LGPD — HospedaPrime

> Guia técnico para adequação à LGPD (Lei 13.709/2018). Isto **não é consultoria jurídica**.
> Para conformidade legal completa, consulte um advogado. Este documento cobre o que dá
> para preparar no sistema.

Legenda: [x] feito · [ ] pendente · [~] parcial

---

## 1. Segurança e acesso aos dados

- [x] **Isolamento multi-tenant** — cada hotel só acessa os próprios dados (RLS no banco).
- [x] **Controle de acesso por papel** — admin, operador, recepção; dono do SaaS separado.
- [x] **Senhas de login com hash** — gerenciado pelo Supabase Auth (bcrypt).
- [x] **Senha-mestra para ação destrutiva** — restauração de dados exige senha, validada server-side (hash bcrypt), nunca exposta no código.
- [x] **Só chave pública (anon) no front** — a chave secreta (service_role) nunca vai para o navegador.
- [x] **HTTPS** — tráfego criptografado (Vercel + Supabase).
- [ ] **Confirmação de e-mail** — hoje DESATIVADA. Recomendado reativar para produção (evita cadastro com e-mail de terceiros).
- [ ] **Política de senha forte** — hoje mínimo 6 caracteres. Avaliar exigir mais robustez.

## 2. Direitos do titular (hóspede)

A LGPD dá ao titular direitos sobre seus dados. No sistema:

- [~] **Acesso aos dados** — os dados do hóspede podem ser visualizados na tela de Hóspedes.
- [x] **Correção** — é possível editar os dados do hóspede.
- [~] **Exclusão / anonimização** — hoje o hóspede pode ser excluído, mas exclusão lógica mantém histórico. Avaliar: função de **anonimizar** (apagar nome/documento/contato preservando estatística) a pedido do titular.
- [ ] **Portabilidade** — exportar os dados de um hóspede (ex: PDF/CSV) a pedido dele.
- [ ] **Relatório de dados armazenados** — o que o sistema guarda sobre cada hóspede.

## 3. Consentimento e transparência

- [ ] **Política de Privacidade** — página com o que é coletado, finalidade, tempo de retenção, contato do responsável. (Texto jurídico — precisa de você/advogado.)
- [ ] **Termo de consentimento** — no cadastro do hóspede, registrar que ele consente com o tratamento dos dados (checkbox + data/hora).
- [ ] **Finalidade declarada** — deixar claro que os dados são usados só para a hospedagem.
- [ ] **Aviso de cookies** — se a landing page usar cookies/analytics.

## 4. Retenção e descarte

- [ ] **Política de retenção** — por quanto tempo guardar dados de hóspedes após a estadia.
- [ ] **Descarte seguro** — rotina para apagar/anonimizar dados antigos automaticamente.
- [x] **Exclusão pelo próprio hotel** — dono/admin pode apagar dados do hotel (com senha-mestra).

## 5. Governança e auditoria

- [ ] **Trilha de auditoria** — registrar quem acessou/alterou/excluiu dados sensíveis (log com usuário + data/hora).
- [ ] **Registro de operações de tratamento** — documento interno do que o sistema faz com dados pessoais.
- [ ] **Encarregado (DPO)** — indicar um responsável pelo tratamento de dados (contato na Política de Privacidade).
- [ ] **Plano de resposta a incidentes** — o que fazer em caso de vazamento (notificar ANPD e titulares).

## 6. Dados de terceiros / subprocessadores

- [x] **Supabase** (banco/auth) — subprocessador; dados hospedados na infraestrutura deles.
- [x] **Vercel** (hospedagem do site) — subprocessador.
- [x] **APIs públicas** (IBGE, ViaCEP, BrasilAPI) — consultadas para preencher endereço/CNPJ; não recebem dados pessoais do hóspede.
- [ ] **Listar subprocessadores na Política de Privacidade** — transparência sobre onde os dados ficam.

---

## Prioridades sugeridas (ordem)

1. **Reativar confirmação de e-mail** (rápido, aumenta segurança do cadastro).
2. **Termo de consentimento no cadastro do hóspede** (checkbox + registro).
3. **Anonimizar/exportar dados do hóspede** (direitos do titular).
4. **Página de Política de Privacidade** (texto — com apoio jurídico).
5. **Trilha de auditoria** (log de ações sensíveis).

> Itens marcados [x] já estão implementados no sistema. Os [ ] e [~] são as próximas frentes.
