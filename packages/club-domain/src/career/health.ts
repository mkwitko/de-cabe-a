/**
 * Injuries, first cut (08 §9, corte 1): a kind, days out and a day of return. A starter may be
 * hurt in a match; the risk grows when he played tired, with how prone he is and under a hard
 * week of training. An injured player does not play: the coach puts the best fit man in his
 * slot for the day, without touching the eleven the person picked. The other clubs are not
 * tracked man by man: each plays a match short of nobody, one or two starters, by a fixed draw.
 * No dice: every roll is a fixed number of the career's seed, the player and the day. Integer
 * arithmetic (ADR-020); every number is a PARÂMETRO, not calibrated.
 */
import { FORMATIONS } from '@decabeca/match-engine';
import type { CareerWorld } from './advance';
import {
  bestLineup,
  foreignLimit,
  isForeign,
  lineupOf,
  slotRatings,
  squadPlayers,
  type Lineup,
} from './squad';
import type { Training } from './training';
import { suspendedIn } from './discipline';
import { matchesOn } from '../competition/season';

export const INJURIES = ['knock', 'muscle', 'sprain', 'serious'] as const;
export type InjuryKind = (typeof INJURIES)[number];

export interface Injury {
  kind: InjuryKind;
  /** The day it happened and the first day he can play again. */
  from: number;
  until: number;
}

/** Of a hundred injuries, how many of each kind, and the days out it runs from and to. */
const TABLE: Record<InjuryKind, { share: number; days: [number, number] }> = {
  knock: { share: 30, days: [3, 9] },
  muscle: { share: 45, days: [8, 28] },
  sprain: { share: 20, days: [12, 40] },
  serious: { share: 5, days: [90, 200] },
};
/** Chance in ten thousand that a rested, ordinary starter is hurt in a match. */
const BASE = 220;
/**
 * The medical department by level 1..5 (04 §6, 04 §4.7): percent on the risk of an injury and on
 * the days out. A level 3 department is the yardstick. PARÂMETRO.
 */
const MEDICAL_RISK = [12, 5, 0, -8, -15] as const;
const MEDICAL_DAYS = [15, 7, 0, -12, -25] as const;
/** Points a level of medical department moves a rival's chance of a man short. */
const MEDICAL_ROLL = 4;
const medicalOf = (w: CareerWorld, clubId: string) =>
  w.pack.clubs.find((c) => c.id === clubId)?.facilities.medical ?? 3;

/** A fixed number 0..9999 for a player, a day and a purpose. */
function draw(seed: number, id: string, day: number, salt: number): number {
  let h = Math.imul(2166136261 ^ salt, 16777619) ^ seed ^ Math.imul(day, 40503);
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return (h >>> 0) % 10_000;
}

/** The person's players who cannot play on `day`. */
export function injuredOn(w: CareerWorld, day: number): Set<string> {
  const out = new Set<string>();
  for (const [id, i] of Object.entries(w.injuries ?? {})) if (day < i.until) out.add(id);
  return out;
}

/** The person's players who cannot play on `day`: injured, or banned from that day's match. */
export function outOn(w: CareerWorld, day: number): Set<string> {
  const out = injuredOn(w, day);
  if (!w.cards?.[w.clubId]) return out;
  for (const id of matchesOn(w.season, day)) {
    const m = w.season.meta.get(id)!;
    if (m.home === w.clubId || m.away === w.clubId)
      for (const p of suspendedIn(w, m.competitionId)) out.add(p);
  }
  return out;
}

/**
 * The eleven that takes the pitch on `day`: the one in force, with each man who cannot play
 * replaced in his slot by the best fit of those left. The eleven the person picked is not
 * changed; when everyone is fit this is that eleven.
 */
