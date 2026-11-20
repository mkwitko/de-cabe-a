/**
 * Coaches with an identity, and clubs with a DNA (06 §5.3, 04 §2). The other clubs' coaches are
 * no longer anonymous: a pool of named men, each with a philosophy (a formation and a style like
 * the clubs' `playingStyle`), a quality that reads the game (a small edge in the quick results),
 * a taste for young or experienced players, a reputation and a career. A board that sacks its
 * coach hires from the free pool the one that fits the club's DNA and size; the sacked coach
 * joins the pool and is hired elsewhere later. A club's DNA drifts, slowly, toward the style it
 * really plays (the coach's blended with its own; the person's tactic at their club).
 * Deterministic: the pool comes from the seed and the hires from the state; integers only.
 */
import { fork, pick, rngFrom } from '@decabeca/match-engine';
import { FIRST_NAMES, LAST_NAMES } from '../generate/names';
import type { Pack } from '../pack/schema';
import type { CareerWorld } from './advance';
import { divisionOf } from './board';
import { note } from './inbox';
import type { PlanChoice } from './squad';

export type Style = Pack['clubs'][number]['profile']['playingStyle'];
/** The axes the person's tactic sets; the rest of the style is only the clubs'. */
export const AXES = ['pressing', 'block', 'width', 'tempo', 'risk'] as const;
const ALL = [...AXES, 'possession', 'verticality'] as const;

export interface Stint {
  club: string;
  /** Season he took the job, and the one he was sacked in. */
  from: number;
  to?: number;
}

export interface Coach {
  id: string;
  name: string;
  formation: string;
  style: Style;
  /** Tenths of a strength point his reading of the game adds to his side, -15..15. */
  quality: number;
  /** Youth growth bonus, 0..100: the boys of his club grow a little more. */
  development: number;
  /** 0 prefers experienced players, 100 prefers boys. */
  young: number;
  reputation: number;
  career: Stint[];
}

export interface Coaches {
  all: Record<string, Coach>;
  /** Club id to the coach in charge. */
  at: Record<string, string>;
  /** Coaches without a club, oldest first. */
  free: string[];
  /** Coaches made so far (ids). */
  made: number;
}

const PRESETS = ['4-3-3', '4-4-2', '4-2-3-1'] as const;
/** Share of a coach's philosophy in how his club plays, per cent (the rest is the club's DNA). */
export const SAY = 60;
/** Share of the gap between the DNA and the style played that closes each season, per cent. */
const DRIFT = 15;
/** Matches of the person before a season's style counts for the board. */
const MIN_MATCHES = 10;
/** Mean gap (0..100) under which the person plays the club's way, and over which against it. */
const IN_STYLE = 15;
const AGAINST = 35;
const IDENTITY = 3;
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

type PackStaff = Pack['staff'][number];

/** Tactical preference (1..20) the import stores in `specialties` as `pref:<key>=<n>`. */
const prefOf = (s: PackStaff, key: string): number => {
  const hit = s.specialties.find((x) => x.startsWith(`pref:${key}=`));
  return hit ? Number(hit.slice(key.length + 6)) : 10;
};

/**
 * A real coach of the pack as a game coach (06 §5.3): philosophy from the tactical preferences the
 * save gives him (pressing, tempo, width, attacking, directness), quality from his ability
 * (`tactics`, 1..20, scaled from the FM current ability), reputation from the pack's. The youth and
 * age tastes have no source: drawn from the seed like a made coach's.
 */
