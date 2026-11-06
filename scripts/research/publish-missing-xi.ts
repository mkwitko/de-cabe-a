// Builds and publishes Escalação levels (ADR-011): one level per side of each Wikipedia final
// (scripts/research/import-lineups.ts) with an 11-player sheet and enough linked players.
// Brazil's World Cup finals first, then recent World Cups, Libertadores, Champions, Copa América.
// Re-runnable: skips (final, side) pairs already in the track.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/publish-missing-xi.ts
import { createPrisma } from '../../apps/api/src/db';
import {
  createChallenge,
  publishChallenge,
  validateChallenge,
} from '../../apps/api/src/modules/challenges/challenges.service';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);

const existing = await prisma.challenge.findMany({
  where: { gameMode: 'MISSING_XI', status: { in: ['draft', 'validated', 'published'] } },
});
const done = new Set(
  existing.map((c) => {
    const s = c.snapshot as { match: { source: string }; side: string };
    return `${s.match.source}|${s.side}`;
  }),
);
const live = existing.filter((c) => c.status === 'published').length;

const matches = await prisma.match.findMany({
  where: { source: 'wikipedia' },
  include: { lineups: { select: { side: true, playerId: true } } },
});
const COMP = ['FIFA World Cup', 'Copa Libertadores', 'UEFA Champions League', 'Copa América'];
const BR = new Set([
  'Brazil',
  'Flamengo',
  'Palmeiras',
  'Fluminense',
  'Botafogo',
  'Atlético Mineiro',
  'Grêmio',
  'São Paulo',
  'Santos',
  'Internacional',
  'Athletico Paranaense',
]);
const sides = matches
  .flatMap((m) =>
    (['home', 'away'] as const).map((side) => ({
      m,
      side,
      team: side === 'home' ? m.homeTeam : m.awayTeam,
      linked: m.lineups.filter((l) => l.side === side && l.playerId).length,
      rows: m.lineups.filter((l) => l.side === side).length,
    })),
  )
  .filter((s) => s.rows === 11 && s.linked >= 6)
  .filter((s) => !done.has(`${s.m.sourceRef.replace(/^wikipedia:en:/, '')}|${s.side}`))
  .sort(
    (a, b) =>
      Number(BR.has(b.team)) - Number(BR.has(a.team)) ||
      // Recent finals are easier to remember: newest first within each competition band.
      Number(Number(a.m.season) < 1990) - Number(Number(b.m.season) < 1990) ||
      COMP.indexOf(a.m.competition) - COMP.indexOf(b.m.competition) ||
      Number(b.m.season) - Number(a.m.season),
  );
console.log(`Escalação: ${live} live, ${sides.length} playable sides`);

let made = 0;
for (const [k, s] of sides.entries()) {
  const level = live + made + 1;
  try {
    const draft = await createChallenge(prisma, {
      mode: 'MISSING_XI',
      params: { matchId: s.m.id, side: s.side },
      difficultyTier: level <= 20 ? 1 : level <= 60 ? 2 : 3,
      createdBy: 'ai-curator',
    });
    await validateChallenge(prisma, draft.id);
    await publishChallenge(prisma, draft.id, new Date());
    made++;
  } catch (e) {
    console.log(`#${k} ${s.m.sourceRef} ${s.side}: ${(e as Error).message.slice(0, 120)}`);
  }
}
console.log(`Escalação: published ${made} new levels (${live + made} in the track)`);
await prisma.$disconnect();
