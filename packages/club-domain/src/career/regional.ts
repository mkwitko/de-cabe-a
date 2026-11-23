/**
 * The person's regional cup (Copa do Nordeste, Copa Verde) and the Supercopa (competition/
 * regionais.ts): the fixed share of the first phase and the prizes by phase reached, as the state
 * championship does (estadual.ts). Every club reads the same tables; only the person's ledger is
 * posted. The share is paid in April to June, in three parts.
 */
import {
  COTAS,
  NORDESTE_ID,
  NORTE_ID,
  CENTRO_OESTE_ID,
  REGIONAL_IDS,
  SUPERCOPA_ID,
} from '../competition/regionais-data';
import { postEntry } from '../finance/ledger';
import type { SeasonState } from '../competition/season';
import type { CareerWorld } from './advance';
import { note } from './inbox';
import { priced, pricesOf } from './prices';

/** Months the share is paid in: the cups' own months (they start on 25 March). */
export const REGIONAL_MONTHS = ['04', '05', '06'];

const index = new WeakMap<SeasonState, Map<string, number>>();

/**
 * A club's fixed share of its regional cup this season, at base prices (0 if none). The cup's
 * clubs are cut in four equal blocks by national ranking (the CBF ranking stands in), best first.
 */
export function regionalCotaFor(w: CareerWorld, clubId: string): number {
  let by = index.get(w.season);
  if (!by) {
    by = new Map();
    const at = new Map(w.season.ranking.map((id, i) => [id, i]));
    for (const [ids, table] of [
      [[NORDESTE_ID], COTAS.nordeste],
      [[NORTE_ID, CENTRO_OESTE_ID], COTAS.verde],
    ] as const) {
      const clubs = ids
        .flatMap((id) => w.season.members[id] ?? [])
        .sort((a, b) => (at.get(a) ?? Infinity) - (at.get(b) ?? Infinity));
      const per = Math.max(1, Math.ceil(clubs.length / table.length));
      clubs.forEach((id, i) =>
        by!.set(id, table[Math.min(Math.floor(i / per), table.length - 1)]!),
      );
    }
    index.set(w.season, by);
  }
  return by.get(clubId) ?? 0;
}

/**
 * A regional cup or the Supercopa is over (its final was just played): the person's prizes by
 * phase reached and a note with the champion, if the club played it. Called on a final's match day.
 */
export function settleCup(w: CareerWorld, competitionId: string, day: number): void {
  if (
    competitionId !== SUPERCOPA_ID &&
    !(REGIONAL_IDS as readonly string[]).includes(competitionId)
  )
    return;
  const comp = w.season.competitions.find((c) => c.id === competitionId);
  const results = w.season.results[competitionId];
  const final = results?.final;
  if (!comp || !final) return;
  const played = comp.phases.some((p) =>
    results[p.id]?.tables.some((t) => t.some((r) => r.clubId === w.clubId)),
  );
  if (!played) return;
  const place = (phaseId: string) =>
    (results[phaseId]?.tables[0]?.findIndex((r) => r.clubId === w.clubId) ?? -1) + 1;
  let total = 0;
  comp.money.prizes.forEach((p, i) => {
    const at = place(p.phaseId);
    if (at < p.positions[0] || at > p.positions[1]) return;
    const amount = priced(p.amount, pricesOf(w).prices);
    if (
      postEntry(w.ledger, {
        key: `regional:${w.season.season}:${competitionId}:${i}`,
        kind: 'prize',
        ref: `regional:${w.season.season}`,
        amount,
        day,
        dueDay: day,
      })
    )
      total += amount;
  });
  note(w, {
    day,
    kind: 'regional',
    name: comp.name,
    champion: final.tables[0]![0]!.clubId,
    position: place('final'),
    prize: total,
  });
}
