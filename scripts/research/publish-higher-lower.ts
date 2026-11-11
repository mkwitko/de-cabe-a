// Builds and publishes Mais ou Menos levels (ADR-011): 5 duels per level between two real spells
// at the same club (verified, league games and goals confirmed by the English infobox, see
// live-data-fixes.json); a clear winner only. No reserve/youth sides and no player whose name is
// shared with a more famous one ("Marcelo" of Wisła). Fame ramp like the other games.
// Re-runnable up to --levels. --replace-unfair replaces in place every live level breaking a rule.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/publish-higher-lower.ts [--levels 100]
import { createPrisma } from '../../apps/api/src/db';
import {
  createChallenge,
  publishChallenge,
  validateChallenge,
} from '../../apps/api/src/modules/challenges/challenges.service';
import { clearWinner } from '../../apps/api/src/modules/challenges/higher-lower-snapshot';
import { normalizeName } from '../../packages/engine/src/index';
import { isReserveClub } from './lib/reserve';
import { leagueConfirmed } from './lib/live-data';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const i = process.argv.indexOf('--levels');
const TARGET = i > 0 ? Number(process.argv[i + 1]) : 100;

function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const rnd = seeded('higher-lower');

// Player × club totals from verified spells with stats (games ≥ 30 so the numbers mean something).
// Ordered, so the seeded draw gives the same duels on every copy of the same base.
const rows = await prisma.$queryRaw<
  {
    playerId: string;
    clubId: string;
    clubName: string;
    tier: string;
    games: bigint;
    goals: bigint;
    spellIds: string[];
  }[]
>`
  SELECT s."playerId", s."clubId", c.name AS "clubName", p."notabilityTier" AS tier,
         SUM(s.appearances) AS games, SUM(s.goals) AS goals, array_agg(s.id) AS "spellIds"
  FROM "CareerSpell" s
  JOIN "Player" p ON p.id = s."playerId" AND p."verificationStatus" = 'verified'
  JOIN "Club" c ON c.id = s."clubId"
  WHERE s."verificationStatus" = 'verified' AND s."spellType" IN ('professional', 'loan')
  GROUP BY 1, 2, 3, 4
  HAVING bool_and(s.appearances IS NOT NULL AND s.goals IS NOT NULL) AND SUM(s.appearances) >= 30
  ORDER BY 1, 2`;
// A name shared with a player at least as famous is ambiguous: "Marcelo" (Wisła) is not Real
// Madrid's Marcelo. Aliases count ("Ronaldo" is Ronaldo Nazário's).
const people = await prisma.player.findMany({
  where: { verificationStatus: 'verified' },
  select: {
    id: true,
    canonicalName: true,
    notabilityTier: true,
    aliases: { select: { normalized: true } },
  },
});
const names = new Map<string, { id: string; tier: string }[]>();
for (const p of people)
  for (const n of new Set([normalizeName(p.canonicalName), ...p.aliases.map((a) => a.normalized)]))
    names.set(n, [...(names.get(n) ?? []), { id: p.id, tier: p.notabilityTier }]);
const ambiguous = new Set(
  people
    .filter((p) =>
      names
        .get(normalizeName(p.canonicalName))!
        .some((o) => o.id !== p.id && o.tier <= p.notabilityTier),
    )
    .map((p) => p.id),
);
const pool = rows
  .filter(
    (r) =>
      !isReserveClub(r.clubName) &&
      !ambiguous.has(r.playerId) &&
      r.spellIds.every((id) => leagueConfirmed.has(id)),
  )
  .map((r) => ({
    ...r,
    games: Number(r.games),
    goals: Number(r.goals),
    tierN: Number(r.tier.slice(1)),
  }));
const byClub = new Map<string, typeof pool>();
for (const r of pool) byClub.set(r.clubId, [...(byClub.get(r.clubId) ?? []), r]);

const existing = await prisma.challenge.findMany({
  where: { gameMode: 'HIGHER_LOWER', status: { in: ['draft', 'validated', 'published'] } },
});
// Duels already live are never drawn again. The draw is seeded, so without this every run (a
// --replace-unfair pass included) replays the same duels: level 2 once repeated 4 of level 1's.
const usedPairs = new Set<string>();
for (const c of existing)
  if (c.status === 'published')
    for (const r of (
      c.snapshot as { rounds?: { a: { playerId: string }; b: { playerId: string } }[] }
    ).rounds ?? [])
      usedPairs.add([r.a.playerId, r.b.playerId].sort().join());
const live = existing.filter((c) => c.status === 'published').length;
console.log(`Mais ou Menos: ${live} live, ${pool.length} player-club totals`);

function buildRounds(level: number) {
  const maxTier = level <= 20 ? 2 : level <= 60 ? 3 : 4;
  const fit = pool.filter((r) => r.tierN <= maxTier);
  const used = new Set<string>();
  const rounds = [];
  for (let tries = 0; rounds.length < 5 && tries < 500; tries++) {
    const a = fit[Math.floor(rnd() * fit.length)]!;
    if (used.has(a.playerId)) continue;
    const metric = rnd() < 0.5 ? ('goals' as const) : ('games' as const);
    const v = (x: typeof a) => (metric === 'goals' ? x.goals : x.games);
    if (metric === 'goals' && a.goals < 5) continue; // goals duels between defenders are dull
    // Same club only: "who scored more for the club" (a Scunthorpe tally against a Man City one
    // compared two different questions).
    const options = byClub
      .get(a.clubId)!
      .filter(
        (b) =>
          b.playerId !== a.playerId &&
          !used.has(b.playerId) &&
          b.tierN <= maxTier &&
          clearWinner(v(a), v(b)) &&
          !usedPairs.has([a.playerId, b.playerId].sort().join()),
      );
    if (!options.length) continue;
    const b = options[Math.floor(rnd() * options.length)]!;
    used.add(a.playerId);
    used.add(b.playerId);
    usedPairs.add([a.playerId, b.playerId].sort().join());
    rounds.push({
      metric,
      a: { playerId: a.playerId, clubId: a.clubId },
      b: { playerId: b.playerId, clubId: b.clubId },
    });
  }
  return { rounds, maxTier };
}

