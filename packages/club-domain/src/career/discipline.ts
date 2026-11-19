/**
 * Suspensions (CBF RGC art. 43-45, CBJD): three yellow cards in a competition bar the player
 * from its next match there and the count starts again; a sending-off bars him from the next
 * one at once. A straight red also goes to the sports court (STJD), which judges it about two
 * weeks later and may add matches: most get no more than the automatic one, a violent act gets
 * several. Bans are served in the competition they were earned in and carry over to its next
 * edition; the yellow count does not cross the season. Only the person's players are tracked
 * man by man, like injuries (health.ts). Every roll is a fixed number of the career's seed.
 */
import type { CareerWorld } from './advance';

export type Card = 'yellow' | 'red' | 'second';
export interface Booking {
  playerId: string;
  card: Card;
}

export interface Discipline {
  /** Yellow cards since the last ban, by competition and player; this season only. */
  yellows: Record<string, Record<string, number>>;
  /** Matches each player still has to sit out, by competition. */
  bans: Record<string, Record<string, number>>;
  /** Straight reds waiting for the court: the day it sits, who, where. */
  trials: { day: number; playerId: string; competitionId: string }[];
}

/** Yellow cards that make a ban (RGC: "terceiro cartão amarelo"). */
export const YELLOWS = 3;
/** Days from the sending-off to the STJD session that judges it. PARÂMETRO. */
export const TRIAL_DAYS = 14;
/**
 * Of a hundred straight reds, the extra matches the court adds to the automatic one. Most
 * sentences are of one or two matches all told, in which the automatic one counts; violent
 * conduct (CBJD art. 254, 254-A) gets four or more. PARÂMETRO.
 */
const COURT: [extra: number, share: number][] = [
  [0, 45],
  [1, 30],
  [2, 15],
  [3, 6],
  [5, 4],
];
/** How often a man in each position is booked, relative (defenders and holders foul most). */
const ROLE: Record<string, number> = { GK: 1, CB: 5, DM: 5, RB: 4, LB: 4, CM: 4, WB: 4 };

/** A fixed number 0..9999 for a purpose, a day and an id. */
function draw(seed: number, id: string, day: number, salt: number): number {
  let h = Math.imul(2166136261 ^ salt, 16777619) ^ seed ^ Math.imul(day, 69069);
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return (h >>> 0) % 10_000;
}

/** The person's players barred from a match of `competitionId`. */
export function suspendedIn(w: CareerWorld, competitionId: string): Set<string> {
  const bans = w.discipline?.bans[competitionId] ?? {};
  return new Set(Object.keys(bans).filter((id) => bans[id]! > 0));
}

/**
 * Who of those on the pitch got the side's cards in a match nobody watched (`cards`: yellows
 * and reds, as quickResult gives them): weighted by position and a hot head. A red is a second
 * yellow about half the time.
 */
export function bookingsOf(
  w: CareerWorld,
  onPitch: readonly string[],
  [yellows, reds]: [number, number],
  day: number,
): Booking[] {
  const players = new Map(w.pack.players.map((p) => [p.id, p]));
  const weight = (id: string) => {
    const p = players.get(id);
    if (!p) return 1;
    // A temperament of 20 is ice, 1 a short fuse.
    return (ROLE[p.positions[0]!.position] ?? 2) * (30 - p.personality.temperament);
  };
  const out: Booking[] = [];
  const taken = new Set<string>();
  const pick = (salt: number) => {
    const left = onPitch.filter((id) => !taken.has(id));
    const total = left.reduce((a, id) => a + weight(id), 0);
    let r = draw(w.seed, `${w.clubId}:${salt}`, day, 20) % Math.max(1, total);
    for (const id of left) if ((r -= weight(id)) < 0) return id;
    return left[0];
  };
  for (let k = 0; k < reds; k++) {
    const id = pick(100 + k);
    if (!id) break;
    taken.add(id);
    out.push({ playerId: id, card: draw(w.seed, id, day, 21) % 2 ? 'second' : 'red' });
  }
  for (let k = 0; k < yellows; k++) {
    const id = pick(k);
    if (!id) break;
    taken.add(id);
    out.push({ playerId: id, card: 'yellow' });
  }
  return out;
}

/** What a ban or a sentence says in the inbox: the player and the matches. */
export interface Sentence {
  playerId: string;
  matches: number;
  why: 'yellows' | 'red' | 'court';
}

/**
 * The person's club played a match of `competitionId` on `day` with `bookings`: those who sat
 * it out serve a match, then the new cards count.
 */
export function afterMatch(
  w: CareerWorld,
  competitionId: string,
  day: number,
  bookings: readonly Booking[],
): Sentence[] {
  const d: Discipline = structuredClone(w.discipline ?? { yellows: {}, bans: {}, trials: [] });
  const out: Sentence[] = [];
  const bans = (d.bans[competitionId] ??= {});
  for (const id of Object.keys(bans)) if (--bans[id]! <= 0) delete bans[id];
  const yellows = (d.yellows[competitionId] ??= {});
  for (const b of bookings) {
    if (b.card === 'yellow') {
      yellows[b.playerId] = (yellows[b.playerId] ?? 0) + 1;
      if (yellows[b.playerId]! < YELLOWS) continue;
      delete yellows[b.playerId];
      bans[b.playerId] = (bans[b.playerId] ?? 0) + 1;
      out.push({ playerId: b.playerId, matches: 1, why: 'yellows' });
    } else {
      // The two yellows of a sending-off do not count towards the three (RGC).
      bans[b.playerId] = (bans[b.playerId] ?? 0) + 1;
      out.push({ playerId: b.playerId, matches: 1, why: 'red' });
      if (b.card === 'red')
        d.trials.push({ day: day + TRIAL_DAYS, playerId: b.playerId, competitionId });
    }
  }
  w.discipline = d;
  return out;
}

/** The court sits, before the day's matches, for every straight red judged by `day`. */
export function sitCourt(w: CareerWorld, day: number): Sentence[] {
  if (!w.discipline?.trials.some((t) => t.day <= day)) return [];
  const d: Discipline = structuredClone(w.discipline);
  const out: Sentence[] = [];
  d.trials = d.trials.filter((t) => {
    if (t.day > day) return true;
    let roll = draw(w.seed, t.playerId, t.day, 22) % 100;
    let extra = 0;
    for (const [n, share] of COURT) {
      extra = n;
      if (roll < share) break;
      roll -= share;
    }
    if (extra > 0) {
      const bans = (d.bans[t.competitionId] ??= {});
      bans[t.playerId] = (bans[t.playerId] ?? 0) + extra;
      out.push({ playerId: t.playerId, matches: extra, why: 'court' });
    }
    return false;
  });
  w.discipline = d;
  return out;
}

/** A new season: the yellow count starts again; bans and pending trials carry over. */
export function newSeasonDiscipline(w: CareerWorld): void {
  if (!w.discipline) return;
  const { bans, trials } = w.discipline;
  if (!trials.length && Object.values(bans).every((b) => !Object.keys(b).length))
    delete w.discipline;
  else w.discipline = { yellows: {}, bans, trials };
}
