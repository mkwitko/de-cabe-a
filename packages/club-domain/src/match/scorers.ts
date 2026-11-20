/**
 * Who scored and who set it up in a match nobody watched: the side's goals dealt among the men
 * on the pitch, weighted by position and attributes, drawn from the match seed and the goal's
 * index so it never feeds back into a result. Integers and + − × ÷ only (ADR-020).
 *
 * Shares are calibrated to the match engine (40 level 1 matches of the 4-3-3 fixture: striker 40 %, wingers 4 %,
 * midfield 22 %, full-backs 16 %, centre-backs 9 %, subs 11 %; one third unassisted) and
 * to real football: a Série A season's top scorer has 15-29 goals (reality bench).
 */
import type { PackPlayer } from '../pack/schema';

export interface Goal {
  scorer: string;
  /** The man who set it up; null for a goal with no assist (solo, rebound, set piece, penalty). */
  assist: string | null;
}

/** Relative chance to score by first position (PARÂMETRO, calibrated to the engine). */
const SCORE: Record<string, number> = {
  ST: 60,
  SS: 52,
  LW: 36,
  RW: 36,
  AM: 34,
  LM: 28,
  RM: 28,
  CM: 26,
  DM: 15,
  LB: 12,
  RB: 12,
  CB: 20,
  GK: 0,
};
/** Relative chance to set one up by first position. */
const ASSIST: Record<string, number> = {
  ST: 40,
  SS: 60,
  LW: 80,
  RW: 80,
  AM: 90,
  LM: 60,
  RM: 60,
  CM: 55,
  DM: 25,
  LB: 35,
  RB: 35,
  CB: 8,
  GK: 1,
};
/** Share of goals with no assist, in hundredths (Série A: about a third are unassisted). */
const UNASSISTED = 30;
/** Share of goals from the penalty spot, in hundredths (about 9 % in the Brasileirão). */
const PENALTY = 9;

/** A fixed number 0..2^31 for a seed, a goal and a purpose. */
function hash(seed: number, k: number): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 2246822519) ^ Math.imul(k + 1, 3266489917);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489917);
  h ^= h >>> 16;
  return h >>> 0;
}

const pos = (p: PackPlayer) => p.positions[0]!.position;

/** How well a man finishes, 1..99 squared: the best attackers take a share well above even. */
const finish = (p: PackPlayer) => {
  const a = p.attributes;
  const f = (a.finishing * 4 + a.offTheBall * 2 + a.heading + a.composure) / 8;
  return (f * f) / 100;
};
const create = (p: PackPlayer) => {
  const a = p.attributes;
  const f = (a.passing * 2 + a.vision * 2 + a.crossing + a.technique) / 6;
  return (f * f) / 100;
};

function pick(
  squad: readonly PackPlayer[],
  weight: (p: PackPlayer) => number,
  r: number,
  skip?: string,
): string {
  const w = squad.map((p) => (p.id === skip ? 0 : Math.floor(weight(p) * 100)));
  let left =
    r %
    Math.max(
      1,
      w.reduce((a, b) => a + b, 0),
    );
  for (const [i, x] of w.entries()) if ((left -= x) < 0) return squad[i]!.id;
  return squad[0]!.id;
}

/**
 * `n` goals of one side, for the men `onPitch` (a club's eleven, or its best fourteen). `seed` is
 * the match's (and side's) seed. Empty when nobody can score.
 */
export function attribute(seed: number, n: number, onPitch: readonly PackPlayer[]): Goal[] {
  const squad = onPitch.filter((p) => (SCORE[pos(p)] ?? 0) > 0);
  if (!n || !squad.length) return [];
  // The penalty taker: the best finisher with a cool head among the outfield.
  const taker = squad.reduce((b, p) =>
    p.attributes.finishing + p.attributes.composure >
    b.attributes.finishing + b.attributes.composure
      ? p
      : b,
  );
  const out: Goal[] = [];
  for (let i = 0; i < n; i++) {
    const penalty = hash(seed, i * 4) % 100 < PENALTY;
    const scorer = penalty
      ? taker.id
      : pick(squad, (p) => (SCORE[pos(p)] ?? 0) * finish(p), hash(seed, i * 4 + 1));
    const assist =
      penalty || hash(seed, i * 4 + 2) % 100 < UNASSISTED
        ? null
        : pick(onPitch, (p) => (ASSIST[pos(p)] ?? 10) * create(p), hash(seed, i * 4 + 3), scorer);
    out.push({ scorer, assist });
  }
  return out;
}