// --replace-unfair: published levels with a duel that breaks a current rule are replaced in place
// (same number) with new duels: a duel must still be drawable now (same club, shown name and
// number equal to the base, confirmed league numbers, no reserve side, no ambiguous name, clear
// winner) and not repeat a duel of an earlier level. --dry lists them only.
if (process.argv.includes('--replace-unfair')) {
  const { retireChallenge } =
    await import('../../apps/api/src/modules/challenges/challenges.service');
  // --levels-to-replace 82,86: also these levels (e.g. no longer valid after a re-curation).
  const li = process.argv.indexOf('--levels-to-replace');
  const forced = new Set(li > 0 ? process.argv[li + 1]!.split(',').map(Number) : []);
  const dry = process.argv.includes('--dry');
  const published = existing
    .filter((c) => c.status === 'published')
    .sort((x, y) => x.publicNumber! - y.publicNumber!);
  const names = new Map(
    (
      await prisma.club.findMany({
        where: { id: { in: [...byClub.keys()] } },
        select: { id: true, shortName: true },
      })
    ).map((c) => [c.id, c.shortName]),
  );
  const byPlayer = new Map<string, typeof pool>();
  for (const r of pool) byPlayer.set(r.playerId, [...(byPlayer.get(r.playerId) ?? []), r]);
  type Side = { playerId: string; clubName: string; value: number };
  type Round = { metric: 'goals' | 'games'; a: Side; b: Side };
  const value = (r: (typeof pool)[number], m: Round['metric']) =>
    m === 'goals' ? r.goals : r.games;
  const why = (r: Round, seen: Set<string>): string | null => {
    const pair = [r.a.playerId, r.b.playerId].sort().join();
    if (seen.has(pair)) return 'duelo repetido de uma fase anterior';
    if (!clearWinner(r.a.value, r.b.value)) return 'diferença pequena demais';
    const at = (x: Side) =>
      (byPlayer.get(x.playerId) ?? []).filter((e) => names.get(e.clubId) === x.clubName);
    const club = at(r.a).find((e) => at(r.b).some((f) => f.clubId === e.clubId));
    if (!club)
      return 'clubes diferentes, nome de clube corrigido, jogador ambíguo ou números sem confirmação';
    const other = at(r.b).find((f) => f.clubId === club.clubId)!;
    if (value(club, r.metric) !== r.a.value || value(other, r.metric) !== r.b.value)
      return 'números corrigidos na base';
    return null;
  };
  let replaced = 0;
  const seen = new Set<string>();
  const unfair: number[] = [];
  for (const c of published) {
    const snap = c.snapshot as { rounds: Round[] };
    const reasons = snap.rounds.map((r) => why(r, seen)).filter((x): x is string => !!x);
    const keep = () =>
      snap.rounds.forEach((r) => seen.add([r.a.playerId, r.b.playerId].sort().join()));
    if (!reasons.length && !forced.has(c.publicNumber!)) {
      keep();
      continue;
    }
    unfair.push(c.publicNumber!);
    if (dry) {
      console.log(`level ${c.publicNumber}: ${reasons.join('; ') || 'forced'}`);
      keep();
      continue;
    }
    const { rounds, maxTier } = buildRounds(c.publicNumber!);
    if (rounds.length < 5) {
      console.log(`level ${c.publicNumber}: not enough duels for a replacement`);
      keep();
      continue;
    }
    const { replacement } = await retireChallenge(
      prisma,
      c.id,
      reasons.length
        ? `Duelo fora das regras: ${[...new Set(reasons)].join('; ')}`
        : 'Substituída a pedido (--levels-to-replace): duelos repetidos ou re-curadoria',
      { params: { rounds }, difficultyTier: maxTier === 2 ? 1 : maxTier === 3 ? 2 : 3 },
      'ai-curator',
    );
    await validateChallenge(prisma, replacement!.id);
    await publishChallenge(prisma, replacement!.id, new Date());
    rounds.forEach((r) => seen.add([r.a.playerId, r.b.playerId].sort().join()));
    replaced++;
  }
  console.log(
    `Mais ou Menos: ${unfair.length} of ${published.length} levels break a rule${unfair.length ? ` (${unfair.join(',')})` : ''}; replaced ${replaced} in place`,
  );
  await prisma.$disconnect();
  process.exit(dry && unfair.length ? 1 : 0);
}

let made = 0;
for (let level = live + 1; level <= TARGET; level++) {
  const { rounds, maxTier } = buildRounds(level);
  if (rounds.length < 5) {
    console.log(`level ${level}: not enough duels, stopping`);
    break;
  }
  try {
    const draft = await createChallenge(prisma, {
      mode: 'HIGHER_LOWER',
      params: { rounds },
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
console.log(`Mais ou Menos: published ${made} new levels (${live + made} in the track)`);
await prisma.$disconnect();
