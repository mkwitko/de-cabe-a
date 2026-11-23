/**
 * Unhappy players (07 §7). A player of the person's club who plays far less than his level (and
 * his ambition) says he should, or whose raise was refused, grows unhappy; after a couple of
 * months he asks to leave and the person answers: list him, promise minutes (remembered and
 * checked a few matches later) or refuse (a grudge, and the dressing room feels it). Real
 * practice: a player cannot force a move, but a benched starter with a contract stirs the squad
 * and agents go to the press ("pedir para sair"). Every number is a PARÂMETRO.
 */
import type { CareerWorld } from '../career/advance';
import { note } from '../career/inbox';
import { squadPlayers } from '../career/squad';
import { fairRole } from './deals';
import { listPlayer } from './talks';

export interface Unrest {
  why: 'minutes' | 'raise';
  /** The day it began (or the last refusal): the request comes ASK_DAYS later. */
  since: number;
  /** He has asked to leave and waits for the person. */
  asked?: true;
  /** Refusals and broken promises so far. */
  grudge: number;
  /** Minutes promised: the share of starts asked, and where the count stood. */
  promise?: { share: number; starts: number; played: number };
}

/** Matches the club must have played before minutes are judged. */
const MIN_PLAYED = 8;
const ASK_DAYS = 60;
/** Matches after a promise before it is checked. */
const PROMISE_MATCHES = 8;
/** Morale taken off the squad's (0..1) per unhappy player and per grudge; at most MAX_COST. */
const COST_UNHAPPY = 0.01;
const COST_GRUDGE = 0.02;
const MAX_COST = 0.1;

/** Starts a player of this role expects, in percent of the matches. */
const expects = (role: string) => (role === 'starter' ? 60 : role === 'rotation' ? 25 : 0);

/** What unrest costs the squad's morale. */
export function unrestCost(w: CareerWorld): number {
  let c = 0;
  for (const u of Object.values(w.unhappy ?? {})) c += COST_UNHAPPY + COST_GRUDGE * u.grudge;
  return Math.min(MAX_COST, c);
}

const setUnrest = (w: CareerWorld, id: string, u: Unrest | null) => {
  const { [id]: _old, ...rest } = w.unhappy ?? {};
  const next = u ? { ...rest, [id]: u } : rest;
  if (Object.keys(next).length) w.unhappy = next;
  else delete w.unhappy;
};

/** A raise he asked for was not met: he is unhappy at once, the request comes later. */
export function upset(w: CareerWorld, id: string): void {
  if (w.unhappy?.[id]) return;
  setUnrest(w, id, { why: 'raise', since: w.day, grudge: 0 });
}

/** Monthly check of the person's squad: minutes against level and ambition; promises kept. */
export function unrestTurn(w: CareerWorld, day: number): void {
  const played = w.played ?? 0;
  if (played < MIN_PLAYED) return;
  const season = w.season.season;
  const squad = squadPlayers(w).filter((p) => !w.loans?.[p.id]);
  const here = new Set(squad.map((p) => p.id));
  const listed = new Set(w.listed ?? []);
  for (const id of Object.keys(w.unhappy ?? {})) if (!here.has(id)) setUnrest(w, id, null);
  for (const p of squad) {
    if (listed.has(p.id)) continue;
    const name = p.knownAs ?? p.name;
    const starts = w.starts?.[p.id] ?? 0;
    const share = Math.floor((starts * 100) / played);
    const want = expects(fairRole(w, p, season));
    const bad = want - share >= 35 - Math.floor(p.personality.ambition / 2);
    const cur = w.unhappy?.[p.id];
    if (cur?.promise) {
      const since = played - cur.promise.played;
      if (since < PROMISE_MATCHES) continue;
      if (Math.floor(((starts - cur.promise.starts) * 100) / since) >= cur.promise.share) {
        setUnrest(w, p.id, null);
        note(w, { day, kind: 'promiseKept', player: name });
      } else {
        setUnrest(w, p.id, { why: 'minutes', since: day, grudge: cur.grudge + 1, asked: true });
        note(w, { day, kind: 'promiseBroken', player: name });
      }
    } else if (!cur) {
      if (!bad) continue;
      setUnrest(w, p.id, { why: 'minutes', since: day, grudge: 0 });
      note(w, { day, kind: 'unhappy', player: name });
    } else if (!cur.asked) {
      if (cur.why === 'minutes' && !bad) setUnrest(w, p.id, cur.grudge > 0 ? cur : null);
      else if (day - cur.since >= ASK_DAYS) {
        setUnrest(w, p.id, { ...cur, asked: true });
        note(w, { day, kind: 'leaveRequest', player: name });
      }
    }
  }
}

export type Plea = 'list' | 'promise' | 'refuse';

/** The person's answer to a player who asked to leave. */
export function answerRequest(w: CareerWorld, id: string, plea: Plea): void {
  const u = w.unhappy?.[id];
  const p = w.pack.players.find((x) => x.id === id);
  if (!u?.asked || p?.clubId !== w.clubId) throw new Error('unrest: no request');
  if (plea === 'list') {
    listPlayer(w, id, true);
    setUnrest(w, id, null);
  } else if (plea === 'refuse') {
    const { asked: _asked, ...rest } = u;
    setUnrest(w, id, { ...rest, since: w.day, grudge: u.grudge + 1 });
  } else {
    if (u.grudge > 0) throw new Error('unrest: no more promises');
    const want = expects(fairRole(w, p, w.season.season));
    setUnrest(w, id, {
      why: u.why,
      since: w.day,
      grudge: u.grudge,
      promise: {
        share: Math.max(25, want - 10),
        starts: w.starts?.[id] ?? 0,
        played: w.played ?? 0,
      },
    });
  }
}
