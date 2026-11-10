/**
 * "Quero esse primeiro": accounts vote for the closed mode they want opened next. One current vote
 * per account (voting again moves it); anyone sees the counts, only a live sign-in votes.
 */
import { ModeVoteRequest, ModeVotesResponse, VotableMode } from '@decabeca/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { AppError } from '../../errors';
import { isLiveSignIn } from '../account/auth';

/** Counts are shared by everyone and change slowly: kept for a few seconds, dropped on a vote. */
const COUNTS_TTL_MS = 15_000;

export const modeVoteRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, auth } = app.deps;
  let cached: { at: number; counts: Map<string, number> } | null = null;

  async function counts() {
    if (cached && Date.now() - cached.at < COUNTS_TTL_MS) return cached.counts;
    const rows = await prisma.modeVote.groupBy({ by: ['mode'], _count: { _all: true } });
    cached = { at: Date.now(), counts: new Map(rows.map((r) => [r.mode, r._count._all])) };
    return cached.counts;
  }

  async function view(userId: string | null) {
    const [byMode, mine] = await Promise.all([
      counts(),
      userId ? prisma.modeVote.findUnique({ where: { userId } }) : null,
    ]);
    // Most voted first; ties keep the lockers' order.
    const modes = VotableMode.options
      .map((mode) => ({ mode, votes: byMode.get(mode) ?? 0 }))
      .sort((a, b) => b.votes - a.votes);
    const parsed = VotableMode.safeParse(mine?.mode);
    return {
      modes,
      total: modes.reduce((s, m) => s + m.votes, 0),
      mine: parsed.success ? parsed.data : null,
    };
  }

  async function voter(req: Parameters<typeof isLiveSignIn>[1]) {
    if (!(await isLiveSignIn(auth, req)))
      throw new AppError(401, 'UNAUTHORIZED', 'Entre na sua conta para votar.');
    return req.userId!;
  }

  const limit = { rateLimit: { max: 20, timeWindow: '1 minute' } };

  app.get('/mode-votes', { schema: { response: { 200: ModeVotesResponse } } }, (req) =>
    view(req.userId),
  );

  app.put(
    '/mode-votes',
    { config: limit, schema: { body: ModeVoteRequest, response: { 200: ModeVotesResponse } } },
    async (req) => {
      const userId = await voter(req);
      await prisma.modeVote.upsert({
        where: { userId },
        create: { userId, mode: req.body.mode },
        update: { mode: req.body.mode },
      });
      cached = null;
      return view(userId);
    },
  );

  app.delete(
    '/mode-votes',
    { config: limit, schema: { response: { 200: ModeVotesResponse } } },
    async (req) => {
      const userId = await voter(req);
      await prisma.modeVote.deleteMany({ where: { userId } });
      cached = null;
      return view(userId);
    },
  );
};
