/**
 * Modo Clube funnel events (docs/modo-clube-metricas.md). Pseudonymous and aggregate: only
 * counts, a tier, a season index, a verdict and durations; no names, no ids, no free text.
 * Each milestone is sent once per career on this device (localStorage), so a reload does not
 * count twice; without storage it may repeat, which only inflates a count slightly.
 */
import { track } from '../../../lib/analytics';

const key = (career: string, what: string) => `mc-tel:${career}:${what}`;

function once(career: string, what: string, send: () => void) {
  try {
    if (localStorage.getItem(key(career, what))) return;
    localStorage.setItem(key(career, what), String(Date.now()));
  } catch {
    // no storage: send anyway
  }
  send();
}

const startedAt = (career: string): number => {
  try {
    return Number(localStorage.getItem(key(career, 'career_started'))) || Date.now();
  } catch {
    return Date.now();
  }
};

type Seen = { fresh: boolean; tier: number; n: number; fired: boolean; over: string | null };

/** `n`: the season's index in the career (1 = the first). `over`: the verdict once it ended. */
export function trackSeen(career: string, s: Seen) {
  if (s.fresh && s.n === 1)
    once(career, 'career_started', () => track('career_started', { tier: s.tier }));
  if (s.n > 1 || s.fresh)
    once(career, `season_started:${s.n}`, () => track('season_started', { n: s.n }));
  if (s.over)
    once(career, `season_completed:${s.n}`, () =>
      track('season_completed', { n: s.n, verdict: s.over! }),
    );
  if (s.fired) once(career, 'career_fired', () => track('career_fired', { n: s.n }));
}

/** The first lineup, tactic or signing change. */
export function trackDecision(career: string, what: 'lineup' | 'signing') {
  once(career, 'first_meaningful_decision', () =>
    track('first_meaningful_decision', {
      what,
      seconds: Math.round((Date.now() - startedAt(career)) / 1000),
    }),
  );
}

/** Client timing of a step ("open" or "seasonTurn"); p50 and p95 are read from the events. */
export const trackTiming = (step: 'open' | 'seasonTurn', ms: number) =>
  track('career_timing', { step, ms: Math.round(ms) });
