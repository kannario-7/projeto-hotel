# Prospecção de clientes — Google Places API

A aba **Prospecção** (no Painel do Dono) busca hotéis/pousadas por cidade,
mostra os contatos públicos (telefone, site, endereço, avaliação) e salva os
que você escolher no **CRM**, para você entrar em contato.

A busca usa a **Google Places API**. Para funcionar, é preciso uma **chave**
(API key) do Google Cloud, configurada no servidor (Vercel). Sem a chave, a
aba abre mas a busca avisa que não está configurada.

> Importante: coletamos apenas **dados comerciais públicos** dos negócios (o
> contato que o próprio estabelecimento divulga). É prospecção B2B legítima.
> Não fazemos raspagem de redes sociais nem envio de mensagens em massa.

## Passo 1 — Gerar a chave no Google Cloud

1. Acesse https://console.cloud.google.com/ e faça login.
2. Crie um projeto (ex.: "HospedaPrime Prospecção") ou use um existente.
3. Ative o faturamento do projeto (o Google exige cartão, mas há **cota grátis
   mensal**; dá para definir limite de gasto).
4. Em **APIs e serviços → Biblioteca**, ative a **Places API (New)**.
5. Em **APIs e serviços → Credenciais → Criar credenciais → Chave de API**.
6. Copie a chave gerada. Recomendado: em **Restrições da chave**, limite a
   "Places API (New)" para reduzir risco de uso indevido.

## Passo 2 — Configurar a chave na Vercel

1. Acesse o projeto na Vercel → **Settings → Environment Variables**.
2. Crie uma variável:
   - **Name:** `GOOGLE_PLACES_KEY`
   - **Value:** (cole a chave do Google)
   - **Environments:** Production (e Preview, se quiser)
3. Salve e faça um **redeploy** (a variável só passa a valer no próximo deploy).

## Passo 3 — Usar

1. Entre no app como dono → **Painel do Dono → Prospecção**.
2. Digite algo como `pousadas em Ubatuba` ou `hotéis em Campos do Jordão`.
3. Veja a lista. Clique em **Salvar** num resultado (ou **Salvar todos**) para
   levá-lo ao CRM. Estabelecimentos repetidos não são duplicados.
4. Vá em **Marketing / CRM** e contate pelos botões de WhatsApp/e-mail.

## Custos (resumo)

- O Google cobra por consulta de busca, mas oferece uma **cota grátis mensal**.
- Cada busca sua = 1 consulta de Text Search. Defina um **limite de orçamento**
  no Google Cloud (Billing → Budgets & alerts) para não haver surpresa.
- Consulte os valores atuais em: https://mapsplatform.google.com/pricing/

## Dependência do banco

Rode uma vez, no Supabase (SQL Editor), o arquivo `supabase/schema-35.sql`
(adiciona campos de prospecção ao lead e a função de importação). Sem ele, o
botão "Salvar no CRM" da prospecção falha.
