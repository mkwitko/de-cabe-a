/**
 * Football Grid snapshot (FOOTBALL_GRID.md §2-§4, §8): resolves criteria, computes each cell's
 * eligible pool from verified data only, checks minimums and combinations, picks examples.
 */
import { checkGridCombination, type Criterion, type FootballGridConfig } from '@decabeca/engine';
import { z } from 'zod';
import type { PrismaClient } from '../../generated/prisma/client';
import { AppError } from '../../errors';

export const CriterionParam = z.discriminatedUnion('type', [
  z.object({ type: z.literal('club'), clubId: z.string() }),
  z.object({ type: z.literal('nationality'), countryId: z.string() }),
  z.object({ type: z.literal('position'), positionGroup: z.enum(['GK', 'DF', 'MF', 'FW']) }),
  z.object({ type: z.literal('played_in_country'), countryId: z.string() }),
]);
export type CriterionParam = z.infer<typeof CriterionParam>;
export const GridParams = z.object({
  rows: z.tuple([CriterionParam, CriterionParam, CriterionParam]),
  cols: z.tuple([CriterionParam, CriterionParam, CriterionParam]),
  /** Optional editor choice of example answer per cell index. */
  examples: z.record(z.string(), z.string()).optional(),
});
export type GridParams = z.infer<typeof GridParams>;

const MIN_PER_CELL = { daily: 8, practice: 5 } as const;
const WEAK_CELL = 200;
const POSITION_LABEL = {
  GK: 'Goleiro',
  DF: 'Defensor',
  MF: 'Meio-campista',
  FW: 'Atacante',
} as const;
const TIER_ORDER = { T1: 0, T2: 1, T3: 2, T4: 3 } as const;

/** A hint about the example answer: first letter and letters per word ("Zé Roberto" -> Z, [2, 7]). */
export function hintFor(name: string): { initial: string; pattern: number[] } {
  const words = name.trim().split(/\s+/);
  return { initial: name.trim()[0]!.toUpperCase(), pattern: words.map((w) => w.length) };
}

/** §8: average pool size ≥ 40 -> 1; 15-39 -> 2; below -> 3. */
export function gridDifficulty(counts: number[]): 1 | 2 | 3 {
  const avg = counts.reduce((a, b) => a + b, 0) / (counts.length || 1);
  return avg >= 40 ? 1 : avg >= 15 ? 2 : 3;
}

interface Candidate {
  id: string;
  canonicalName: string;
  notabilityTier: keyof typeof TIER_ORDER;
  nationalities: Set<string>;
  position: string | null;
  clubs: Set<string>;
  countries: Set<string>;
}

// ponytail: loads every verified player into memory; fine for the pilot (~300), move the
// intersection to SQL if the verified pool reaches tens of thousands.
async function loadCandidates(prisma: PrismaClient): Promise<Candidate[]> {
  const players = await prisma.player.findMany({
    where: { verificationStatus: 'verified' },
    include: {
      spells: {
        where: { verificationStatus: 'verified', spellType: { in: ['professional', 'loan'] } },
        include: { club: true },
      },
    },
  });
  return players.map((p) => ({
    id: p.id,
    canonicalName: p.canonicalName,
    notabilityTier: p.notabilityTier,
    nationalities: new Set([
      p.nationalityCountryId,
      ...(p.secondaryNationalityCountryId ? [p.secondaryNationalityCountryId] : []),
    ]),
    position: p.primaryPositionGroup,
    clubs: new Set(p.spells.map((s) => s.clubId)),
    countries: new Set(p.spells.map((s) => s.club.countryId)),
  }));
}

const matches = (c: CriterionParam, p: Candidate) =>
  c.type === 'club'
    ? p.clubs.has(c.clubId)
    : c.type === 'nationality'
      ? p.nationalities.has(c.countryId)
      : c.type === 'position'
        ? p.position === c.positionGroup
        : p.countries.has(c.countryId);

