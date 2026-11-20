import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import {
  canStartAt,
  jobOffers,
  nationalDivisions,
  offerProfiles,
  profileDistance,
  startCareer,
  upcomingFor,
} from './start';

const pack = generateDevPack();

describe('career start (MC-176, MC-177)', () => {
  it('free choice: any club of the national divisions, and the world starts as the pack', () => {
    const divs = nationalDivisions(pack);
    expect(divs.map((d) => d.tier)).toEqual([1, 2, 3, 4]);
    expect(divs.reduce((s, d) => s + d.clubIds.length, 0)).toBe(156);
    const club = pack.clubs.find((c) => c.id === divs[0]!.clubIds[0])!;
    expect(canStartAt(pack, 'free_choice', club.id, [])).toBe(true);
    expect(canStartAt(pack, 'free_choice', 'nobody', [])).toBe(false);

    const start = startCareer(pack, 9, club.id);
    expect(start.ledger.cash).toBe(club.initialCash);
    // The divisions are the pack's; the state championships come on top of them.
    expect(Object.fromEntries(divs.map((d) => [d.id, start.season.members[d.id]]))).toEqual(
      Object.fromEntries(divs.map((d) => [d.id, d.clubIds])),
    );
    // Same seed, same season (the browser and the server agree).
    expect(startCareer(pack, 9, club.id).season.calendar).toEqual(start.season.calendar);
    const next = upcomingFor(start.season, club.id, 5);
    expect(next).toHaveLength(5);
    for (const m of next) expect([m.home, m.away]).toContain(club.id);
    expect(next.map((m) => m.day)).toEqual([...next.map((m) => m.day)].sort((a, b) => a - b));
  });

  it('job offers: three last-division clubs, reproducible, farther apart than random picks', () => {
    const last = nationalDivisions(pack).at(-1)!;
    const offers = jobOffers(pack, 77);
    expect(offers).toHaveLength(3);
    expect(new Set(offers.map((o) => o.clubId)).size).toBe(3);
    for (const o of offers) expect(last.clubIds).toContain(o.clubId);
    expect(jobOffers(pack, 77)).toEqual(offers);
    expect(jobOffers(pack, 78).map((o) => o.clubId)).not.toEqual(offers.map((o) => o.clubId));
    expect(canStartAt(pack, 'job_offers', offers[0]!.clubId, offers)).toBe(true);
    expect(canStartAt(pack, 'job_offers', pack.clubs[0]!.id, offers)).toBe(false);

    // The closest pair of the offers beats the closest pair of most fixed triples.
    const profiles = offerProfiles(pack, last.clubIds);
    const minPair = (ids: string[]) =>
      Math.min(
        ...ids.flatMap((a, i) =>
          ids.slice(i + 1).map((b) => profileDistance(profiles.get(a)!, profiles.get(b)!)),
        ),
      );
    const ours = minPair(offers.map((o) => o.clubId));
    const triples = Array.from({ length: 30 }, (_, k) =>
      [k, k + 31, k + 62].map((i) => last.clubIds[i % last.clubIds.length]!),
    );
    const beaten = triples.filter((t) => minPair(t) < ours).length;
    expect(beaten).toBeGreaterThanOrEqual(27);
  });
});
