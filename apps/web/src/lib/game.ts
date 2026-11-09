import { play } from './sound';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AttemptResponse,
  GameMode,
  DailyResponse,
  GamesResponse,
  HistoryResponse,
  LevelRankingResponse,
  MeResponse,
  PlayerRef,
  RankingResponse,
  RankingScope,
  RoundResponse,
  SeasonResponse,
  StatsResponse,
  TrackResponse,
} from '@decabeca/contracts';
import { api } from './api';

export { GAME_PATH } from '@decabeca/contracts';
export const GAME_NAME = {
  CAREER_PATH: 'Career Path',
  FOOTBALL_GRID: 'Football Grid',
  IMPOSTOR: 'Impostor',
  TIMELINE: 'Linha do tempo',
  HIGHER_LOWER: 'Mais ou Menos',
  MISSING_XI: 'Escalação',
  CONNECTIONS: 'Conexões',
  DRAFT: 'Draft',
  MYSTERY_PLAYER: 'Craque Misterioso',
} as const;

export const useGames = () =>
  useQuery({ queryKey: ['games'], queryFn: () => api<GamesResponse>('/v1/games') });
export const useTrack = (mode: GameMode) =>
  useQuery({ queryKey: ['track', mode], queryFn: () => api<TrackResponse>(`/v1/tracks/${mode}`) });
/** Desafio do Dia: `date` is YYYY-MM-DD or 'hoje'. */
export const useDaily = (date: string) =>
  useQuery({ queryKey: ['daily', date], queryFn: () => api<DailyResponse>(`/v1/daily/${date}`) });
export const useStats = () =>
  useQuery({ queryKey: ['stats'], queryFn: () => api<StatsResponse>('/v1/me/stats') });
export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => api<MeResponse>('/v1/me') });
export const useRanking = (scope: RankingScope) =>
  useQuery({
    queryKey: ['ranking', scope],
    queryFn: () => api<RankingResponse>(`/v1/ranking?scope=${scope}`),
  });
/** Temporadas (2.6): the current season and the player's trophies. */
export const useSeason = () =>
  useQuery({ queryKey: ['season'], queryFn: () => api<SeasonResponse>('/v1/season') });
/** Rodada semanal (2.7). */
export const useRound = () =>
  useQuery({ queryKey: ['round'], queryFn: () => api<RoundResponse>('/v1/round') });
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
export function useAttempt(mode: GameMode, level: number, timed = false) {
  return useQuery({
    queryKey: ['attempt', mode, level],
    queryFn: () =>
      api<AttemptResponse>('/v1/attempts', { method: 'POST', json: { mode, level, timed } }),
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
      // Sound for the outcome (off unless the player turned it on).
      if (data.attempt.status !== 'IN_PROGRESS')
        play(
          data.attempt.stars === 3 ? 'win' : data.event?.type === 'correct' ? 'correct' : 'wrong',
        );
      else if (data.event?.type === 'correct') play('correct');
      else if (data.event?.type === 'wrong') play('wrong');
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
