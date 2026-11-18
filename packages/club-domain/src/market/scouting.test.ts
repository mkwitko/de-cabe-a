import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { openCareer } from '../career/advance';
import { loadCareer, saveCareer } from '../career/save';
import { jobOffers } from '../career/start';
import {
  MISSION_DAYS,
  personKnows,
  scoutAreas,
  scoutingDay,
  scoutsOf,
  sendScout,
} from './scouting';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;

describe("the person's scouts", () => {
  it('the club starts out knowing its squad and only part of the country', () => {
    const w = openCareer(pack, 3, clubId);
    const others = w.pack.players.filter((p) => p.clubId && p.clubId !== clubId);
    const seen = others.filter((p) => personKnows(w, p)).length;
    expect(seen).toBeGreaterThan(0);
    expect(seen).toBeLessThan(others.length);
    for (const p of w.pack.players.filter((p) => p.clubId === clubId))
      expect(personKnows(w, p)).toBe(true);
  });

  it('a scout reports after his trip, the players stay in the files and survive a save', () => {
    const w = openCareer(pack, 3, clubId);
    const area = scoutAreas(w).find((a) => a.startsWith('tier:'))!;
    expect(sendScout(w, area, 10)).toBeNull();
    expect(sendScout(w, area, 10)).toBe('already');
    expect(sendScout(w, 'nowhere', 10)).toBe('area');
    const before = w.pack.players.filter((p) => personKnows(w, p)).length;
    scoutingDay(w, 10 + MISSION_DAYS - 1);
    expect(w.scouting!.missions).toHaveLength(1);
    scoutingDay(w, 10 + MISSION_DAYS);
    expect(w.scouting!.missions).toHaveLength(0);
    const found = Object.keys(w.scouting!.known);
    expect(found.length).toBeGreaterThan(0);
    expect(w.pack.players.filter((p) => personKnows(w, p)).length).toBe(before + found.length);
    expect(w.inbox!.at(-1)).toMatchObject({ kind: 'scouted', area, players: found.length });
    const back = loadCareer(pack, 3, clubId, saveCareer(w));
    expect(back.scouting!.known).toEqual(w.scouting!.known);
  });

  it('no more scouts away than the department has', () => {
    const w = openCareer(pack, 3, clubId);
    const areas = scoutAreas(w);
    const n = scoutsOf(w);
    for (let i = 0; i < n; i++) expect(sendScout(w, areas[i]!, 1)).toBeNull();
    expect(sendScout(w, areas[n]!, 1)).toBe('busy');
  });
});
