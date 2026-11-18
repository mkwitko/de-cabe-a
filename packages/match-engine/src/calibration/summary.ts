/** What calibration and zebra runs keep of a match (small enough to batch thousands). */
import type { MatchResult } from '../contract';
import { shotOrigins } from '../rules/explain';

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
  /** xG by where the chance came from (rules/explain.ts origins). */
  xgBy: Record<'setPiece' | 'transition' | 'positional', [number, number]>;
  /** Balls won within 35 m of the opponents' goal. */
  highWins: [number, number];
  /**
   * Transition (research 18 §1): balls won within 40 m of the opponents' goal and how many of
   * them lead to a shot in the same sequence, before the opponents win it or play stops (Opta:
   * 13% to 21%; Opta Analyst, Premier League 2025/26: 14.9%); losses and how many are won back
   * within 5 s (Bauer and Anzer 2021: counter-press success).
   */
  highTurnovers: [number, number];
  highTurnoverShots: [number, number];
  losses: [number, number];
  regained5s: [number, number];
}

/** A sequence (Opta) ends when play stops: these events end it before any later shot. */
const STOPPAGE = new Set(['foul', 'offside', 'corner', 'throwIn', 'goalKick', 'freeKick', 'goal']);

export function transitions(r: Pick<MatchResult, 'events'>) {
  const out = { ht: [0, 0], hts: [0, 0], losses: [0, 0], back: [0, 0] } as Record<
    'ht' | 'hts' | 'losses' | 'back',
    [number, number]
  >;
  const wins = r.events.filter((e) => e.kind === 'phaseChange' && e.team !== null);
  wins.forEach((e, k) => {
    const t = e.team as 0 | 1;
    const prev = wins[k - 1];
    if (prev && prev.team !== t) {
      out.losses[prev.team as 0 | 1]++;
      // Won back by the side that lost it, within 5 s of losing it.
      const again = wins[k + 1];
      if (again && again.team === prev.team && again.atMs - e.atMs <= 5000)
        out.back[prev.team as 0 | 1]++;
    }
    if (!e.at || (t === 0 ? 1050 - e.at[0] : e.at[0]) >= 400) return;
    out.ht[t]++;
    const end = wins[k + 1]?.id ?? Infinity;
    const first = r.events.find(
      (x) =>
        x.id > e.id && x.id < end && ((x.kind === 'shot' && x.team === t) || STOPPAGE.has(x.kind)),
    );
    if (first?.kind === 'shot') out.hts[t]++;
  });
  return out;
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
    xgBy: (() => {
      const o = shotOrigins(r.events);
      const out = { setPiece: [0, 0], transition: [0, 0], positional: [0, 0] } as Summary['xgBy'];
      for (const e of r.events)
        if (e.kind === 'shot' && e.team !== null) out[o.get(e.id)!][e.team] += e.data.xg ?? 0;
      return out;
    })(),
    ...(() => {
      const t = transitions(r);
      return {
        highTurnovers: t.ht,
        highTurnoverShots: t.hts,
        losses: t.losses,
        regained5s: t.back,
      };
    })(),
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
