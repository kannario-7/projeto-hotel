# HospedaPrime — Plano de Produto (SaaS para Hotéis)

Documento vivo. Atualizamos conforme decidimos e executamos.

---

## 1. Visão

Transformar o HospedaPrime (hoje uma demo client-side) em um **SaaS multi-hotel**:
uma aplicação hospedada uma vez, onde cada hotel tem sua conta isolada e paga uma
assinatura mensal. Acompanha um **site de vendas** (landing page) com demonstração,
guias e planos.

## 2. Situação atual (ponto de partida)

- App de página única (`index.html`), tema escuro moderno, navegação estilo app.
- Módulos: Painel, Reservas, Hóspedes, Quartos, Check-in/out, Financeiro, Serviços,
  Funcionários, Relatórios, Configurações.
- **Dados em `localStorage`** (por navegador) — não serve para produção multi-hotel.
- Publicado no Vercel: beta em `projeto-hotel-six.vercel.app`; desenvolvimento na branch `develop`.

## 3. Arquitetura alvo

```
[ Site de vendas (landing) ]  ->  [ Cadastro / Teste grátis ]
              |
              v
[ App HospedaPrime (SPA) ]  <-->  [ Supabase ]
                                   - Auth (login seguro)
                                   - Banco PostgreSQL
                                   - RLS (isolamento por hotel/tenant)
              |
              v
[ Cobrança recorrente ]  (Stripe ou Asaas/Mercado Pago no Brasil)
              |
              v
[ Painel do dono (admin) ]  - gerenciar hotéis, assinaturas, status
```

Decisão-base: **multi-tenant** (um sistema, dados separados por hotel via coluna
`hotel_id` + Row Level Security no Supabase). Mais barato de manter e atualizar.

## 4. Modelo de dados (rascunho inicial)

- **hoteis** (tenant): id, nome, cnpj, telefone, email, plano, status, criado_em
- **usuarios**: id, hotel_id, nome, email, papel (admin/recepcao/operador), auth_uid
- **tipos_quarto**: id, hotel_id, nome, capacidade, preco_diaria
- **quartos**: id, hotel_id, numero, andar, tipo_id, status
- **hospedes**: id, hotel_id, nome, documento, telefone, email
- **reservas**: id, hotel_id, hospede_id, quarto_id, checkin, checkout, total, status
- **servicos**: id, hotel_id, nome, preco
- **pagamentos**: id, hotel_id, reserva_id, valor, forma, data
- **assinaturas**: id, hotel_id, plano, status, provedor_id, vigencia

Toda tabela de dados do hotel tem `hotel_id` e política RLS: usuário só enxerga
linhas do seu próprio hotel.

## 5. Planos de preço (rascunho — a definir)

- **Teste grátis**: 14 dias, sem cartão.
- **Essencial**: recepção, reservas, hóspedes, quartos, check-in/out. (hotéis pequenos)
- **Profissional**: tudo do Essencial + financeiro, relatórios, multiusuário.
- Cobrança mensal por hotel; possível faixa por nº de quartos.

## 6. Site de vendas (landing page)

Objetivo: apresentar o produto e converter em teste grátis.
Seções previstas:
- Topo com proposta de valor + botão "Testar grátis" e "Ver demonstração".
- Prints/demonstração do sistema (tema escuro, mapa de quartos, mobile).
- Lista de funcionalidades (módulos).
- Planos e preços.
- Depoimentos / prova social (quando houver).
- Guias / FAQ / como começar.
- Rodapé com contato (WhatsApp (11) 99214-4143, kannariodev@gmail.com).

## 7. Guias / documentação de uso

- "Primeiros passos" (cadastrar hotel, quartos, primeira reserva).
- Guia por módulo (Reservas, Check-in, Financeiro...).
- FAQ (dados, segurança, cancelamento).
- Acessível pelo site e por um menu de Ajuda dentro do app.

## 8. Roadmap por etapas

**Etapa 1 — Fundação de dados (crítica)**
- Criar projeto no Supabase.
- Modelar tabelas + RLS (isolamento por hotel).
- Autenticação real (login/e-mail/senha).
- Migrar o app do `localStorage` para o Supabase, mantendo a interface atual.

**Etapa 2 — Onboarding de hotel**
- Fluxo de cadastro de novo hotel (cria tenant + primeiro admin).
- Seed inicial opcional (dados de exemplo por hotel).

**Etapa 3 — Site de vendas + guias**
- Landing page (nova, separada do app).
- Guias e FAQ.

**Etapa 4 — Cobrança**
- Integração de assinatura (teste grátis -> plano pago).
- Bloqueio/ativação por status de pagamento.

**Etapa 5 — Painel do dono (admin)**
- Gestão de hotéis, assinaturas e métricas.

## 9. Decisões em aberto

- Provedor de pagamento (Stripe internacional vs Asaas/Mercado Pago no Brasil).
- Domínio (ex: hospedaprime.com.br).
- Preço de cada plano.
- Landing separada do app ou no mesmo domínio (ex: site em `/`, app em `/app`).

## 10. Progresso

### Etapa 0 — Reorganização do código (CONCLUÍDA)
O app deixou de ser um único HTML monolítico. Agora está modularizado:
- `index.html` — apenas markup.
- `css/styles.css` — todos os estilos.
- `js/` — módulos ES6: `utils`, `store`, `ui`, `changelog`, `auth`, `nav`, `app`
  e `js/modules/*` (um por tela: dashboard, reservas, hospedes, quartos, checkin,
  checkout, financeiro, servicos, funcionarios, relatorios, config).
- A camada `store.js` (hoje localStorage) é o ponto único que será trocado por Supabase.

### Etapa 1 — Fundação de dados (CONCLUÍDA)
- Supabase configurado (`app/js/supabase.js`), schema criado (`supabase/schema.sql` + `schema-02.sql`).
- Autenticação real (e-mail/senha) e cadastro de hotel (onboarding do tenant).
- Persistência na nuvem com isolamento por hotel (RLS) — testado end-to-end.
- `store.js` agora usa cache em memória sincronizado com o Supabase.

### Etapa 3 — Site de vendas + guias (CONCLUÍDA — parcial)
- Landing page (`landing.html` + `landing.css`) com hero, recursos, planos e CTA.
- Página de guias/FAQ (`guias.html`).
- App movido para `/app`; rotas no `vercel.json` (`/` = landing, `/app` = sistema).

### Etapa 2 — Cobrança (PRÓXIMA)
Integração de assinatura (teste grátis -> plano pago). Provedor a definir
(Stripe internacional vs Asaas/Mercado Pago no Brasil).

### Etapa 5 — Painel do dono (admin) — futura
Gestão de hotéis, assinaturas e métricas.

### Multi-usuário por hotel — futura
Convidar recepcionistas/gerentes para a equipe do hotel.
