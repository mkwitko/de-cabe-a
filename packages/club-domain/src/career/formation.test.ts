import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { crop, formedBy } from './development';
import { readingsOf } from '../market/value';

const base = generateDevPack();
const clubId = base.clubs[10]!.id;
/** The pack with the club credited for forming its whole first team. */
const former = {
  ...base,
  players: base.players.map((p) => (p.clubId === clubId ? { ...p, origin: { clubId } } : p)),
};

describe('formation and the talent map (mapa de conhecimento §2.9)', () => {
  it('counts the players a club formed who play at a professional level', () => {
    expect(formedBy(base).get(clubId) ?? 0).toBe(0);
    expect(formedBy(former).get(clubId)).toBeGreaterThan(0);
  });

  it("a club's boys are its own (solidarity), and a known former brings better ones", () => {
    const mean = (pack: typeof base) => {
      let sum = 0;
      let n = 0;
      for (let season = 2027; season < 2037; season++)
        for (const b of crop(pack, clubId, 7, season)) {
          expect(b.origin?.clubId).toBe(clubId);
          sum += b.potential.ceiling.technical;
          n++;
        }
      return sum / n;
    };
    if ((formedBy(former).get(clubId) ?? 0) >= 8) expect(mean(former)).toBeGreaterThan(mean(base));
    expect(readingsOf(base).size).toBeGreaterThan(0);
  });
});
