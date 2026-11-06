/**
 * Players report errors in a level they finished (wrong position, missing club, wrong stats, a
 * valid answer refused). The editorial panel and the AI curator (scripts/research/reports.ts) read
 * them with the level's data, fix the base, replace the level in place (ADR-002) and close them.
 */
import { GameMode } from '@decabeca/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { PrismaClient } from '../../generated/prisma/client';
import { AppError } from '../../errors';
import { playerAttempts } from '../session/session';

export const REPORT_REASONS = [
  'position',
  'club_missing',
  'wrong_stats',
  'answer_refused',
  'other',
] as const;

/** POST /v1/levels/:mode/:level/report: only after finishing the level (no spoilers). */
export const levelReportRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;
  app.post(
    '/levels/:mode/:level/report',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        params: z.object({ mode: GameMode, level: z.coerce.number().int().min(1) }),
        body: z.object({
          reason: z.enum(REPORT_REASONS),
          note: z.string().trim().max(500).optional(),
          cellIndex: z.number().int().min(0).max(8).optional(),
        }),
      },
    },
    async (req, reply) => {
      const attempt = await prisma.attempt.findFirst({
        where: {
          ...playerAttempts(req),
          completedAt: { not: null },
          challenge: { gameMode: req.params.mode, publicNumber: req.params.level },
        },
        orderBy: { startedAt: 'asc' },
      });
      if (!attempt)
        throw new AppError(403, 'LEVEL_NOT_FINISHED', 'Termine a fase para relatar um erro.');
      const data = {
        reason: req.body.reason,
        note: req.body.note || null,
        cellIndex: req.body.cellIndex ?? null,
        status: 'open',
      };
      await prisma.levelReport.upsert({
        where: {
          challengeId_sessionId: { challengeId: attempt.challengeId, sessionId: req.sessionId },
        },
        create: { ...data, challengeId: attempt.challengeId, sessionId: req.sessionId },
        update: data,
      });
      return reply.code(201).send({ ok: true });
    },
  );
};

/** Open reports grouped by level, with the data a reviewer needs to judge them. */
export async function reportedLevels(prisma: PrismaClient, status = 'open') {
  const reports = await prisma.levelReport.findMany({
    where: { status },
    include: { challenge: true },
    orderBy: { createdAt: 'asc' },
  });
  const byChallenge = new Map<string, typeof reports>();
  for (const r of reports)
    byChallenge.set(r.challengeId, [...(byChallenge.get(r.challengeId) ?? []), r]);

  return Promise.all(
    [...byChallenge.values()].map(async (rs) => {
      const c = rs[0]!.challenge;
      const snap = c.snapshot as {
        answerPlayerId?: string;
        extraHints?: unknown;
        trajectory?: unknown;
        rows?: unknown;
        cols?: unknown;
      };
      const answer = snap.answerPlayerId
        ? await prisma.player.findUnique({
            where: { id: snap.answerPlayerId },
            include: {
              spells: {
                include: { club: { select: { shortName: true } } },
                orderBy: [{ startDate: 'asc' }, { sortIndex: 'asc' }],
              },
            },
          })
        : null;
      return {
        challengeId: c.id,
        mode: c.gameMode,
        level: c.publicNumber,
        challengeStatus: c.status,
        shown:
          c.gameMode === 'CAREER_PATH'
            ? { extraHints: snap.extraHints, trajectory: snap.trajectory }
            : { rows: snap.rows, cols: snap.cols },
        answer: answer && {
          id: answer.id,
          name: answer.canonicalName,
          position: answer.primaryPositionGroup,
          secondaryPositions: answer.secondaryPositionGroups,
          source: answer.notes,
          wikidata: answer.wikidataId,
          spells: answer.spells.map((s) => ({
            club: s.club.shortName,
            type: s.spellType,
            from: s.startDate?.getUTCFullYear() ?? null,
            to: s.endDate?.getUTCFullYear() ?? null,
            appearances: s.appearances,
            goals: s.goals,
            status: s.verificationStatus,
          })),
        },
        reports: rs.map((r) => ({
          id: r.id,
          reason: r.reason,
          note: r.note,
          cellIndex: r.cellIndex,
          createdAt: r.createdAt,
        })),
      };
    }),
  );
}

/** Admin: list and resolve. */
export const levelReportAdminRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now } = app.deps;
  app.get(
    '/level-reports',
    {
      schema: {
        querystring: z.object({ status: z.enum(['open', 'fixed', 'dismissed']).default('open') }),
      },
    },
    async (req) => ({ levels: await reportedLevels(prisma, req.query.status) }),
  );
  app.patch(
    '/level-reports/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({
          status: z.enum(['fixed', 'dismissed', 'open']),
          resolution: z.string().trim().max(500).optional(),
        }),
      },
    },
    async (req) => {
      const done = req.body.status !== 'open';
      return prisma.levelReport.update({
        where: { id: req.params.id },
        data: {
          status: req.body.status,
          resolution: req.body.resolution ?? null,
          resolvedBy: done ? String(req.headers['x-editor'] ?? 'editor').slice(0, 60) : null,
          resolvedAt: done ? now() : null,
        },
      });
    },
  );
};
