import {
  APOIO_NOTE,
  CATALOG,
  CheckoutRequest,
  EntitlementsResponse,
  EquipRequest,
  MAX_STICKER_FINISHES,
  type Cosmetic,
  RedeemRequest,
  RedirectResponse,
} from '@decabeca/contracts';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type Stripe from 'stripe';
import { AppError } from '../../errors';
import { myPks } from '../leagues/leagues';
import {
  LIVE,
  addMonths,
  clubeStatus,
  entitlements,
  handleEvent,
  guestApoio,
  supportOf,
  type BillingDeps,
} from './billing';

/** Tags these sessions in the Dashboard (Checkout → integration identifier). */
const INTEGRATION_ID = 'decabeca-checkout-qmrtzvkh';
/** Stripe wants a trial end at least 48 h ahead. */
const MIN_TRIAL_MS = 49 * 3600_000;
/** Accounts only: guests are asked to sign in first (the web sends them to /entrar). */
function accountOf(req: { userId: string | null }) {
  if (!req.userId) throw new AppError(401, 'UNAUTHORIZED', 'Entre na sua conta para continuar.');
  return req.userId;
}

/** Checkout, portal, gift redeem and entitlements; registered with the public (session) routes. */
export const billingRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now } = app.deps;

  function billing(): BillingDeps {
    if (!app.deps.billing)
      throw new AppError(503, 'BILLING_UNAVAILABLE', 'Pagamentos indisponíveis no momento.');
    return app.deps.billing;
  }

  async function customerFor(b: BillingDeps, userId: string) {
    const known = await prisma.billingCustomer.findUnique({ where: { userId } });
    if (known) return known.stripeCustomerId;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    // Same key for 24 h: two checkouts opened at once share one Stripe customer.
    const c = await b.stripe.customers.create(
      { email: user.email, name: user.nickname, metadata: { userId } },
      { idempotencyKey: `customer-${userId}` },
    );
    await prisma.billingCustomer.upsert({
      where: { userId },
      create: { userId, stripeCustomerId: c.id },
      update: {},
    });
    return c.id;
  }

  app.get('/me/entitlements', { schema: { response: { 200: EntitlementsResponse } } }, (req) =>
    entitlements(prisma, accountOf(req), now()),
  );

  /** Wears or takes off owned items; anything not owned (now) is refused, guests are asked to sign in. */
  app.patch(
    '/me/cosmetics',
    { schema: { body: EquipRequest, response: { 200: EntitlementsResponse } } },
    async (req) => {
      const userId = accountOf(req);
      const t = now();
      const owned = new Set<string>((await entitlements(prisma, userId, t)).cosmetics);
      const { stickers: patch, ...worn } = req.body;
      const wanted = [...Object.values(worn), ...Object.values(patch ?? {})];
      if (wanted.some((v) => v && v !== 'none' && !owned.has(v as Cosmetic)))
        throw new AppError(403, 'FORBIDDEN', 'Este item não é seu. Veja a Banca no Clube.');
      const saved = await prisma.cosmeticChoice.findUnique({ where: { userId } });
      const stickers = { ...((saved?.stickers ?? {}) as Record<string, string>) };
      for (const [playerId, f] of Object.entries(patch ?? {}))
        if (f) stickers[playerId] = f;
        else delete stickers[playerId];
      if (Object.keys(stickers).length > MAX_STICKER_FINISHES)
        throw new AppError(400, 'VALIDATION_ERROR', 'Figurinhas demais com acabamento próprio.');
      const data = {
        ...(Object.fromEntries(Object.entries(worn).filter(([, v]) => v !== undefined)) as {
          [K in keyof typeof worn]?: string | null;
        }),
        stickers,
      };
      await prisma.cosmeticChoice.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      });
      return entitlements(prisma, userId, t);
    },
  );

  app.post(
    '/billing/checkout',
    { schema: { body: CheckoutRequest, response: { 200: RedirectResponse } } },
    async (req) => {
      const product = CATALOG[req.body.product];
      // Apoie is open to guests: Checkout asks for the e-mail; only the thank-you needs an account.
      if (product.kind === 'apoio')
        return {
          url: await donate(
            req.userId,
            req.sessionId,
            product.interval ? undefined : (req.body.amount ?? 0),
          ),
        };
      const userId = accountOf(req);
      const b = billing();
      const price = b.prices[product.key];
      if (!price)
        throw new AppError(503, 'BILLING_UNAVAILABLE', 'Este item não está à venda agora.');
      const t = now();
      const subscription_data: Stripe.Checkout.SessionCreateParams.SubscriptionData = {};

      if (product.kind === 'clube') {
        const clube = await clubeStatus(prisma, userId, t);
        if (clube.sub)
          throw new AppError(
            409,
            'ALREADY_SUBSCRIBED',
            'Você já é do Clube. Gerencie a assinatura.',
          );
        // Gift time already redeemed: the first charge waits for it to end.
        if (clube.until && clube.until.getTime() - t.getTime() > MIN_TRIAL_MS)
          subscription_data.trial_end = Math.floor(clube.until.getTime() / 1000);
      }
      if (product.kind === 'liga_pro') {
        const code = req.body.leagueCode?.toUpperCase();
        const league = code ? await prisma.league.findUnique({ where: { code } }) : null;
        if (!league) throw new AppError(404, 'NOT_FOUND', 'Liga não encontrada.');
        if (!(await myPks(prisma, req)).includes(league.createdBy))
          throw new AppError(403, 'FORBIDDEN', 'Só quem criou a liga pode torná-la Pro.');
        const live = await prisma.billingSubscription.count({
          where: { leagueId: league.id, status: { in: LIVE }, currentPeriodEnd: { gt: t } },
        });
        if (live) throw new AppError(409, 'ALREADY_SUBSCRIBED', 'Esta liga já é Pro.');
        subscription_data.metadata = { leagueId: league.id };
      }

      const back = `${b.webOrigin}/clube`;
      const session = await b.stripe.checkout.sessions.create({
        mode: product.interval ? 'subscription' : 'payment',
        customer: await customerFor(b, userId),
        client_reference_id: userId,
        line_items: [{ price, quantity: 1 }],
        locale: 'pt-BR',
        integration_identifier: INTEGRATION_ID,
        success_url: `${back}?checkout=ok&item=${product.key}`,
        cancel_url: `${back}?checkout=cancelado`,
        ...(product.interval ? { subscription_data } : {}),
      });
      if (!product.interval)
        await prisma.purchase.create({
          data: {
            checkoutSessionId: session.id,
            userId,
            product: product.key,
            amount: product.amount,
          },
        });
      return { url: session.url! };
    },
  );

  /**
   * Apoie: a one-time amount the donor picks (price_data; card or Pix) or, with no amount, the
   * monthly price (accounts only). A guest gives as themselves (Checkout collects the e-mail); the
   * payment is kept under their device session and joins the account if they sign up later.
   */
  async function donate(userId: string | null, sessionId: string, amount: number | undefined) {
    const b = billing();
    const monthly = amount === undefined;
    if (!monthly && !amount)
      throw new AppError(400, 'VALIDATION_ERROR', 'Escolha um valor a partir de R$ 5.');
    // Monthly needs an account: it is where the apoio is managed and cancelled.
    if (monthly && !userId)
      throw new AppError(401, 'UNAUTHORIZED', 'Entre na sua conta para apoiar todo mês.');
    const price = b.prices.apoio_mensal;
    if (monthly && !price)
      throw new AppError(503, 'BILLING_UNAVAILABLE', 'O apoio mensal não está disponível agora.');
    if (monthly && userId && (await supportOf(prisma, userId, now())).supportsMonthly)
      throw new AppError(409, 'ALREADY_SUBSCRIBED', 'Você já apoia todo mês. Valeu!');
    const back = `${b.webOrigin}/apoie`;
    const session = await b.stripe.checkout.sessions.create({
      ...(userId ? { customer: await customerFor(b, userId), client_reference_id: userId } : {}),
      mode: monthly ? 'subscription' : 'payment',
      line_items: [
        monthly
          ? { price: price!, quantity: 1 }
          : {
              quantity: 1,
              price_data: {
                currency: 'brl',
                unit_amount: amount,
                product_data: { name: 'Apoio ao De Cabeça F.C.' },
              },
            },
      ],
      ...(monthly ? {} : { submit_type: 'donate' as const }),
      custom_text: { submit: { message: APOIO_NOTE } },
      locale: 'pt-BR',
      integration_identifier: INTEGRATION_ID,
      success_url: `${back}?apoio=ok`,
      cancel_url: `${back}?apoio=cancelado`,
    });
    if (!monthly)
      await prisma.purchase.create({
        data: {
          checkoutSessionId: session.id,
          // a guest's payment waits under its device session; sign-up moves it (account `link`)
          userId: userId ?? guestApoio(sessionId),
          product: 'apoio_avulso',
          amount,
        },
      });
    return session.url!;
  }

  /** Stripe's Customer Portal: change card, cancel at period end, invoices. */
  app.post(
    '/billing/portal',
    {
      schema: {
        querystring: z.object({ volta: z.enum(['clube', 'apoie']).default('clube') }),
        response: { 200: RedirectResponse },
      },
    },
    async (req) => {
      const userId = accountOf(req);
      const b = billing();
      const customer = await prisma.billingCustomer.findUnique({ where: { userId } });
      if (!customer) throw new AppError(404, 'NOT_FOUND', 'Nenhuma assinatura nesta conta.');
      const s = await b.stripe.billingPortal.sessions.create({
        customer: customer.stripeCustomerId,
        return_url: `${b.webOrigin}/${req.query.volta}`,
        locale: 'pt-BR',
      });
      return { url: s.url };
    },
  );

  /**
   * Redeems a Clube gift: the months start when the current Clube time ends. With a renewing
   * subscription, its next charge moves by the same months (trial_end), so nobody pays twice.
   */
  app.post(
    '/billing/gift/redeem',
    { schema: { body: RedeemRequest, response: { 200: EntitlementsResponse } } },
    async (req) => {
      const userId = accountOf(req);
      const t = now();
      const gift = await prisma.giftCode.findUnique({
        where: { code: req.body.code },
        include: { purchase: true },
      });
      if (!gift || gift.revoked || gift.purchase.status !== 'paid')
        throw new AppError(404, 'GIFT_INVALID', 'Código de presente inválido.');
      if (gift.redeemedBy) throw new AppError(409, 'GIFT_USED', 'Este presente já foi usado.');

      const clube = await clubeStatus(prisma, userId, t);
      const startsAt = clube.until && clube.until > t ? clube.until : t;
      const endsAt = addMonths(startsAt, gift.months);
      // Claimed first (one winner if two redeem at once), released if Stripe refuses the change.
      const claimed = await prisma.giftCode.updateMany({
        where: { code: gift.code, redeemedBy: null },
        data: { redeemedBy: userId, redeemedAt: t, startsAt, endsAt },
      });
      if (!claimed.count) throw new AppError(409, 'GIFT_USED', 'Este presente já foi usado.');
      const renewing = clube.sub && !clube.sub.cancelAtPeriodEnd ? clube.sub : null;
      if (renewing)
        try {
          await billing().stripe.subscriptions.update(renewing.id, {
            trial_end: Math.floor(endsAt.getTime() / 1000),
            proration_behavior: 'none',
          });
        } catch (e) {
          await prisma.giftCode.update({
            where: { code: gift.code },
            data: { redeemedBy: null, redeemedAt: null, startsAt: null, endsAt: null },
          });
          throw e;
        }
      return entitlements(prisma, userId, t);
    },
  );
};

/**
 * POST /v1/billing/webhook: outside the session routes (Stripe has no cookie). The raw body is
 * verified with STRIPE_WEBHOOK_SECRET; each event id is handled once, in one transaction with its
 * effects, so a failed handler is retried by Stripe and a repeated delivery is a no-op.
 */
export const billingWebhook: FastifyPluginAsync = async (app) => {
  const { prisma, now } = app.deps;
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) =>
    done(null, body),
  );
  app.post('/billing/webhook', async (req, reply) => {
    const b = app.deps.billing;
    if (!b) return reply.code(503).send();
    let event: Stripe.Event;
    try {
      event = b.stripe.webhooks.constructEvent(
        req.body as Buffer,
        String(req.headers['stripe-signature'] ?? ''),
        b.webhookSecret,
      );
    } catch {
      throw new AppError(400, 'VALIDATION_ERROR', 'Assinatura do webhook inválida.');
    }
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.stripeEvent.createMany({
        data: [{ id: event.id, type: event.type }],
        skipDuplicates: true,
      });
      if (fresh.count) await handleEvent(tx, event, b, now());
    });
    return { received: true };
  });
};
