import { z } from 'zod';

export const GameMode = z.enum([
  'CAREER_PATH',
  'FOOTBALL_GRID',
  'IMPOSTOR',
  'TIMELINE',
  'HIGHER_LOWER',
  'MISSING_XI',
  'MYSTERY_PLAYER',
  'CONNECTIONS',
]);
export type GameMode = z.infer<typeof GameMode>;
export const AttemptStatus = z.enum(['IN_PROGRESS', 'WON', 'LOST', 'COMPLETED']);
export type AttemptStatus = z.infer<typeof AttemptStatus>;
const PositionGroup = z.enum(['GK', 'DF', 'MF', 'FW']);

export const PlayerRef = z.strictObject({
  id: z.string(),
  name: z.string(),
  disambiguation: z.string().nullable(),
  /** Small Wikimedia Commons thumbnail, when the player has a freely licensed photo. */
  photo: z.string().nullable().optional(),
  /** "Foto: author · licence" (CC licences require the credit where the photo shows). */
  photoCredit: z.string().optional(),
});

/** GET /v1/players/:id/card: who the player is (never the whole career during play). */
export const PlayerCard = z.strictObject({
  id: z.string(),
  name: z.string(),
  fullName: z.string().nullable(),
  aliases: z.array(z.string()),
  birthYear: z.number().nullable(),
  nationalityCode: z.string().nullable(),
  positions: z.array(z.enum(['GK', 'DF', 'MF', 'FW'])),
  formationClub: z.string().nullable(),
  mostGamesClub: z.strictObject({ name: z.string(), games: z.number().nullable() }).nullable(),
  photo: z
    .strictObject({
      url: z.string(),
      page: z.string(),
      author: z.string().nullable(),
      license: z.string(),
    })
    .nullable(),
});
export type PlayerCard = z.infer<typeof PlayerCard>;
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
  appearances: z.number().nullable(),
  goals: z.number().nullable(),
  loanFromName: z.string().nullable(),
});
export type RevealedClub = z.infer<typeof RevealedClub>;
export const CareerPathView = z.strictObject({
  status: AttemptStatus,
  maxAttempts: z.number(),
  attemptsUsed: z.number(),
  /** Shown from the first attempt (career-path@2). */
  position: PositionGroup.nullable(),
  secondaryPositions: z.array(PositionGroup),
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
    secondaryPositions: z.array(PositionGroup).optional(),
    nationalityCode: z.string().optional(),
  }),
  /** The answer's career page (/jogador/...), when the career is verified. */
  answerPage: z.string().nullable(),
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
  /** football-grid@2: up to 3 hints; a hint shows a valid answer's initial, letters per word and the pool size. */
  hintsLeft: z.number(),
  hints: z.array(
    z.strictObject({
      cellIndex: z.number(),
      initial: z.string(),
      pattern: z.array(z.number()),
      validAnswers: z.number(),
    }),
  ),
});
export type FootballGridView = z.infer<typeof FootballGridView>;
export const FootballGridReveal = z.strictObject({
  cells: z.array(
    z.strictObject({ index: z.number(), example: PlayerRef, validAnswers: z.number() }),
  ),
});

/** Impostor (ADR-011): a club and 4 players per round; past rounds show the impostor. */
const ImpostorPlayer = z.strictObject({ id: z.string(), name: z.string() });
export const ImpostorView = z.strictObject({
  status: z.enum(['IN_PROGRESS', 'WON', 'LOST', 'COMPLETED']),
  round: z.number(),
  totalRounds: z.number(),
  rounds: z.array(
    z.strictObject({
      clubName: z.string(),
      clubCountryCode: z.string(),
      players: z.array(ImpostorPlayer),
      picked: z.string(),
      impostorId: z.string(),
      correct: z.boolean(),
    }),
  ),
  current: z
    .strictObject({
      clubName: z.string(),
      clubCountryCode: z.string(),
      players: z.array(ImpostorPlayer),
    })
    .nullable(),
});
export type ImpostorView = z.infer<typeof ImpostorView>;
export const ImpostorReveal = z.strictObject({
  rounds: z.array(
    z.strictObject({
      clubName: z.string(),
      players: z.array(ImpostorPlayer),
      impostorId: z.string(),
    }),
  ),
});
export type ImpostorReveal = z.infer<typeof ImpostorReveal>;

