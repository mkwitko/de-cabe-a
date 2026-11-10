import { randomUUID } from 'node:crypto';
import { APOIO_NOTE } from '@decabeca/contracts';
import Stripe from 'stripe';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { testApp, WEB_ORIGIN } from '../../test/app';
import { resetDb, testPrisma } from '../../test/db';
import type { BillingDeps } from './billing';

const NOW = new Date('2026-11-10T12:00:00Z');
const SECRET = 'whsec_test_secret';
const PRICES = {
  clube_mensal: 'price_clube_m',
  clube_anual: 'price_clube_a',
  liga_pro: 'price_liga',
  presente_3m: 'price_gift3',
  acabamento_holografico: 'price_holo',
  apoio_mensal: 'price_apoio_m',
};

// Mocked Stripe client; signatures are real (the SDK's own webhook helpers, no network).
const real = new Stripe('sk_test_not_used');
let n = 0;
const stripe = {
  customers: { create: vi.fn(async () => ({ id: `cus_${++n}` })) },
  checkout: {
    sessions: {
      create: vi.fn(async (_p: Stripe.Checkout.SessionCreateParams) => {
        const id = `cs_${++n}`;
        return { id, url: `https://checkout.stripe.test/${id}` };
      }),
    },
  },
  billingPortal: {
    sessions: { create: vi.fn(async () => ({ url: 'https://billing.stripe.test/p' })) },
  },
  subscriptions: { update: vi.fn(async () => ({})), cancel: vi.fn(async () => ({})) },
  webhooks: real.webhooks,
};
const billing: BillingDeps = {
  stripe: stripe as unknown as Stripe,
  webhookSecret: SECRET,
  prices: PRICES,
  webOrigin: WEB_ORIGIN,
};

const prisma = testPrisma();
const { app } = testApp({
  prisma,
  now: () => NOW,
  billing,
  limits: { sessionsPerIp: 10_000, perSession: 10_000, search: 10_000, actions: 10_000 },
});

function device(ip?: string) {
  const jar = new Map<string, string>();
  const req = async (
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    payload?: object,
  ) => {
    const res = await app.inject({
      method,
      url: `/v1${url}`,
      // its own address: the auth routes allow ten calls a minute per IP
      ...(ip ? { remoteAddress: ip } : {}),
      headers: {
        origin: WEB_ORIGIN,
        ...(jar.size ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
      },
      ...(payload ? { payload } : {}),
    });
    for (const c of [res.headers['set-cookie'] ?? []].flat()) {
      const [kv] = String(c).split(';');
      const [k, ...v] = kv!.split('=');
      if (/Max-Age=0/i.test(String(c))) jar.delete(k!);
      else jar.set(k!, v.join('='));
    }
    return res;
  };
  return { req };
}

async function account(name: string) {
  const d = device();
  const email = `${randomUUID()}@example.com`;
  const res = await d.req('POST', '/auth/sign-up/email', { email, password: 'segredo-123', name });
  expect(res.statusCode, res.body).toBe(200);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { ...d, userId: user.id };
}

/** A signed Stripe event delivered to the webhook. */
async function deliver(type: string, object: object, id = `evt_${randomUUID()}`, secret = SECRET) {
  const payload = JSON.stringify({ id, object: 'event', type, data: { object } });
  return app.inject({
    method: 'POST',
    url: '/v1/billing/webhook',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': real.webhooks.generateTestHeaderString({ payload, secret }),
    },
    payload,
  });
}

const sub = (id: string, customer: string, price: string, extra: object = {}) => ({
  id,
  object: 'subscription',
  customer,
  status: 'active',
  cancel_at_period_end: false,
  cancel_at: null,
  metadata: {},
  items: {
    data: [
      { price: { id: price }, current_period_end: Math.floor(NOW.getTime() / 1000) + 30 * 86400 },
    ],
  },
  ...extra,
});

async function checkout(d: { req: ReturnType<typeof device>['req'] }, body: object) {
  const res = await d.req('POST', '/billing/checkout', body);
  const created = await stripe.checkout.sessions.create.mock.results.at(-1)?.value;
  return { res, sessionId: (created as { id: string } | undefined)?.id ?? '' };
}

const ents = async (d: { req: ReturnType<typeof device>['req'] }) =>
  (await d.req('GET', '/me/entitlements')).json();

beforeAll(() => resetDb(prisma));
beforeEach(() => vi.clearAllMocks());
afterAll(() => app.close());

