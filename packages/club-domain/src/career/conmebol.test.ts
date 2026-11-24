import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { LIBERTADORES_ID } from '../competition/conmebol';
import { simulateMatch } from '@decabeca/match-engine';
import { outcomeOf } from '../match/fixture-input';
import { quickResult } from '../match/quick';
import { careerMatch, nextDecision, openCareer, playDecision } from './advance';
import { foreignSquad } from './foreign-squad';
import { clubLevels } from './training';
import { altitudeOf, climbOf } from './travel';

describe('the person in the Libertadores', () => {
  it('watches its matches against foreign clubs, and is paid its prizes and group money', () => {
    const pack = generateDevPack();
    const probe = openCareer(pack, 4, pack.clubs[0]!.id);
    const clubId = probe.season.members[LIBERTADORES_ID]!.find((id) => !id.startsWith('foreign-'))!;
    const w = openCareer(pack, 4, clubId);
    let foreign = 0;
    for (let d = nextDecision(w); d.kind === 'match'; d = nextDecision(w)) {
      if (
        d.competitionId === LIBERTADORES_ID &&
        (d.home.startsWith('foreign-') || d.away.startsWith('foreign-'))
      ) {
        foreign++;
        if (foreign === 1) {
          // The foreign side fields its own generated squad, in the engine.
          const rival = d.home.startsWith('foreign-') ? d.home : d.away;
          const { input, mine } = careerMatch(w, d);
          const theirs = input.teams[mine === 0 ? 1 : 0].players.map((p) => p.id);
          expect(theirs.every((id) => id.startsWith(`${rival}-p`))).toBe(true);
          playDecision(w, d, outcomeOf(simulateMatch(input)));
          continue;
        }
      }
      playDecision(w, d);
    }
    expect(foreign).toBeGreaterThan(0);
    expect(w.season.results[LIBERTADORES_ID]?.final).toBeTruthy();
    const paid = w.ledger.entries.filter((e) => e.key.includes(`:${LIBERTADORES_ID}:`));
    expect(paid.length).toBeGreaterThan(0);
    expect(paid.reduce((s, e) => s + e.amount, 0)).toBeGreaterThan(5_000_000);
    // Paid stage by stage, not all on the final's day.
    const final = Math.max(...paid.map((e) => e.day));
    expect(paid.some((e) => e.day < final)).toBe(true);
  }, 120_000);
});

describe('the foreign clubs', () => {
  it('borrow the squad of the Brazilian club at their rank, under their own flag', () => {
    const pack = generateDevPack();
    const levels = clubLevels(pack, pack.season);
    for (const id of ['foreign-arg-river', 'foreign-bol-bolivar']) {
      const squad = foreignSquad(pack, pack.season, id);
      expect(squad.length).toBeGreaterThanOrEqual(18);
      expect(squad.every((p) => p.clubId === id && p.nationality !== 'BR')).toBe(true);
      const twin = [...levels.strength].find(
        ([k, v]) => !k.startsWith('foreign-') && v === levels.strength.get(id),
      );
      expect(twin).toBeTruthy();
    }
    // Not in the pack: no other system ever sees them.
    expect(pack.players.some((p) => p.clubId?.startsWith('foreign-'))).toBe(false);
    // Four seasons on, the same men, four years older.
    const later = foreignSquad(pack, pack.season + 4, 'foreign-arg-river');
    expect(Number(later[0]!.birthDate.slice(0, 4))).toBe(
      Number(foreignSquad(pack, pack.season, 'foreign-arg-river')[0]!.birthDate.slice(0, 4)) + 4,
    );
  });

  it('are hard to beat up in La Paz', () => {
    const pack = generateDevPack();
    const home = 'foreign-bol-bolivar';
    expect(altitudeOf(pack, home)).toBeGreaterThan(3000);
    const climb = climbOf(pack, home, pack.clubs[0]!.id);
    expect(climb).toBeGreaterThan(2000);
    expect(climbOf(pack, pack.clubs[0]!.id, home)).toBe(0);
    const diff = (c: number) => {
      let gd = 0;
      for (let i = 0; i < 4000; i++) {
        const o = quickResult(i, 60, 60, 0.85, undefined, false, c);
        gd += o.goals[0] - o.goals[1];
      }
      return gd / 4000;
    };
    // McSharry: about half a goal per 1,000 m.
    expect(diff(climb) - diff(0)).toBeCloseTo((0.5 * climb) / 1000, 1);
  });
});
