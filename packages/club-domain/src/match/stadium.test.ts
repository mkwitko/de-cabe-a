import { describe, expect, it } from 'vitest';
import { nextDecision, openCareer, playDecision } from '../career/advance';
import { jobOffers } from '../career/start';
import { generateDevPack } from '../generate/pack';
import { closedDoors, crowdAt, punishmentAt, ticketOf, usualCrowd } from './stadium';

describe('stadium operation (mapa §2.11)', () => {
  it('fills the share of seats the fans demand, and sets the ticket by price sensitivity', () => {
    const c = { stadium: { capacity: 40_000 }, fans: { demand: 60, priceSensitivity: 50 } };
    expect(usualCrowd(c as never)).toBe(24_000);
    expect(ticketOf(c as never, 1)).toBe(51);
    expect(ticketOf({ fans: { priceSensitivity: 80 } } as never, 1)).toBe(20);
    expect(ticketOf({ fans: { priceSensitivity: 100 } } as never, 1)).toBe(13);
  });

  it('plays the sentenced home matches behind closed doors, empty, after the trial', () => {
    const pack = generateDevPack();
    const w = openCareer(pack, 3, jobOffers(pack, 3)[0]!.clubId);
    for (let d = nextDecision(w); d.kind === 'match'; d = nextDecision(w)) playDecision(w, d);
    const s = w.season;
    let sentences = 0;
    for (const [clubId, set] of s.calendar.byClub) {
      const homes = [...set]
        .filter((m) => m.home === clubId)
        .sort((a, b) => a.day - b.day || (a.id < b.id ? -1 : 1));
      homes.forEach((m, i) => {
        const n = punishmentAt(pack, s, m.id);
        if (!n) return;
        sentences++;
        // The next home match is before the trial; then the sentence.
        if (homes[i + 1]) expect(closedDoors(pack, s, homes[i + 1]!.id)).toBe(false);
        for (const x of homes.slice(i + 2, i + 2 + n)) {
          expect(closedDoors(pack, s, x.id)).toBe(true);
          expect(crowdAt(pack, s, x.id)).toBe(0);
        }
      });
    }
    // Rare, but it happens in a season.
    expect(sentences).toBeGreaterThan(0);
    expect(sentences).toBeLessThan(s.outcomes.size / 50);
  });
});
