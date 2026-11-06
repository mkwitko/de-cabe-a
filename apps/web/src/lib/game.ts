import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AttemptResponse,
  GameMode,
  GamesResponse,
  HistoryResponse,
  LevelRankingResponse,
  MeResponse,
  PlayerRef,
  RankingResponse,
  StatsResponse,
  TrackResponse,
} from '@decabeca/contracts';
import { api } from './api';

export const GAME_PATH = { CAREER_PATH: '/career-path', FOOTBALL_GRID: '/grid' } as const;
export const GAME_NAME = { CAREER_PATH: 'Career Path', FOOTBALL_GRID: 'Football Grid' } as const;

export const useGames = () =>
  useQuery({ queryKey: ['games'], queryFn: () => api<GamesResponse>('/v1/games') });
export const useTrack = (mode: GameMode) =>
  useQuery({ queryKey: ['track', mode], queryFn: () => api<TrackResponse>(`/v1/tracks/${mode}`) });
export const useStats = () =>
  useQuery({ queryKey: ['stats'], queryFn: () => api<StatsResponse>('/v1/me/stats') });
export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => api<MeResponse>('/v1/me') });
export const useRanking = (scope: 'all' | 'week') =>
  useQuery({
    queryKey: ['ranking', scope],
    queryFn: () => api<RankingResponse>(`/v1/ranking?scope=${scope}`),
  });
export const useLevelRanking = (mode: GameMode, level: number, enabled: boolean) =>
  useQuery({
    queryKey: ['level-ranking', mode, level],
    queryFn: () => api<LevelRankingResponse>(`/v1/ranking/levels/${mode}/${level}`),
    enabled,
  });

export const fetchHistory = (mode: GameMode | '', cursor: string | null) =>
  api<HistoryResponse>(
    `/v1/me/history?${new URLSearchParams({ ...(mode ? { mode } : {}), ...(cursor ? { cursor } : {}) })}`,
  );

/** Starts or resumes the level's attempt; the server returns the same one on reload. */
export function useAttempt(mode: GameMode, level: number) {
  return useQuery({
    queryKey: ['attempt', mode, level],
    queryFn: () => api<AttemptResponse>('/v1/attempts', { method: 'POST', json: { mode, level } }),
    staleTime: Infinity,
    retry: 0,
  });
}

/** Submits one action with a fresh idempotency key; replaces the cached attempt with the result. */
export function useAction(mode: GameMode, level: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ attemptId, input }: { attemptId: string; input: object }) =>
      api<AttemptResponse>(`/v1/attempts/${attemptId}/actions`, {
        method: 'POST',
        json: { idempotencyKey: crypto.randomUUID(), input },
      }),
    onSuccess: (data) => {
      qc.setQueryData(['attempt', mode, level], data);
      if (data.attempt.status !== 'IN_PROGRESS')
        for (const key of ['games', 'track', 'stats', 'me', 'ranking', 'level-ranking'])
          void qc.invalidateQueries({ queryKey: [key] });
    },
  });
}

export async function searchPlayers(q: string, signal: AbortSignal): Promise<PlayerRef[]> {
  return (
    await api<{ players: PlayerRef[] }>(`/v1/players/search?q=${encodeURIComponent(q)}`, { signal })
  ).players;
}

/** Account and nickname actions; everything that depends on the player refreshes after. */
export function useAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      path,
      method,
      json,
    }: {
      path: string;
      method: 'POST' | 'PATCH';
      json?: object;
    }) => api<unknown>(path, { method, json: json ?? {} }),
    onSuccess: () => qc.invalidateQueries(),
  });
}