/** Linha do tempo (ADR-011): put a player's 4 clubs in career order; past rounds show years. */
const TimelineClub = z.strictObject({
  id: z.string(),
  name: z.string(),
  from: z.number(),
  to: z.number().nullable(),
});
export const TimelineView = z.strictObject({
  status: z.enum(['IN_PROGRESS', 'WON', 'LOST', 'COMPLETED']),
  round: z.number(),
  totalRounds: z.number(),
  rounds: z.array(
    z.strictObject({
      playerName: z.string(),
      clubs: z.array(TimelineClub),
      answer: z.array(z.string()),
      correct: z.boolean(),
    }),
  ),
  current: z
    .strictObject({
      playerName: z.string(),
      clubs: z.array(z.strictObject({ id: z.string(), name: z.string() })),
    })
    .nullable(),
});
export type TimelineView = z.infer<typeof TimelineView>;
export const TimelineReveal = z.strictObject({
  rounds: z.array(z.strictObject({ playerName: z.string(), clubs: z.array(TimelineClub) })),
});
export type TimelineReveal = z.infer<typeof TimelineReveal>;

/** Mais ou Menos (ADR-011): two spells, who had more goals or games; values after the pick. */
const HlSide = z.strictObject({
  playerId: z.string(),
  playerName: z.string(),
  clubName: z.string(),
});
const HlSideValue = HlSide.extend({ value: z.number() });
export const HigherLowerView = z.strictObject({
  status: z.enum(['IN_PROGRESS', 'WON', 'LOST', 'COMPLETED']),
  round: z.number(),
  totalRounds: z.number(),
  rounds: z.array(
    z.strictObject({
      metric: z.enum(['goals', 'games']),
      a: HlSideValue,
      b: HlSideValue,
      choice: z.enum(['a', 'b']),
      correct: z.boolean(),
    }),
  ),
  current: z.strictObject({ metric: z.enum(['goals', 'games']), a: HlSide, b: HlSide }).nullable(),
});
export type HigherLowerView = z.infer<typeof HigherLowerView>;
export const HigherLowerReveal = z.strictObject({
  rounds: z.array(
    z.strictObject({ metric: z.enum(['goals', 'games']), a: HlSideValue, b: HlSideValue }),
  ),
});
export type HigherLowerReveal = z.infer<typeof HigherLowerReveal>;

/** Escalação (ADR-011): a final's starting XI with some names hidden; hidden ids never sent. */
const XiMatch = z.strictObject({
  competition: z.string(),
  season: z.string(),
  stage: z.string().nullable(),
  homeTeam: z.string(),
  awayTeam: z.string(),
  homeScore: z.number().nullable(),
  awayScore: z.number().nullable(),
  source: z.string(),
});
export const MissingXiView = z.strictObject({
  status: z.enum(['IN_PROGRESS', 'WON', 'LOST', 'COMPLETED']),
  match: XiMatch,
  side: z.enum(['home', 'away']),
  hidden: z.number(),
  wrongLeft: z.number(),
  slots: z.array(
    z.strictObject({
      position: z.string(),
      jersey: z.number().nullable(),
      name: z.string().nullable(),
      playerId: z.string().nullable(),
      found: z.boolean(),
    }),
  ),
});
export type MissingXiView = z.infer<typeof MissingXiView>;
export const MissingXiReveal = z.strictObject({
  match: XiMatch,
  side: z.enum(['home', 'away']),
  slots: z.array(
    z.strictObject({
      position: z.string(),
      jersey: z.number().nullable(),
      name: z.string(),
      playerId: z.string().nullable(),
      hidden: z.boolean(),
    }),
  ),
});
export type MissingXiReveal = z.infer<typeof MissingXiReveal>;

