import { z } from 'zod';

export const GameMode = z.enum(['CAREER_PATH', 'FOOTBALL_GRID']);
export type GameMode = z.infer<typeof GameMode>;
export const AttemptStatus = z.enum(['IN_PROGRESS', 'WON', 'LOST', 'COMPLETED']);
export type AttemptStatus = z.infer<typeof AttemptStatus>;
const PositionGroup = z.enum(['GK', 'DF', 'MF', 'FW']);

export const PlayerRef = z.strictObject({
  id: z.string(),
  name: z.string(),
  disambiguation: z.string().nullable(),
});
export type PlayerRef = z.infer<typeof PlayerRef>;

/** GET /v1/players/search */
export const PlayerSearchQuery = z.object({
  q: z.string().trim().min(2).max(40),
  limit: z.coerce.number().int().min(1).max(10).default(10),
});
export const PlayerSearchResponse = z.strictObject({ players: z.array(PlayerRef) });

// ── Career Path views (never the answer while IN_PROGRESS) ──
const RevealedClub = z.strictObject({
  clubName: z.string(),
  countryCode: z.string(),
  fromYear: z.number().nullable(),
  toYear: z.number().nullable(),
  isLoan: z.boolean(),
});
export const CareerPathView = z.strictObject({
  status: AttemptStatus,
  maxAttempts: z.number(),
  attemptsUsed: z.number(),
  revealed: z.array(RevealedClub),
  extraHints: z.strictObject({
    position: PositionGroup.optional(),
    nationalityCode: z.string().optional(),
  }),
  history: z.array(
    z.union([
      z.strictObject({
        kind: z.literal('guess'),
        playerId: z.string(),
        name: z.string(),
        correct: z.literal(false),
      }),
      z.strictObject({ kind: z.literal('skip') }),
      z.strictObject({ kind: z.literal('correct') }),
    ]),
  ),
});
export type CareerPathView = z.infer<typeof CareerPathView>;
export const CareerPathReveal = z.strictObject({
  answer: PlayerRef,
  trajectory: z.array(RevealedClub),
  extraHints: z.strictObject({
    position: PositionGroup.optional(),
    nationalityCode: z.string().optional(),
  }),
});

// ── Football Grid views (never the eligible pools) ──
const GridCriterion = z.strictObject({
  type: z.enum(['club', 'nationality', 'position', 'played_in_country']),
  label: z.string(),
  code: z.string().nullable(),
});
export const FootballGridView = z.strictObject({
  status: AttemptStatus,
  maxAttempts: z.number(),
  attemptsUsed: z.number(),
  rows: z.array(GridCriterion),
  cols: z.array(GridCriterion),
  cells: z.array(z.strictObject({ index: z.number(), player: PlayerRef.nullable() })),
  wrongGuesses: z.array(z.strictObject({ cellIndex: z.number(), player: PlayerRef })),
});
export type FootballGridView = z.infer<typeof FootballGridView>;
export const FootballGridReveal = z.strictObject({
  cells: z.array(
    z.strictObject({ index: z.number(), example: PlayerRef, validAnswers: z.number() }),
  ),
});

export const AttemptSummary = z.strictObject({
  id: z.string(),
  challengeId: z.string(),
  mode: GameMode,
  level: z.number(),
  status: AttemptStatus,
  score: z.number(),
  stars: z.number(),
});
export type AttemptSummary = z.infer<typeof AttemptSummary>;

const GameEvent = z.union([
  z.strictObject({ type: z.literal('correct'), cellIndex: z.number().optional() }),
  z.strictObject({
    type: z.literal('wrong'),
    revealed: z.enum(['club', 'extraHint', 'none']).optional(),
    cellIndex: z.number().optional(),
  }),
  z.strictObject({ type: z.literal('lost') }),
  z.strictObject({ type: z.literal('completed') }),
]);

/** POST /v1/attempts, GET /v1/attempts/:id, POST /v1/attempts/:id/actions */
export const AttemptResponse = z.strictObject({
  attempt: AttemptSummary,
  event: GameEvent.optional(),
  view: z.union([CareerPathView, FootballGridView]),
  reveal: z.union([CareerPathReveal, FootballGridReveal]).nullable(),
  share: z.strictObject({ text: z.string() }).nullable(),
});
export type AttemptResponse = z.infer<typeof AttemptResponse>;

export const StartAttemptRequest = z.object({ mode: GameMode, level: z.number().int().min(1) });
export const SubmitActionRequest = z.object({
  idempotencyKey: z.uuid(),
  input: z.union([
    z.object({
      kind: z.literal('guess'),
      playerId: z.string().min(1),
      cellIndex: z.number().int().optional(),
    }),
    z.object({ kind: z.literal('skip') }),
    z.object({ kind: z.literal('finish') }),
  ]),
});

