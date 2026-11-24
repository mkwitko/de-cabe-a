/**
 * State championships (estaduais) as ordinary competitions: the pack's clubs by state (the
 * city's `state`), the first level of each state only. Participants are rebuilt every season, no
 * promotion or relegation between state divisions (the pack has no lower state levels): clubs of
 * the national divisions first (tier order), then the state's other clubs, by reputation, up to
 * the format's size. Calendar: the CBF window, nine Sundays and eight Wednesdays from the first
 * Sunday on or after 9 January (11 Jan to 8 Mar in 2026, 10 Jan to 7 Mar in 2027). Formats and
 * money: `estaduais-data.ts`.
 */
import type { Pack } from '../pack/schema';
import { estadualWindow, isoOf } from './calendar';
import { gruposPhase, knockoutPhase, ligaPhase, regulation } from '../generate/competitions';
import type { Competition, Phase } from './schema';
import { DOCUMENTED, ESTIMATE, GENERIC, type StateFormat } from './estaduais-data';

export const ESTADUAL_PREFIX = 'est-';
export const estadualId = (uf: string) => `${ESTADUAL_PREFIX}${uf}`;
export const isEstadual = (c: { id: string }) => c.id.startsWith(ESTADUAL_PREFIX);

/** Fewer clubs than this and the state plays no championship. */
const MIN_CLUBS = 4;
const WEEKDAYS = [0, 3];
/** The CBF's cap on a state championship's dates from 2026 (16 before). */
export const ESTADUAL_DATES = 11;

/**
 * Match dates of the CBF window for a state championship of `needed` dates: its nine Sundays,
 * and the Wednesdays from the first one for the rest (two before the Série A starts; a format
 * that needs more takes a Série A midweek, as the Paranaense's twelfth date did).
 */
export function estadualSlots(season: number, needed = ESTADUAL_DATES): number[] {
  const { first, last } = estadualWindow(season);
  const out: number[] = [];
  for (let d = first; d <= last; d += 7) out.push(d);
  const extra = Math.max(0, needed - out.length);
  for (let k = 0; k < extra && first + 3 + 7 * k < last; k++) out.push(first + 3 + 7 * k);
  return out.sort((a, b) => a - b);
}

const documented = new Map(DOCUMENTED.map((f) => [f.uf, f]));

/** The generic format for `n` clubs: one table, or two groups from 11 clubs, then a knockout. */
export function genericFormat(uf: string, name: string, n: number): StateFormat {
  const big = n >= 11;
  const f = genericRow(uf, name, n, big);
  // Within the CBF's cap: one leg, then single semi-finals, then a single final, as needed.
  const dates = () =>
    roundsOf(f, n) + (f.ko === 8 ? f.koLegs.quarter : 0) + f.koLegs.semi + f.koLegs.final;
  if (dates() > ESTADUAL_DATES) f.legs = 1;
  if (dates() > ESTADUAL_DATES) f.koLegs.semi = 1;
  if (dates() > ESTADUAL_DATES) f.koLegs.final = 1;
  return f;
}

function genericRow(uf: string, name: string, n: number, big: boolean): StateFormat {
  return {
    uf,
    name,
    size: n,
    groups: big ? 2 : 1,
    opponents: 'own',
    legs: n <= 6 ? 2 : 1,
    advance: [{ positions: [1, 4] }],
    ko: big ? 8 : 4,
    koLegs: { quarter: 1, semi: 2, final: 2 },
    cotas: [],
    prizes: { champion: 0, runnerUp: 0, semi: 0 },
    estimated: true,
    videoReferee: false,
    kind: 'generic',
    note: 'Generic format of this project (no regulation researched).',
    sources: [],
  };
}

/** The format a state plays with `n` available clubs (the documented one only at its size). */
export function formatFor(uf: string, n: number): StateFormat | null {
  const doc = documented.get(uf);
  const gen = GENERIC[uf];
  const size = doc?.size ?? gen?.size;
  if (size === undefined) return null;
  const clubs = Math.min(size, n);
  if (clubs < MIN_CLUBS) return null;
  if (doc && clubs === doc.size) return doc;
  const g = genericFormat(uf, doc?.name ?? gen!.name, clubs);
  // The documented money stays with the state.
  return doc ? { ...g, cotas: doc.cotas, prizes: doc.prizes, estimated: doc.estimated } : g;
}

/** Percent of the estimated shares by the club's national tier (none = 100). */
const ESTIMATE_SCALE: Record<number, number> = { 1: 200, 2: 150, 3: 120 };

/** A club's fixed share of the state championship, reais at base prices. */
export function cotaOf(uf: string, rank: number, tier: number | undefined): number {
  const doc = documented.get(uf);
  const gen = GENERIC[uf];
  const table = doc && doc.cotas.length > 0 ? doc.cotas : ESTIMATE[gen?.tier ?? 'small'].cotas;
  const base = table[Math.min(rank, table.length - 1)] ?? 0;
  const estimated = !doc || doc.estimated;
  return estimated ? Math.round((base * (ESTIMATE_SCALE[tier ?? 0] ?? 100)) / 100) : base;
}

/** Prizes by final position of the championship, reais at base prices. */
export function prizesOf(uf: string): { champion: number; runnerUp: number; semi: number } {
  const doc = documented.get(uf);
  if (doc) return doc.prizes;
  const e = ESTIMATE[GENERIC[uf]?.tier ?? 'small'];
  return { champion: e.champion, runnerUp: e.runnerUp, semi: 0 };
}

