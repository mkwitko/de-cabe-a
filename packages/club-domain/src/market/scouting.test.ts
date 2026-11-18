import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { openCareer } from '../career/advance';
import { loadCareer, saveCareer } from '../career/save';
import { jobOffers } from '../career/start';
import {
  MISSION_DAYS,
  WATCH_DAYS,
  FADE_DAYS,
  MATCH_GAIN,
  facedClub,
  knowledgeOf,
  personKnows,
  personReading,
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
    // Reports reach players unknown before and sharpen some the club half knew.
    expect(w.pack.players.filter((p) => personKnows(w, p)).length).toBeGreaterThan(before);
    for (const id of found)
      expect(
        knowledgeOf(
          w,
          w.pack.players.find((p) => p.id === id)!,
        ),
      ).toBeGreaterThan(0);
    expect(w.inbox!.at(-1)).toMatchObject({ kind: 'scouted', area, players: found.length });
    const back = loadCareer(pack, 3, clubId, saveCareer(w));
    expect(back.scouting!.known).toEqual(w.scouting!.known);
  });

  it('knowledge sharpens the reading, fades with time, and grows with matches', () => {
    const w = openCareer(pack, 3, clubId);
    const area = scoutAreas(w).find((a) => a.startsWith('tier:'))!;
    sendScout(w, area, 10);
    const back = 10 + MISSION_DAYS;
    scoutingDay(w, back);
    const id = Object.keys(w.scouting!.known)[0]!;
    const p = w.pack.players.find((x) => x.id === id)!;
    w.day = back;
    const fresh = personReading(w, p);
    expect(fresh.knowledge).toBeGreaterThan(0);
    w.day = back + 20 * FADE_DAYS;
    const old = personReading(w, p);
    expect(old.knowledge).toBe(Math.max(0, fresh.knowledge - 20));
    expect(old.range[1] - old.range[0]).toBeGreaterThanOrEqual(fresh.range[1] - fresh.range[0]);
    // A match against his club teaches the club about him again.
    facedClub(w, p.clubId!, w.day);
    expect(knowledgeOf(w, p)).toBe(old.knowledge + MATCH_GAIN);
    // Faded all the way, he leaves the files.
    scoutingDay(w, w.day + 300 * FADE_DAYS - ((w.day + 300 * FADE_DAYS) % 30));
    expect(w.scouting!.known[id]).toBeUndefined();
  });

  it('at full knowledge the club reads him exactly', () => {
    const w = openCareer(pack, 3, clubId);
    const p = w.pack.players.find((x) => x.clubId && x.clubId !== clubId)!;
    w.scouting = { known: { [p.id]: { k: 100, day: w.day } }, missions: [] };
    const r = personReading(w, p);
    expect(r.range[0]).toBe(r.range[1]);
  });

  it('a scout watches one player for a week and knows him better than a trip would', () => {
    const w = openCareer(pack, 3, clubId);
    const p = w.pack.players.find((x) => x.clubId && x.clubId !== clubId && !personKnows(w, x))!;
    expect(sendScout(w, `player:${p.id}`, 5)).toBeNull();
    expect(sendScout(w, `player:${p.id}`, 5)).toBe('already');
    const mine = w.pack.players.find((x) => x.clubId === clubId)!;
    expect(sendScout(w, `player:${mine.id}`, 5)).toBe('area');
    scoutingDay(w, 5 + WATCH_DAYS);
    w.day = 5 + WATCH_DAYS;
    expect(knowledgeOf(w, p)).toBeGreaterThanOrEqual(30);
    expect(personKnows(w, p)).toBe(true);
    expect(w.inbox!.at(-1)).toMatchObject({ kind: 'scouted', area: `player:${p.id}`, players: 1 });
  });

  it('no more scouts away than the department has', () => {
    const w = openCareer(pack, 3, clubId);
    const areas = scoutAreas(w);
    const n = scoutsOf(w);
    for (let i = 0; i < n; i++) expect(sendScout(w, areas[i]!, 1)).toBeNull();
    expect(sendScout(w, areas[n]!, 1)).toBe('busy');
  });
});