export function fielded(w: CareerWorld, day: number): Lineup {
  const picked = lineupOf(w);
  const out = outOn(w, day);
  // Past the limit of foreigners, the last of them named sits out like a man hurt.
  const limit = foreignLimit(w.season.season);
  const foreign = new Set(
    w.pack.players.filter((p) => p.clubId === w.clubId && isForeign(p)).map((p) => p.id),
  );
  const named = picked.xi.filter((id) => foreign.has(id) && !out.has(id));
  for (const id of named.slice(limit)) out.add(id);
  if (!picked.xi.some((id) => out.has(id))) return picked;
  const roles = FORMATIONS[picked.formation]!.roles;
  const fit = slotRatings(w, picked.formation);
  const xi = [...picked.xi];
  const squad = squadPlayers(w);
  for (const [i, id] of picked.xi.entries()) {
    if (!out.has(id)) continue;
    const keeper = roles[i] === 'goalkeeper' || roles[i] === 'sweeperKeeper';
    let best: string | null = null;
    const room = xi.filter((x) => foreign.has(x) && !out.has(x)).length < limit;
    for (const p of squad) {
      if (out.has(p.id) || xi.includes(p.id) || (!room && foreign.has(p.id))) continue;
      if (p.positions.some((x) => x.position === 'GK') !== keeper) continue;
      if (
        !best ||
        fit.get(p.id)![i]! > fit.get(best)![i]! ||
        (fit.get(p.id)![i]! === fit.get(best)![i]! && p.id < best)
      )
        best = p.id;
    }
    // Nobody left for the slot (a squad of walking wounded): he plays hurt rather than leave a hole.
    if (best) xi[i] = best;
  }
  return { ...picked, xi };
}

/**
 * Who of the eleven was hurt in the match of `day`, given how fresh each was at kick-off and
 * the week's training. Tired legs up to triple the risk; a fragile player up to half more.
 */
export function hurtIn(
  w: CareerWorld,
  xi: readonly string[],
  day: number,
  t: Training,
): Record<string, Injury> {
  const hurt: Record<string, Injury> = {};
  const players = new Map(w.pack.players.map((p) => [p.id, p]));
  const medical = medicalOf(w, w.clubId);
  for (const id of xi) {
    const p = players.get(id);
    if (!p) continue;
    const tired = Math.round((1 - (t.fresh[id] ?? 1)) * 200);
    const prone = (p.hidden.injuryProneness - 10) * 5;
    const week = t.intensity === 'hard' ? 20 : t.intensity === 'light' ? -10 : 0;
    const care = 100 + MEDICAL_RISK[medical - 1]!;
    const risk = Math.round(
      (BASE * (100 + tired) * (100 + prone) * (100 + week) * care) / 100_000_000,
    );
    if (draw(w.seed, id, day, 1) >= risk) continue;
    let pick = draw(w.seed, id, day, 2) % 100;
    let kind: InjuryKind = 'knock';
    for (const k of INJURIES) {
      kind = k;
      if (pick < TABLE[k].share) break;
      pick -= TABLE[k].share;
    }
    const [lo, hi] = TABLE[kind].days;
    const out = lo + (draw(w.seed, id, day, 3) % (hi - lo + 1));
    hurt[id] = {
      kind,
      from: day,
      until: day + Math.max(1, Math.round((out * (100 + MEDICAL_DAYS[medical - 1]!)) / 100)),
    };
  }
  return hurt;
}

/**
 * Starters another club is short of on `day`: none in about half its matches, one, sometimes
 * two; fewer with a better medical department.
 */
export function rivalOut(w: CareerWorld, clubId: string, day: number): number {
  // A better medical department keeps more of the squad on its feet.
  const roll = (draw(w.seed, clubId, day, 4) % 100) - (medicalOf(w, clubId) - 3) * MEDICAL_ROLL;
  return roll < 55 ? 0 : roll < 88 ? 1 : 2;
}
/**
 * Which starters another club is short of on `day`: as many as `rivalOut` says, picked from its
 * best eleven by a fixed draw. For the engine match, where the men who replace them play.
 */
export function rivalOutIds(
  w: CareerWorld,
  clubId: string,
  xi: readonly string[],
  day: number,
): Set<string> {
  const out = new Set<string>();
  const n = rivalOut(w, clubId, day);
  // The keeper's slot is left alone: a club always has its number one or his stand-in ready.
  for (let k = 0; out.size < n && k < 40; k++)
    out.add(xi[1 + (draw(w.seed, clubId, day, 10 + k) % (xi.length - 1))]!);
  return out;
}
/**
 * Share of the eleven's part of the strength a missing starter costs in a level 3 result, in
 * thousandths. A club's strength is a mean of sixteen, so a starter replaced by a man five or
 * six points worse costs a third of a point: this is that, for a club not tracked man by man.
 */
export const MISSING = 11;

/** For a squad to field without the injured: the coach's best eleven of those fit. */
export const fitLineup = (w: CareerWorld, formation: string, day: number): Lineup =>
  bestLineup(w, formation, outOn(w, day), foreignLimit(w.season.season));
