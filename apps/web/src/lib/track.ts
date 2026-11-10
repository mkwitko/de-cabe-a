import type { TrackResponse } from '@decabeca/contracts';

/** The level to play next: the one in progress, else the first open one. Never a locked or missing level. */
export function nextLevel(
  track: Pick<TrackResponse, 'levels'> | undefined,
): { level: number; inProgress: boolean } | null {
  const levels = track?.levels ?? [];
  const l = levels.find((x) => x.state === 'in_progress') ?? levels.find((x) => x.state === 'open');
  return l ? { level: l.level, inProgress: l.state === 'in_progress' } : null;
}