/** GET /v1/games: one track per game (ADR-007) */
export const GamesResponse = z.strictObject({
  games: z.array(
    z.strictObject({
      mode: GameMode,
      name: z.string(),
      levels: z.number(),
      completed: z.number(),
      stars: z.number(),
      nextLevel: z.number().nullable(),
    }),
  ),
});
export type GamesResponse = z.infer<typeof GamesResponse>;

/** GET /v1/tracks/:mode */
export const LevelState = z.enum(['locked', 'open', 'in_progress', 'done']);
export type LevelState = z.infer<typeof LevelState>;
export const TrackResponse = z.strictObject({
  mode: GameMode,
  levels: z.array(
    z.strictObject({
      level: z.number(),
      state: LevelState,
      stars: z.number(),
      score: z.number(),
      difficultyTier: z.number(),
    }),
  ),
});
export type TrackResponse = z.infer<typeof TrackResponse>;

/** GET /v1/me/history */
export const HistoryQuery = z.object({
  mode: GameMode.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export const HistoryResponse = z.strictObject({
  items: z.array(
    z.strictObject({
      attemptId: z.string(),
      mode: GameMode,
      level: z.number(),
      status: AttemptStatus,
      score: z.number(),
      stars: z.number(),
      completedAt: z.string(),
    }),
  ),
  nextCursor: z.string().nullable(),
});
export type HistoryResponse = z.infer<typeof HistoryResponse>;

const Title = z.strictObject({
  name: z.string(),
  next: z.strictObject({ name: z.string(), missing: z.number() }).nullable(),
});
/** GET /v1/me/stats */
export const StatsResponse = z.strictObject({
  totalStars: z.number(),
  title: Title,
  rank: z.strictObject({ all: z.number().nullable(), week: z.number().nullable() }),
  CAREER_PATH: z.strictObject({
    completed: z.number(),
    won: z.number(),
    stars: z.number(),
    threeStars: z.number(),
    distribution: z.record(z.string(), z.number()),
  }),
  FOOTBALL_GRID: z.strictObject({
    completed: z.number(),
    stars: z.number(),
    threeStars: z.number(),
    avgScore: z.number(),
    perfect: z.number(),
  }),
});
export type StatsResponse = z.infer<typeof StatsResponse>;

/** GET /v1/ranking?scope=all|week */
export const RankingQuery = z.object({ scope: z.enum(['all', 'week']).default('all') });
const RankingEntry = z.strictObject({
  position: z.number(),
  nickname: z.string(),
  stars: z.number(),
  score: z.number(),
  title: z.string(),
  isMe: z.boolean(),
});
export const RankingResponse = z.strictObject({
  scope: z.enum(['all', 'week']),
  entries: z.array(RankingEntry),
  me: z.strictObject({
    position: z.number().nullable(),
    stars: z.number(),
    nickname: z.string().nullable(),
  }),
});
export type RankingResponse = z.infer<typeof RankingResponse>;

/** GET /v1/ranking/levels/:mode/:level: top 10 of one level */
export const LevelRankingResponse = z.strictObject({
  entries: z.array(
    z.strictObject({
      position: z.number(),
      nickname: z.string(),
      score: z.number(),
      stars: z.number(),
      durationSec: z.number(),
      isMe: z.boolean(),
    }),
  ),
});
export type LevelRankingResponse = z.infer<typeof LevelRankingResponse>;

/** GET/PATCH /v1/me, POST /v1/auth/* */
export const Nickname = z
  .string()
  .trim()
  .min(3)
  .max(20)
  .regex(/^[\p{L}\p{N} ._-]+$/u, 'Use letras, números, espaço, ponto, hífen ou _.');
export const MeResponse = z.strictObject({
  nickname: z.string().nullable(),
  account: z.strictObject({ email: z.string() }).nullable(),
  totalStars: z.number(),
  title: Title,
});
export type MeResponse = z.infer<typeof MeResponse>;
export const UpdateMeRequest = z.object({ nickname: Nickname });
export const RegisterRequest = z.object({
  email: z.email().max(200),
  password: z.string().min(8).max(200),
  nickname: Nickname,
});
export const LoginRequest = z.object({
  email: z.email().max(200),
  password: z.string().min(1).max(200),
});
export type CareerPathReveal = z.infer<typeof CareerPathReveal>;
export type FootballGridReveal = z.infer<typeof FootballGridReveal>;

/** Client analytics events (ANALYTICS.md §1). Game events are recorded by the server. */
export const ClientEventName = z.enum([
  'game_viewed',
  'result_shared',
  'game_abandoned',
  'search_no_result',
]);
export const EventsRequest = z.object({
  events: z
    .array(
      z.object({
        name: ClientEventName,
        ts: z.iso.datetime(),
        props: z
          .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
          .default({}),
      }),
    )
    .min(1)
    .max(20),
});
export type EventsRequest = z.infer<typeof EventsRequest>;
