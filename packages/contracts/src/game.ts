import { z } from 'zod';

export const GameMode = z.enum(['CAREER_PATH', 'FOOTBALL_GRID']);
export type GameMode = z.infer<typeof GameMode>;
export const ChallengeKind = z.enum(['daily', 'practice']);
export type ChallengeKind = z.infer<typeof ChallengeKind>;
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
  kind: ChallengeKind,
  publicNumber: z.number().nullable(),
  status: AttemptStatus,
  score: z.number(),
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

export const StartAttemptRequest = z.object({ mode: GameMode, kind: ChallengeKind });
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

/** GET /v1/games */
export const GamesResponse = z.strictObject({
  today: z.string(),
  games: z.array(
    z.strictObject({
      mode: GameMode,
      name: z.string(),
      daily: z
        .strictObject({
          challengeId: z.string(),
          publicNumber: z.number().nullable(),
          attempt: z
            .strictObject({ id: z.string(), status: AttemptStatus, score: z.number() })
            .nullable(),
        })
        .nullable(),
    }),
  ),
});
export type GamesResponse = z.infer<typeof GamesResponse>;