/** Craque Misterioso (ADR-011): each guess compared with the hidden player. */
const MysteryFacts = z.strictObject({
  playerId: z.string(),
  name: z.string(),
  nationalityCode: z.string(),
  positionGroup: z.enum(['GK', 'DF', 'MF', 'FW']).nullable(),
  birthYear: z.number().nullable(),
  clubs: z.array(z.strictObject({ id: z.string(), name: z.string(), countryCode: z.string() })),
});
export const MysteryView = z.strictObject({
  status: z.enum(['IN_PROGRESS', 'WON', 'LOST', 'COMPLETED']),
  guessesLeft: z.number(),
  guesses: z.array(
    z.strictObject({
      playerId: z.string(),
      name: z.string(),
      nationalityCode: z.string(),
      positionGroup: z.enum(['GK', 'DF', 'MF', 'FW']).nullable(),
      birthYear: z.number().nullable(),
      feedback: z.strictObject({
        nationality: z.boolean(),
        position: z.boolean(),
        birthYear: z.enum(['older', 'younger', 'same', 'unknown']),
        birthYearClose: z.boolean(),
        sharedClubs: z.array(z.string()),
        sharedCountries: z.array(z.string()),
      }),
    }),
  ),
});
export type MysteryView = z.infer<typeof MysteryView>;
export const MysteryReveal = z.strictObject({ answer: MysteryFacts });
export type MysteryReveal = z.infer<typeof MysteryReveal>;

/** Conexões (ADR-011): 16 players in 4 hidden groups. */
const CnGroup = z.strictObject({
  group: z.number(),
  label: z.string(),
  players: z.array(z.strictObject({ id: z.string(), name: z.string() })),
});
export const ConnectionsView = z.strictObject({
  status: z.enum(['IN_PROGRESS', 'WON', 'LOST', 'COMPLETED']),
  mistakesLeft: z.number(),
  found: z.array(CnGroup),
  tiles: z.array(z.strictObject({ id: z.string(), name: z.string() })),
});
export type ConnectionsView = z.infer<typeof ConnectionsView>;
export const ConnectionsReveal = z.strictObject({ groups: z.array(CnGroup) });
export type ConnectionsReveal = z.infer<typeof ConnectionsReveal>;

export const AttemptSummary = z.strictObject({
  id: z.string(),
  challengeId: z.string(),
  mode: GameMode,
  level: z.number(),
  status: AttemptStatus,
  score: z.number(),
  stars: z.number(),
  /** Against the clock (ADR-009): the server closes the level at deadlineAt. */
  timed: z.boolean(),
  deadlineAt: z.string().nullable(),
  /** Seconds left by the server's clock when this response was built; the screen counts from it,
   * so a phone with a wrong clock never loses (or gains) time. */
  secondsLeft: z.number().nullable(),
  /** Time the level took, once finished (shown in both modes). */
  durationSec: z.number().nullable(),
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
  z.strictObject({ type: z.literal('hint'), cellIndex: z.number() }),
  z.strictObject({ type: z.literal('completed') }),
  // Impostor: the round's impostor is shown once the round is played.
  z.strictObject({
    type: z.enum(['correct', 'wrong']),
    round: z.number(),
    impostorId: z.string(),
  }),
  z.strictObject({ type: z.literal('ended') }),
  // Escalação: a hidden slot found, or a wrong guess.
  z.strictObject({ type: z.literal('found'), slot: z.number() }),
  z.strictObject({ type: z.literal('wrong'), wrongLeft: z.number() }),
  // Craque Misterioso.
  z.strictObject({ type: z.literal('won') }),
  // Conexões.
  z.strictObject({ type: z.literal('group_found'), group: z.number() }),
  z.strictObject({ type: z.literal('miss'), oneAway: z.boolean(), mistakesLeft: z.number() }),
  z.strictObject({ type: z.literal('wrong'), guessesLeft: z.number() }),
  // Linha do tempo: the right order is shown once the round is played.
  z.strictObject({
    type: z.enum(['correct', 'wrong']),
    round: z.number(),
    order: z.array(z.string()),
  }),
  // Mais ou Menos: both values are shown once the round is played.
  z.strictObject({
    type: z.enum(['correct', 'wrong']),
    round: z.number(),
    values: z.tuple([z.number(), z.number()]),
  }),
]);

