// Builds and publishes Impostor levels (ADR-011). Each round: a club, 3 verified players with a
// verified spell there and a plausible impostor (verified, never at that club, same country's
// league, overlapping years, similar fame). Early levels use the most famous players.
// Re-runnable: appends levels up to --levels; impostors are not repeated across levels.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/publish-impostor.ts [--levels 100]
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
const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? Number(process.argv[i + 1]) : fallback;
};
const TARGET = arg('--levels', 100);

function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const rnd = seeded('impostor');
const pickOne = <T>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]!;
const TIER = { T1: 1, T2: 2, T3: 3, T4: 4 } as const;

const players = await prisma.player.findMany({
  where: { verificationStatus: 'verified' },
  include: {
    spells: {
      where: {
        verificationStatus: { not: 'rejected' },
        spellType: { in: ['professional', 'loan'] },
      },
      include: { club: { select: { id: true, shortName: true, countryId: true } } },
    },
  },
});
type P = (typeof players)[number];
const yearsAt = (p: P, clubId?: string) =>
  p.spells
    .filter((s) => !clubId || s.clubId === clubId)
    .map((s) => [s.startDate?.getUTCFullYear() ?? 0, s.endDate?.getUTCFullYear() ?? 2026] as const);
const overlaps = (
  a: readonly (readonly [number, number])[],
  b: readonly (readonly [number, number])[],
) => a.some(([s1, e1]) => b.some(([s2, e2]) => s1 <= e2 && s2 <= e1));

// Club -> verified members (verified spell there).
const members = new Map<string, P[]>();
const clubInfo = new Map<string, { name: string; countryId: string }>();
for (const p of players)
  for (const s of p.spells)
    if (s.verificationStatus === 'verified') {
      if (!(members.get(s.clubId) ?? []).includes(p))
        members.set(s.clubId, [...(members.get(s.clubId) ?? []), p]);
      clubInfo.set(s.clubId, { name: s.club.shortName, countryId: s.club.countryId });
    }

const existing = await prisma.challenge.findMany({
  where: { gameMode: 'IMPOSTOR', status: { in: ['draft', 'validated', 'published'] } },
});
const usedImpostors = new Set(
  existing.flatMap((c) =>
    (c.snapshot as { rounds: { impostorId: string }[] }).rounds.map((r) => r.impostorId),
  ),
);
const live = existing.filter((c) => c.status === 'published').length;
console.log(`Impostor: ${live} levels live, ${members.size} clubs with verified players`);

let made = 0;
for (let level = live + 1; level <= TARGET; level++) {
  // Fame ramp (T1 has only a handful of players): T1–T2 first, then up to T3, then anyone.
  const maxTier = level <= 20 ? 2 : level <= 60 ? 3 : 4;
  const fit = (p: P) => TIER[p.notabilityTier] <= maxTier;
  const clubs = [...members.entries()]
    .filter(([, ms]) => ms.filter(fit).length >= 3)
    .map(([id]) => id);
  const used = new Set<string>();
  const usedCountries = new Map<string, number>();
  const rounds = [];
  for (let tries = 0; rounds.length < 5 && tries < 400; tries++) {
    const clubId = pickOne(clubs);
    const info = clubInfo.get(clubId)!;
    if (rounds.some((r) => r.clubId === clubId)) continue;
    if ((usedCountries.get(info.countryId) ?? 0) >= 2) continue; // at most 2 clubs per country
    const ms = members.get(clubId)!.filter((p) => fit(p) && !used.has(p.id));
    if (ms.length < 3) continue;
    const chosen = [...ms].sort(() => rnd() - 0.5).slice(0, 3);
    const era = chosen.flatMap((p) => yearsAt(p, clubId));
    // Plausible impostor: played in the same country, in the same years, similar fame, never here.
    const candidates = players.filter(
      (p) =>
        fit(p) &&
        !used.has(p.id) &&
        !usedImpostors.has(p.id) &&
        !p.spells.some((s) => s.clubId === clubId) &&
        p.spells.some(
          (s) =>
            s.club.countryId === info.countryId &&
            overlaps(
              [[s.startDate?.getUTCFullYear() ?? 0, s.endDate?.getUTCFullYear() ?? 2026]],
              era,
            ),
        ),
    );
    if (!candidates.length) continue;
    const imp = pickOne(candidates);
    for (const p of [...chosen, imp]) used.add(p.id);
    usedImpostors.add(imp.id);
    usedCountries.set(info.countryId, (usedCountries.get(info.countryId) ?? 0) + 1);
    rounds.push({ clubId, memberIds: chosen.map((p) => p.id), impostorId: imp.id });
  }
  if (rounds.length < 5) {
    console.log(`level ${level}: not enough rounds, stopping`);
    break;
  }
  try {
    const draft = await createChallenge(prisma, {
      mode: 'IMPOSTOR',
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
console.log(`Impostor: published ${made} new levels (${live + made} in the track)`);
await prisma.$disconnect();
