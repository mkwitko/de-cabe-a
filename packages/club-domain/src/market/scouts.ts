/**
 * The person's scouts as people (scouting.ts keeps what the club knows). Each has a name, an eye
 * for what a player is (`ability`) and for what he may become (`potential`), 1..20, a state he
 * knows best, and some are youth specialists. How many the club has comes from its scouting
 * department; who they are is drawn from the career's seed, so it needs no saving. A report is
 * worth more from a better eye, in his own state, and from a specialist sent after boys.
 *
 * Every number is a PARÂMETRO.
 */
import { homeOf } from '../career/bases';
import { fork, pick, rngFrom } from '@decabeca/match-engine';
import type { CareerWorld } from '../career/advance';
import type { PackPlayer } from '../pack/schema';
import { ABROAD } from './abroad';
import { eyeOf, seenCeiling, seenLevel } from './judgement';
import { scoutsOf, stateOf } from './scouting';

export interface Scout {
  id: string;
  name: string;
  age: number;
  /** Eye for what a player is today, 1..20. */
  ability: number;
  /** Eye for what a player may become, 1..20. */
  potential: number;
  /** The state he knows best (two letters), where his reports are worth more. */
  home: string;
  /** Sent after boys (a mission for 21-year-olds or younger), his reports are worth more. */
  youth: boolean;
}

/** What a mission looks for: players up to an age, of a position. */
export interface Focus {
  maxAge?: number;
  position?: string;
}

/** Age up to which a mission counts as looking for boys. */
export const YOUTH_FOCUS = 21;

/** The club's scouts: as many as its scouting department allows, the same ones every time. */
export function scoutStaff(w: CareerWorld): Scout[] {
  const level = eyeOf(w.pack, w.clubId).scouting;
  const r = rngFrom(w.seed);
  const home = stateOf(w.pack, w.clubId) ?? 'SP';
  const states = [...new Set(w.pack.cities.map((c) => c.state))].sort();
  const { first, last } = w.pack.names;
  const out: Scout[] = [];
  // Drawn for the largest department, so a club that grows keeps the scouts it had.
  for (let k = 0; k < 3; k++) {
    const s = fork(r, `scout:${w.clubId}:${k}`);
    // A better department hires better eyes: 6..10 at level 1, 14..18 at level 5.
    const eye = () => Math.min(20, 4 + 2 * level + pick(s, 5));
    out.push({
      id: `scout-${k}`,
      name: `${first[pick(s, first.length)]} ${last[pick(s, last.length)]}`,
      age: 30 + pick(s, 30),
      ability: eye(),
      potential: eye(),
      // The first knows the club's own state; the others half the time another one.
      home: k === 0 || pick(s, 2) === 0 ? home : (states[pick(s, states.length)] ?? home),
      youth: pick(s, 3) === 0,
    });
  }
  return out.slice(0, scoutsOf(w));
}

/**
 * A report's worth from this scout, in percent of his department's: 60..150. The department's
 * gain already counts its level, so his eyes count against the eyes it hires (6 + 2 a level).
 */
export function scoutWorth(
  s: Scout,
  area: string,
  focus: Focus | undefined,
  level: number,
): number {
  let worth = Math.round(((s.ability + s.potential) * 100) / (2 * (6 + 2 * level)));
  if (area === s.home) worth += 25;
  if (s.youth && focus?.maxAge !== undefined && focus.maxAge <= YOUTH_FOCUS) worth += 25;
  return Math.max(60, Math.min(150, worth));
}

const ageOf = (p: PackPlayer, season: number) => season - Number(p.birthDate.slice(0, 4));

/** Whether a player is what the mission looks for. */
export function fitsFocus(p: PackPlayer, focus: Focus | undefined, season: number): boolean {
  if (!focus) return true;
  if (focus.maxAge !== undefined && ageOf(p, season) > focus.maxAge) return false;
  if (focus.position !== undefined && p.positions[0]?.position !== focus.position) return false;
  return true;
}

/**
 * The scout's word on a player he found, against the person's own squad at his position:
 * A, better than anyone there; B, better than the middle of it; C, worth a look. For boys the
 * ceiling he sees counts, not today's level.
 */
export function gradeOf(
  w: CareerWorld,
  p: PackPlayer,
  squad: readonly PackPlayer[],
): 'A' | 'B' | 'C' {
  const boys = ageOf(p, w.season.season) <= YOUTH_FOCUS;
  const read = (x: PackPlayer) =>
    boys && x === p ? seenCeiling(w.pack, w.clubId, x) : seenLevel(w.pack, w.clubId, x);
  const pos = p.positions[0]?.position;
  const mine = squad
    .filter((x) => x.positions[0]?.position === pos)
    .map((x) => seenLevel(w.pack, w.clubId, x))
    .sort((a, b) => b - a);
  const his = read(p);
  if (mine.length === 0 || his > mine[0]!) return 'A';
  if (his >= mine[Math.floor(mine.length / 2)]!) return 'B';
  return 'C';
}

/** Folds case and accents, for searching by name. */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export interface PlayerQuery {
  /** Part of his name, his known name or his club's name. */
  text?: string;
  clubId?: string;
  /** A national division, 1..4. */
  tier?: number;
  /** A state, two letters. */
  state?: string;
  position?: string;
  maxAge?: number;
}

/**
 * The world's players that match, the person's own left out: those the club knows nothing of
 * too, as in a database (their reading is then a guess, scouting.ts `personReading`). Players
 * abroad only while they can sign. Sorted by name.
 */
export function searchPlayers(
  w: CareerWorld,
  q: PlayerQuery,
  tierOf: (clubId: string) => number | null,
  limit = 60,
): PackPlayer[] {
  const text = q.text ? fold(q.text.trim()) : '';
  const clubNames = new Map(w.pack.clubs.map((c) => [c.id, fold(`${c.name} ${c.shortName}`)]));
  const out: PackPlayer[] = [];
  for (const p of w.pack.players) {
    if (p.clubId === w.clubId || p.clubId === ABROAD) continue;
    // A boy of another club's academy is found under that club (bases.ts).
    const at = homeOf(p.clubId);
    if (at === w.clubId) continue;
    if (q.clubId && at !== q.clubId) continue;
    if (q.tier !== undefined && (at === null || tierOf(at) !== q.tier)) continue;
    if (q.state && (at === null || stateOf(w.pack, at) !== q.state)) continue;
    if (!fitsFocus(p, q, w.season.season)) continue;
    if (
      text &&
      !fold(`${p.name} ${p.knownAs ?? ''}`).includes(text) &&
      !(at && clubNames.get(at)?.includes(text))
    )
      continue;
    out.push(p);
  }
  out.sort((a, b) => (a.knownAs ?? a.name).localeCompare(b.knownAs ?? b.name, 'pt-BR'));
  return out.slice(0, limit);
}
