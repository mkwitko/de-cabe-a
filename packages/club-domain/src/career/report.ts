/**
 * Why the person's match went the way it did, in facts the level 3 result actually uses
 * (match/quick.ts): the two squads' strength gap and what moved each side's strength (men out,
 * tired legs, wages owed, a long trip), and the crowd. Nothing is invented: each fact is a
 * difference between two readings the simulation takes. Impact is in goals of expected margin
 * (the result's own slopes: 0.35 + 0.3 a tenth of a strength point, 0.6 a share of the crowd).
 */
import { crowdShare } from '../match/stadium';
import { awayLoss, distanceKm } from './travel';
import type { CareerWorld } from './advance';
import { fielded, outOn } from './health';
import { lineupOf } from './squad';
import { myStrength, rivalStrength, type Training } from './training';
import { strengthOwed } from './arrears';

export type FactKind = 'quality' | 'out' | 'tired' | 'owed' | 'rivalShort' | 'travel' | 'crowd';

export interface ReportFact {
  kind: FactKind;
  /** 1 when it favoured the person's club, -1 when it went against. */
  side: 1 | -1;
  /** Margin it is worth, in goals. */
  impact: number;
  /** A whole number for the sentence: men out, crowd %, km. */
  n: number;
}

const PER_POINT = 0.065;
/** Below this many goals of margin a factor is noise and left out. */
const MIN_IMPACT = 0.05;

/** The three biggest facts of the person's match `matchId` on `day`, before it changes anything. */
export function matchReport(
  w: CareerWorld,
  matchId: string,
  day: number,
  training: Training,
): ReportFact[] {
  const m = w.season.meta.get(matchId)!;
  const home = m.home === w.clubId;
  const opp = home ? m.away : m.home;
  const rested = { ...training, fresh: {} };
  const picked = lineupOf(w);
  const field = fielded(w, day);
  const pickedRested = myStrength(w, rested, picked);
  const fieldRested = myStrength(w, rested, field);
  const fieldTired = myStrength(w, training, field);
  const final = strengthOwed(w, fieldTired);
  const theirRested = w.strength.get(opp) ?? 50;
  const theirs = rivalStrength(w, opp, day);
  const km = distanceKm(w.pack, m.home, m.away);
  const lost = (s: number) => (s * awayLoss(km)) / 1000;
  const out = outOn(w, day);
  const facts: ReportFact[] = [];
  const add = (kind: FactKind, points: number, n = 0, unit = PER_POINT) =>
    facts.push({ kind, side: points >= 0 ? 1 : -1, impact: Math.abs(points) * unit, n });
  add('quality', pickedRested - theirRested);
  add('out', fieldRested - pickedRested, picked.xi.filter((id) => out.has(id)).length);
  add('tired', fieldTired - fieldRested);
  add('owed', final - fieldTired);
  add('rivalShort', theirRested - theirs);
  add('travel', home ? lost(theirs) : -lost(final), Math.round(km));
  // The host's crowd, 0.6 being the usual: more of it helps him, less of it hurts him.
  const crowd = crowdShare(w.pack, w.season, matchId);
  add('crowd', (home ? 1 : -1) * (crowd - 0.6), Math.round(crowd * 100), 0.6);
  return facts
    .filter((f) => f.impact >= MIN_IMPACT)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);
}