/** Rounds of the first phase for `n` clubs (a round robin of k clubs has k - 1 rounds, k if odd). */
function roundsOf(fmt: StateFormat, n: number): number {
  const robin = (k: number) => (k % 2 === 0 ? k - 1 : k);
  if (fmt.groups === 1) return robin(n) * fmt.legs;
  if (fmt.opponents === 'other') return (n / 2) * fmt.legs;
  return robin(Math.ceil(n / fmt.groups)) * fmt.legs;
}

function build(
  fmt: StateFormat,
  season: number,
  clubIds: string[],
  prizes: { champion: number; runnerUp: number; semi: number },
): Competition {
  const koRounds: { id: string; legs: 1 | 2 }[] = [];
  if (fmt.ko === 8) koRounds.push({ id: 'quartas', legs: fmt.koLegs.quarter });
  if (fmt.ko >= 4) koRounds.push({ id: 'semi', legs: fmt.koLegs.semi });
  koRounds.push({ id: 'final', legs: fmt.koLegs.final });
  const tail = koRounds.reduce((s, r) => s + r.legs, 0);
  const slots = estadualSlots(season, roundsOf(fmt, clubIds.length) + tail);
  // The Wednesdays past the ones this championship takes are the national series'.
  const wednesdays = slots.filter((d) => (d - slots[0]!) % 7 !== 0);
  const exclude = {
    start: isoOf(wednesdays.length ? wednesdays.at(-1)! + 1 : slots[0]!),
    end: isoOf(slots.at(-1)!),
    weekdays: [3],
  };
  const win = (from: number, to: number) => ({
    start: isoOf(slots[from]!),
    end: isoOf(slots[to]!),
    weekdays: WEEKDAYS,
    exclude,
  });
  const firstEnd = slots.length - tail - 1;
  const first = win(0, firstEnd);
  const phases: Phase[] = [
    fmt.groups === 1
      ? ligaPhase('fase1', first, { legs: fmt.legs })
      : gruposPhase('fase1', fmt.groups, first, {
          legs: fmt.legs,
          opponents: fmt.opponents,
        }),
  ];
  let at = firstEnd + 1;
  koRounds.forEach((r, i) => {
    const prev = koRounds[i - 1]?.id;
    const entrants: Phase['entrants'] = prev
      ? [{ from: 'phase', phaseId: prev, positions: [1, r.id === 'final' ? 2 : 4] }]
      : fmt.advance.map((s) => ({ from: 'phase' as const, phaseId: 'fase1', ...s }));
    const last = r.id === 'final';
    phases.push(
      knockoutPhase(r.id, last ? 'final' : 'mata-mata', win(at, at + r.legs - 1), {
        entrants,
        legs: r.legs,
        survivors: last ? 1 : r.id === 'quartas' ? 4 : 2,
        outcomes: last ? [{ kind: 'title', positions: [1, 1] }] : [],
      }),
    );
    at += r.legs;
  });
  const hasSemi = koRounds.some((r) => r.id === 'semi');
  const paid = [
    { phaseId: 'final', positions: [1, 1] as [number, number], amount: prizes.champion },
    { phaseId: 'final', positions: [2, 2] as [number, number], amount: prizes.runnerUp },
    ...(hasSemi
      ? [{ phaseId: 'semi', positions: [3, 4] as [number, number], amount: prizes.semi }]
      : []),
  ].filter((p) => p.amount > 0);
  const base = regulation(
    {
      id: estadualId(fmt.uf),
      name: fmt.name,
      season,
      clubIds,
      scope: 'estadual',
      tier: null,
      // The CBF keeps the state dates: the Série A plays only midweek until they end, and a
      // league match moved by a CONMEBOL or Copa do Brasil date goes elsewhere. Level with the
      // cups (priority 2), above the leagues.
      priority: 2,
    },
    phases,
  );
  return {
    ...base,
    matchRules: { ...base.matchRules, videoReferee: fmt.videoReferee },
    money: { ...base.money, prizes: paid },
  };
}

/**
 * The season's state championships and their participants. `tierOf` gives a club's national
 * tier (undefined outside the divisions).
 */
export function estadualCompetitions(
  pack: Pack,
  season: number,
  tierOf: (clubId: string) => number | undefined,
): { competitions: Competition[]; members: Record<string, string[]> } {
  const cityState = new Map(pack.cities.map((c) => [c.id, c.state]));
  const byState = new Map<string, Pack['clubs']>();
  for (const c of pack.clubs) {
    const uf = cityState.get(c.cityId);
    if (!uf) continue;
    const list = byState.get(uf);
    if (list) list.push(c);
    else byState.set(uf, [c]);
  }
  const competitions: Competition[] = [];
  const members: Record<string, string[]> = {};
  for (const uf of [...byState.keys()].sort()) {
    const clubs = byState.get(uf)!;
    const fmt = formatFor(uf, clubs.length);
    if (!fmt) continue;
    const rep = (a: Pack['clubs'][number], b: Pack['clubs'][number]) =>
      b.reputation - a.reputation || (a.id < b.id ? -1 : 1);
    const chosen = [...clubs]
      .sort((a, b) => (tierOf(a.id) ?? 9) - (tierOf(b.id) ?? 9) || rep(a, b))
      .slice(0, fmt.size)
      .sort(rep)
      .map((c) => c.id);
    const comp = build(fmt, season, chosen, prizesOf(uf));
    competitions.push(comp);
    members[comp.id] = chosen;
  }
  return { competitions, members };
}
