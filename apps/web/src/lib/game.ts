import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AttemptResponse,
  ChallengeKind,
  GameMode,
  GamesResponse,
  HistoryResponse,
  PlayerRef,
  StatsResponse,
} from '@decabeca/contracts';
import { api } from './api';

export const useGames = () =>
  useQuery({ queryKey: ['games'], queryFn: () => api<GamesResponse>('/v1/games') });

export const useStats = () =>
  useQuery({ queryKey: ['stats'], queryFn: () => api<StatsResponse>('/v1/me/stats') });

export const fetchHistory = (mode: GameMode | '', cursor: string | null) =>
  api<HistoryResponse>(
    `/v1/me/history?${new URLSearchParams({ ...(mode ? { mode } : {}), ...(cursor ? { cursor } : {}) })}`,
  );

/** Starts or resumes the attempt; the server returns the same one on reload (idempotent). */
export function useAttempt(mode: GameMode, kind: ChallengeKind) {
  return useQuery({
    queryKey: ['attempt', mode, kind],
    queryFn: () => api<AttemptResponse>('/v1/attempts', { method: 'POST', json: { mode, kind } }),
    staleTime: Infinity,
    retry: 0,
  });
}

/** Submits one action with a fresh idempotency key; replaces the cached attempt with the result. */
export function useAction(mode: GameMode, kind: ChallengeKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ attemptId, input }: { attemptId: string; input: object }) =>
      api<AttemptResponse>(`/v1/attempts/${attemptId}/actions`, {
        method: 'POST',
        json: { idempotencyKey: crypto.randomUUID(), input },
      }),
    onSuccess: (data) => {
      qc.setQueryData(['attempt', mode, kind], data);
      if (data.attempt.status !== 'IN_PROGRESS') {
        void qc.invalidateQueries({ queryKey: ['games'] });
        void qc.invalidateQueries({ queryKey: ['stats'] });
      }
    },
  });
}

export async function searchPlayers(q: string, signal: AbortSignal): Promise<PlayerRef[]> {
  return (
    await api<{ players: PlayerRef[] }>(`/v1/players/search?q=${encodeURIComponent(q)}`, { signal })
  ).players;
}

/** Starts a new practice after finishing one (the server picks a fresh challenge). */
export function useNewPractice(mode: GameMode) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['attempt', mode, 'practice'] });
}
