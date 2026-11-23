import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { openCareer } from '../career/advance';
import { loadCareer, saveCareer } from '../career/save';
import { jobOffers, nationalDivisions } from '../career/start';
import { MISSION_DAYS, scoutAreas, scoutingDay, scoutsOf, sendScout } from './scouting';
import { scoutStaff, scoutWorth, searchPlayers } from './scouts';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;

describe('scouts as people', () => {
  it('the club has named scouts, as many as its department allows, the same every time', () => {
    const w = openCareer(pack, 3, clubId);
    const staff = scoutStaff(w);
    expect(staff).toHaveLength(scoutsOf(w));
    expect(scoutStaff(openCareer(pack, 3, clubId))).toEqual(staff);
    for (const s of staff) {
      expect(s.name).toMatch(/\S+ \S+/);
      expect(s.ability).toBeGreaterThanOrEqual(1);
      expect(s.ability).toBeLessThanOrEqual(20);
      expect(s.home).toMatch(/^[A-Z]{2}$/);
    }
    // His own state and boys (for a specialist) make his reports worth more.
    const s = { ...staff[0]!, youth: true };
    expect(scoutWorth(s, s.home, undefined, 3)).toBeGreaterThan(
      scoutWorth(s, 'tier:1', undefined, 3),
    );
    expect(scoutWorth(s, 'tier:1', { maxAge: 19 }, 3)).toBeGreaterThan(
      scoutWorth(s, 'tier:1', undefined, 3),
    );
  });

  it('a mission for boys of a position reports only such players, graded, and keeps the report', () => {
    const w = openCareer(pack, 3, clubId);
    const scout = scoutStaff(w)[0]!;
    const area = scoutAreas(w).find((a) => a.startsWith('tier:'))!;
    expect(
      sendScout(w, area, 10, { scout: scout.id, focus: { maxAge: 21, position: 'CM' } }),
    ).toBeNull();
    expect(sendScout(w, area, 10, { scout: 'nobody' })).toBe('scout');
    scoutingDay(w, 10 + MISSION_DAYS);
    const report = w.scouting!.reports![0]!;
    expect(report.scout).toBe(scout.id);
    expect(report.players.length).toBeGreaterThan(0);
    const byId = new Map(w.pack.players.map((p) => [p.id, p]));
    for (const r of report.players) {
      const p = byId.get(r.id)!;
      expect(p.positions[0]!.position).toBe('CM');
      expect(w.season.season - Number(p.birthDate.slice(0, 4))).toBeLessThanOrEqual(21);
      expect(['A', 'B', 'C']).toContain(r.grade);
    }
    const note = w.inbox!.findLast((n) => n.kind === 'scouted')!;
    expect(note).toMatchObject({ scout: scout.name });
    expect(loadCareer(pack, 3, clubId, saveCareer(w)).scouting!.reports).toEqual(
      w.scouting!.reports,
    );
  });

  it('the areas take in the season’s other competitions and the players abroad', () => {
    const w = openCareer(pack, 3, clubId);
    const areas = scoutAreas(w);
    expect(areas.some((a) => a.startsWith('comp:'))).toBe(true);
    expect(areas).toContain('abroad');
  });

  it('search finds players by name and by club, the person’s own left out', () => {
    const w = openCareer(pack, 3, clubId);
    const tiers = new Map(
      nationalDivisions(w.pack).flatMap((d) => d.clubIds.map((c) => [c, d.tier])),
    );
    const tierOf = (c: string) => tiers.get(c) ?? null;
    const someone = w.pack.players.find((p) => p.clubId && p.clubId !== clubId)!;
    const found = searchPlayers(
      w,
      { text: someone.name.split(' ')[0]!.toUpperCase() },
      tierOf,
      500,
    );
    expect(found.map((p) => p.id)).toContain(someone.id);
    expect(found.every((p) => p.clubId !== clubId)).toBe(true);
    const club = w.pack.clubs.find((c) => c.id === someone.clubId)!;
    const byClub = searchPlayers(w, { clubId: club.id }, tierOf, 500);
    expect(byClub.length).toBeGreaterThan(10);
    expect(byClub.every((p) => p.clubId === club.id)).toBe(true);
    expect(
      searchPlayers(w, { tier: 1, maxAge: 21 }, tierOf, 500).every((p) => tierOf(p.clubId!) === 1),
    ).toBe(true);
  });
});
