/**
 * The sticker card's numbers, all real: career games, goals, clubs, seasons, starts for the
 * national team in the line-ups we hold, games at big clubs, and the "Nota De Cabeça" made
 * from them. No estimated pace or shooting: what we do not know stays null ("—" on the card).
 */
import type { PrismaClient } from '../../generated/prisma/client';
import { BIG_BRAZILIAN_CLUBS } from '../challenges/career-path-difficulty';
import { stickerPhoto, stickerStats } from '../knowledge/player-card';
import { displayName } from '../challenges/connections-snapshot';

/** Clubs every fan knows, by "ISO:shortName" (short names repeat across countries). */
export const BIG_CLUBS = new Set([
  ...[...BIG_BRAZILIAN_CLUBS, 'Vasco da Gama'].map((c) => `BR:${c}`),
  'ES:Real Madrid',
  'ES:Barcelona',
  'ES:Atlético de Madrid',
  'GB:Manchester United',
  'GB:Manchester City',
  'GB:Liverpool',
  'GB:Arsenal',
  'GB:Chelsea',
  'IT:Juventus',
  'IT:Milan',
  'IT:Inter de Milão',
  'DE:Bayern de Munique',
  'DE:Borussia Dortmund',
  'FR:Paris Saint-Germain',
  'FR:PSG',
  'NL:Ajax',
  'PT:Benfica',
  'PT:Porto',
  'AR:Boca Juniors',
  'AR:River Plate',
]);

/** Line-ups that count as national-team games. */
const NATIONAL = ['FIFA World Cup', 'Copa América'];

export interface NotaFacts {
  tier: 'T1' | 'T2' | 'T3' | 'T4';
  /** Career league games / goals (null when any spell lacks them). */
  games: number | null;
  goals: number | null;
  /** National-team starts in the line-ups we hold (World Cup, Copa América). */
  nationalGames: number;
  worldCupTitles: number;
  /** Spells at a big club, and league games there (null when unknown). */
  bigClubs: number;
  bigClubGames: number | null;
}

const BASE = { T1: 78, T2: 70, T3: 62, T4: 55 } as const;

/**
 * Nota De Cabeça, 50–99, deterministic:
 *   fame tier (T1 78, T2 70, T3 62, T4 55)
 * + career games / 100, at most 6       (600+ league games)
 * + career goals / 60, at most 4        (240+ league goals)
 * + national-team starts / 4, at most 4 (16+ starts in our line-ups)
 * + 2 per World Cup won, at most 4
 * + big club: 3 for having played at one, 2 more with 100+ games there
 * rounded, clamped to 50–99. Unknown numbers add nothing.
 */
export function notaDeCabeca(f: NotaFacts) {
  const raw =
    BASE[f.tier] +
    Math.min((f.games ?? 0) / 100, 6) +
    Math.min((f.goals ?? 0) / 60, 4) +
    Math.min(f.nationalGames / 4, 4) +
    Math.min(2 * f.worldCupTitles, 4) +
    (f.bigClubs ? 3 : 0) +
    ((f.bigClubGames ?? 0) >= 100 ? 2 : 0);
  return Math.max(50, Math.min(99, Math.round(raw)));
}

/** Prisma include for `cardNumbers`: the professional spells that count, with dates and club. */
export const cardSpells = {
  where: { verificationStatus: { not: 'rejected' }, spellType: { not: 'youth' } },
  select: {
    clubId: true,
    appearances: true,
    goals: true,
    startDate: true,
    endDate: true,
    club: { select: { shortName: true, country: { select: { isoCode: true } } } },
  },
} as const;

type Spell = {
  clubId: string;
  appearances: number | null;
  goals: number | null;
  startDate: Date | null;
  endDate: Date | null;
  club: { shortName: string; country: { isoCode: string } };
};
export type National = { games: number; worldCupTitles: number };

