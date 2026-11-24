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
  /** Big chances (Opta-like, shot event `big`), those after a team-mate's pass, and their goals. */
  bigChances: [number, number];
  bigFromPass: [number, number];
  bigGoals: [number, number];
  /** Progressive passes (FBref definition, progressivePasses). */
  progressive: [number, number];
  highTurnovers: [number, number];
  highTurnoverShots: [number, number];
  losses: [number, number];
  regained5s: [number, number];
  /** Squad and body (TEST_STRATEGY §2.1 group e): injuries, substitutions, mean rating. */
  injuries: [number, number];
  subs: [number, number];
  rating: number;
}

/** A sequence (Opta) ends when play stops: these events end it before any later shot. */
const STOPPAGE = new Set(['foul', 'offside', 'corner', 'throwIn', 'goalKick', 'freeKick', 'goal']);

const YARD = 0.9144;
/**
 * Progressive passes, FBref definition: a completed pass that moves the ball at least 10 yards
 * towards the opponents' goal from the furthest point of the last six passes, or any completed
 * pass into the penalty area; passes from the defending 40% of the pitch do not count.
 * ponytail: "last six passes" restarts when the other team touches the ball or play stops.
 */
export function progressivePasses(r: Pick<MatchResult, 'events'>): [number, number] {
  const out: [number, number] = [0, 0];
  const starts: [number[], number[]] = [[], []];
  let from: { team: 0 | 1; x: number } | null = null;
  const frame = (team: 0 | 1, at: [number, number]) => {
    const x = at[0] / 10;
    const y = at[1] / 10;
    return team === 0 ? { x, y } : { x: 105 - x, y: 68 - y };
  };
  for (const e of r.events) {
    if (STOPPAGE.has(e.kind)) {
      starts[0] = [];
      starts[1] = [];
      from = null;
      continue;
    }
    if (e.team === null || !e.at) continue;
    if (['pass', 'reception', 'interception', 'tackle'].includes(e.kind)) starts[1 - e.team] = [];
    if (e.kind === 'pass') {
      const x = frame(e.team, e.at).x;
      starts[e.team] = [...starts[e.team], x].slice(-6);
      from = { team: e.team, x };
    } else if (e.kind === 'reception' && from && from.team === e.team) {
      const to = frame(e.team, e.at);
      const inBox = to.x > 105 - 16.5 && Math.abs(to.y - 34) < 20.16;
      const furthest = Math.max(...starts[e.team]);
      if (from.x >= 0.4 * 105 && (to.x - furthest >= 10 * YARD || (inBox && from.x <= 105 - 16.5)))
        out[e.team]++;
      from = null;
    } else from = null;
  }
  return out;
}

/** Events that are not a touch of the ball. */
const OFF_PLAY = new Set(['substitution', 'command', 'card', 'injury']);
/** Events after which possession changes at a restart, not in open play. */
const RESTART_CAUSE = new Set([
  'throwIn',
  'freeKick',
  'corner',
  'goalKick',
  'kickOff',
  'foul',
  'offside',
  'penalty',
]);

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
    // Opta's high turnover: won in open play within 40 m of the opponents' goal (a radius, not a
    // line across the pitch); a change of possession at a restart is not one.
    const before = r.events[r.events.indexOf(e) - 1];
    if (!e.at || (before && RESTART_CAUSE.has(before.kind))) return;
    if (Math.hypot(t === 0 ? 1050 - e.at[0] : e.at[0], 340 - e.at[1]) >= 400) return;
    out.ht[t]++;
    // Opta's sequence ends at a shot, a stoppage or any defensive action, even one that leaves
    // the ball with the attackers (a failed tackle, a deflected pass, a save).
    const first = r.events.find(
      (x) =>
        x.id > e.id &&
        ((x.kind === 'shot' && x.team === t) ||
          STOPPAGE.has(x.kind) ||
          x.kind === 'periodEnd' ||
          (x.team !== null && x.team !== t && !OFF_PLAY.has(x.kind))),
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
    ...(() => {
      const b: Record<'n' | 'pass' | 'goal', [number, number]> = {
        n: [0, 0],
        pass: [0, 0],
        goal: [0, 0],
      };
      r.events.forEach((e, i) => {
        if (e.kind !== 'shot' || !e.data.big || e.team === null) return;
        b.n[e.team]++;
        const prev = r.events[i - 1];
        if (prev?.kind === 'reception' && prev.playerId === e.playerId && prev.otherId)
          b.pass[e.team]++;
        const nx = r.events.slice(i + 1).find((q) => q.kind === 'shot' || q.kind === 'goal');
        if (nx?.kind === 'goal' && nx.team === e.team) b.goal[e.team]++;
      });
      return { bigChances: b.n, bigFromPass: b.pass, bigGoals: b.goal };
    })(),
    progressive: progressivePasses(r),
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
    injuries: pair((t) => r.events.filter((e) => e.kind === 'injury' && e.team === t).length),
    subs: pair((t) => r.events.filter((e) => e.kind === 'substitution' && e.team === t).length),
    rating: (() => {
      const on = r.players.filter((p) => p.minutes > 0);
      return on.reduce((a, p) => a + p.rating, 0) / (on.length || 1);
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
