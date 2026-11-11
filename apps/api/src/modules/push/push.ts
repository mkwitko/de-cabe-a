/**
 * Notificações opt-in (GROWTH_PLAN.md 2.9): browser push, only after the player turns it on in
 * /conta. Two kinds: a new Desafio do Dia, and a league's week closed. Plain facts, never "you
 * are losing" or "your friends are ahead". Off when the server has no VAPID keys.
 */
import { PushSubscribeRequest, PushUnsubscribeRequest, PushKeyResponse } from '@decabeca/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { PrismaClient } from '../../generated/prisma/client';
import { civilDate } from '../challenges/civil-date';
import { effectivePks } from '../leagues/leagues';
import { rankRows, weekStart } from '../progression/ranking';

export interface PushMessage {
  title: string;
  body: string;
  url: string;
}
export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}
/** Sends one message; resolves to the push service's HTTP status (404/410: subscription gone). */
export type PushSender = (to: PushTarget, message: PushMessage) => Promise<number>;
export interface PushDeps {
  publicKey: string | null;
  send: PushSender;
}
export const NO_PUSH: PushDeps = { publicKey: null, send: async () => 201 };

/** Hour of day in Brasília (UTC−3, no daylight saving since 2019). */
const hourBR = (now: Date) => new Date(now.getTime() - 3 * 3600_000).getUTCHours();
/** Morning, not midnight: nobody gets woken up by a quiz. */
export const SEND_HOUR = 9;

async function deliver(prisma: PrismaClient, send: PushSender, subs: PushTarget[], m: PushMessage) {
  let sent = 0;
  const gone: string[] = [];
  for (const s of subs) {
    const status = await send(s, m).catch(() => 0);
    if (status === 404 || status === 410) gone.push(s.endpoint);
    else if (status >= 200 && status < 300) sent++;
  }
  if (gone.length) await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: gone } } });
  return sent;
}

/** Claims a batch key; false when another run already sent it. */
const claim = async (prisma: PrismaClient, key: string) =>
  (await prisma.pushSend.createMany({ data: [{ key }], skipDuplicates: true })).count === 1;

/**
 * Runs every minute on the server. After 09:00 in Brasília: the day's Desafio do Dia once, and
 * on Mondays the closed week of every league. Returns how many messages went out.
 */
export async function runPushJobs(prisma: PrismaClient, send: PushSender, now: Date) {
  if (hourBR(now) < SEND_HOUR) return 0;
  let sent = 0;
  const today = civilDate(now);
  if (await claim(prisma, `daily:${today}`)) {
    const subs = await prisma.pushSubscription.findMany({ where: { daily: true } });
    sent += await deliver(prisma, send, subs, {
      title: 'Desafio do Dia',
      body: 'Saiu o desafio de hoje: uma fase de cada jogo, a mesma para todo mundo.',
      url: '/d/hoje',
    });
  }
  const monday = weekStart(now);
  if (civilDate(monday) === today && (await claim(prisma, `league:${today}`))) {
    const prev = new Date(monday.getTime() - 7 * 86400_000);
    const stars = new Map(
      (await rankRows(prisma, prev, false, monday)).map((r) => [r.pk, r.stars]),
    );
    const subs = await prisma.pushSubscription.findMany({ where: { league: true } });
    const byPk = new Map<string, PushTarget[]>();
    for (const s of subs) byPk.set(s.pk, [...(byPk.get(s.pk) ?? []), s]);
    // ponytail: every league in one pass; batch by subscriber when leagues number in thousands.
    const leagues = await prisma.league.findMany({ include: { members: true } });
    for (const league of leagues) {
      if (league.members.length < 2) continue;
      const pks = await effectivePks(
        prisma,
        league.members.map((m) => m.pk),
      );
      const order = [...pks].sort((a, b) => (stars.get(b) ?? 0) - (stars.get(a) ?? 0));
      for (const [i, pk] of order.entries()) {
        const to = byPk.get(pk);
        if (!to) continue;
        sent += await deliver(prisma, send, to, {
          title: league.name,
          body: `A semana da liga fechou: você terminou em ${i + 1}º de ${order.length}, com ${stars.get(pk) ?? 0} estrelas. Nova semana começou.`,
          url: `/liga/${league.code}`,
        });
      }
    }
  }
  return sent;
}

export const pushRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, push } = app.deps;
  const pk = (req: { sessionId: string; userId: string | null }) => req.userId ?? req.sessionId;

  app.get('/push/key', { schema: { response: { 200: PushKeyResponse } } }, async () => ({
    publicKey: push.publicKey,
  }));

  app.post(
    '/push/subscriptions',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: { body: PushSubscribeRequest },
    },
    async (req, reply) => {
      const { endpoint, keys, daily, league } = req.body;
      const data = { pk: pk(req), p256dh: keys.p256dh, auth: keys.auth, daily, league };
      await prisma.pushSubscription.upsert({
        where: { endpoint },
        create: { endpoint, ...data },
        update: data,
      });
      return reply.code(204).send();
    },
  );

  app.delete(
    '/push/subscriptions',
    { schema: { body: PushUnsubscribeRequest } },
    async (req, reply) => {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: req.body.endpoint, pk: pk(req) },
      });
      return reply.code(204).send();
    },
  );
};
