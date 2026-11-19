import { expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { postEntry } from '../finance/ledger';
import { nextDecision, openCareer, playDecision } from './advance';
import { WALKOUT_MONTHS, moraleOf, monthTurned, strengthOwed } from './arrears';
import { loadCareer, saveCareer } from './save';
import { squadPlayers } from './squad';
import { jobOffers } from './start';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;

/** A career whose cash is pushed below zero. */
function broke() {
  const w = openCareer(structuredClone(pack), 3, clubId);
  postEntry(w.ledger, {
    key: 'test:hole',
    kind: 'other',
    ref: 'test',
    amount: -w.ledger.cash - 1_000_000_000,
    day: w.ledger.today,
    dueDay: w.ledger.today,
  });
  return w;
}

it('an unpaid month counts, weighs on the team and clears when the cash is back', () => {
  const w = broke();
  monthTurned(w, 10);
  expect(w.arrears).toBe(1);
  expect(strengthOwed(w, 70)).toBeLessThan(70);
  expect(moraleOf(w)).toBeLessThan(0.7);
  postEntry(w.ledger, {
    key: 'test:fill',
    kind: 'other',
    ref: 'test',
    amount: 2_000_000_000,
    day: w.ledger.today,
    dueDay: w.ledger.today,
  });
  monthTurned(w, 40);
  expect(w.arrears).toBeUndefined();
  expect(w.inbox!.at(-1)!.kind).toBe('arrearsPaid');
});

it('at three months owed the players the market wants walk out, never below a squad', () => {
  const w = broke();
  const before = squadPlayers(w).length;
  for (let m = 0; m < WALKOUT_MONTHS + 6; m++) monthTurned(w, 10 + 30 * m);
  const gone = w.inbox!.filter((n) => n.kind === 'walkout').length;
  expect(gone).toBeGreaterThan(0);
  expect(squadPlayers(w).length).toBe(before - gone);
  expect(squadPlayers(w).length).toBeGreaterThanOrEqual(Math.min(before, 22));
});

it('a season in the red runs into arrears through the days, and the save keeps them', () => {
  const w = broke();
  for (let d = nextDecision(w); d.kind === 'match' && !w.arrears; d = nextDecision(w))
    playDecision(w, d);
  expect(w.arrears).toBeGreaterThan(0);
  const back = loadCareer(structuredClone(pack), 3, clubId, saveCareer(w));
  expect(back.arrears).toBe(w.arrears);
});
