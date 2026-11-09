/**
 * The Copa dos Sonhos pool, built once from the World Cup line-ups: every starter rated from
 * his World Cup facts (see manager.ts), and the legendary sides (a side at one World Cup with
 * at least 9 known starters) with their XI and strength. Matches held twice (two sources) count
 * once.
 */
import type { PrismaClient } from '../../generated/prisma/client';
import { slotOf } from '../challenges/draft-snapshot';
import { overall, stageDepth, type Rated, type Slot } from './manager';

/** Winners up to 2022 (finals decided on penalties need it); later ones come from the score. */
const CHAMPIONS: Record<string, string> = {
  '1930': 'Uruguay',
  '1934': 'Italy',
  '1938': 'Italy',
  '1950': 'Uruguay',
  '1954': 'West Germany',
  '1958': 'Brazil',
  '1962': 'Brazil',
  '1966': 'England',
  '1970': 'Brazil',
  '1974': 'West Germany',
  '1978': 'Argentina',
  '1982': 'Italy',
  '1986': 'Argentina',
  '1990': 'West Germany',
  '1994': 'Brazil',
  '1998': 'France',
  '2002': 'Brazil',
  '2006': 'Italy',
  '2010': 'Spain',
  '2014': 'Germany',
  '2018': 'France',
  '2022': 'Argentina',
};

export interface LegendSide {
  key: string;
  team: string;
  season: string;
  champion: boolean;
  xi: Rated[];
  strength: number;
}
export interface CopaPool {
  players: Map<string, Rated>;
  bySlot: Map<Slot, Rated[]>;
  sides: LegendSide[];
}

let cache: Promise<CopaPool> | null = null;
// ponytail: cached for the process lifetime; restart the API after importing new matches.
export const copaPool = (prisma: PrismaClient) => (cache ??= build(prisma));

async function build(prisma: PrismaClient): Promise<CopaPool> {
  const rows = await prisma.matchLineup.findMany({
    where: { starter: true, playerId: { not: null }, match: { competition: 'FIFA World Cup' } },
    select: {
      playerId: true,
      side: true,
      position: true,
      match: {
        select: {
          season: true,
          stage: true,
          homeTeam: true,
          awayTeam: true,
          homeScore: true,
          awayScore: true,
        },
      },
    },
  });
  const champions = { ...CHAMPIONS };
  for (const r of rows) {
    const m = r.match;
    if (
      m.stage === 'Final' &&
      !champions[m.season] &&
      m.homeScore !== null &&
      m.awayScore !== null &&
      m.homeScore !== m.awayScore
    )
      champions[m.season] = m.homeScore > m.awayScore ? m.homeTeam : m.awayTeam;
  }

  type Agg = {
    starts: Set<string>;
    cups: Set<string>;
    finals: number;
    depth: number;
    titles: Set<string>;
    slots: Map<Slot, number>;
    sideStarts: Map<string, number>;
  };
  const agg = new Map<string, Agg>();
  for (const r of rows) {
    const m = r.match;
    const team = r.side === 'home' ? m.homeTeam : m.awayTeam;
    const depth = stageDepth(m.stage);
    const key = `${m.season}|${[m.homeTeam, m.awayTeam].sort().join('-')}|${depth}`;
    const a = agg.get(r.playerId!) ?? {
      starts: new Set(),
      cups: new Set(),
      finals: 0,
      depth: 0,
      titles: new Set(),
      slots: new Map(),
      sideStarts: new Map(),
    };
    if (a.starts.has(key)) continue;
    a.starts.add(key);
    a.cups.add(m.season);
    if (depth === 4) a.finals++;
    a.depth = Math.max(a.depth, depth);
    if (champions[m.season] === team) a.titles.add(m.season);
    const slot = slotOf(r.position);
    if (slot) a.slots.set(slot, (a.slots.get(slot) ?? 0) + 1);
    const side = `${team}|${m.season}`;
    a.sideStarts.set(side, (a.sideStarts.get(side) ?? 0) + 1);
    agg.set(r.playerId!, a);
  }

  const ids = [...agg.keys()];
  const [people, spells] = await Promise.all([
    prisma.player.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        canonicalName: true,
        notabilityTier: true,
        primaryPositionGroup: true,
        nationalityCountryId: true,
      },
    }),
    prisma.careerSpell.findMany({
      where: { playerId: { in: ids }, startDate: { not: null } },
      select: {
        playerId: true,
        clubId: true,
        startDate: true,
        endDate: true,
        club: { select: { shortName: true } },
      },
    }),
  ]);
  const clubs = new Map<string, Rated['clubs']>();
  for (const s of spells) {
    const list = clubs.get(s.playerId) ?? [];
    list.push([
      s.clubId,
      s.club.shortName,
      s.startDate!.getUTCFullYear(),
      s.endDate?.getUTCFullYear() ?? 2026,
    ]);
    clubs.set(s.playerId, list);
  }

  const players = new Map<string, Rated>();
  for (const p of people) {
    const a = agg.get(p.id)!;
    const slot = ([...a.slots].sort((x, y) => y[1] - x[1])[0]?.[0] ??
      p.primaryPositionGroup) as Slot | null;
    if (!slot) continue;
    const [side] = [...a.sideStarts].sort(
      (x, y) => y[1] - x[1] || Number(y[0].split('|')[1]) - Number(x[0].split('|')[1]),
    )[0]!;
    const facts = {
      cups: a.cups.size,
      starts: a.starts.size,
      finals: a.finals,
      titles: a.titles.size,
    };
    players.set(p.id, {
      id: p.id,
      name: p.canonicalName,
      slot,
      overall: overall({ ...facts, depth: a.depth, tier: p.notabilityTier }),
      facts,
      team: side.split('|')[0]!,
      season: side.split('|')[1]!,
      sides: [...a.sideStarts.keys()],
      nationality: p.nationalityCountryId,
      clubs: clubs.get(p.id) ?? [],
    });
  }

  const bySlot = new Map<Slot, Rated[]>();
  for (const p of players.values()) bySlot.set(p.slot, [...(bySlot.get(p.slot) ?? []), p]);
  for (const list of bySlot.values()) list.sort((a, b) => b.overall - a.overall);

  const sideMembers = new Map<string, { p: Rated; starts: number }[]>();
  for (const [id, a] of agg) {
    const p = players.get(id);
    if (!p) continue;
    for (const [side, n] of a.sideStarts)
      sideMembers.set(side, [...(sideMembers.get(side) ?? []), { p, starts: n }]);
  }
  const sides: LegendSide[] = [];
  for (const [key, members] of sideMembers) {
    if (members.length < 9) continue;
    const xi = members
      .sort((a, b) => b.starts - a.starts || b.p.overall - a.p.overall)
      .slice(0, 11)
      .map((m) => m.p);
    const [team, season] = key.split('|') as [string, string];
    const champion = champions[season] === team;
    const avg = xi.reduce((s, p) => s + p.overall, 0) / xi.length;
    sides.push({ key, team, season, champion, xi, strength: avg + 3 + (champion ? 1 : 0) });
  }
  sides.sort((a, b) => a.strength - b.strength);
  return { players, bySlot, sides };
}
