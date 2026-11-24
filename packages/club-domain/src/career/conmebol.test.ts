import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { LIBERTADORES_ID } from '../competition/conmebol';
import { simulateMatch } from '@decabeca/match-engine';
import { outcomeOf } from '../match/fixture-input';
import { quickResult } from '../match/quick';
import { careerMatch, nextDecision, openCareer, playDecision } from './advance';
import { foreignSquad } from './foreign-squad';
import { clubLevel, clubLevels } from './training';
import { altitudeOf, climbOf } from './travel';
import { foreignRank } from './foreign';
import { PackSchema } from '../pack/schema';
import { dayOf } from '../competition/calendar';
import { postEntry } from '../finance/ledger';
import { ABROAD, importFee, signable } from '../market/abroad';
import { bidFee, bidTerms, cannotTalk, myWageRoom, openTalk, openingWage } from '../market/talks';
import type { CareerWorld } from './advance';
import { codeOf, evolve, foreignClubs } from './development';
import { loadCareer, saveCareer } from './save';
import { nationalDivisions } from './start';

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

describe('the foreign clubs of the FM export', () => {
  it('rank by reputation and play with their real squad', () => {
    const dev = generateDevPack();
    const twin = dev.clubs[3]!;
    const squad = dev.players
      .filter((p) => p.clubId === twin.id)
      .map((p) => ({ ...p, id: `real-${p.id}`, nationality: 'AR', clubId: 'foreign-arg-river' }));
    const pack = {
      ...dev,
      foreign: [
        { id: 'foreign-arg-river', reputation: 50, players: squad },
        { id: 'foreign-bol-bolivar', reputation: 100, players: [] },
      ],
    };
    expect(PackSchema.safeParse(pack).success).toBe(true);
    // The best reputation of all: first, whatever its stage and country.
    expect(foreignRank('foreign-bol-bolivar', pack)).toBe(1);
    expect(foreignRank('foreign-bol-bolivar')).toBeGreaterThan(1);
    // The real squad plays, and its measure is its own.
    const real = foreignSquad(pack, pack.season, 'foreign-arg-river');
    expect(real.map((p) => p.id)).toEqual(squad.map((p) => p.id));
    expect(clubLevels(pack, pack.season).strength.get('foreign-arg-river')).toBe(
      clubLevel({ ...pack, players: squad }, 'foreign-arg-river', pack.season, Infinity).strength,
    );
    // A player filed under another club is refused.
    const wrong = { ...pack, foreign: [{ id: 'foreign-arg-boca', players: squad }] };
    expect(PackSchema.safeParse(wrong).success).toBe(false);
  });
});

describe('signing from a real foreign squad', () => {
  it('the person signs a River player: he joins the squad, leaves River and stays on load', () => {
    const dev = generateDevPack();
    const twin = dev.clubs[3]!;
    const squad = dev.players
      .filter((p) => p.clubId === twin.id)
      .map((p) => ({ ...p, id: `real-${p.id}`, nationality: 'AR', clubId: 'foreign-arg-river' }));
    const pack = { ...dev, foreign: [{ id: 'foreign-arg-river', players: squad }] };
    const clubId = nationalDivisions(pack)[0]!.clubIds[5]!;
    const w = openCareer(structuredClone(pack), 3, clubId);
    w.day = dayOf('2026-02-16');
    w.ledger.today = w.day;
    // River's players sit abroad, on the person's market, priced by the foreign market's rules.
    const p = w.pack.players
      .filter((x) => x.id.startsWith('real-') && x.clubId === ABROAD)
      .filter((x) => cannotTalk(w, x) === null && openingWage(w, x) <= myWageRoom(w))
      .sort((a, b) => importFee(w, a) - importFee(w, b))[0]!;
    expect(p).toBeDefined();
    postEntry(w.ledger, {
      key: 'test:cash',
      kind: 'transfers',
      ref: 'test',
      amount: importFee(w, p) * 2,
      day: w.day,
      dueDay: w.day,
    });
    expect(openTalk(w, p.id).asking).toBe(importFee(w, p));
    expect(bidFee(w, p.id, w.talks![p.id]!.asking).kind).toBe('accept');
    expect(bidTerms(w, p.id, w.talks![p.id]!.wants!).kind).toBe('accept');
    expect(w.pack.players.find((x) => x.id === p.id)!.clubId).toBe(clubId);
    const river = (x: CareerWorld) =>
      foreignSquad(x.origin, x.season.season, 'foreign-arg-river', x.moves).map((q) => q.id);
    expect(river(w)).not.toContain(p.id);
    expect(river(w)).toHaveLength(squad.length - 1);
    // The inbox names River, not the abroad bucket; River's strength is the squad left's.
    expect(w.inbox!.findLast((n) => n.kind === 'bought')).toMatchObject({
      club: 'foreign-arg-river',
    });
    const level = (players: typeof squad) =>
      clubLevel({ ...w.origin, players }, 'foreign-arg-river', w.season.season, Infinity).strength;
    expect(clubLevels(w.pack, w.season.season, w.origin).strength.get('foreign-arg-river')).toBe(
      level(squad.filter((x) => x.id !== p.id)),
    );
    // The world's clubs never buy them.
    expect(
      signable(
        w.pack.players.find((x) => x.id === squad[0]!.id)!,
        w.season.season,
      ),
    ).toBe(false);
    const back = loadCareer(structuredClone(pack), 3, clubId, saveCareer(w));
    expect(back.pack.players.find((x) => x.id === p.id)!.clubId).toBe(clubId);
    expect(river(back)).not.toContain(p.id);
    // A year on: the unsigned leave and come back a year older; he stays (unless he retires),
    // never back on River's books.
    const season = w.season.season;
    const growth = codeOf(
      w.pack,
      { clubId, intensity: 'normal', played: {} },
      new Set(),
      foreignClubs(w.origin),
    );
    const next = evolve(w.pack, w.origin, 3, { season, growth });
    const of = (id: string) => next.players.filter((x) => x.id === id);
    expect(of(p.id).length).toBeLessThanOrEqual(1);
    expect(of(p.id).every((x) => x.clubId === clubId)).toBe(true);
    const other = squad.find((x) => x.id !== p.id)!;
    expect(of(other.id)).toHaveLength(1);
    expect(of(other.id)[0]!.clubId).toBe(ABROAD);
    expect(Number(of(other.id)[0]!.birthDate.slice(0, 4))).toBe(
      Number(other.birthDate.slice(0, 4)) + season + 1 - pack.season,
    );
  });
});

describe('the inbox of the other cups', () => {
  it('tells a knockout exit from the Libertadores by name; a lost final is left to its end note', async () => {
    const { cupNotes } = await import('./cup');
    const pack = generateDevPack();
    const probe = openCareer(pack, 4, pack.clubs[0]!.id);
    const clubId = probe.season.members[LIBERTADORES_ID]!.find((id) => !id.startsWith('foreign-'))!;
    const w = openCareer(pack, 4, clubId);
    const at = w.season.decisions.length;
    const out = {
      competitionId: LIBERTADORES_ID,
      a: clubId,
      b: 'foreign-arg-boca',
      winner: 'foreign-arg-boca',
      by: 'penalties',
    } as const;
    w.season.decisions.push({ ...out, phaseId: 'quartas' }, { ...out, phaseId: 'final' });
    cupNotes(w, w.day, new Set([...Array(9).keys()]), at);
    const exits = w.inbox!.filter((n) => n.kind === 'copaOut');
    expect(exits).toEqual([
      expect.objectContaining({ phase: 'quartas', by: 'penalties', cup: expect.any(String) }),
    ]);
  });
});
