# Pagamentos com Stripe

O site vende Clube (assinatura), cosméticos avulsos, Liga Pro e presentes de Clube pelo Checkout
hospedado da Stripe. Tudo é só visual; nada muda pontuação ou jogo. A página `/clube` fica fechada
até `clube` entrar em `LAUNCHED_PAGES` (`apps/web/src/lib/launch.ts`).

## 1. Chaves (modo de teste primeiro)

1. Dashboard da Stripe → **Desenvolvedores → Chaves de API**, com o seletor em **Modo de teste**
   (ou na sandbox `acct_1UZcSYD3FzwzVFN9`).
2. Crie uma **chave restrita** (`rk_test_...`) com escrita em: Checkout Sessions, Customers,
   Customer portal, Subscriptions; leitura em Prices e Products. Uma `sk_test_` também funciona.
3. Em `.env.prod` no servidor: `STRIPE_SECRET_KEY=rk_test_...`. Nunca no git.
   A API recusa uma chave `_live_` fora de `NODE_ENV=production`.

## 2. Produtos e preços

Já criados na sandbox (BRL). Os ids vão em `STRIPE_PRICE_<CHAVE>` (o `.env.example` tem os de teste):

| Chave                    | Produto                           | Preço          | Price (teste)                    |
| ------------------------ | --------------------------------- | -------------- | -------------------------------- |
| `clube_mensal`           | `decabeca_clube`                  | R$ 9,90/mês    | `price_1UaL3AD3FzwzVFN9Aa7jbJ4z` |
| `clube_anual`            | `decabeca_clube`                  | R$ 79,90/ano   | `price_1UaL3ID3FzwzVFN92soqE4eo` |
| `liga_pro`               | `decabeca_liga_pro`               | R$ 14,90/mês   | `price_1UaL3BD3FzwzVFN9HtyDtELb` |
| `presente_1m`            | `decabeca_presente_clube`         | R$ 9,90 único  | `price_1UaL3CD3FzwzVFN9FT6aSQpX` |
| `presente_3m`            | `decabeca_presente_clube`         | R$ 29,70 único | `price_1UaL3JD3FzwzVFN9nskSabgt` |
| `presente_12m`           | `decabeca_presente_clube`         | R$ 79,90 único | `price_1UaL3JD3FzwzVFN9zuk6eSdS` |
| `acabamento_holografico` | `decabeca_acabamento_holografico` | R$ 4,90 único  | `price_1UaL3ZD3FzwzVFN9O9qpPDw0` |
| `acabamento_cromado`     | `decabeca_acabamento_cromado`     | R$ 4,90 único  | `price_1UaL3ZD3FzwzVFN9bAbxu92d` |
| `passaporte_retro`       | `decabeca_passaporte_retro`       | R$ 6,90 único  | `price_1UaL3aD3FzwzVFN92RCjhYeT` |
| `passaporte_selecao`     | `decabeca_passaporte_selecao`     | R$ 6,90 único  | `price_1UaL3aD3FzwzVFN9GOTCRDWq` |
| `torcida_charanga`       | `decabeca_torcida_charanga`       | R$ 2,90 único  | `price_1UaL3bD3FzwzVFN9HAeF9hks` |
| `torcida_geral`          | `decabeca_torcida_geral`          | R$ 2,90 único  | `price_1UaL3cD3FzwzVFN93LlbXqUw` |
| `apoio_mensal`           | `prod_VbYhNgJIapZTkY` (Apoio)     | R$ 10,00/mês   | `price_1UaLaUD3FzwzVFN9YWzL05Gd` |

Os valores mostrados no site estão em `packages/contracts/src/billing.ts` (`CATALOG`); se mudar um
preço na Stripe, mude lá também. Uma chave sem `STRIPE_PRICE_` fica fora de venda.

`apoio_avulso` (/apoie) não tem Price: o valor que a pessoa escolhe (R$ 5 a R$ 1.000) vai como
`price_data` no Checkout, com o botão "Doar". Quem recebe o apoio está em `APOIO_RECIPIENT`
(`packages/contracts/src/billing.ts`); mude ali se o apoio passar para um CNPJ. A página abre com
a chave `apoie` em `apps/web/src/lib/launch.ts`.

