import { describe, expect, it } from 'vitest';
import { isoOf } from '../competition/calendar';
import { cashFromEntries, checkLedger } from '../finance/ledger';
import { generateDevPack } from '../generate/pack';
import {
  nextDecision,
  openCareer,
  playDecision,
  startNextSeason,
  type CareerWorld,
} from './advance';
import { attendance } from './finance';
import { loadCareer, saveCareer } from './save';
import { nationalDivisions } from './start';

const pack = generateDevPack();
const divs = nationalDivisions(pack);
const playSeason = (w: CareerWorld) => {
  for (let d = nextDecision(w); d.kind === 'match'; d = nextDecision(w)) playDecision(w, d);
};

describe('career money (04 §4)', () => {
  it('wages, TV and sponsors once a month, gate money at home matches, cash = sum', () => {
    const club = divs[2]!.clubIds[3]!;
    const w = openCareer(pack, 51, club);
    playSeason(w);
    const kinds = (k: string) => w.ledger.entries.filter((e) => e.kind === k);
    const months = new Set(kinds('wages').map((e) => isoOf(e.day).slice(0, 7)));
    expect(months.size).toBe(kinds('wages').length);
    expect(months.size).toBeGreaterThanOrEqual(10);
    expect(kinds('tv')).toHaveLength(months.size);
    // Home matches played: a manager dismissed before the end leaves the rest unplayed.
    const homes = [...w.season.meta].filter(
      ([id, m]) => m.home === club && w.season.outcomes.has(id),
    ).length;
    expect(kinds('tickets')).toHaveLength(homes);
    expect(kinds('tickets')[0]!.amount).toBe(attendance(w) * 18);
    expect(checkLedger(w.ledger)).toEqual([]);
    expect(w.ledger.cash).toBe(cashFromEntries(w.ledger));
    // Retrying a day never pays twice: a snapshot reloaded carries the same entries.
    const again = loadCareer(pack, 51, club, saveCareer(w));
    expect(again.ledger.entries).toHaveLength(w.ledger.entries.length);
  });
});

describe('season turn (MC-172 in the career)', () => {
  it('a finished season moves clubs up and down and the next one starts a year later', () => {
    const club = divs[0]!.clubIds[19]!; // the weakest of the top division
    const w = openCareer(pack, 52, club);
    playSeason(w);
    const cash = w.ledger.cash;
    const turn = startNextSeason(w);
    expect(turn.season).toBe(2027);
    expect(turn.titles.length).toBeGreaterThanOrEqual(4);
    expect(w.season.season).toBe(2027);
    expect(Object.values(w.season.members).flat().length).toBeGreaterThanOrEqual(156);
    // The money carries over; the only new entry is the prize for the final position.
    const prize = w.ledger.entries.filter((e) => e.kind === 'prize');
    expect(prize).toHaveLength(1);
    expect(w.ledger.cash).toBe(cash + prize[0]!.amount);
    const d = nextDecision(w);
    expect(d.kind).toBe('match');
    if (d.kind === 'match') expect(isoOf(d.day).startsWith('2027')).toBe(true);
    // The snapshot survives the turn.
    const again = loadCareer(pack, 52, club, saveCareer(w));
    expect(again.season.season).toBe(2027);
    expect(() => startNextSeason(w)).toThrow(/not over/);
  });
});
