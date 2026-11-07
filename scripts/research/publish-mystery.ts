// Builds and publishes Craque Misterioso levels (ADR-011): one verified player per level with a
// position, a birth year and 3+ clubs. Most famous first (shuffled by a fixed hash inside each
// fame tier), Brazilians and players who played in Brazil favoured early. Re-runnable.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/publish-mystery.ts [--levels 150]
import { createHash } from 'node:crypto';
import { createPrisma } from '../../apps/api/src/db';
import {
  createChallenge,
  publishChallenge,
  validateChallenge,
} from '../../apps/api/src/modules/challenges/challenges.service';
import { playerFacts } from '../../apps/api/src/modules/challenges/mystery-snapshot';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const i = process.argv.indexOf('--levels');
const TARGET = i > 0 ? Number(process.argv[i + 1]) : 150;
const TIER = { T1: 1, T2: 2, T3: 3, T4: 4 } as const;
const hash = (s: string) => createHash('sha1').update(s).digest('hex');

const existing = await prisma.challenge.findMany({
  where: { gameMode: 'MYSTERY_PLAYER', status: { in: ['draft', 'validated', 'published'] } },
});
const used = new Set(
  existing.map((c) => (c.snapshot as { answer: { playerId: string } }).answer.playerId),
);
const live = existing.filter((c) => c.status === 'published').length;
const players = await prisma.player.findMany({
  where: {
    verificationStatus: 'verified',
    birthDate: { not: null },
    primaryPositionGroup: { not: null },
  },
  select: { id: true, notabilityTier: true, nationality: { select: { isoCode: true } } },
});
const pool = [];
for (const p of players.sort(
  (a, b) => TIER[a.notabilityTier] - TIER[b.notabilityTier] || (hash(a.id) < hash(b.id) ? -1 : 1),
)) {
  if (used.has(p.id)) continue;
  const f = await playerFacts(prisma, p.id);
  if (!f || f.clubs.length < 3) continue;
  const br = p.nationality.isoCode === 'BR' || f.clubs.some((c) => c.countryCode === 'BR');
  pool.push({ id: p.id, tier: TIER[p.notabilityTier], br });
  if (pool.length > TARGET * 3) break;
}
// Inside each tier, Brazilian football first.
pool.sort((a, b) => a.tier - b.tier || Number(b.br) - Number(a.br));
console.log(`Craque Misterioso: ${live} live, ${pool.length} candidates`);

let made = 0;
for (let level = live + 1; level <= TARGET && pool.length; level++) {
  const p = pool.shift()!;
  try {
    const draft = await createChallenge(prisma, {
      mode: 'MYSTERY_PLAYER',
      params: { playerId: p.id },
      difficultyTier: level <= 30 ? 1 : level <= 90 ? 2 : 3,
      createdBy: 'ai-curator',
    });
    await validateChallenge(prisma, draft.id);
    await publishChallenge(prisma, draft.id, new Date());
    made++;
  } catch (e) {
    console.log(`level ${level}: ${(e as Error).message.slice(0, 120)}`);
    level--;
  }
}
console.log(`Craque Misterioso: published ${made} new levels (${live + made} in the track)`);
await prisma.$disconnect();
