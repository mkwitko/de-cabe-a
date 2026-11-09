/**
 * Own analytics table (ANALYTICS.md): no IP, no user agent, no search text.
 * Server records game events where they happen; clients only send what the server cannot see.
 */
import { EventsRequest } from '@decabeca/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { sessionHash } from '../session/session';

type Props = Record<string, string | number | boolean | null>;

/** Allowed props per event; anything else is dropped. */
const ALLOWED: Record<string, readonly string[]> = {
  game_viewed: ['mode', 'level', 'isMobile'],
  result_shared: ['mode', 'level', 'method', 'isMobile'],
  game_abandoned: ['mode', 'level', 'attemptsUsed', 'isMobile'],
  search_no_result: ['qLength', 'mode', 'isMobile'],
  link_opened: ['kind', 'ref', 'isMobile'],
};

const pick = (name: string, props: Props) =>
  Object.fromEntries(Object.entries(props).filter(([k]) => ALLOWED[name]?.includes(k)));

/** Fire-and-forget server event; analytics never breaks gameplay. */
export function track(
  prisma: PrismaClient | Prisma.TransactionClient,
  sessionId: string,
  name: string,
  props: Props,
  ts = new Date(),
) {
  return prisma.event
    .create({
      data: {
        sessionHash: sessionHash(sessionId),
        name,
        ts,
        props: props as Prisma.InputJsonValue,
      },
    })
    .catch(() => undefined);
}

export const analyticsRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now } = app.deps;
  app.post('/events', { schema: { body: EventsRequest } }, async (req, reply) => {
    const at = now().getTime();
    await prisma.event.createMany({
      data: req.body.events.map((e) => ({
        sessionHash: sessionHash(req.sessionId),
        name: e.name,
        // clamp client clocks to ±1 day of the server
        ts: new Date(Math.min(Math.max(Date.parse(e.ts), at - 86400_000), at + 86400_000)),
        props: pick(e.name, e.props) as Prisma.InputJsonValue,
      })),
    });
    return reply.code(202).send();
  });
};
