import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const RETENTION_DAYS = 30;

/** Editorial reports (DATA_QUALITY.md §5). */
export const reportRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, now } = app.deps;

  app.get('/reports/rejections', async () => {
    await prisma.searchMiss.deleteMany({
      where: { lastAt: { lt: new Date(now().getTime() - RETENTION_DAYS * 86400_000) } },
    });
    const searchMisses = await prisma.searchMiss.findMany({
      orderBy: [{ count: 'desc' }, { lastAt: 'desc' }],
      take: 100,
    });

    // Most frequent wrong guesses per grid cell: missing data or a legitimate confusion.
    const wrong = await prisma.$queryRaw<
      {
        challengeId: string;
        publicNumber: number | null;
        cellIndex: number;
        playerId: string;
        name: string;
        n: bigint;
      }[]
    >`
      SELECT c.id AS "challengeId", c."publicNumber", (aa.input->>'cellIndex')::int AS "cellIndex",
             aa.input->>'playerId' AS "playerId", p."canonicalName" AS name, COUNT(*) AS n
      FROM "AttemptAction" aa
      JOIN "Attempt" a ON a.id = aa."attemptId"
      JOIN "Challenge" c ON c.id = a."challengeId"
      JOIN "Player" p ON p.id = aa.input->>'playerId'
      WHERE c."gameMode" = 'FOOTBALL_GRID' AND aa.event->>'type' = 'wrong'
      GROUP BY 1, 2, 3, 4, 5
      ORDER BY n DESC
      LIMIT 100`;

    const importedSpellsOfVerified = await prisma.player.findMany({
      where: {
        verificationStatus: 'verified',
        spells: { some: { verificationStatus: 'imported' } },
      },
      select: {
        id: true,
        canonicalName: true,
        _count: { select: { spells: { where: { verificationStatus: 'imported' } } } },
      },
      take: 200,
    });

    return {
      searchMisses: searchMisses.map((s) => ({
        text: s.normalized,
        count: s.count,
        lastAt: s.lastAt,
      })),
      gridWrongGuesses: wrong.map((w) => ({ ...w, n: Number(w.n) })),
      importedSpellsOfVerified: importedSpellsOfVerified.map((p) => ({
        id: p.id,
        name: p.canonicalName,
        importedSpells: p._count.spells,
      })),
    };
  });
};