/** National-team starts and World Cups won, per footballer, from the line-ups we hold. */
export async function nationalRecords(prisma: PrismaClient, ids: string[]) {
  const out = new Map<string, National>();
  if (!ids.length) return out;
  const rows = await prisma.matchLineup.findMany({
    where: { playerId: { in: ids }, starter: true, match: { competition: { in: NATIONAL } } },
    select: {
      playerId: true,
      side: true,
      matchId: true,
      match: {
        select: {
          competition: true,
          stage: true,
          homeTeam: true,
          awayTeam: true,
          homeScore: true,
          awayScore: true,
        },
      },
    },
  });
  const seen = new Set<string>();
  for (const r of rows) {
    const key = `${r.playerId}|${r.matchId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const n = out.get(r.playerId!) ?? { games: 0, worldCupTitles: 0 };
    n.games++;
    const m = r.match;
    // ponytail: a final drawn and won on penalties is not counted (we hold no shoot-out result)
    const won =
      m.homeScore !== null &&
      m.awayScore !== null &&
      (r.side === 'home' ? m.homeScore > m.awayScore : m.awayScore > m.homeScore);
    if (m.competition === 'FIFA World Cup' && m.stage === 'Final' && won) n.worldCupTitles++;
    out.set(r.playerId!, n);
  }
  return out;
}

/** Every number on the card, rating included. */
export function cardNumbers(
  p: { notabilityTier: NotaFacts['tier']; spells: Spell[] },
  national: National | undefined,
  nowYear: number,
) {
  const stats = stickerStats(p.spells);
  const years = p.spells.flatMap((s) =>
    s.startDate ? [s.startDate.getUTCFullYear(), s.endDate?.getUTCFullYear() ?? nowYear] : [],
  );
  const big = p.spells.filter((s) =>
    BIG_CLUBS.has(`${s.club.country.isoCode}:${s.club.shortName}`),
  );
  const bigClubGames =
    big.length && big.every((s) => s.appearances !== null)
      ? big.reduce((n, s) => n + s.appearances!, 0)
      : null;
  const nationalGames = national?.games ?? 0;
  return {
    ...stats,
    seasons: years.length ? Math.max(...years) - Math.min(...years) + 1 : null,
    nationalGames: nationalGames || null,
    bigClubGames: big.length ? bigClubGames : 0,
    rating: notaDeCabeca({
      tier: p.notabilityTier,
      games: stats.games,
      goals: stats.goals,
      nationalGames,
      worldCupTitles: national?.worldCupTitles ?? 0,
      bigClubs: big.length,
      bigClubGames,
    }),
  };
}

/** Prisma include for `stickerFace`. */
export const cardInclude = {
  nationality: true,
  spells: cardSpells,
  aliases: { select: { alias: true } },
} as const;

type PositionGroup = 'GK' | 'DF' | 'MF' | 'FW';

/**
 * The card's position. Wikidata often lists wide forwards as midfielders first (Neymar: MF,
 * also FW); a midfielder also known as a forward who scores at a forward's rate (0.35+ league
 * goals a game) is shown as ATA. Everyone else keeps the primary position.
 * ponytail: goal-rate heuristic; switch to the most-played role once line-up roles are stored.
 */
export function cardPosition(
  primary: PositionGroup | null,
  secondary: PositionGroup[],
  games: number | null,
  goals: number | null,
): PositionGroup | null {
  if (
    primary === 'MF' &&
    secondary.includes('FW') &&
    games &&
    goals !== null &&
    goals / games >= 0.35
  )
    return 'FW';
  return primary;
}

/** Everything on the sticker but its rarity and when it was earned. */
export function stickerFace(
  p: Parameters<typeof cardNumbers>[0] &
    Parameters<typeof displayName>[0] &
    Parameters<typeof stickerPhoto>[0] & {
      id: string;
      primaryPositionGroup: PositionGroup | null;
      secondaryPositionGroups: PositionGroup[];
      nationality: { name: string; isoCode: string };
    },
  national: National | undefined,
  nowYear: number,
) {
  const numbers = cardNumbers(p, national, nowYear);
  return {
    playerId: p.id,
    name: displayName(p),
    positionGroup: cardPosition(
      p.primaryPositionGroup,
      p.secondaryPositionGroups,
      numbers.games,
      numbers.goals,
    ),
    nationality: p.nationality.name,
    nationalityCode: p.nationality.isoCode,
    ...numbers,
    ...stickerPhoto(p),
  };
}
