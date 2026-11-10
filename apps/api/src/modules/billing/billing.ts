/**
 * Clube, cosmetics, Liga Pro and Clube gifts on Stripe-hosted Checkout (deploy/STRIPE-SETUP.md).
 * Webhooks are the source of truth: a purchase counts once Stripe says it is paid. Everything sold
 * is cosmetic (entitlement flags); nothing here touches scoring or play.
 */
import { randomInt } from 'node:crypto';
import {
  CATALOG,
  CLUBE_PERKS,
  ProductKey,
  type Cosmetic,
  type EntitlementsResponse,
} from '@decabeca/contracts';
import type Stripe from 'stripe';
import type { PrismaClient } from '../../generated/prisma/client';

export type BillingDeps = {
  stripe: Stripe;
  webhookSecret: string;
  /** Stripe Price id per product (STRIPE_PRICE_<KEY>); a missing one is not for sale. */
  prices: Partial<Record<ProductKey, string>>;
  /** Public origin of the web app: Checkout and the portal return here. */
  webOrigin: string;
};

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
type Db = PrismaClient | Tx;

/** Subscription statuses that keep the perks; past_due keeps them while Smart Retries run. */
export const LIVE = ['active', 'trialing', 'past_due'];

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const block = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
export const newGiftCode = () => `${block()}-${block()}-${block()}`;

export const addMonths = (d: Date, months: number) => {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + months);
  return x;
};

const isClube = (product: string) => CATALOG[product as ProductKey]?.kind === 'clube';

/** The account's Clube: its live subscription and the gift time it redeemed. */
export async function clubeStatus(prisma: Db, userId: string, now: Date) {
  const [subs, gifts] = await Promise.all([
    prisma.billingSubscription.findMany({
      where: { userId, status: { in: LIVE }, currentPeriodEnd: { gt: now } },
    }),
    prisma.giftCode.findMany({
      where: { redeemedBy: userId, revoked: false, endsAt: { gt: now } },
    }),
  ]);
  const sub = subs.filter((s) => isClube(s.product)).sort(byEnd)[0] ?? null;
  const giftEnd = gifts.reduce<Date | null>(
    (m, g) => (g.endsAt && (!m || g.endsAt > m) ? g.endsAt : m),
    null,
  );
  const ends = [sub?.currentPeriodEnd, giftEnd].filter((d): d is Date => !!d);
  const until = ends.length ? new Date(Math.max(...ends.map(Number))) : null;
  return { sub, until, active: until !== null };
}
const byEnd = (a: { currentPeriodEnd: Date }, b: { currentPeriodEnd: Date }) =>
  b.currentPeriodEnd.getTime() - a.currentPeriodEnd.getTime();

