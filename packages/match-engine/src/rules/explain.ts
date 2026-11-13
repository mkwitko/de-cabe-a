/**
 * Match explanation (02 §11; MC-043): a pure function of the event log. It
 * splits the goal difference into creation (xG difference) and conversion
 * (goals minus xG on each side), attributes creation to where the chances came
 * from, and returns message keys with numbers and evidence, never text.
 * Point of view: team 0 (the home side); the screen flips signs for team 1.
 *
 * Origins partition the shots, so their weights add up to the creation exactly;
 * a factor is cited only when it differs from the opponent's by THRESHOLD xG.
 */
import type { Explanation, Factor, MatchEvent } from '../contract';

/** PARAMETERS: seconds after a restart or a won ball that a shot still belongs to it, and the citing threshold. */
const SET_PIECE_WINDOW = 10_000;
const TRANSITION_WINDOW = 10_000;
const THRESHOLD = 0.15;

type Origin = 'setPiece' | 'transition' | 'positional';
const RESTARTS = new Set(['corner', 'freeKick', 'penalty', 'throwIn']);

const round = (x: number) => Math.round(x * 100) / 100;

/** Where each shot came from: a set piece, a ball won in the last seconds, or a settled attack. */
export function shotOrigins(events: MatchEvent[]): Map<number, Origin> {
  const out = new Map<number, Origin>();
  let restartAt = -Infinity;
  let restartTeam: 0 | 1 | null = null;
  let wonAt = -Infinity;
  let wonTeam: 0 | 1 | null = null;
  for (const e of events) {
    if (RESTARTS.has(e.kind)) {
      restartAt = e.atMs;
      restartTeam = e.team;
    }
    if (e.kind === 'phaseChange' && e.data.won) {
      wonAt = e.atMs;
      wonTeam = e.team;
    }
    if (e.kind !== 'shot') continue;
    if (
      (e.data.penalty ?? 0) > 0 ||
      (restartTeam === e.team && e.atMs - restartAt < SET_PIECE_WINDOW)
    )
      out.set(e.id, 'setPiece');
    else if (wonTeam === e.team && e.atMs - wonAt < TRANSITION_WINDOW) out.set(e.id, 'transition');
    else out.set(e.id, 'positional');
  }
  return out;
}

const KEYS: Record<Origin, { key: string; decision: string }> = {
  setPiece: { key: 'match.explain.setPieces', decision: 'setPieces' },
  transition: { key: 'match.explain.transition', decision: 'restDefence' },
  positional: { key: 'match.explain.positional', decision: 'buildUp' },
};

export function explain(events: MatchEvent[], endMinute = 90): Explanation {
  const origins = shotOrigins(events);
  const xg: [number, number] = [0, 0];
  const goals: [number, number] = [0, 0];
  const psxg: [number, number] = [0, 0]; // on-target quality faced by each team's keeper
  const byOrigin: Record<Origin, { xg: [number, number]; ids: number[] }> = {
    setPiece: { xg: [0, 0], ids: [] },
    transition: { xg: [0, 0], ids: [] },
    positional: { xg: [0, 0], ids: [] },
  };
  const shotIds: [number[], number[]] = [[], []];
  for (const e of events) {
    if (e.team === null) continue;
    if (e.kind === 'shot') {
      const v = e.data.xg ?? 0;
      xg[e.team] += v;
      const o = origins.get(e.id)!;
      byOrigin[o].xg[e.team] += v;
      byOrigin[o].ids.push(e.id);
      shotIds[e.team].push(e.id);
      psxg[e.team === 0 ? 1 : 0] += e.data.psxg ?? 0;
    }
    if (e.kind === 'goal') goals[e.team]++;
  }
  const creation = xg[0] - xg[1];
  const conversion = goals[0] - xg[0] - (goals[1] - xg[1]);
  const window: [number, number] = [0, endMinute];
  const factors: Factor[] = [];

  // Conversion first when it decided more of the result than creation (02 §11).
  const keeperSaved: [number, number] = [psxg[0] - goals[1], psxg[1] - goals[0]];
  const conv: Factor[] = [
    {
      message: { key: 'match.explain.finishing', params: { goals: goals[0], xg: round(xg[0]) } },
      evidence: {
        metric: 'goalsMinusXg',
        value: round(goals[0] - xg[0]),
        reference: round(goals[1] - xg[1]),
        window,
        events: shotIds[0],
      },
      weight: round(goals[0] - xg[0]),
      decision: null,
    },
    {
      message: { key: 'match.explain.keeper', params: { saved: round(keeperSaved[1]), team: 1 } },
      evidence: {
        metric: 'goalsPrevented',
        value: round(keeperSaved[1]),
        reference: round(keeperSaved[0]),
        window,
        events: shotIds[0],
      },
      weight: round(-keeperSaved[1]),
      decision: null,
    },
    {
      message: { key: 'match.explain.keeper', params: { saved: round(keeperSaved[0]), team: 0 } },
      evidence: {
        metric: 'goalsPrevented',
        value: round(keeperSaved[0]),
        reference: round(keeperSaved[1]),
        window,
        events: shotIds[1],
      },
      weight: round(keeperSaved[0]),
      decision: null,
    },
  ].filter((f) => Math.abs(f.weight) >= THRESHOLD);

  const create: Factor[] = (Object.keys(byOrigin) as Origin[])
    .map((o) => {
      const [a, b] = byOrigin[o].xg;
      return {
        message: { key: KEYS[o].key, params: { xgFor: round(a), xgAgainst: round(b) } },
        evidence: {
          metric: `xg.${o}`,
          value: round(a),
          reference: round(b),
          window,
          events: byOrigin[o].ids,
        },
        weight: round(a - b),
        decision: KEYS[o].decision,
      };
    })
    .filter((f) => Math.abs(f.weight) >= THRESHOLD);

  const big = (x: Factor, y: Factor) => Math.abs(y.weight) - Math.abs(x.weight);
  conv.sort(big);
  create.sort(big);
  factors.push(
    ...(Math.abs(conversion) > Math.abs(creation) ? [...conv, ...create] : [...create, ...conv]),
  );
  const cited = create.reduce((s, f) => s + f.weight, 0);
  return {
    creation: round(creation),
    conversion: round(conversion),
    factors: factors.slice(0, 12),
    unexplained: round(creation - cited),
  };
}