## 3. Webhook (obrigatório)

Dashboard → **Desenvolvedores → Webhooks → Adicionar destino**:

- URL: `https://decabecafc.com.br/v1/billing/webhook`
- Versão da API: a do SDK (`2026-07-29.dahlia`, stripe-node 22.5).
- Eventos:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `checkout.session.expired`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `charge.refunded`
  - `charge.dispute.created`

Copie o **segredo de assinatura** (`whsec_...`) para `STRIPE_WEBHOOK_SECRET` e reinicie a API
(`docker compose up -d api`). Sem as duas variáveis, os pagamentos ficam desligados (503).

Teste local: `stripe listen --forward-to 127.0.0.1:3000/v1/billing/webhook` e use o `whsec_` que
ele imprime; `stripe trigger checkout.session.completed` dispara um evento.

## 4. Pix e métodos de pagamento

Dashboard → **Configurações → Pagamentos → Métodos de pagamento**: ative **Pix** e **Link**
(cartão já vem ligado). O código não fixa métodos: a Stripe mostra os que valem para cada compra.
Pix aparece só nas compras únicas (cosméticos e presentes); assinaturas são no cartão.
Pix exige conta Stripe brasileira; confira se a conta está habilitada.

## 5. Portal do cliente

Dashboard → **Configurações → Billing → Portal do cliente**:

- Ative: atualizar forma de pagamento, ver faturas, **cancelar assinatura → no fim do período**.
- Desative troca de plano/quantidade (não oferecemos).
- Links: termos e privacidade do site (`/termos`, `/privacidade`).

O botão "Gerenciar assinatura" em `/clube` abre esse portal.

## 6. Recuperação de pagamento

Dashboard → **Configurações → Billing → Assinaturas e e-mails**:

- **Smart Retries** ligado (padrão: 8 tentativas em 2 semanas), depois **cancelar a assinatura**.
- E-mails automáticos: pagamento falhou, cartão vencendo, recibos.
  Enquanto as tentativas correm (`past_due`), o sócio mantém os itens.

## 7. Impostos

Não cobramos imposto pela Stripe Tax. Deixe o **monitoramento de limites** (Tax → Registros)
ligado para avisar se alguma obrigação aparecer. A nota fiscal de serviço continua sendo do seu
contador/emissor.

## 8. Dados pessoais (LGPD)

`/me/export` inclui cliente Stripe, assinaturas, compras e presentes. Ao excluir a conta, as
renovações são canceladas na Stripe e os registros locais de cliente/assinatura somem; as vendas
ficam como registro fiscal sem a conta (`userId = deleted`). A Stripe guarda a própria cópia do
cliente e dos pagamentos, como processadora; cite isso na `/privacidade` antes de abrir a loja.

## 9. Lista para entrar em produção

1. Teste ponta a ponta no modo de teste: assinar (cartão `4242 4242 4242 4242`), cancelar no
   portal, comprar cosmético com Pix, comprar e resgatar presente (`/presente/CODIGO`).
2. Ative a conta (dados da empresa e conta bancária) e confira Pix habilitado em produção.
3. Copie os produtos para o modo de produção (Produtos → "Copiar para o modo de produção") e anote
   os novos `price_` ids.
4. Crie o webhook de produção (mesma URL e eventos) e pegue o novo `whsec_`.
5. Crie a chave restrita de produção (`rk_live_...`).
6. Em `.env.prod`: chave, segredo e os 12 `STRIPE_PRICE_` de produção. Reinicie a API.
7. Configure o portal e os e-mails também no modo de produção (são separados do teste).
8. Atualize `/termos` e `/privacidade` (assinatura, renovação automática, cancelamento, reembolso).
9. Abra a página: adicione `'clube'` em `LAUNCHED_PAGES` e publique o web.
10. Faça uma compra real pequena e reembolse pelo Dashboard; confira que o item some.
