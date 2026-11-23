/**
 * Season turnover (MC-172; 05 §3): titles, promotion, relegation, places in
 * other competitions with the cascade, and next season's members, checked
 * against the size the next regulation declares (the transition rule).
 */
import { select } from './groups';
import type { Row, TableRules } from './league';
import type { Competition } from './schema';

/** A finished phase: its tables in order (one per group; one for a league or knockout). */
export interface PhaseResult {
  tables: Row[][];
  rules: TableRules;
}
export type Results = Record<string, Record<string, PhaseResult>>;

export interface TurnoverInput {
  competitions: readonly Competition[];
  members: Readonly<Record<string, readonly string[]>>;
  results: Results;
  /** Next season's regulations (`regulationsFor`). */
  next: readonly Competition[];
  /** National ranking, best first, for `refill`. */
  ranking: readonly string[];
}
export interface Move {
  clubId: string;
  from: string;
  to: string;
  kind: 'promotion' | 'relegation';
}
export interface Turnover {
  titles: { competitionId: string; clubId: string }[];
  moves: Move[];
  /** Next season's members by competition. */
  members: Record<string, string[]>;
  /** Places given by `slot` outcomes: target competition, then target phase. */
  slots: Record<string, Record<string, string[]>>;
  /** Clubs moved to a competition that does not exist next season (they leave the world). */
  left: string[];
}

/** The regulation of each competition for a season; without one, the last known is repeated (05 §3). */
export function regulationsFor(all: readonly Competition[], season: number): Competition[] {
  const out: Competition[] = [];
  for (const id of new Set(all.map((c) => c.id))) {
    const known = all.filter((c) => c.id === id && c.season <= season);
    if (known.length === 0) continue;
    const last = known.reduce((a, b) => (b.season > a.season ? b : a));
    if (last.season === season) out.push(last);
    else {
      // The same regulation a year later: every date window moves by the years in between.
      const years = season - last.season;
      const shift = (iso: string) => `${Number(iso.slice(0, 4)) + years}${iso.slice(4)}`;
      const phases = last.phases.map((p) =>
        p.dates
          ? {
              ...p,
              dates: {
                ...p.dates,
                start: shift(p.dates.start),
                end: shift(p.dates.end),
                ...(p.dates.exclude && {
                  exclude: {
                    ...p.dates.exclude,
                    start: shift(p.dates.exclude.start),
                    end: shift(p.dates.exclude.end),
                  },
                }),
              },
            }
          : p,
      );
      out.push({ ...last, season, clubIds: [], phases } as Competition);
    }
  }
  return out;
}

export function applyOutcomes(input: TurnoverInput): Turnover {
  const { results } = input;
  const picked = (competitionId: string, phaseId: string, sel: Parameters<typeof select>[1]) => {
    const r = results[competitionId]?.[phaseId];
    if (!r) throw new Error(`no result for ${competitionId}/${phaseId}`);
    return select(r.tables, sel, r.rules);
  };

  const titles: Turnover['titles'] = [];
  const moves = new Map<string, Move>();
  for (const c of input.competitions)
    for (const p of c.phases)
      for (const o of p.outcomes) {
        if (o.kind === 'title')
          picked(c.id, p.id, o).forEach((clubId) => titles.push({ competitionId: c.id, clubId }));
        if (o.kind === 'promotion' || o.kind === 'relegation')
          for (const clubId of picked(c.id, p.id, o)) {
            if (moves.has(clubId)) throw new Error(`club ${clubId} moves twice`);
            moves.set(clubId, { clubId, from: c.id, to: o.target, kind: o.kind });
          }
      }

  const nextIds = new Set(input.next.map((c) => c.id));
  const members: Record<string, string[]> = {};
  for (const reg of input.next) {
    const before = input.members[reg.id] ?? reg.clubIds;
    members[reg.id] = [
      ...before.filter((k) => moves.get(k)?.from !== reg.id),
      ...[...moves.values()].filter((m) => m.to === reg.id).map((m) => m.clubId),
    ];
  }
  const left = [...moves.values()].filter((m) => !nextIds.has(m.to)).map((m) => m.clubId);

  // Divisions (competitions with a tier) are exclusive: one club, one division.
  const placed = new Set(input.next.filter((c) => c.tier !== null).flatMap((c) => members[c.id]!));
  for (const reg of input.next) {
    const list = members[reg.id]!;
    if (reg.refill === 'ranking')
      for (const k of input.ranking) {
        if (list.length >= reg.size) break;
        if (placed.has(k) || list.includes(k)) continue;
        list.push(k);
        placed.add(k);
      }
    if (list.length !== reg.size)
      throw new Error(`${reg.id}: ${list.length} members, regulation says ${reg.size}`);
  }

  // Places in other competitions, in the pack's order (the more beneficial first).
  const relegated = new Set(
    [...moves.values()].filter((m) => m.kind === 'relegation').map((m) => m.clubId),
  );
  const slots: Turnover['slots'] = {};
  for (const c of input.competitions)
    for (const p of c.phases)
      for (const o of p.outcomes) {
        if (o.kind !== 'slot') continue;
        const byPhase = (slots[o.target] ??= {});
        const holders = new Set([...Object.values(byPhase).flat(), ...(members[o.target] ?? [])]);
        const given: string[] = [];
        for (const cand of o.candidates)
          for (const clubId of picked(cand.competitionId ?? c.id, cand.phaseId, cand)) {
            if (given.length === o.count) break;
            if (holders.has(clubId) || (o.excludeRelegated && relegated.has(clubId))) continue;
            given.push(clubId);
            holders.add(clubId);
          }
        if (given.length < o.count)
          throw new Error(`${c.id}: ${o.count - given.length} place(s) in ${o.target} not filled`);
        (byPhase[o.targetPhaseId] ??= []).push(...given);
      }

  return { titles, moves: [...moves.values()], members, slots, left };
}