/** POST /v1/attempts, GET /v1/attempts/:id, POST /v1/attempts/:id/actions */
export const AttemptResponse = z.strictObject({
  attempt: AttemptSummary,
  event: GameEvent.optional(),
  view: z.union([
    CareerPathView,
    FootballGridView,
    ImpostorView,
    TimelineView,
    HigherLowerView,
    MissingXiView,
    MysteryView,
    ConnectionsView,
  ]),
  reveal: z
    .union([
      CareerPathReveal,
      FootballGridReveal,
      ImpostorReveal,
      TimelineReveal,
      HigherLowerReveal,
      MissingXiReveal,
      MysteryReveal,
      ConnectionsReveal,
    ])
    .nullable(),
  share: z.strictObject({ text: z.string() }).nullable(),
});
export type AttemptResponse = z.infer<typeof AttemptResponse>;

export const StartAttemptRequest = z.strictObject({
  mode: GameMode,
  level: z.number().int().min(1),
  /** Chosen once, when the level starts (ADR-009). */
  timed: z.boolean().default(false),
});
export const SubmitActionRequest = z.strictObject({
  idempotencyKey: z.uuid(),
  input: z.union([
    z.strictObject({
      kind: z.literal('guess'),
      playerId: z.string().min(1),
      cellIndex: z.number().int().optional(),
    }),
    z.strictObject({ kind: z.literal('skip') }),
    z.strictObject({ kind: z.literal('finish') }),
    z.strictObject({ kind: z.literal('give_up') }),
    z.strictObject({ kind: z.literal('pick'), playerId: z.string().min(1) }),
    z.strictObject({ kind: z.literal('order'), clubIds: z.array(z.string()).length(4) }),
    z.strictObject({ kind: z.literal('choose'), side: z.enum(['a', 'b']) }),
    z.strictObject({ kind: z.literal('group'), playerIds: z.array(z.string()).length(4) }),
    z.strictObject({ kind: z.literal('hint'), cellIndex: z.number().int() }),
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
  IMPOSTOR: z.strictObject({
    completed: z.number(),
    stars: z.number(),
    threeStars: z.number(),
    perfect: z.number(),
  }),
  TIMELINE: z.strictObject({
    completed: z.number(),
    stars: z.number(),
    threeStars: z.number(),
    perfect: z.number(),
  }),
  HIGHER_LOWER: z.strictObject({
    completed: z.number(),
    stars: z.number(),
    threeStars: z.number(),
    perfect: z.number(),
  }),
  MISSING_XI: z.strictObject({
    completed: z.number(),
    stars: z.number(),
    threeStars: z.number(),
    perfect: z.number(),
  }),
  MYSTERY_PLAYER: z.strictObject({
    completed: z.number(),
    stars: z.number(),
    threeStars: z.number(),
    perfect: z.number(),
  }),
  CONNECTIONS: z.strictObject({
    completed: z.number(),
    stars: z.number(),
    threeStars: z.number(),
    perfect: z.number(),
  }),
});
export type StatsResponse = z.infer<typeof StatsResponse>;

/** GET /v1/ranking?scope=all|week */
/** `timed`: stars from levels played against the clock, ties broken by the faster total (ADR-009). */
export const RankingQuery = z.object({ scope: z.enum(['all', 'week', 'timed']).default('all') });
const RankingEntry = z.strictObject({
  position: z.number(),
  nickname: z.string(),
  stars: z.number(),
  score: z.number(),
  title: z.string(),
  isMe: z.boolean(),
});
export const RankingResponse = z.strictObject({
  scope: z.enum(['all', 'week', 'timed']),
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
  account: z.strictObject({ email: z.string(), emailVerified: z.boolean() }).nullable(),
  totalStars: z.number(),
  title: Title,
});
export type MeResponse = z.infer<typeof MeResponse>;
export const UpdateMeRequest = z.strictObject({ nickname: Nickname });
export type CareerPathReveal = z.infer<typeof CareerPathReveal>;
export type FootballGridReveal = z.infer<typeof FootballGridReveal>;

/** Client analytics events (ANALYTICS.md §1). Game events are recorded by the server. */
export const ClientEventName = z.enum([
  'game_viewed',
  'result_shared',
  'game_abandoned',
  'search_no_result',
]);
export const EventsRequest = z.strictObject({
  events: z
    .array(
      z.strictObject({
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
