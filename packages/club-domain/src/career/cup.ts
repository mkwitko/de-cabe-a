/**
 * The person's club in the Copa do Brasil (competition/copa.ts): the draws and the exits as
 * inbox facts, and the run for the season's story. The cup itself is played by the season engine
 * like any competition; this reads what it did to the person's club.
 */
import { COPA_ID, COPA_PHASES } from '../competition/copa';
import type { SeasonState } from '../competition/season';
import type { CareerWorld } from './advance';
import { note } from './inbox';

const stageOf = (phaseId: string) => COPA_PHASES.indexOf(phaseId as (typeof COPA_PHASES)[number]);

/** The cup phases (0..8) the club has matches in so far: a phase is drawn once its clubs are known. */
export function cupStages(s: SeasonState, clubId: string): Set<number> {
  const out = new Set<number>();
  for (const m of s.calendar.byClub.get(clubId) ?? []) {
    const meta = s.meta.get(m.id);
    if (meta?.competitionId === COPA_ID) out.add(stageOf(meta.phaseId));
  }
  return out;
}

/** The furthest cup phase (1..9) the club reached this season, 0 when it was not in the cup. */
export const cupReached = (s: SeasonState, clubId: string): number =>
  Math.max(-1, ...cupStages(s, clubId)) + 1;

/** Notes for the draws made since `before` (the phases the person's club was in) and the exits. */
export function cupNotes(w: CareerWorld, day: number, before: Set<number>, decided: number): void {
  const s = w.season;
  for (const stage of cupStages(s, w.clubId)) {
    if (before.has(stage)) continue;
    const mine = [...(s.calendar.byClub.get(w.clubId) ?? [])]
      .map((m) => ({ m, meta: s.meta.get(m.id)! }))
      .filter((x) => x.meta.competitionId === COPA_ID && stageOf(x.meta.phaseId) === stage)
      .sort((a, b) => (a.meta.ko?.leg ?? 0) - (b.meta.ko?.leg ?? 0));
    const first = mine[0];
    if (!first) continue;
    note(w, {
      day,
      kind: 'copaDraw',
      phase: COPA_PHASES[stage]!,
      opponent: first.meta.home === w.clubId ? first.meta.away : first.meta.home,
      atHome: first.meta.home === w.clubId,
      legs: mine.length > 1 ? 2 : 1,
    });
  }
  for (const d of s.decisions.slice(decided)) {
    if (d.competitionId !== COPA_ID || (d.a !== w.clubId && d.b !== w.clubId)) continue;
    const stage = stageOf(d.phaseId);
    if (stage === COPA_PHASES.length - 1 && d.winner === w.clubId)
      note(w, { day, kind: 'copaTitle' });
    else if (d.winner !== w.clubId)
      note(w, { day, kind: 'copaOut', phase: COPA_PHASES[stage]!, by: d.by });
  }
}

/** Where a match stands in the cup: the phase, and which leg of how many; null outside the cup. */
export function cupStage(
  s: SeasonState,
  matchId: string,
): { phase: string; leg: number; legs: 1 | 2 } | null {
  const meta = s.meta.get(matchId);
  if (meta?.competitionId !== COPA_ID) return null;
  const phase = s.competitions
    .find((c) => c.id === COPA_ID)
    ?.phases.find((p) => p.id === meta.phaseId);
  const legs = phase && (phase.kind === 'mata-mata' || phase.kind === 'final') ? phase.legs : 1;
  return { phase: meta.phaseId, leg: (meta.ko?.leg ?? 0) + 1, legs };
}

/**
 * Days between a match and the club's one before it (played or scheduled), null for the first.
 * A short gap (three days or less) is a congested week: the squad needs rotating.
 */
export function restBefore(s: SeasonState, clubId: string, day: number): number | null {
  let last = -Infinity;
  for (const m of s.calendar.byClub.get(clubId) ?? [])
    if (m.day < day && m.day > last) last = m.day;
  return last === -Infinity ? null : day - last;
}

export interface CupTie {
  a: string;
  b: string;
  legs: { day: number; home: string; goals: [number, number] | null }[];
  winner: string | null;
  by: string | null;
}
export interface CupView {
  /** Phases drawn so far, in order, with every tie of each. */
  phases: { id: string; ties: CupTie[] }[];
}

/** The cup as drawn and played so far (list, brackets and the person's way through), or null. */
export function cupView(s: SeasonState): CupView | null {
  if (!s.competitions.some((c) => c.id === COPA_ID)) return null;
  const decided = new Map<string, { winner: string; by: string }>();
  for (const d of s.decisions)
    if (d.competitionId === COPA_ID) decided.set(`${d.phaseId}/${[d.a, d.b].sort().join('/')}`, d);
  const byPhase = new Map<string, Map<number, CupTie>>();
  for (const [id, meta] of s.meta) {
    if (meta.competitionId !== COPA_ID || !meta.ko) continue;
    const ties = byPhase.get(meta.phaseId) ?? new Map<number, CupTie>();
    byPhase.set(meta.phaseId, ties);
    let tie = ties.get(meta.ko.tie);
    if (!tie) {
      // `a` is the home side of the first leg (of the only match in a single-match tie).
      const [a, b] = meta.ko.leg === 0 ? [meta.home, meta.away] : [meta.away, meta.home];
      tie = { a, b, legs: [], winner: null, by: null };
      ties.set(meta.ko.tie, tie);
    }
    const o = s.outcomes.get(id);
    tie.legs[meta.ko.leg] = {
      day: s.calendar.matches.get(id)!.day,
      home: meta.home,
      goals: o ? o.goals : null,
    };
  }
  const phases = COPA_PHASES.flatMap((id) => {
    const ties = byPhase.get(id);
    if (!ties) return [];
    return [
      {
        id: id as string,
        ties: [...ties.entries()]
          .sort((x, y) => x[0] - y[0])
          .map(([, tie]) => {
            const d = decided.get(`${id}/${[tie.a, tie.b].sort().join('/')}`);
            return { ...tie, winner: d?.winner ?? null, by: d?.by ?? null };
          }),
      },
    ];
  });
  return { phases };
}