describe('billing', () => {
  it('asks guests to sign in first', async () => {
    const res = await device().req('POST', '/billing/checkout', { product: 'clube_mensal' });
    expect(res.statusCode).toBe(401);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('subscribes to the Clube through Checkout and the webhook', async () => {
    const ana = await account('Ana');
    const { res } = await checkout(ana, { product: 'clube_mensal' });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json().url).toMatch(/^https:\/\/checkout\.stripe\.test\//);
    const params = stripe.checkout.sessions.create.mock.calls[0]![0];
    expect(params).toMatchObject({
      mode: 'subscription',
      client_reference_id: ana.userId,
      line_items: [{ price: 'price_clube_m', quantity: 1 }],
    });
    expect(params).not.toHaveProperty('payment_method_types');
    const { stripeCustomerId } = await prisma.billingCustomer.findUniqueOrThrow({
      where: { userId: ana.userId },
    });
    expect((await ents(ana)).clube.active).toBe(false); // nothing until Stripe confirms

    const s = sub('sub_ana', stripeCustomerId, 'price_clube_m');
    const evt = `evt_${randomUUID()}`;
    expect((await deliver('customer.subscription.created', s, evt)).statusCode).toBe(200);
    // A repeated delivery is a no-op.
    expect((await deliver('customer.subscription.created', s, evt)).statusCode).toBe(200);
    expect(await prisma.stripeEvent.count({ where: { id: evt } })).toBe(1);

    const e = await ents(ana);
    expect(e.clube).toMatchObject({ active: true, subscribed: true, endsAtPeriodEnd: false });
    expect(e.cosmetics).toEqual(expect.arrayContaining(['selo_socio', 'acabamento_clube']));
    expect((await checkout(ana, { product: 'clube_anual' })).res.statusCode).toBe(409);
    expect((await ana.req('POST', '/billing/portal')).json().url).toContain('billing.stripe.test');

    // Cancelled in the portal: perks until the period ends, then gone.
    await deliver('customer.subscription.updated', { ...s, cancel_at_period_end: true });
    expect((await ents(ana)).clube.endsAtPeriodEnd).toBe(true);
    await deliver('invoice.payment_failed', {
      parent: { subscription_details: { subscription: 'sub_ana' } },
    });
    expect((await ents(ana)).clube.active).toBe(true); // past_due keeps perks during retries
    await deliver('customer.subscription.deleted', { ...s, status: 'canceled' });
    expect((await ents(ana)).clube).toMatchObject({ active: false, subscribed: false });
    expect((await ents(ana)).cosmetics).toEqual([]);
  });

  it('rejects an unsigned webhook', async () => {
    const res = await deliver(
      'checkout.session.completed',
      { id: 'cs_x' },
      undefined,
      'whsec_wrong',
    );
    expect(res.statusCode).toBe(400);
    expect(await prisma.stripeEvent.count()).toBeGreaterThan(0);
    expect(await prisma.stripeEvent.count({ where: { type: 'checkout.session.completed' } })).toBe(
      0,
    );
  });

  it('sells a cosmetic paid later by Pix, and takes it back on refund', async () => {
    const bia = await account('Bia');
    const { res, sessionId } = await checkout(bia, { product: 'acabamento_holografico' });
    expect(res.statusCode).toBe(200);
    expect(stripe.checkout.sessions.create.mock.calls[0]![0].mode).toBe('payment');
    const session = {
      id: sessionId,
      mode: 'payment',
      payment_status: 'unpaid',
      payment_intent: 'pi_bia',
    };
    await deliver('checkout.session.completed', session);
    expect((await ents(bia)).pending).toEqual(['acabamento_holografico']);
    expect((await ents(bia)).cosmetics).toEqual([]);
    await deliver('checkout.session.async_payment_succeeded', {
      ...session,
      payment_status: 'paid',
    });
    expect(await ents(bia)).toMatchObject({ pending: [], cosmetics: ['acabamento_holografico'] });
    await deliver('charge.refunded', { refunded: true, payment_intent: 'pi_bia' });
    expect((await ents(bia)).cosmetics).toEqual([]);
  });

  it('drops a failed Pix and an abandoned checkout', async () => {
    const cris = await account('Cris');
    const a = await checkout(cris, { product: 'acabamento_holografico' });
    await deliver('checkout.session.async_payment_failed', { id: a.sessionId });
    const b = await checkout(cris, { product: 'acabamento_holografico' });
    await deliver('checkout.session.expired', { id: b.sessionId });
    expect(await prisma.purchase.findMany({ where: { userId: cris.userId } })).toEqual([
      expect.objectContaining({ checkoutSessionId: a.sessionId, status: 'failed' }),
    ]);
  });

  it('gives a Clube gift code that stacks on the redeemer’s subscription', async () => {
    const buyer = await account('Duda');
    const { sessionId } = await checkout(buyer, { product: 'presente_3m' });
    await deliver('checkout.session.completed', {
      id: sessionId,
      mode: 'payment',
      payment_status: 'paid',
      payment_intent: 'pi_gift',
    });
    const [gift] = (await ents(buyer)).gifts;
    expect(gift).toMatchObject({ months: 3, redeemed: false });

    // The friend already subscribes: the gift moves the next charge by 3 months.
    const friend = await account('Edu');
    await checkout(friend, { product: 'clube_mensal' });
    const { stripeCustomerId } = await prisma.billingCustomer.findUniqueOrThrow({
      where: { userId: friend.userId },
    });
    await deliver(
      'customer.subscription.created',
      sub('sub_edu', stripeCustomerId, 'price_clube_m'),
    );
    const res = await friend.req('POST', '/billing/gift/redeem', { code: gift.code });
    expect(res.statusCode, res.body).toBe(200);
    const end = new Date(NOW.getTime() + 30 * 86400_000);
    end.setUTCMonth(end.getUTCMonth() + 3);
    expect(res.json().clube.until).toBe(end.toISOString());
    expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_edu', {
      trial_end: end.getTime() / 1000,
      proration_behavior: 'none',
    });
    expect((await friend.req('POST', '/billing/gift/redeem', { code: gift.code })).statusCode).toBe(
      409,
    );
    expect((await ents(buyer)).gifts[0].redeemed).toBe(true);
    expect(
      (await friend.req('POST', '/billing/gift/redeem', { code: 'AAAA-BBBB-CCCC' })).statusCode,
    ).toBe(404);
  });

  it('sells Liga Pro only to the league’s owner', async () => {
    const owner = await account('Fabi');
    const other = await account('Gui');
    const created = await owner.req('POST', '/leagues', { name: 'Resenha' });
    expect(created.statusCode, created.body).toBe(201);
    const code = created.json().code as string;
    expect((await checkout(other, { product: 'liga_pro', leagueCode: code })).res.statusCode).toBe(
      403,
    );
    const ok = await checkout(owner, { product: 'liga_pro', leagueCode: code });
    expect(ok.res.statusCode).toBe(200);
    const params = stripe.checkout.sessions.create.mock.calls.at(-1)![0];
    const league = await prisma.league.findUniqueOrThrow({ where: { code } });
    expect(params.subscription_data?.metadata).toEqual({ leagueId: league.id });
    const { stripeCustomerId } = await prisma.billingCustomer.findUniqueOrThrow({
      where: { userId: owner.userId },
    });
    await deliver(
      'customer.subscription.created',
      sub('sub_liga', stripeCustomerId, 'price_liga', { metadata: { leagueId: league.id } }),
    );
    expect((await ents(owner)).leaguesPro).toEqual([{ code, until: expect.any(String) }]);

    // What Liga Pro delivers: 100 places and the crest, styled by the owner only.
    expect((await owner.req('GET', `/leagues/${code}`)).json()).toMatchObject({
      pro: true,
      isOwner: true,
      maxMembers: 100,
      style: null,
      history: [],
      trophies: [],
    });
    const style = { color: 'vinho', nameStyle: 'dourado' };
    expect((await other.req('PATCH', `/leagues/${code}/style`, style)).statusCode).toBe(403);
    const styled = await owner.req('PATCH', `/leagues/${code}/style`, style);
    expect(styled.statusCode, styled.body).toBe(200);
    expect(styled.json().style).toEqual(style);
    expect(
      (await owner.req('PATCH', `/leagues/${code}/style`, { color: 'rosa', nameStyle: 'bloco' }))
        .statusCode,
    ).toBe(400);

    // A league without Liga Pro keeps 20 places and cannot be styled.
    const plain = (await owner.req('POST', '/leagues', { name: 'Pelada' })).json().code as string;
    expect((await owner.req('GET', `/leagues/${plain}`)).json()).toMatchObject({
      pro: false,
      maxMembers: 20,
      style: null,
    });
    expect((await owner.req('PATCH', `/leagues/${plain}/style`, style)).statusCode).toBe(403);

    // Lapsed: back to a plain league; the crest is kept for a renewal.
    await deliver(
      'customer.subscription.deleted',
      sub('sub_liga', stripeCustomerId, 'price_liga', {
        status: 'canceled',
        metadata: { leagueId: league.id },
      }),
    );
    expect((await owner.req('GET', `/leagues/${code}`)).json()).toMatchObject({
      pro: false,
      maxMembers: 20,
      style: null,
    });
  });

  it('wears only owned items; guests cannot', async () => {
    const guest = await device().req('PATCH', '/me/cosmetics', {
      finish: 'acabamento_holografico',
    });
    expect(guest.statusCode).toBe(401);

    const ivo = await account('Ivo');
    const patch = (body: object) => ivo.req('PATCH', '/me/cosmetics', body);
    expect((await ents(ivo)).equipped).toEqual({
      finish: null,
      passport: null,
      crowd: null,
      stickers: {},
    });
    for (const body of [
      { finish: 'acabamento_holografico' },
      { passport: 'passaporte_clube' },
      { crowd: 'torcida_geral' },
      { stickers: { p1: 'acabamento_cromado' } },
    ])
      expect((await patch(body)).statusCode).toBe(403);
    expect((await patch({ finish: 'acabamento_dourado' })).statusCode).toBe(400);
    expect((await patch({ selo: true })).statusCode).toBe(400);

    // Bought: worn as the default, and per sticker.
    const { sessionId } = await checkout(ivo, { product: 'acabamento_holografico' });
    await deliver('checkout.session.completed', {
      id: sessionId,
      mode: 'payment',
      payment_status: 'paid',
      payment_intent: 'pi_ivo',
    });
    const worn = await patch({
      finish: 'acabamento_holografico',
      stickers: { p1: 'none', p2: 'acabamento_holografico' },
    });
    expect(worn.statusCode, worn.body).toBe(200);
    expect(worn.json().equipped).toEqual({
      finish: 'acabamento_holografico',
      passport: null,
      crowd: null,
      stickers: { p1: 'none', p2: 'acabamento_holografico' },
    });
    // Only the fields sent change; null takes it off.
    const off = await patch({ finish: null, stickers: { p1: null } });
    expect(off.json().equipped).toMatchObject({
      finish: null,
      stickers: { p2: 'acabamento_holografico' },
    });

    // The Clube lends its items while it lasts.
    await checkout(ivo, { product: 'clube_mensal' });
    const { stripeCustomerId } = await prisma.billingCustomer.findUniqueOrThrow({
      where: { userId: ivo.userId },
    });
    const s = sub('sub_ivo', stripeCustomerId, 'price_clube_m');
    await deliver('customer.subscription.created', s);
    expect(
      (await patch({ passport: 'passaporte_clube', crowd: 'torcida_clube' })).json().equipped,
    ).toMatchObject({ passport: 'passaporte_clube', crowd: 'torcida_clube' });
    await deliver('customer.subscription.deleted', { ...s, status: 'canceled' });
    expect((await ents(ivo)).equipped).toMatchObject({ passport: null, crowd: null });

    // A refund takes the finish off every sticker too.
    await deliver('charge.refunded', { refunded: true, payment_intent: 'pi_ivo' });
    expect((await ents(ivo)).equipped.stickers).toEqual({});
  });

  it('exports billing rows and, on erasure, cancels renewals and anonymises sales', async () => {
    const h = await account('Hugo');
    const { sessionId } = await checkout(h, { product: 'acabamento_holografico' });
    await deliver('checkout.session.completed', {
      id: sessionId,
      mode: 'payment',
      payment_status: 'paid',
      payment_intent: 'pi_hugo',
    });
    await checkout(h, { product: 'clube_mensal' });
    const { stripeCustomerId } = await prisma.billingCustomer.findUniqueOrThrow({
      where: { userId: h.userId },
    });
    await deliver(
      'customer.subscription.created',
      sub('sub_hugo', stripeCustomerId, 'price_clube_m'),
    );

    const exported = JSON.parse((await h.req('GET', '/me/export')).body);
    expect(exported.billing).toMatchObject({
      stripeCustomerId,
      subscriptions: [expect.objectContaining({ id: 'sub_hugo' })],
      purchases: [expect.objectContaining({ product: 'acabamento_holografico', status: 'paid' })],
    });

    expect((await h.req('DELETE', '/me')).statusCode).toBe(204);
    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_hugo');
    expect(await prisma.billingCustomer.count({ where: { userId: h.userId } })).toBe(0);
    expect(await prisma.billingSubscription.count({ where: { userId: h.userId } })).toBe(0);
    expect(
      await prisma.purchase.findUniqueOrThrow({ where: { checkoutSessionId: sessionId } }),
    ).toMatchObject({
      userId: 'deleted',
      status: 'paid',
    });
  });

  it('takes a guest’s one-time apoio without an account, at the amount picked', async () => {
    const guest = device();
    expect(
      (await guest.req('POST', '/billing/checkout', { product: 'apoio_avulso' })).statusCode,
    ).toBe(400);
    expect(
      (await guest.req('POST', '/billing/checkout', { product: 'apoio_avulso', amount: 499 }))
        .statusCode,
    ).toBe(400);
    expect(
      (await guest.req('POST', '/billing/checkout', { product: 'apoio_mensal' })).statusCode,
    ).toBe(401);
    const before = await prisma.purchase.count();
    const { res } = await checkout(guest, { product: 'apoio_avulso', amount: 2500 });
    expect(res.statusCode, res.body).toBe(200);
    const params = stripe.checkout.sessions.create.mock.calls[0]![0];
    expect(params).toMatchObject({
      mode: 'payment',
      submit_type: 'donate',
      line_items: [{ quantity: 1, price_data: { currency: 'brl', unit_amount: 2500 } }],
      success_url: `${WEB_ORIGIN}/apoie?apoio=ok`,
    });
    expect(params).not.toHaveProperty('customer');
    expect(params.custom_text).toMatchObject({ submit: { message: APOIO_NOTE } });
    expect(await prisma.purchase.count()).toBe(before + 1); // kept under the device session
  });

  it('a guest’s paid apoio follows them into the account they create on the same device', async () => {
    const d = device('10.9.9.9');
    const { sessionId } = await checkout(d, { product: 'apoio_avulso', amount: 1500 });
    await deliver('checkout.session.completed', {
      id: sessionId,
      mode: 'payment',
      payment_status: 'paid',
      payment_intent: 'pi_guest_apoio',
    });
    const email = `${randomUUID()}@example.com`;
    const res = await d.req('POST', '/auth/sign-up/email', {
      email,
      password: 'segredo-123',
      name: 'Gil',
    });
    expect(res.statusCode, res.body).toBe(200);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(await ents({ ...d, userId: user.id })).toMatchObject({ supporter: true });
  });

  it('marks an account as supporter: one-time until refunded, monthly for good', async () => {
    const iara = await account('Iara');
    expect(await ents(iara)).toMatchObject({ supporter: false, supportsMonthly: false });
    const { sessionId } = await checkout(iara, { product: 'apoio_avulso', amount: 1000 });
    const paid = {
      id: sessionId,
      mode: 'payment',
      payment_status: 'paid',
      payment_intent: 'pi_iara',
    };
    await deliver('checkout.session.completed', paid);
    expect(await ents(iara)).toMatchObject({ supporter: true, cosmetics: [] });
    await deliver('charge.refunded', { refunded: true, payment_intent: 'pi_iara' });
    expect((await ents(iara)).supporter).toBe(false);

    const { res } = await checkout(iara, { product: 'apoio_mensal' });
    expect(res.statusCode, res.body).toBe(200);
    expect(stripe.checkout.sessions.create.mock.calls.at(-1)![0]).toMatchObject({
      mode: 'subscription',
      line_items: [{ price: 'price_apoio_m', quantity: 1 }],
    });
    const { stripeCustomerId } = await prisma.billingCustomer.findUniqueOrThrow({
      where: { userId: iara.userId },
    });
    const s = sub('sub_iara', stripeCustomerId, 'price_apoio_m');
    await deliver('customer.subscription.created', s);
    expect(await ents(iara)).toMatchObject({
      supporter: true,
      supportsMonthly: true,
      clube: { active: false },
    });
    expect((await checkout(iara, { product: 'apoio_mensal' })).res.statusCode).toBe(409);
    await deliver('customer.subscription.deleted', { ...s, status: 'canceled' });
    expect(await ents(iara)).toMatchObject({ supporter: true, supportsMonthly: false });
  });
});
