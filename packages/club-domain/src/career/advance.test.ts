import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { toJson } from '../bench/world';
import { isOver } from '../competition/season';
import { divisionTable, nextDecision, openCareer, playDecision } from './advance';
import { estadualView } from './estadual';
import { jobOffers } from './start';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;

describe('career calendar (MC-084)', () => {
  it('stops before each match of the club; reopening at the saved day rebuilds the same world', () => {
    const w = openCareer(pack, 31, clubId);
    let played = 0;
    let inDivision = 0;
    for (let i = 0; i < 6; i++) {
      const d = nextDecision(w);
      if (d.kind !== 'match') break;
      expect([d.home, d.away]).toContain(clubId);
      expect(w.day).toBeLessThan(d.day);
      const o = playDecision(w, d);
      expect(o.goals.every((g) => Number.isInteger(g) && g >= 0)).toBe(true);
      expect(w.day).toBe(d.day);
      played++;
      // The first matches are the state championship's: the division table counts its own.
      if (d.competitionId.startsWith('div-')) inDivision++;
    }
    expect(played).toBe(6);
    // What the server keeps is the day; the browser replays to it and gets the same bits.
    const again = openCareer(pack, 31, clubId, w.day);
    expect(toJson(again.season)).toBe(toJson(w.season));
    expect(again.ledger.cash).toBe(w.ledger.cash);
    const table = divisionTable(again);
    expect(table.rows.find((r) => r.clubId === clubId)!.played).toBe(inDivision);
  });

  it('a whole season ends in seasonOver, with every table full', () => {
    const w = openCareer(pack, 32, clubId);
    let n = 0;
    for (let d = nextDecision(w); d.kind === 'match'; d = nextDecision(w)) {
      playDecision(w, d);
      n++;
    }
    expect(n).toBeGreaterThan(5);
    expect(isOver(w.season)).toBe(true);
    // The last division starts in groups: the table is the club's group, all games played.
    const rows = divisionTable(w).rows;
    expect(rows.length).toBeLessThan(20);
    expect(new Set(rows.map((r) => r.played)).size).toBe(1);
    expect(() =>
      playDecision(w, {
        kind: 'match',
        day: 1,
        matchId: 'x',
        competitionId: '',
        home: '',
        away: '',
      }),
    ).toThrow();
  });
});

describe('watching the person’s match (level 1)', () => {
  it('the engine input puts the person in charge, and its outcome is what gets recorded', async () => {
    const { simulateMatch } = await import('@decabeca/match-engine');
    const { outcomeOf } = await import('../match/fixture-input');
    const { careerMatch } = await import('./advance');
    const w = openCareer(pack, 33, clubId);
    const d = nextDecision(w);
    if (d.kind !== 'match') throw new Error('no match');
    const { input, mine } = careerMatch(w, d);
    expect(input.teams[mine].players.map((p) => p.id).every((id) => id.startsWith(clubId))).toBe(
      true,
    );
    expect(input.teams[mine].coach.flexibility).toBe(1);
    const result = simulateMatch(input);
    const o = playDecision(w, d, outcomeOf(result));
    expect(o.goals).toEqual(result.score);
    // The first match is the state championship's: its table counts it.
    const rows = d.competitionId.startsWith('div-') ? divisionTable(w).rows : estadualView(w)!.rows;
    const row = rows.find((r) => r.clubId === clubId)!;
    expect(row.goalsFor).toBe(result.score[mine]);
  }, 60_000);
});
