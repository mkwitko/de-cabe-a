/**
 * Short vibrations on phones that support them (GROWTH_PLAN.md polish): a tick for a right answer,
 * a softer double for a wrong one, one beat per star at the end. Never needed to understand the
 * result (the screen and the screen reader say it). On by default, off in Conta › Preferências.
 */
import type { AttemptResponse } from '@decabeca/contracts';

const KEY = 'dc_haptics';
const listeners = new Set<(on: boolean) => void>();

export const hapticsSupported = () => typeof navigator !== 'undefined' && 'vibrate' in navigator;
export function hapticsOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}
export function setHaptics(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* private mode: for this visit only */
  }
  for (const l of listeners) l(on);
  if (on) buzz(12);
}
export const onHapticsChange = (l: (on: boolean) => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

function buzz(pattern: number | number[]) {
  if (hapticsSupported() && hapticsOn()) navigator.vibrate?.(pattern);
}

const RIGHT = new Set(['correct', 'found', 'group_found', 'won']);
const WRONG = new Set(['wrong', 'miss', 'lost']);

/** Pattern for an action's outcome: the level's end wins over the last move. */
export function hapticFor(data: AttemptResponse): number | number[] | null {
  if (data.attempt.status !== 'IN_PROGRESS')
    return data.attempt.stars > 0
      ? Array.from({ length: data.attempt.stars * 2 - 1 }, (_, i) => (i % 2 ? 70 : 18))
      : [20, 60, 20];
  const type = data.event?.type;
  if (type && RIGHT.has(type)) return 12;
  if (type && WRONG.has(type)) return [20, 60, 20];
  return null;
}

export function hapticForAction(data: AttemptResponse) {
  const p = hapticFor(data);
  if (p !== null) buzz(p);
}