export async function buildGridSnapshot(
  prisma: PrismaClient,
  params: GridParams,
  kind: 'daily' | 'practice',
) {
  const all = [...params.rows, ...params.cols];
  const clubIds = all.flatMap((c) => (c.type === 'club' ? [c.clubId] : []));
  const countryIds = all.flatMap((c) =>
    c.type === 'nationality' || c.type === 'played_in_country' ? [c.countryId] : [],
  );
  const [clubs, countries] = await Promise.all([
    prisma.club.findMany({ where: { id: { in: clubIds } } }),
    prisma.country.findMany({ where: { id: { in: countryIds } } }),
  ]);
  const clubById = new Map(clubs.map((c) => [c.id, c]));
  const countryById = new Map(countries.map((c) => [c.id, c]));
  const reasons: string[] = [];

  const resolve = (c: CriterionParam): Criterion => {
    if (c.type === 'club') {
      const club = clubById.get(c.clubId);
      if (!club) throw new AppError(404, 'NOT_FOUND', `Clube ${c.clubId} não encontrado.`);
      if (club.verificationStatus !== 'verified') reasons.push('UNVERIFIED_CLUB');
      return { type: 'club', clubId: club.id, label: club.shortName };
    }
    if (c.type === 'position')
      return {
        type: 'position',
        positionGroup: c.positionGroup,
        label: POSITION_LABEL[c.positionGroup],
      };
    const country = countryById.get(c.countryId);
    if (!country) throw new AppError(404, 'NOT_FOUND', `País ${c.countryId} não encontrado.`);
    return c.type === 'nationality'
      ? {
          type: 'nationality',
          countryId: country.id,
          label: country.name,
          flagCode: country.isoCode,
        }
      : {
          type: 'played_in_country',
          countryId: country.id,
          label: `Jogou em ${country.name}`,
          flagCode: country.isoCode,
        };
  };
  const rows = params.rows.map(resolve) as FootballGridConfig['rows'];
  const cols = params.cols.map(resolve) as FootballGridConfig['cols'];
  reasons.push(
    ...checkGridCombination(rows, cols, Object.fromEntries(clubs.map((c) => [c.id, c.countryId]))),
  );

  const candidates = await loadCandidates(prisma);
  const warnings: string[] = [];
  const cells = [];
  const counts: number[] = [];
  for (let i = 0; i < 9; i++) {
    const row = params.rows[Math.floor(i / 3)]!;
    const col = params.cols[i % 3]!;
    const pool = candidates
      .filter((p) => matches(row, p) && matches(col, p))
      .sort(
        (a, b) =>
          TIER_ORDER[a.notabilityTier] - TIER_ORDER[b.notabilityTier] ||
          a.canonicalName.localeCompare(b.canonicalName),
      );
    counts.push(pool.length);
    if (pool.length < MIN_PER_CELL[kind]) reasons.push(`CELL_${i}_TOO_SMALL`);
    if (pool.length > WEAK_CELL) warnings.push(`CELL_${i}_WEAK_CRITERION`);
    const chosen = params.examples?.[String(i)];
    if (chosen && !pool.some((p) => p.id === chosen))
      reasons.push(`CELL_${i}_EXAMPLE_NOT_ELIGIBLE`);
    if (pool.length) {
      const example = pool.find((p) => p.id === chosen) ?? pool[0]!;
      cells.push({
        index: i,
        eligiblePlayerIds: pool.map((p) => p.id),
        exampleAnswerPlayerId: example.id,
        hint: hintFor(example.canonicalName),
      });
    }
  }

  const unique = [...new Set(reasons)];
  const eligible = unique.length === 0;
  const config: Omit<FootballGridConfig, 'difficultyTier'> | null = eligible
    ? {
        engine: 'football-grid',
        engineVersion: 2,
        maxHints: 3,
        maxAttempts: 9,
        rows,
        cols,
        cells: cells as FootballGridConfig['cells'],
      }
    : null;
  return { eligible, reasons: unique, warnings, counts, config };
}