export function coachOfPack(seed: number, s: PackStaff): Coach {
  const r = fork(rngFrom(seed), `coach:${s.id}`);
  const [press, tempo, width, attack, direct] = [
    'press',
    'tempo',
    'width',
    'attacking',
    'directness',
  ].map((k) => prefOf(s, k) * 5) as [number, number, number, number, number];
  const ability = ((s.attributes.tactics ?? 10) - 1) * 10.5; // back to FM's 0..200 scale
  return {
    id: s.id,
    name: s.name,
    formation: attack >= 70 && width >= 55 ? '4-3-3' : attack <= 40 ? '4-4-2' : '4-2-3-1',
    style: {
      possession: clamp(105 - direct),
      verticality: clamp(direct),
      pressing: clamp(press),
      block: clamp(Math.round((press + attack) / 2)),
      width: clamp(width),
      tempo: clamp(tempo),
      risk: clamp(attack),
    },
    quality: clamp(Math.round((ability - 70) / 6), -15, 15),
    development: pick(r, 101),
    young: pick(r, 101),
    reputation: clamp(s.reputation),
    career: [],
  };
}

/** The pack's real head coaches by club (those of clubs outside the game's world too). */
function realCoaches(w: CareerWorld) {
  const real = new Map(
    w.pack.staff.filter((s) => s.field.identity?.origin === 'imported').map((s) => [s.id, s]),
  );
  const at = new Map<string, PackStaff>();
  if (real.size)
    for (const a of w.pack.assignments) {
      const s = real.get(a.staffId);
      if (s && a.posts.includes('headCoach')) at.set(a.clubId, s);
    }
  return { at };
}

export function makeCoach(seed: number, n: number): Coach {
  const r = fork(rngFrom(seed), `coach:${n}`);
  const quality = pick(r, 11) + pick(r, 11) + pick(r, 11) - 15;
  const axis = () => pick(r, 101);
  return {
    id: `t${n}`,
    name: `${FIRST_NAMES[pick(r, FIRST_NAMES.length)]!} ${LAST_NAMES[pick(r, LAST_NAMES.length)]!}`,
    formation: PRESETS[pick(r, PRESETS.length)]!,
    style: {
      possession: axis(),
      verticality: axis(),
      pressing: axis(),
      block: axis(),
      width: axis(),
      tempo: axis(),
      risk: axis(),
    },
    quality,
    development: pick(r, 101),
    young: pick(r, 101),
    reputation: clamp(45 + quality * 2 + pick(r, 31) - 15),
    career: [],
  };
}

const clubOf = (w: CareerWorld, id: string) => w.pack.clubs.find((c) => c.id === id)!;

/** A club's DNA: the opening pack's style, moved by the seasons (`w.dna`). */
export const dnaOf = (w: CareerWorld, clubId: string): Style =>
  w.dna?.[clubId] ?? clubOf(w, clubId).profile.playingStyle;

/** Mean gap between two styles over the axes the tactic sets, 0..100. */
export function gap(a: Style, b: Style): number {
  return Math.round(AXES.reduce((s, k) => s + Math.abs(a[k] - b[k]), 0) / AXES.length);
}

/** How well a coach suits a club: higher is better. DNA first, then size, then age taste. */
function fit(w: CareerWorld, clubId: string, c: Coach): number {
  const club = clubOf(w, clubId);
  return (
    -gap(dnaOf(w, clubId), c.style) -
    Math.abs(c.reputation - club.reputation) / 2 -
    Math.abs(c.young - (100 - club.profile.market.readyVsYoung)) / 4
  );
}