export async function entitlements(
  prisma: PrismaClient,
  userId: string,
  now: Date,
): Promise<EntitlementsResponse> {
  const [clube, purchases, bought, leagues] = await Promise.all([
    clubeStatus(prisma, userId, now),
    prisma.purchase.findMany({ where: { userId, status: { in: ['paid', 'processing'] } } }),
    prisma.giftCode.findMany({
      where: { purchase: { userId }, revoked: false },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.billingSubscription.findMany({
      where: {
        userId,
        product: 'liga_pro',
        status: { in: LIVE },
        currentPeriodEnd: { gt: now },
      },
    }),
  ]);
  const owned = new Set<Cosmetic>(clube.active ? CLUBE_PERKS : []);
  for (const p of purchases) {
    const grants = CATALOG[p.product as ProductKey]?.grants;
    if (p.status === 'paid' && grants) owned.add(grants);
  }
  const codes = await prisma.league.findMany({
    where: { id: { in: leagues.flatMap((l) => (l.leagueId ? [l.leagueId] : [])) } },
    select: { id: true, code: true },
  });
  return {
    clube: {
      active: clube.active,
      until: clube.until?.toISOString() ?? null,
      endsAtPeriodEnd: clube.sub?.cancelAtPeriodEnd ?? false,
      subscribed: clube.sub !== null,
    },
    cosmetics: [...owned],
    gifts: bought.map((g) => ({ code: g.code, months: g.months, redeemed: !!g.redeemedBy })),
    pending: purchases
      .filter((p) => p.status === 'processing')
      .map((p) => ProductKey.parse(p.product)),
    leaguesPro: leagues.flatMap((l) => {
      const code = codes.find((c) => c.id === l.leagueId)?.code;
      return code ? [{ code, until: l.currentPeriodEnd.toISOString() }] : [];
    }),
  };
}

/** Stripe objects carry ids or expanded objects; we only need the id. */
const idOf = (x: string | { id: string } | null | undefined) =>
  typeof x === 'string' ? x : (x?.id ?? null);

async function fulfil(tx: Tx, sessionId: string, now: Date) {
  const p = await tx.purchase.findUnique({ where: { checkoutSessionId: sessionId } });
  if (!p || p.status === 'paid') return;
  await tx.purchase.update({
    where: { checkoutSessionId: sessionId },
    data: { status: 'paid', paidAt: now },
  });
  const months = CATALOG[p.product as ProductKey]?.months;
  if (months)
    await tx.giftCode.create({ data: { code: newGiftCode(), purchaseId: sessionId, months } });
}

/** A refund or dispute takes back what the payment gave (cosmetic, or the gift code). */
async function revoke(tx: Tx, paymentIntentId: string | null) {
  if (!paymentIntentId) return;
  const p = await tx.purchase.findUnique({ where: { paymentIntentId } });
  if (!p) return;
  await tx.purchase.update({ where: { paymentIntentId }, data: { status: 'refunded' } });
  await tx.giftCode.updateMany({
    where: { purchaseId: p.checkoutSessionId },
    data: { revoked: true },
  });
}

async function syncSubscription(tx: Tx, sub: Stripe.Subscription, deps: BillingDeps) {
  const customer = await tx.billingCustomer.findUnique({
    where: { stripeCustomerId: idOf(sub.customer)! },
  });
  const item = sub.items.data[0];
  const product = (Object.keys(deps.prices) as ProductKey[]).find(
    (k) => deps.prices[k] === item?.price.id,
  );
  if (!customer || !item || !product) return; // not ours (another integration on the account)
  // ponytail: last delivery wins; Stripe can deliver updates out of order, so retrieve the
  // subscription here if stale states ever show up.
  const data = {
    userId: customer.userId,
    product,
    status: sub.status,
    currentPeriodEnd: new Date(item.current_period_end * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end || sub.cancel_at !== null,
    leagueId: product === 'liga_pro' ? (sub.metadata.leagueId ?? null) : null,
  };
  await tx.billingSubscription.upsert({
    where: { id: sub.id },
    create: { id: sub.id, ...data },
    update: data,
  });
}

/** Applies one verified Stripe event inside the caller's transaction. */
export async function handleEvent(tx: Tx, event: Stripe.Event, deps: BillingDeps, now: Date) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object;
      if (s.mode !== 'payment') return; // subscriptions arrive as customer.subscription.*
      await tx.purchase.updateMany({
        where: { checkoutSessionId: s.id, status: 'open' },
        data: { status: 'processing', paymentIntentId: idOf(s.payment_intent) },
      });
      if (s.payment_status === 'paid') await fulfil(tx, s.id, now); // card; Pix pays later
      return;
    }
    case 'checkout.session.async_payment_succeeded':
      return fulfil(tx, event.data.object.id, now);
    case 'checkout.session.async_payment_failed':
      await tx.purchase.updateMany({
        where: { checkoutSessionId: event.data.object.id, status: { not: 'paid' } },
        data: { status: 'failed' },
      });
      return;
    case 'checkout.session.expired':
      await tx.purchase.deleteMany({
        where: { checkoutSessionId: event.data.object.id, status: 'open' },
      });
      return;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return syncSubscription(tx, event.data.object, deps);
    case 'invoice.payment_failed': {
      // Smart Retries and Stripe's e-mails do the recovery; perks stay while past_due.
      const id = idOf(event.data.object.parent?.subscription_details?.subscription);
      if (id)
        await tx.billingSubscription.updateMany({
          where: { id, status: 'active' },
          data: { status: 'past_due' },
        });
      return;
    }
    case 'charge.refunded':
      if (event.data.object.refunded) await revoke(tx, idOf(event.data.object.payment_intent));
      return;
    case 'charge.dispute.created':
      return revoke(tx, idOf(event.data.object.payment_intent));
    default:
      return;
  }
}

/** Erasing an account: its renewals must stop at Stripe before the rows go. */
export async function cancelSubscriptions(
  prisma: PrismaClient,
  billing: BillingDeps | null,
  userId: string,
) {
  const subs = await prisma.billingSubscription.findMany({
    where: { userId, status: { notIn: ['canceled', 'incomplete_expired'] } },
  });
  if (subs.length && !billing) throw new Error('Stripe is not configured: cannot cancel renewals');
  for (const s of subs) await billing!.stripe.subscriptions.cancel(s.id);
}
