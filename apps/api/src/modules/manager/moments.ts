/**
 * Watching modes of a match (MC-250): the whole match, extended highlights,
 * highlights or goals only. The server simulates on to the next moment and
 * sends only its frames, from a little before the event (the build-up) to a
 * little after it; the plan can change between moments (match-jobs.ts).
 */
export type MomentMode = 'extended' | 'highlights' | 'goals';

export interface MomentEvent {
  kind: string;
  atMs: number;
  data: Record<string, number>;
}

/** Frames are 4 per second of play. */
const TPS = 4;
/**
 * PARÂMETRO: seconds of play shown before and after an event. A goal gets the
 * longest build-up; extended highlights keep a bit more around everything.
 */
const BEFORE = { goal: 14, other: 8 };
const AFTER = 5;
/** Frames to simulate past a moment before it is final: a goal close after would join it. */
export const MOMENT_LOOKAHEAD = BEFORE.goal * TPS;
/** PARÂMETRO: a shot this likely (xg) is a highlight even when it misses. */
const BIG_CHANCE_XG = 0.15;

export function isMoment(e: MomentEvent, mode: MomentMode): boolean {
  if (e.kind === 'goal') return true;
  if (mode === 'goals') return false;
  const red = e.kind === 'card' && e.data.card === 2;
  if (mode === 'highlights')
    return red || (e.kind === 'shot' && (e.data.xg ?? 0) >= BIG_CHANCE_XG) || e.kind === 'save';
  return red || e.kind === 'card' || e.kind === 'shot' || e.kind === 'save' || e.kind === 'injury';
}

/**
 * Frame windows [from, to) around the chosen events, merged when they touch.
 * `clocks[i]` is the match clock of frame i (it jumps while the ball is dead).
 */
export function momentWindows(
  events: readonly MomentEvent[],
  clocks: readonly number[],
  mode: MomentMode,
): [number, number][] {
  const out: [number, number][] = [];
  let i = 0;
  for (const e of [...events].sort((a, b) => a.atMs - b.atMs)) {
    if (!isMoment(e, mode)) continue;
    while (i < clocks.length - 1 && clocks[i]! < e.atMs) i++;
    const before = (e.kind === 'goal' ? BEFORE.goal : BEFORE.other) * TPS;
    const from = Math.max(0, i - before);
    const to = Math.min(clocks.length, i + AFTER * TPS + 1);
    const last = out.at(-1);
    if (last && from <= last[1]) last[1] = Math.max(last[1], to);
    else out.push([from, to]);
  }
  return out;
}
