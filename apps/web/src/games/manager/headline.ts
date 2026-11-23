/**
 * The full-time headline, one line in the locker-room voice. A small fixed table: the result,
 * the goal difference, how strong the other side is against ours and whether the last goal came late.
 */
export type HeadlineKind =
  | 'rout'
  | 'upsetWin'
  | 'lateWin'
  | 'win'
  | 'hold'
  | 'goalless'
  | 'wildDraw'
  | 'dropped'
  | 'draw'
  | 'lateLoss'
  | 'thrashed'
  | 'lossStrong'
  | 'lossWeak'
  | 'loss';

/** Rating points between the two clubs that make one of them clearly the stronger. */
export const CLEAR_GAP = 4;

export function headlineKind(o: {
  mine: number;
  theirs: number;
  /** Their strength minus ours; 0 when unknown. */
  gap?: number;
  /** The goal that decided it came in the last minutes. */
  late?: boolean;
}): HeadlineKind {
  const d = o.mine - o.theirs;
  const gap = o.gap ?? 0;
  const strong = gap >= CLEAR_GAP;
  const weak = gap <= -CLEAR_GAP;
  if (d > 0) {
    if (d >= 4) return 'rout';
    if (strong) return 'upsetWin';
    return d === 1 && o.late ? 'lateWin' : 'win';
  }
  if (d === 0) {
    if (strong) return 'hold';
    if (o.mine === 0) return 'goalless';
    if (weak) return 'dropped';
    return o.mine >= 2 ? 'wildDraw' : 'draw';
  }
  if (d === -1 && o.late) return 'lateLoss';
  if (d <= -4) return 'thrashed';
  return strong ? 'lossStrong' : weak ? 'lossWeak' : 'loss';
}
