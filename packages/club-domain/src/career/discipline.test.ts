import { expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { nextDecision, openCareer, playDecision } from './advance';
import { TRIAL_DAYS, afterMatch, bookingsOf, sitCourt, suspendedIn } from './discipline';
import { fielded } from './health';
import { loadCareer, saveCareer } from './save';
import { jobOffers } from './start';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;
const fresh = () => openCareer(structuredClone(pack), 3, clubId);

it('the third yellow bars a man from the next match of that competition only', () => {
  const w = fresh();
  for (let k = 0; k < 2; k++) afterMatch(w, 'liga', k, [{ playerId: 'p', card: 'yellow' }]);
  expect(suspendedIn(w, 'liga').size).toBe(0);
  const ban = afterMatch(w, 'liga', 2, [{ playerId: 'p', card: 'yellow' }]);
  expect(ban).toEqual([{ playerId: 'p', matches: 1, why: 'yellows' }]);
  expect(suspendedIn(w, 'liga').has('p')).toBe(true);
  expect(suspendedIn(w, 'copa').has('p')).toBe(false);
  // He sits the next one out, and the count started again.
  afterMatch(w, 'liga', 3, []);
  expect(suspendedIn(w, 'liga').has('p')).toBe(false);
  expect(w.discipline!.yellows.liga!.p).toBeUndefined();
});

it('a straight red goes to court; a second yellow does not', () => {
  const w = fresh();
  afterMatch(w, 'liga', 10, [
    { playerId: 'a', card: 'red' },
    { playerId: 'b', card: 'second' },
  ]);
  expect(w.discipline!.trials.map((t) => t.playerId)).toEqual(['a']);
  expect(sitCourt(w, 10 + TRIAL_DAYS - 1)).toEqual([]);
  sitCourt(w, 10 + TRIAL_DAYS);
  expect(w.discipline!.trials).toEqual([]);
});

it('the court adds matches to some straight reds, none to most', () => {
  const w = fresh();
  let extra = 0;
  for (let k = 0; k < 200; k++) afterMatch(w, 'liga', 0, [{ playerId: `p${k}`, card: 'red' }]);
  for (const s of sitCourt(w, TRIAL_DAYS)) extra += s.matches;
  // Mean extra matches of the table: 0.45·0 + 0.3·1 + 0.15·2 + 0.06·3 + 0.04·5 = 0.98.
  expect(extra / 200).toBeGreaterThan(0.7);
  expect(extra / 200).toBeLessThan(1.3);
});

it('cards fall on the men on the pitch, keepers seldom', () => {
  const w = fresh();
  const xi = fielded(w, 1).xi;
  const keeper = xi[0]!;
  let keeperCards = 0;
  for (let day = 1; day < 300; day++) {
    const b = bookingsOf(w, xi, [3, 1], day);
    expect(b).toHaveLength(4);
    expect(new Set(b.map((x) => x.playerId)).size).toBe(4);
    for (const x of b) expect(xi).toContain(x.playerId);
    keeperCards += b.filter((x) => x.playerId === keeper).length;
  }
  expect(keeperCards).toBeLessThan((300 * 4) / 11 / 2);
});

it('a season brings bans, the banned man does not play, and the save keeps them', () => {
  const w = fresh();
  let bans = 0;
  let checked = 0;
  for (
    let d = nextDecision(w);
    d.kind === 'match' && w.season.season === 2026;
    d = nextDecision(w)
  ) {
    const out = suspendedIn(w, d.competitionId);
    for (const id of fielded(w, d.day).xi) expect(out.has(id)).toBe(false);
    checked += out.size;
    playDecision(w, d);
    bans = w.inbox!.filter((n) => n.kind === 'suspension').length;
  }
  // A fourth-division club plays ten matches: two or three bans.
  expect(bans).toBeGreaterThan(1);
  expect(checked).toBeGreaterThan(0);
  const back = loadCareer(structuredClone(pack), 3, clubId, saveCareer(w));
  expect(back.discipline).toEqual(w.discipline);
});
