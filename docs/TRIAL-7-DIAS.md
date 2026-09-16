# Teste grátis de 7 dias — como ativar e testar

Este guia explica como ligar o bloqueio automático do teste grátis (7 dias) e
como verificar que, ao vencer, o hotel realmente perde o acesso.

## Contexto (o que mudou)

Antes, o "teste grátis" era só um texto na landing. Um hotel novo nascia **sem
data de expiração**, e a regra de acesso tratava "sem data" como liberado para
sempre — ou seja, **nenhum trial bloqueava sozinho**.

Agora:

- No cadastro, o hotel nasce com `plano_expira = hoje + 7 dias`.
- A função `meu_hotel_liberado()` foi endurecida: um hotel em `trial` **sem
  data** ou **vencido** deixa de ter acesso.
- O app já bloqueia no login/abertura (mostra a tela "Acesso temporariamente
  bloqueado" com botão de WhatsApp). Isso está em `app/js/auth.js`
  (`hotelLiberado()` → `mostrarBloqueio()`).

> Observação: o **dono do sistema** (`is_owner`) nunca é bloqueado. O bloqueio
> vale para os hotéis clientes.

## Passo 1 — Rodar os SQLs (obrigatório, nesta ordem)

1. Abra o **Supabase** do projeto.
2. Vá em **SQL Editor → New query**.
3. Rode **primeiro** o `supabase/schema-32.sql` (cole todo o conteúdo → **Run**).
4. Em seguida, rode o `supabase/schema-33.sql` (cole todo o conteúdo → **Run**).

Ambos são seguros de rodar mais de uma vez.

- **schema-32.sql** — a regra do teste em si:
  - atualiza a função de cadastro (`criar_hotel_e_perfil`) para gravar
    `plano_expira = hoje + 7 dias`;
  - atualiza a regra de acesso (`meu_hotel_liberado`);
  - dá +7 dias aos hotéis que já estão em trial sem data (para não bloquear
    ninguém de surpresa).
- **schema-33.sql** — a blindagem no banco (RLS):
  - cria a função `meu_hotel_id_ok()` e faz as tabelas operacionais (quartos,
    reservas, hóspedes, serviços, consumos, pagamentos, tarifas, despesas,
    caixa, funcionários) só devolverem/aceitarem dados quando o hotel está
    liberado. Mantém o canal de **suporte** aberto para o cliente vencido
    conseguir falar com você e regularizar.

> Se rodar só o 32, o bloqueio funciona na tela de login. Rodando também o 33,
> o bloqueio passa a valer no próprio banco (à prova de contorno técnico).

Para mudar a duração no futuro, troque os `7` nos dois arquivos e rode de novo.

## Passo 2 — Testar que o bloqueio funciona

Você não precisa esperar 7 dias. Simule um trial vencido:

1. No **SQL Editor**, rode (troque pelo nome do seu hotel de teste):

   ```sql
   update public.hoteis
     set plano = 'trial', status = 'ativo', plano_expira = current_date - 1
   where nome = 'NOME DO HOTEL DE TESTE';
   ```

2. Faça **logout** e **login** de novo com um usuário **não-dono** desse hotel
   (ou recarregue o app já logado).
3. Resultado esperado: aparece a tela **"Acesso temporariamente bloqueado"** e o
   sistema **não carrega**.

Para liberar de novo (voltar a poder usar):

```sql
update public.hoteis
  set status = 'ativo', plano_expira = current_date + interval '7 days'
where nome = 'NOME DO HOTEL DE TESTE';
```

### Conferir dias restantes de qualquer hotel

```sql
select nome, plano, status, plano_expira,
       (plano_expira - current_date) as dias_restantes
from public.hoteis
order by plano_expira nulls last;
```

`dias_restantes` negativo = já vencido.

## Como funciona no dia a dia

- Do 5º dia em diante, o hotel vê um aviso no Painel ("Seu plano vence em X
  dias") com link para renovar no WhatsApp.
- Ao vencer, o acesso é bloqueado no próximo login/abertura.
- Quando o cliente paga, você registra o pagamento no **Painel do Dono** →
  isso estende o plano em +1 mês e reativa o acesso automaticamente.

## Camadas de bloqueio

Com os dois SQLs rodados, o bloqueio atua em duas camadas:

1. **Interface (schema-32 + app):** ao vencer, o login mostra a tela "Acesso
   temporariamente bloqueado" e o app não carrega.
2. **Banco / RLS (schema-33):** mesmo que alguém tente contornar a interface,
   as tabelas operacionais não devolvem nem aceitam dados enquanto o hotel
   estiver vencido/suspenso.

## Limites conhecidos

- O **canal de suporte** (chat com o dono) continua acessível ao cliente
  vencido de propósito, para ele conseguir regularizar. Isso é intencional.
- Na checagem de login, se houver falha de rede, o app **libera** o acesso da
  interface (evita travar o cliente por instabilidade). Mesmo nesse caso, a
  camada de banco (RLS) continua valendo, então dados operacionais seguem
  protegidos. É uma escolha conservadora; dá para inverter o comportamento da
  interface se preferir.
- O **dono** (`is_owner`) nunca é bloqueado por nenhuma das camadas.
