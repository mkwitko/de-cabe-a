// Builds and publishes Draft levels (GROWTH_PLAN.md 2.4). Each level is a 4-3-3: per slot, a
// real match (Wikipedia line-ups), one side, the linked player who started there in that
// position, and 3 wrong options who started in that position for the same team in other matches
// (closest seasons first), so the right one takes knowing the match. Early levels use finals and
// the most famous players. Re-runnable: appends levels up to --levels; answers are not repeated.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/publish-draft.ts [--levels 60]
import { createPrisma } from '../../apps/api/src/db';
import {
  createChallenge,
  publishChallenge,
  validateChallenge,
} from '../../apps/api/src/modules/challenges/challenges.service';
import { DRAFT_SLOTS, slotOf } from '../../apps/api/src/modules/challenges/draft-snapshot';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const i = process.argv.indexOf('--levels');
const TARGET = i > 0 ? Number(process.argv[i + 1]) : 60;

function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const rnd = seeded('draft');
const TIER = { T1: 1, T2: 2, T3: 3, T4: 4 } as const;

const matches = await prisma.match.findMany({
  where: { source: 'wikipedia' },
  include: { lineups: { where: { starter: true } } },
});
const tiers = new Map(
  (
    await prisma.player.findMany({
      where: { id: { in: matches.flatMap((m) => m.lineups.flatMap((l) => l.playerId ?? [])) } },
      select: { id: true, notabilityTier: true },
    })
  ).map((p) => [p.id, TIER[p.notabilityTier ?? 'T3']]),
);

interface Start {
  matchId: string;
  side: 'home' | 'away';
  team: string;
  season: number;
  final: boolean;
  playerId: string;
  slot: string;
  tier: number;
}
const starts: Start[] = matches.flatMap((m) =>
  m.lineups.flatMap((l) => {
    const slot = slotOf(l.position);
    if (!l.playerId || !slot || !tiers.has(l.playerId)) return [];
    const side = l.side as 'home' | 'away';
    return [
      {
        matchId: m.id,
        side,
        team: side === 'home' ? m.homeTeam : m.awayTeam,
        season: Number.parseInt(m.season, 10),
        final: m.stage === 'Final',
        playerId: l.playerId,
        slot,
        tier: tiers.get(l.playerId)!,
      },
    ];
  }),
);
const inMatch = new Map<string, Set<string>>();
for (const m of matches) inMatch.set(m.id, new Set(m.lineups.flatMap((l) => l.playerId ?? [])));
const byTeamSlot = new Map<string, Start[]>();
for (const s of starts) {
  const k = `${s.team}|${s.slot}`;
  byTeamSlot.set(k, [...(byTeamSlot.get(k) ?? []), s]);
}

const existing = await prisma.challenge.findMany({
  where: { gameMode: 'DRAFT', status: { in: ['draft', 'validated', 'published'] } },
});
const usedAnswers = new Set(
  existing.flatMap((c) =>
    (c.snapshot as { rounds: { answerId: string }[] }).rounds.map((r) => r.answerId),
  ),
);
const live = existing.filter((c) => c.status === 'published').length;
console.log(
  `Draft: ${live} levels live, ${starts.length} linked starts in ${matches.length} matches`,
);

let made = 0;
for (let level = live + 1; level <= TARGET; level++) {
  // Famous players first (tier plus a little noise); levels 1–20 prefer finals.
  const band = level <= 20 ? 1 : level <= 40 ? 2 : 3;
  const finalsFirst = level <= 20;
  const usedPlayers = new Set<string>();
  const usedMatches = new Set<string>();
  const rounds = [];
  for (const slot of DRAFT_SLOTS) {
    const pool = starts.filter(
      (s) =>
        s.slot === slot &&
        !usedAnswers.has(s.playerId) &&
        !usedPlayers.has(s.playerId) &&
        !usedMatches.has(`${s.matchId}|${s.side}`),
    );
    let round = null;
    const weight = (x: Start) => x.tier + rnd() * 2 + (finalsFirst && !x.final ? 2 : 0);
    const ranked = pool.map((x) => [x, weight(x)] as const).sort((a, b) => a[1] - b[1]);
    for (const [s] of ranked) {
      const others = new Map<string, number>();
      for (const o of byTeamSlot.get(`${s.team}|${slot}`) ?? [])
        if (!inMatch.get(s.matchId)!.has(o.playerId) && !usedPlayers.has(o.playerId))
          others.set(
            o.playerId,
            Math.min(others.get(o.playerId) ?? 999, Math.abs(o.season - s.season)),
          );
      // Closest seasons first, a little shuffle among the nearest six.
      const near = [...others]
        .sort((a, b) => a[1] - b[1])
        .slice(0, 6)
        .sort(() => rnd() - 0.5);
      if (near.length < 3) continue;
      round = { s, decoyIds: near.slice(0, 3).map(([id]) => id) };
      break;
    }
    if (!round) break;
    for (const id of [round.s.playerId, ...round.decoyIds]) usedPlayers.add(id);
    usedMatches.add(`${round.s.matchId}|${round.s.side}`);
    rounds.push({
      matchId: round.s.matchId,
      side: round.s.side,
      playerId: round.s.playerId,
      decoyIds: round.decoyIds,
    });
  }
  if (rounds.length < DRAFT_SLOTS.length) {
    console.log(`level ${level}: not enough rounds, stopping`);
    break;
  }
  try {
    const draft = await createChallenge(prisma, {
      mode: 'DRAFT',
      params: { rounds },
      difficultyTier: band as 1 | 2 | 3,
      createdBy: 'ai-curator',
    });
    await validateChallenge(prisma, draft.id);
    await publishChallenge(prisma, draft.id, new Date());
    for (const r of rounds) usedAnswers.add(r.playerId);
    made++;
  } catch (e) {
    console.log(`level ${level}: ${(e as Error).message.slice(0, 120)}`);
  }
}
console.log(`Draft: published ${made} new levels (${live + made} in the track)`);
await prisma.$disconnect();
