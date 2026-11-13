/** What calibration and zebra runs keep of a match (small enough to batch thousands). */
import type { MatchResult } from '../contract';

export interface Summary {
  score: [number, number];
  xg: [number, number];
  shots: [number, number];
  onTarget: [number, number];
  passes: [number, number];
  completed: [number, number];
  fouls: [number, number];
  yellows: [number, number];
  reds: [number, number];
  corners: [number, number];
  offsides: [number, number];
  possession: [number, number];
  saves: [number, number];
  setPieceGoals: [number, number];
  firstFactor: string | null;
  factors: string[];
  distance: number;
  stamina: number;
  /** Balls won within 35 m of the opponents' goal. */
  highWins: [number, number];
}

export function summary(r: MatchResult): Summary {
  const pair = (f: (t: 0 | 1) => number): [number, number] => [f(0), f(1)];
  const st = r.stats;
  const goalsFrom = (t: 0 | 1) => {
    let n = 0;
    r.events.forEach((e, i) => {
      if (e.kind !== 'goal' || e.team !== t) return;
      for (let j = i - 1; j >= 0 && j > i - 8; j--) {
        const k = r.events[j]!.kind;
        if (k === 'corner' || k === 'freeKick' || k === 'penalty') {
          n++;
          return;
        }
        if (k === 'phaseChange') return;
      }
    });
    return n;
  };
  return {
    score: r.score,
    xg: pair((t) => st[t].xg),
    shots: pair((t) => st[t].shots),
    onTarget: pair((t) => st[t].shotsOnTarget),
    passes: pair((t) => st[t].passes),
    completed: pair((t) => st[t].passesCompleted),
    fouls: pair((t) => st[t].fouls),
    yellows: pair((t) => st[t].yellowCards),
    reds: pair((t) => st[t].redCards),
    corners: pair((t) => st[t].corners),
    offsides: pair((t) => st[t].offsides),
    possession: pair((t) => st[t].possession),
    saves: pair(
      (t) =>
        r.events.filter((e) => e.kind === 'save' && e.team === t && !e.data.block && !e.data.wide)
          .length,
    ),
    setPieceGoals: pair(goalsFrom),
    firstFactor: r.explanation.factors[0]?.message.key ?? null,
    factors: r.explanation.factors.map((f) => f.message.key),
    distance: r.players.reduce((a, p) => a + p.distanceM, 0) / r.players.length,
    stamina: r.players.reduce((a, p) => a + p.stamina, 0) / r.players.length,
    highWins: pair(
      (t) =>
        r.events.filter(
          (e) =>
            e.kind === 'phaseChange' &&
            e.team === t &&
            e.at &&
            (t === 0 ? e.at[0] : 1050 - e.at[0]) > 700,
        ).length,
    ),
  };
}
