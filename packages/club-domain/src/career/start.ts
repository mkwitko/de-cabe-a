/**
 * How a career starts (00 §1.1, MC-176 and MC-177): any club of the pack's national divisions
 * (free_choice), or one of three offers from the last division picked to be different
 * challenges (job_offers). Pure and exact (ADR-020): the browser and the server agree.
 */
import { fork, next, rngFrom } from '@decabeca/match-engine';
import { regulationsFor } from '../competition/outcomes';
import { startSeason, type SeasonState } from '../competition/season';
import { createLedger, type Ledger } from '../finance/ledger';
import type { Pack, PackClub } from '../pack/schema';
import { bestRoles } from '../player/ratings';

export const START_MODES = ['free_choice', 'job_offers'] as const;
export type StartMode = (typeof START_MODES)[number];

export interface Division {
  id: string;
  name: string;
  tier: number;
  clubIds: string[];
}

/** National professional divisions of the pack's season, top first. */
export function nationalDivisions(pack: Pack): Division[] {
  return regulationsFor(pack.competitions, pack.season)
    .filter((c) => c.scope === 'nacional' && c.tier !== null && c.category === 'profissional')
    .sort((a, b) => a.tier! - b.tier!)
    .map((c) => ({ id: c.id, name: c.name, tier: c.tier!, clubIds: c.clubIds }));
}

/** The six sides of an offer (00 §1.1), each 0–100 as a rank inside the compared clubs. */
export const OFFER_AXES = ['budget', 'crowd', 'structure', 'staff', 'squad', 'ambition'] as const;
export type OfferAxis = (typeof OFFER_AXES)[number];
export type OfferProfile = Record<OfferAxis, number>;

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function rawAxes(pack: Pack, c: PackClub): Record<OfferAxis, number> {
  const ratings = pack.players
    .filter((p) => p.clubId === c.id)
    .map((p) => bestRoles(p.attributes, 1)[0]!.rating)
    .sort((a, b) => b - a)
    .slice(0, 16);
  return {
    budget: c.initialCash - c.initialDebt + c.sponsors.reduce((s, x) => s + x.annual, 0),
    crowd: c.fans.size,
    structure: mean(Object.values(c.facilities)) * 1_000_000 + c.stadium.capacity,
    staff: mean(Object.values(c.departments)),
    squad: ratings.length ? mean(ratings) : 0,
    ambition: c.fans.ambition + c.profile.financialRisk,
  };
}

/** Profiles as ranks among `clubIds` (0 = lowest, 100 = highest), so the axes are comparable. */
export function offerProfiles(pack: Pack, clubIds: string[]): Map<string, OfferProfile> {
  const byId = new Map(pack.clubs.map((c) => [c.id, c]));
  const raw = clubIds.map((id) => [id, rawAxes(pack, byId.get(id)!)] as const);
  const out = new Map<string, OfferProfile>(clubIds.map((id) => [id, {} as OfferProfile]));
  for (const axis of OFFER_AXES) {
    const sorted = [...raw].sort((a, b) => a[1][axis] - b[1][axis] || (a[0] < b[0] ? -1 : 1));
    sorted.forEach(([id], i) => {
      out.get(id)![axis] = sorted.length > 1 ? Math.round((i * 100) / (sorted.length - 1)) : 50;
    });
  }
  return out;
}

/** Squared distance between two profiles (exact arithmetic). */
export const profileDistance = (a: OfferProfile, b: OfferProfile) =>
  OFFER_AXES.reduce((s, k) => s + (a[k] - b[k]) ** 2, 0);

export interface Offer {
  clubId: string;
  profile: OfferProfile;
}

/**
 * Three offers from the last national division, as different from each other as possible:
 * the first at random by the seed, then each next the club farthest from those already
 * chosen (farthest-point). Same pack and seed, same offers.
 */
export function jobOffers(pack: Pack, seed: number, count = 3): Offer[] {
  const last = nationalDivisions(pack).at(-1);
  if (!last || last.clubIds.length < count) throw new Error('pack has no last division to offer');
  const profiles = offerProfiles(pack, last.clubIds);
  const r = fork(rngFrom(seed), 'job-offers');
  const ids = [...last.clubIds].sort();
  const chosen = [ids[Math.floor(next(r) * ids.length)]!];
  while (chosen.length < count) {
    let best = '';
    let bestD = -1;
    for (const id of ids) {
      if (chosen.includes(id)) continue;
      const d = Math.min(
        ...chosen.map((c) => profileDistance(profiles.get(c)!, profiles.get(id)!)),
      );
      if (d > bestD) [best, bestD] = [id, d];
    }
    chosen.push(best);
  }
  return chosen.map((clubId) => ({ clubId, profile: profiles.get(clubId)! }));
}

/** Clubs a person may pick in each mode. */
export function canStartAt(pack: Pack, mode: StartMode, clubId: string, offers: Offer[]): boolean {
  if (mode === 'job_offers') return offers.some((o) => o.clubId === clubId);
  return nationalDivisions(pack).some((d) => d.clubIds.includes(clubId));
}

export interface CareerStart {
  clubId: string;
  season: SeasonState;
  /** The person's club ledger, opened with the pack's cash and debt (01 §5, MC-175). */
  ledger: Ledger;
}

/** The world on day one: exactly the pack, the season drawn from the seed, the opening ledger. */
export function startCareer(pack: Pack, seed: number, clubId: string): CareerStart {
  const club = pack.clubs.find((c) => c.id === clubId);
  if (!club) throw new Error(`unknown club ${clubId}`);
  // The old debt is paid in monthly instalments (04 §4 Dívida, career/finance.ts), not here.
  const ledger = createLedger(0, [
    {
      key: 'opening-cash',
      kind: 'opening',
      ref: 'pack',
      amount: club.initialCash,
      day: 0,
      dueDay: 0,
    },
  ]);
  return { clubId, season: startSeason(pack, { seed }), ledger };
}

export interface Upcoming {
  id: string;
  day: number;
  competitionId: string;
  home: string;
  away: string;
}

/** The club's next matches already on the calendar, soonest first. */
export function upcomingFor(s: SeasonState, clubId: string, n = 5): Upcoming[] {
  return [...(s.calendar.byClub.get(clubId) ?? [])]
    .filter((m) => !m.played)
    .sort((a, b) => a.day - b.day || (a.id < b.id ? -1 : 1))
    .slice(0, n)
    .map((m) => {
      const meta = s.meta.get(m.id)!;
      return {
        id: m.id,
        day: m.day,
        competitionId: meta.competitionId,
        home: meta.home,
        away: meta.away,
      };
    });
}
