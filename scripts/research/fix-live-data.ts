// Applies the reviewed fixes of live-data-fixes.json (club names, spells on the wrong club, loans,
// league games/goals) and replaces in place every live level they change: Career Path levels are
// rebuilt for the same answer, Mais ou Menos levels breaking a rule get new duels
// (publish-higher-lower.ts --replace-unfair). Idempotent: each fix checks the value it expects to
// find and is skipped when already applied; a value that is neither is reported, not overwritten.
// Run: DATABASE_URL=... pnpm --filter @decabeca/api exec tsx ../../scripts/research/fix-live-data.ts [--dry]
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createPrisma } from '../../apps/api/src/db';
import {
  buildSnapshot,
  publishChallenge,
  retireChallenge,
  validateChallenge,
} from '../../apps/api/src/modules/challenges/challenges.service';
import { liveDataFixes as fx } from './lib/live-data';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const DRY = process.argv.includes('--dry');
const report: string[] = [];

// 1. Club names.
const clubs = new Map(
  (
    await prisma.club.findMany({
      where: { id: { in: fx.clubNames.map((c) => c.id) } },
      select: { id: true, shortName: true },
    })
  ).map((c) => [c.id, c.shortName]),
);
const renames = fx.clubNames.filter((c) => {
  const now = clubs.get(c.id);
  if (now === c.from) return true;
  if (now !== c.to) report.push(`club ${c.id}: expected "${c.from}", found "${now}"`);
  return false;
});

// 2. Spells on the wrong club, loans, league numbers.
const ids = [
  ...fx.spellClubs.map((s) => s.spellId),
  ...fx.spellLoans.map((s) => s.spellId),
  ...fx.spellStats.map((s) => s.spellId),
];
const spells = new Map(
  (
    await prisma.careerSpell.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        clubId: true,
        spellType: true,
        loanFromClubId: true,
        appearances: true,
        goals: true,
      },
    })
  ).map((s) => [s.id, s]),
);
const moves = fx.spellClubs.filter((m) => {
  const s = spells.get(m.spellId);
  if (s?.clubId === m.fromClubId) return true;
  if (s?.clubId !== m.toClubId)
    report.push(`spell ${m.spellId} (${m.player}): club not as expected`);
  return false;
});
const loans = fx.spellLoans.filter((l) => {
  const s = spells.get(l.spellId);
  if (s?.spellType === 'professional') return true;
  if (s?.spellType !== 'loan') report.push(`spell ${l.spellId} (${l.player}): missing`);
  return false;
});
const stats = fx.spellStats.filter((x) => {
  const s = spells.get(x.spellId);
  if (s && s.appearances === x.from[0] && s.goals === x.from[1]) return true;
  if (!s || s.appearances !== x.to[0] || s.goals !== x.to[1])
    report.push(`spell ${x.spellId} (${x.player}): games/goals not as expected`);
  return false;
});
console.log(
  `to apply: ${renames.length} club names, ${moves.length} spells to another club, ${loans.length} loans, ${stats.length} league numbers`,
);
const values = (rows: string[][]) =>
  rows
    .map((r) => `(${r.map((v) => (v === 'NULL' ? v : `'${v.replace(/'/g, "''")}'`)).join(',')})`)
    .join(',');
if (!DRY) {
  await prisma.$transaction(async (tx) => {
    if (renames.length)
      await tx.$executeRawUnsafe(
        `UPDATE "Club" c SET "shortName" = v.n, "updatedAt" = now() FROM (VALUES ${values(renames.map((r) => [r.id, r.to]))}) v(id, n) WHERE c.id = v.id`,
      );
    if (moves.length) {
      await tx.$executeRawUnsafe(
        `UPDATE "CareerSpell" s SET "clubId" = v.c, "updatedAt" = now() FROM (VALUES ${values(moves.map((m) => [m.spellId, m.toClubId]))}) v(id, c) WHERE s.id = v.id`,
      );
      // Loans lent by the moved spell's club now come from the club it moved to.
      await tx.$executeRawUnsafe(
        `UPDATE "CareerSpell" l SET "loanFromClubId" = v.t, "updatedAt" = now()
         FROM (VALUES ${values(moves.map((m) => [m.spellId, m.fromClubId, m.toClubId]))}) v(id, f, t)
         JOIN "CareerSpell" m ON m.id = v.id
         WHERE l."playerId" = m."playerId" AND l."loanFromClubId" = v.f
           AND NOT EXISTS (SELECT 1 FROM "CareerSpell" o WHERE o."playerId" = m."playerId" AND o."clubId" = v.f)`,
      );
      // A club a verified career goes through is verified (DQ-09), as the curator does.
      await tx.club.updateMany({
        where: { id: { in: moves.map((m) => m.toClubId) } },
        data: { verificationStatus: 'verified' },
      });
    }
    if (loans.length)
      await tx.$executeRawUnsafe(
        `UPDATE "CareerSpell" s SET "spellType" = 'loan', "loanFromClubId" = v.f, "updatedAt" = now() FROM (VALUES ${values(loans.map((l) => [l.spellId, l.loanFromClubId]))}) v(id, f) WHERE s.id = v.id`,
      );
    if (stats.length)
      await tx.$executeRawUnsafe(
        `UPDATE "CareerSpell" s SET appearances = v.a::int, goals = v.g::int, "updatedAt" = now() FROM (VALUES ${values(stats.map((x) => [x.spellId, String(x.to[0]), String(x.to[1])]))}) v(id, a, g) WHERE s.id = v.id`,
      );
  });
}