/** The registry, opened on first use: a pool a quarter larger than the clubs, hired by fit. */
export function coachesOf(w: CareerWorld): Coaches {
  if (w.coaches) return w.coaches;
  const clubs = w.pack.clubs
    .filter((c) => c.id !== w.clubId && divisionOf(w, c.id))
    .sort((a, b) => b.reputation - a.reputation || (a.id < b.id ? -1 : 1));
  const cs: Coaches = { all: {}, at: {}, free: [], made: 0 };
  w.coaches = cs;
  const pool = Math.ceil(clubs.length * 1.25);
  // Real coaches (a real-data pack) keep their own club; those of clubs outside the game's world
  // fill the free pool first; made coaches only fill the gaps. A pack without them: made only.
  const real = realCoaches(w);
  const inGame = new Set(clubs.map((c) => c.id));
  const spare: PackStaff[] = [];
  for (const [clubId, s] of real.at) {
    if (!inGame.has(clubId)) {
      if (clubId !== w.clubId) spare.push(s);
      continue;
    }
    const c = coachOfPack(w.seed, s);
    cs.all[c.id] = c;
    cs.made++;
    cs.at[clubId] = c.id;
    c.career.push({ club: clubId, from: 0 });
  }
  spare.sort((a, b) => b.reputation - a.reputation || (a.id < b.id ? -1 : 1));
  for (const s of spare) if (cs.made < pool) free(cs, coachOfPack(w.seed, s));
  while (cs.made < pool) free(cs, makeCoach(w.seed, cs.made));
  for (const c of clubs) if (!cs.at[c.id]) take(w, c.id, 0);
  return cs;
}

function free(cs: Coaches, c: Coach): void {
  cs.all[c.id] = c;
  cs.made++;
  cs.free.push(c.id);
}

/** The best fit of the free pool takes the club; a new man is made if nobody is free. */
function take(w: CareerWorld, clubId: string, season: number): Coach {
  const cs = w.coaches!;
  const last = (c: Coach) => c.career[c.career.length - 1]?.club === clubId;
  let best: Coach | undefined;
  for (const id of cs.free) {
    const c = cs.all[id]!;
    if (last(c) && cs.free.length > 1) continue;
    if (!best || fit(w, clubId, c) > fit(w, clubId, best)) best = c;
  }
  if (!best) {
    best = makeCoach(w.seed, cs.made);
    cs.all[best.id] = best;
    cs.made++;
    cs.free.push(best.id);
  }
  cs.free.splice(cs.free.indexOf(best.id), 1);
  cs.at[clubId] = best.id;
  best.career.push({ club: clubId, from: season });
  return best;
}

/** The club's coach, or undefined while it has none (vacancy, or the person's club). */
export function coachAt(w: CareerWorld, clubId: string): Coach | undefined {
  const cs = coachesOf(w);
  const id = cs.at[clubId];
  return id ? cs.all[id] : undefined;
}

/** The board sacked him: he is free again, a little less sought. */
export function dismiss(w: CareerWorld, clubId: string): void {
  const cs = coachesOf(w);
  const c = coachAt(w, clubId);
  if (!c) return;
  delete cs.at[clubId];
  const stint = c.career[c.career.length - 1];
  if (stint) stint.to = w.season.season;
  c.reputation = clamp(c.reputation - 4);
  cs.free.push(c.id);
}

/** The club hires from the free pool; the near ones hear who (inbox). */
export function hire(w: CareerWorld, clubId: string, day: number): void {
  coachesOf(w);
  const c = take(w, clubId, w.season.season);
  if (divisionOf(w, clubId) === divisionOf(w, w.clubId))
    note(w, { day, kind: 'coachHired', club: clubId, coach: c.name, style: styleKind(c.style) });
}

export type StyleKind =
  'attacking' | 'defensive' | 'pressing' | 'possession' | 'direct' | 'balanced';

/** The word for a style: the axis it leans on most, or balanced when none stands out. */
export function styleKind(s: Style): StyleKind {
  const scores: [StyleKind, number][] = [
    ['attacking', (s.risk + s.width + s.tempo) / 3],
    ['defensive', (200 - s.block - s.risk) / 2],
    ['pressing', s.pressing],
    ['possession', s.possession],
    ['direct', (s.verticality + s.tempo) / 2],
  ];
  const [kind, v] = scores.reduce((a, b) => (b[1] > a[1] ? b : a));
  return v >= 58 ? kind : 'balanced';
}

