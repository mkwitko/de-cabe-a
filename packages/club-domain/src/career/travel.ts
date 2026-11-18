/**
 * Travel (mapa de conhecimento §2.6, entrega 4): Brazil is a continent, and a trip from Porto
 * Alegre to Manaus is not one across town. The distance between two clubs is read from their
 * cities (by air, cached per pack); it costs the away side some strength on the day and,
 * for the person's club, the trip's money and a little more of the eleven's legs.
 * Every number is a PARÂMETRO.
 */
import type { CareerWorld } from './advance';
import { postEntry } from '../finance/ledger';
import { WHOLE, cached } from '../lib/pack-cache';
import type { Competition } from '../competition/schema';
import type { Pack } from '../pack/schema';

const EARTH_KM = 6371;

/** Kilometres between two clubs' cities, by air; 0 when a city is unknown. */
export function distanceKm(pack: Pack, a: string, b: string): number {
  if (a === b) return 0;
  const memo = cached(pack, 'travelKm', WHOLE, () => {
    const cities = new Map(pack.cities.map((c) => [c.id, c]));
    const clubs = new Map(pack.clubs.map((c) => [c.id, cities.get(c.cityId)]));
    return { clubs, km: new Map<string, number>() };
  });
  const key = a < b ? `${a}|${b}` : `${b}|${a}`;
  const known = memo.km.get(key);
  if (known !== undefined) return known;
  const x = memo.clubs.get(a);
  const y = memo.clubs.get(b);
  let km = 0;
  if (x && y) {
    // Equirectangular distance with a polynomial cosine: only +, -, *, / and sqrt, which every
    // engine computes alike (ADR-020), and within 1% of the great circle across Brazil.
    const rad = Math.PI / 180;
    const mid = ((x.lat + y.lat) / 2) * rad;
    const m2 = mid * mid;
    const cos = 1 - m2 / 2 + (m2 * m2) / 24 - (m2 * m2 * m2) / 720;
    const dLat = (y.lat - x.lat) * rad;
    const dLon = (y.lon - x.lon) * rad * cos;
    km = Math.round(EARTH_KM * Math.sqrt(dLat * dLat + dLon * dLon));
  }
  memo.km.set(key, km);
  return km;
}

/** Strength the away side loses on the day, in thousandths: up to 20 (2%) past 3,000 km. */
const AWAY_LOSS_PER_1000_KM = 7;
const AWAY_LOSS_MAX = 20;
export const awayLoss = (km: number) =>
  Math.min(AWAY_LOSS_MAX, Math.round((km * AWAY_LOSS_PER_1000_KM) / 1000));

/** Legs the person's eleven leave on a long trip, on top of the match: up to 6% at 3,000 km. */
const TIRE_PER_1000_KM = 0.02;
const TIRE_MAX = 0.06;
export const travelTire = (km: number) => Math.min(TIRE_MAX, (km * TIRE_PER_1000_KM) / 1000);

/**
 * What a trip costs the club that travels: a bus under the plane distance, a charter over it,
 * and the nights; nothing when the organiser pays.
 */
const PEOPLE = 32;
const BUS_PER_KM = 12;
const PLANE_PER_SEAT = 1_500;
const PLANE_PER_SEAT_KM = 0.5;
const NIGHT = 350;
const PLANE_FROM_KM = 500;
export function travelCost(km: number, travel: Competition['money']['travel'] | undefined): number {
  if (km <= 0 || travel?.payer === 'organiser') return 0;
  const people = travel?.people ?? PEOPLE;
  const planeFrom = travel?.planeFromKm ?? PLANE_FROM_KM;
  const nights = travel?.nights ?? (km >= planeFrom ? 2 : 1);
  const move =
    km >= planeFrom
      ? people * (PLANE_PER_SEAT + Math.round(km * 2 * PLANE_PER_SEAT_KM))
      : Math.round(km * 2 * BUS_PER_KM);
  return Math.round((move + people * NIGHT * nights) / 1000) * 1000;
}

/** The person's away match: the trip's money into the ledger. Returns the kilometres. */
export function postAwayTrip(w: CareerWorld, matchId: string, day: number): number {
  const m = w.season.meta.get(matchId)!;
  if (m.away !== w.clubId) return 0;
  const km = distanceKm(w.pack, m.home, m.away);
  const travel = w.season.competitions.find((c) => c.id === m.competitionId)?.money.travel;
  const amount = travelCost(km, travel);
  if (amount > 0)
    postEntry(w.ledger, {
      key: `travel:${w.season.season}:${matchId}`,
      kind: 'travel',
      ref: matchId,
      amount: -amount,
      day,
      dueDay: day,
    });
  return km;
}
