import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { awayLoss, distanceKm, travelCost, travelTire } from './travel';

const pack = generateDevPack();

describe('travel (mapa de conhecimento §2.6)', () => {
  it('distance is symmetric, zero within a city, and a long trip costs more', () => {
    const [a, b, c] = pack.clubs;
    expect(distanceKm(pack, a!.id, b!.id)).toBe(distanceKm(pack, b!.id, a!.id));
    expect(distanceKm(pack, a!.id, a!.id)).toBe(0);
    expect(distanceKm(pack, a!.id, c!.id)).toBeGreaterThanOrEqual(0);
    expect(travelCost(3000, undefined)).toBeGreaterThan(travelCost(300, undefined));
    expect(travelCost(0, undefined)).toBe(0);
  });

  it('the organiser pays when its rules say so', () => {
    const organiser = {
      payer: 'organiser' as const,
      busFromKm: null,
      planeFromKm: null,
      people: null,
      nights: null,
      conditional: false,
    };
    expect(travelCost(2000, organiser)).toBe(0);
  });

  it('the away side loses a little on long trips, capped', () => {
    expect(awayLoss(0)).toBe(0);
    expect(awayLoss(1000)).toBe(7);
    expect(awayLoss(10_000)).toBe(20);
    expect(travelTire(10_000)).toBe(0.06);
  });
});