/** How a club plays: its DNA with its coach's philosophy blended in (`SAY`). */
export function playedStyle(w: CareerWorld, clubId: string): Style {
  const dna = dnaOf(w, clubId);
  const c = coachAt(w, clubId);
  if (!c) return dna;
  const out = { ...dna };
  for (const k of ALL) out[k] = Math.round((dna[k] * (100 - SAY) + c.style[k] * SAY) / 100);
  return out;
}

const level = (x: number) => 1 + Math.round(x / 25);
/** The team instructions a style asks of the engine. */
export const planOfStyle = (s: Style): PlanChoice => ({
  block: s.block < 34 ? 'low' : s.block > 66 ? 'high' : 'mid',
  pressIntensity: level(s.pressing),
  tempo: level(s.tempo),
  width: level(s.width),
  risk: level(s.risk),
});

/** A rival's formation and instructions for the engine: its coach's philosophy over its DNA. */
export function rivalPlan(
  w: CareerWorld,
  clubId: string,
): { formation: string; plan: PlanChoice } | undefined {
  const c = coachAt(w, clubId);
  return c && { formation: c.formation, plan: planOfStyle(playedStyle(w, clubId)) };
}

/** Strength a rival's coach adds in the quick results: his quality, at most 1.5 points. */
export const coachEdge = (w: CareerWorld, clubId: string): number =>
  (coachAt(w, clubId)?.quality ?? 0) / 10;

/** The person's tactic as a style, 0..100 on the axes it sets. */
function styleOfPlan(p: PlanChoice): Record<(typeof AXES)[number], number> {
  return {
    pressing: (p.pressIntensity - 1) * 25,
    block: p.block === 'low' ? 15 : p.block === 'high' ? 85 : 50,
    width: (p.width - 1) * 25,
    tempo: (p.tempo - 1) * 25,
    risk: (p.risk - 1) * 25,
  };
}

/** One match of the person with this tactic, added to the season's style. */
export function styled(w: CareerWorld, p: PlanChoice): void {
  const s = styleOfPlan(p);
  const run = (w.styled ??= { n: 0, sum: AXES.map(() => 0) });
  run.n++;
  AXES.forEach((k, i) => (run.sum[i]! += s[k]));
}

/** The style the person played over the season, or undefined before enough matches. */
function averageStyle(w: CareerWorld): Record<(typeof AXES)[number], number> | undefined {
  const run = w.styled;
  if (!run || run.n < MIN_MATCHES) return undefined;
  return Object.fromEntries(AXES.map((k, i) => [k, Math.round(run.sum[i]! / run.n)])) as Record<
    (typeof AXES)[number],
    number
  >;
}

/**
 * Board confidence a season in the club's own style earns, or costs when against it: supporters
 * who know what their club is are the ones who mind (fans' loyalty). 0 in between.
 */
export function identityOf(w: CareerWorld): number {
  const avg = averageStyle(w);
  if (!avg) return 0;
  const d = gap({ ...dnaOf(w, w.clubId), ...avg }, dnaOf(w, w.clubId));
  const base = d <= IN_STYLE ? IDENTITY : d >= AGAINST ? -IDENTITY : 0;
  return Math.round((base * (50 + clubOf(w, w.clubId).fans.loyalty)) / 150);
}

/** The season's turn: every DNA moves a step toward the style its club played; the count resets. */
export function driftDna(w: CareerWorld): void {
  const dna: Record<string, Style> = { ...w.dna };
  const move = (clubId: string, to: Partial<Style>) => {
    const from = dnaOf(w, clubId);
    const next = { ...from };
    for (const k of ALL)
      if (to[k] !== undefined)
        next[k] = Math.round((from[k] * (100 - DRIFT) + to[k]! * DRIFT) / 100);
    dna[clubId] = next;
  };
  const mine = averageStyle(w);
  if (mine) move(w.clubId, mine);
  for (const clubId of Object.keys(coachesOf(w).at)) move(clubId, playedStyle(w, clubId));
  w.dna = dna;
  delete w.styled;
}
