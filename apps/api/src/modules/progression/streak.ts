import { addDays } from '../challenges/civil-date';

/**
 * Streaks over civil dates (YYYY-MM-DD) with a completed daily. A day counts when the daily was
 * finished, won or lost (CAREER_PATH.md §7). Current streak ends today or yesterday.
 */
export function streaks(days: string[], today: string): { current: number; max: number } {
  const set = new Set(days);
  const sorted = [...set].sort();
  let max = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    max = Math.max(max, run);
    prev = d;
  }
  let current = 0;
  let cursor = set.has(today) ? today : addDays(today, -1);
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, max };
}