// 3. Careers rebuilt from the English infobox replace the player's senior spells.
const current = await prisma.careerSpell.findMany({
  where: { playerId: { in: fx.careers.map((c) => c.playerId) }, spellType: { not: 'youth' } },
  select: { id: true, playerId: true },
});
const rebuilt = fx.careers.filter((c) => {
  const have = current
    .filter((s) => s.playerId === c.playerId)
    .map((s) => s.id)
    .sort();
  return (
    have.join() !==
    c.spells
      .map((s) => s.id)
      .sort()
      .join()
  );
});
console.log(`to apply: ${rebuilt.length} careers rebuilt from the English infobox`);
if (!DRY && rebuilt.length) {
  const now = new Date();
  const year = (y: number | null) => (y === null ? null : new Date(Date.UTC(y, 0, 1)));
  await prisma.$transaction([
    prisma.careerSpell.deleteMany({
      where: { playerId: { in: rebuilt.map((c) => c.playerId) }, spellType: { not: 'youth' } },
    }),
    prisma.careerSpell.createMany({
      data: rebuilt.flatMap((c) =>
        c.spells.map((s) => ({
          id: s.id,
          playerId: c.playerId,
          clubId: s.clubId,
          spellType: s.loanFromClubId ? ('loan' as const) : ('professional' as const),
          loanFromClubId: s.loanFromClubId,
          startDate: year(s.from),
          startPrecision: 'year' as const,
          endDate: year(s.to),
          endPrecision: s.to === null ? ('unknown' as const) : ('year' as const),
          sortIndex: s.sortIndex,
          appearances: s.appearances,
          goals: s.goals,
          sourceRef: c.sourceRef,
          verificationStatus: 'verified' as const,
          verifiedAt: now,
          verifiedBy: 'ai-curator',
        })),
      ),
    }),
    prisma.club.updateMany({
      where: { id: { in: rebuilt.flatMap((c) => c.spells.map((s) => s.clubId)) } },
      data: { verificationStatus: 'verified' },
    }),
  ]);
}

// 4. Career Path levels that no longer equal a fresh build: same answer, same number.
const canonical = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)))
      : x,
  );
const levels = await prisma.challenge.findMany({
  where: { gameMode: 'CAREER_PATH', status: 'published' },
  orderBy: { publicNumber: 'asc' },
});
const replaced: number[] = [];
for (const c of levels) {
  const s = c.snapshot as { answerPlayerId: string; difficultyTier: 1 | 2 | 3 };
  const input = {
    mode: 'CAREER_PATH' as const,
    params: { playerId: s.answerPlayerId },
    difficultyTier: s.difficultyTier,
  };
  const fresh = await buildSnapshot(prisma, input, c.id).catch(
    (e: { details?: { reasons?: string[] } }) => {
      report.push(
        `Carreira ${c.publicNumber}: no longer eligible (${e.details?.reasons?.join(',') ?? 'error'})`,
      );
      return null;
    },
  );
  if (!fresh || canonical(fresh.config) === canonical(c.snapshot)) continue;
  replaced.push(c.publicNumber!);
  if (DRY) continue;
  const { replacement } = await retireChallenge(
    prisma,
    c.id,
    'Carreira corrigida: clube, empréstimo ou jogos/gols da liga (live-data-fixes.json)',
    { params: input.params, difficultyTier: s.difficultyTier },
    'ai-curator',
  );
  await validateChallenge(prisma, replacement!.id);
  await publishChallenge(prisma, replacement!.id, new Date());
}
console.log(
  `Career Path: ${DRY ? 'would replace' : 'replaced'} ${replaced.length} levels in place${replaced.length ? ` (${replaced.join(',')})` : ''}`,
);
await prisma.$disconnect();

// 5. Mais ou Menos: every level with a duel the fixed base no longer supports, or a repeat.
const hl = fileURLToPath(new URL('./publish-higher-lower.ts', import.meta.url));
try {
  execFileSync(
    process.execPath,
    [...process.execArgv, hl, '--replace-unfair', ...(DRY ? ['--dry'] : [])],
    {
      stdio: 'inherit',
      env: process.env,
    },
  );
} catch {
  /* --dry exits 1 when levels would be replaced; the list is printed above */
}
for (const r of report) console.log(`skipped: ${r}`);
