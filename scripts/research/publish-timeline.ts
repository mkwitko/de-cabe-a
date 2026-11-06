// Builds and publishes Linha do tempo levels (ADR-011): 5 verified players per level, each with
// at least 4 clubs (verified professional spells, distinct start years). Fame ramp like the
// Impostor; a player appears in one level only. Re-runnable: appends up to --levels.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/publish-timeline.ts [--levels 100]
import { createPrisma } from '../../apps/api/src/db';
import {
  createChallenge,
  publishChallenge,
  validateChallenge,
} from '../../apps/api/src/modules/challenges/challenges.service';
import { timelineClubs } from '../../apps/api/src/modules/challenges/timeline-snapshot';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const i = process.argv.indexOf('--levels');
const TARGET = i > 0 ? Number(process.argv[i + 1]) : 100;
const TIER = { T1: 1, T2: 2, T3: 3, T4: 4 } as const;

const existing = await prisma.challenge.findMany({
  where: { gameMode: 'TIMELINE', status: { in: ['draft', 'validated', 'published'] } },
});
const used = new Set(
  existing.flatMap((c) =>
    (c.snapshot as { rounds: { playerId: string }[] }).rounds.map((r) => r.playerId),
  ),
);
const live = existing.filter((c) => c.status === 'published').length;
const candidates = await prisma.player.findMany({
  where: { verificationStatus: 'verified' },
  select: { id: true, notabilityTier: true, canonicalName: true },
  orderBy: [{ notabilityTier: 'asc' }, { canonicalName: 'asc' }],
});
// Players with a playable career (4 clubs), easiest (most famous) first; stable order.
const pool: { id: string; tier: number }[] = [];
for (const p of candidates)
  if (!used.has(p.id) && (await timelineClubs(prisma, p.id)))
    pool.push({ id: p.id, tier: TIER[p.notabilityTier] });
console.log(`Linha do tempo: ${live} live, ${pool.length} playable players unused`);

let made = 0;
for (let level = live + 1; level <= TARGET; level++) {
  const maxTier = level <= 20 ? 2 : level <= 60 ? 3 : 4;
  const picks = pool.filter((p) => p.tier <= maxTier && !used.has(p.id)).slice(0, 5);
  if (picks.length < 5) {
    console.log(`level ${level}: not enough players, stopping`);
    break;
  }
  for (const p of picks) used.add(p.id);
  try {
    const draft = await createChallenge(prisma, {
      mode: 'TIMELINE',
      params: { rounds: picks.map((p) => ({ playerId: p.id })) },
      difficultyTier: maxTier === 2 ? 1 : maxTier === 3 ? 2 : 3,
      createdBy: 'ai-curator',
    });
    await validateChallenge(prisma, draft.id);
    await publishChallenge(prisma, draft.id, new Date());
    made++;
  } catch (e) {
    console.log(`level ${level}: ${(e as Error).message.slice(0, 120)}`);
  }
}
console.log(`Linha do tempo: published ${made} new levels (${live + made} in the track)`);
await prisma.$disconnect();
