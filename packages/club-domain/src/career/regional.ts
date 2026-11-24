/**
 * The person's regional cup (Copa do Nordeste, Copa Verde, Copa Sul-Sudeste) and the Supercopa (competition/
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
  SUL_SUDESTE_ID,
  SUPERCOPA_ID,
} from '../competition/regionais-data';
import { postEntry } from '../finance/ledger';
import { GROUP_MONEY, RECOPA_ID, isConmebol } from '../competition/conmebol';
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
      [[SUL_SUDESTE_ID], COTAS.sulSudeste],
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
 * CONMEBOL pays each stage as a club reaches it, and each group win as it comes (2026
 * regulations): called after every match of the person's club in the Libertadores or the
 * Sul-Americana. The final's prizes wait for the final (settleCup).
 */
export function payConmebol(
  w: CareerWorld,
  m: { id: string; competitionId: string; phaseId: string; home: string; away: string },
  day: number,
): void {
  if (!isConmebol({ id: m.competitionId }) || (m.home !== w.clubId && m.away !== w.clubId)) return;
  const comp = w.season.competitions.find((c) => c.id === m.competitionId);
  if (!comp) return;
  const key = `regional:${w.season.season}:${m.competitionId}`;
  // Once per stage: the first match there pays it.
  const pay = (k: string, amount: number) =>
    !w.ledger.keys.has(`${key}:${k}`) &&
    postEntry(w.ledger, {
      key: `${key}:${k}`,
      kind: 'prize',
      ref: `regional:${w.season.season}`,
      amount: priced(amount, pricesOf(w).prices),
      day,
      dueDay: day,
    });
  comp.money.prizes.forEach((p, i) => {
    if (p.phaseId === m.phaseId && p.phaseId !== 'final') pay(String(i), p.amount);
  });
  const groupMoney = GROUP_MONEY[m.competitionId as keyof typeof GROUP_MONEY];
  if (!groupMoney || m.phaseId !== 'grupos') return;
  pay('grupos', groupMoney.stage);
  const g = w.season.outcomes.get(m.id)?.goals;
  const [mine, theirs] = m.home === w.clubId ? [0, 1] : [1, 0];
  if (g && g[mine]! > g[theirs]!) pay(`grupos:${m.id}`, groupMoney.win);
}

/**
 * A regional cup or the Supercopa is over (its final was just played): the person's prizes by
 * phase reached and a note with the champion, if the club played it. Called on a final's match day.
 */
export function settleCup(w: CareerWorld, competitionId: string, day: number): void {
  if (
    competitionId !== SUPERCOPA_ID &&
    competitionId !== RECOPA_ID &&
    !(REGIONAL_IDS as readonly string[]).includes(competitionId) &&
    !isConmebol({ id: competitionId })
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
    // CONMEBOL's stage prizes are paid as reached (payConmebol).
    if (
      isConmebol({ id: competitionId }) &&
      w.ledger.keys.has(`regional:${w.season.season}:${competitionId}:${i}`)
    )
      return;
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
  // CONMEBOL paid its stages as they came (payConmebol): the note sums the whole run.
  if (isConmebol({ id: competitionId })) {
    const key = `regional:${w.season.season}:${competitionId}:`;
    total = w.ledger.entries
      .filter((e) => e.key.startsWith(key))
      .reduce((sum, e) => sum + e.amount, 0);
  }
  note(w, {
    day,
    kind: 'regional',
    name: comp.name,
    champion: final.tables[0]![0]!.clubId,
    position: place('final'),
    prize: total,
  });
}
