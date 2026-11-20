/**
 * The person's state championship (competition/estaduais.ts): the fixed share it pays each club
 * and the prizes by final position. Every club, the person's or not, reads the same tables; only
 * the person's ledger is posted. Integers, results from seed and day.
 */
import { cotaOf, isEstadual } from '../competition/estaduais';
import { postEntry } from '../finance/ledger';
import type { Competition } from '../competition/schema';
import type { SeasonState } from '../competition/season';
import type { CareerWorld } from './advance';
import { note } from './inbox';
import { boardAfterExit } from './board';
import { judgeExit } from './coaches';
import { priced, pricesOf } from './prices';
import { nationalDivisions } from './start';
import { standings, type Row } from '../competition/league';

interface Entry {
  comp: Competition;
  uf: string;
  /** 0-based place among the participants by reputation (members are kept in that order). */
  rank: number;
  /** National tier of the club this season, if it plays a division. */
  tier: number | undefined;
}

const index = new WeakMap<SeasonState, Map<string, Entry>>();

/** The state championship a club plays this season, or null (no state, too few clubs). */
export function estadualOf(w: CareerWorld, clubId: string): Entry | null {
  let by = index.get(w.season);
  if (!by) {
    by = new Map();
    const tier = new Map<string, number>();
    for (const d of nationalDivisions(w.pack))
      for (const id of w.season.members[d.id] ?? []) tier.set(id, d.tier);
    for (const comp of w.season.competitions)
      if (isEstadual(comp))
        (w.season.members[comp.id] ?? []).forEach((id, rank) =>
          by!.set(id, { comp, uf: comp.id.slice(4), rank, tier: tier.get(id) }),
        );
    index.set(w.season, by);
  }
  return by.get(clubId) ?? null;
}

/** A club's fixed share of its state championship this season, at base prices (0 if none). */
export function cotaFor(w: CareerWorld, clubId: string): number {
  const e = estadualOf(w, clubId);
  return e ? cotaOf(e.uf, e.rank, e.tier) : 0;
}

/** Months the share is paid in: the championship's own months (January to March). */
export const COTA_MONTHS = ['01', '02', '03'];

/**
 * The state championship is over (its final was just played): the person's prize by position and
 * a note with the champion. Called with the day of a final's match.
 */
export function settleEstadual(w: CareerWorld, competitionId: string, day: number): void {
  const e = estadualOf(w, w.clubId);
  if (!e || e.comp.id !== competitionId) return;
  const results = w.season.results[competitionId];
  const final = results?.final;
  if (!final) return;
  const place = (phaseId: string) =>
    (results?.[phaseId]?.tables[0]?.findIndex((r) => r.clubId === w.clubId) ?? -1) + 1;
  let total = 0;
  for (const p of e.comp.money.prizes) {
    const at = place(p.phaseId);
    if (at < p.positions[0] || at > p.positions[1]) continue;
    const amount = priced(p.amount, pricesOf(w).prices);
    if (
      postEntry(w.ledger, {
        key: `estadual:${w.season.season}:${p.phaseId}:${p.positions[0]}`,
        kind: 'prize',
        ref: `estadual:${w.season.season}`,
        amount,
        day,
        dueDay: day,
      })
    )
      total += amount;
  }
  note(w, {
    day,
    kind: 'estadual',
    name: e.comp.name,
    champion: final.tables[0]![0]!.clubId,
    position: place('final') || (place('semi') > 0 ? 3 : 0),
    prize: total,
  });
}

/** The person's state championship for the screen: their group's table and the knockout so far. */
export interface EstadualView {
  name: string;
  rows: Row[];
  ties: { stage: string; home: string; away: string; goals: [number, number] | null }[];
  champion: string | null;
}

export function estadualView(w: CareerWorld): EstadualView | null {
  const e = estadualOf(w, w.clubId);
  if (!e) return null;
  const id = e.comp.id;
  const done = w.season.results[id]?.fase1;
  const run = w.season.running.get(`${id}/fase1`);
  const group =
    done?.tables.find((t) => t.some((r) => r.clubId === w.clubId))?.map((r) => r.clubId) ??
    (run?.kind === 'table' ? run.groups.find((g) => g.includes(w.clubId)) : undefined) ??
    [];
  const inGroup = new Set(group);
  // Display order only; the phase's outcomes use the competition's own tie-breakers.
  const rows = standings(
    group,
    (w.season.played.get(id) ?? []).filter((g) => inGroup.has(g.home) && inGroup.has(g.away)),
    { points: { win: 3, draw: 1, loss: 0 }, tieBreakers: ['goalDifference', 'goalsFor'], seed: 0 },
  );
  const ties: EstadualView['ties'] = [];
  for (const [mid, m] of w.season.meta)
    if (m.competitionId === id && m.ko)
      ties.push({
        stage: m.phaseId,
        home: m.home,
        away: m.away,
        goals: w.season.outcomes.get(mid)?.goals ?? null,
      });
  const final = w.season.results[id]?.final;
  return { name: e.comp.name, rows, ties, champion: final?.tables[0]?.[0]?.clubId ?? null };
}

/**
 * Clubs that just left a state championship early (out of the group phase, or beaten in the
 * quarter-finals) put pressure on their board: the person's directly, the others' through
 * their coach (coaches.ts). `before` is how many ties were decided before this match.
 */
export function estadualExits(
  w: CareerWorld,
  m: { competitionId: string; phaseId: string },
  before: number,
  day: number,
): void {
  const out = (id: string) => {
    if (id === w.clubId) w.board = boardAfterExit(w);
    else judgeExit(w, id, day);
  };
  for (const d of w.season.decisions.slice(before))
    if (d.competitionId === m.competitionId && d.phaseId === 'quartas')
      out(d.winner === d.a ? d.b : d.a);
  if (m.phaseId !== 'fase1' || !w.season.results[m.competitionId]?.fase1) return;
  const comp = w.season.competitions.find((c) => c.id === m.competitionId)!;
  const run = w.season.running.get(`${comp.id}/${comp.phases[1]!.id}`);
  if (run?.kind !== 'bracket') return;
  const through = new Set(run.bracket.seeds);
  for (const id of w.season.members[comp.id] ?? []) if (!through.has(id)) out(id);
}
