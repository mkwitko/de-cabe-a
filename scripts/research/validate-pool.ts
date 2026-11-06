// Runs DQ-01..09 over verified players (or every non-rejected one with --all) and prints the
// violations (TEST_STRATEGY.md §4).
// Run before publishing a week of challenges:
//   pnpm --filter @decabeca/api exec tsx ../../scripts/research/validate-pool.ts
import { createPrisma } from '../../apps/api/src/db';
import {
  checkClub,
  checkPlayer,
  checkTrajectoryClubs,
  findPossibleDuplicates,
} from '../../apps/api/src/modules/knowledge/quality';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const players = await prisma.player.findMany({
  where: { verificationStatus: process.argv.includes('--all') ? { not: 'rejected' } : 'verified' },
  include: { aliases: true, spells: true },
});
const clubs = await prisma.club.findMany({ where: { verificationStatus: 'verified' } });
const clubStatus = new Map(clubs.map((c) => [c.id, c.verificationStatus]));
const names = new Map([
  ...players.map((p) => [p.id, p.canonicalName] as const),
  ...clubs.map((c) => [c.id, c.shortName] as const),
]);

const violations = [
  ...players.flatMap((p) =>
    [
      ...checkPlayer(p),
      ...(p.verificationStatus === 'verified' ? checkTrajectoryClubs(p, clubStatus) : []),
    ].map((v) => ({ ...v, owner: p.canonicalName })),
  ),
  ...clubs.flatMap((c) => checkClub(c).map((v) => ({ ...v, owner: c.shortName }))),
  ...findPossibleDuplicates(players).map((v) => ({
    ...v,
    owner: names.get(v.entityId) ?? v.entityId,
  })),
];
const blocks = violations.filter((v) => v.severity === 'block');
for (const v of violations)
  console.log(`${v.severity.toUpperCase().padEnd(5)} ${v.rule} ${v.owner}: ${v.message}`);
console.log(
  `\n${players.length} players, ${clubs.length} clubs: ${blocks.length} blocking, ${violations.length - blocks.length} warnings.`,
);
await prisma.$disconnect();
process.exitCode =
  blocks.length && players.some((p) => p.verificationStatus === 'verified') ? 1 : 0;
