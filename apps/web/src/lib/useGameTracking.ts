import { useEffect, useRef } from 'react';
import type { AttemptResponse } from '@decabeca/contracts';
import { beacon, track } from './analytics';

/** game_viewed once per attempt; game_abandoned when the page hides mid-game. */
export function useGameTracking(data: AttemptResponse | undefined) {
  const viewed = useRef<string | null>(null);
  const latest = useRef(data);
  latest.current = data;

  useEffect(() => {
    if (!data || viewed.current === data.attempt.id) return;
    viewed.current = data.attempt.id;
    track('game_viewed', {
      mode: data.attempt.mode,
      level: data.attempt.level,
    });
  }, [data]);

  useEffect(() => {
    const onHide = () => {
      const d = latest.current;
      if (document.visibilityState === 'hidden' && d && d.attempt.status === 'IN_PROGRESS')
        beacon('game_abandoned', {
          mode: d.attempt.mode,
          level: d.attempt.level,
          attemptsUsed:
            'attemptsUsed' in d.view
              ? d.view.attemptsUsed
              : 'round' in d.view
                ? d.view.round
                : 'guesses' in d.view
                  ? d.view.guesses.length
                  : 'wrongLeft' in d.view
                    ? 5 - d.view.wrongLeft
                    : 0,
        });
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);
}
