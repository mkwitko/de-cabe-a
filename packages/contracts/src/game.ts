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
  'DRAFT',
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

/** Draft (GROWTH_PLAN.md 2.4): a 4-3-3 built one slot per round from real matches. */
const DraftMatch = z.strictObject({
  competition: z.string(),
  season: z.string(),
  stage: z.string().nullable(),
  team: z.string(),
  opponent: z.string(),
  teamScore: z.number().nullable(),
  opponentScore: z.number().nullable(),
});
const DraftRound = {
  slot: PositionGroup,
  match: DraftMatch,
  players: z.array(ImpostorPlayer),
};
export const DraftView = z.strictObject({
  status: z.enum(['IN_PROGRESS', 'WON', 'LOST', 'COMPLETED']),
  round: z.number(),
  totalRounds: z.number(),
  rounds: z.array(
    z.strictObject({
      ...DraftRound,
      picked: z.string(),
      answerId: z.string(),
      correct: z.boolean(),
    }),
  ),
  current: z.strictObject(DraftRound).nullable(),
});
export type DraftView = z.infer<typeof DraftView>;
export const DraftReveal = z.strictObject({
  rounds: z.array(z.strictObject({ ...DraftRound, answerId: z.string() })),
});
export type DraftReveal = z.infer<typeof DraftReveal>;

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
  // Draft: the round's starter is shown once the round is played.
  z.strictObject({
    type: z.enum(['correct', 'wrong']),
    round: z.number(),
    answerId: z.string(),
  }),
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

export const StickerRarity = z.enum([
  'bronze',
  'prata',
  'ouro',
  'ouro_brilhante',
  'destaque_rodada',
  'selecao_temporada',
  'idolo',
  'lenda',
]);
export type StickerRarity = z.infer<typeof StickerRarity>;

export const Sticker = z.strictObject({
  playerId: z.string(),
  name: z.string(),
  positionGroup: z.enum(['GK', 'DF', 'MF', 'FW']).nullable(),
  nationality: z.string(),
  rarity: StickerRarity,
  mode: GameMode,
  earnedAt: z.string(),
});
export type Sticker = z.infer<typeof Sticker>;

/** Sticker earned by an attempt; `upgradedFrom` is the previous rarity when it replaced a lower one. */
export const StickerAward = z.strictObject({
  sticker: Sticker,
  upgradedFrom: StickerRarity.nullable(),
  isNew: z.boolean(),
});
export type StickerAward = z.infer<typeof StickerAward>;

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
    DraftView,
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
      DraftReveal,
    ])
    .nullable(),
  /** `url` is the level's page without the scheme, e.g. decabecafc.com.br/career-path/12. */
  share: z.strictObject({ text: z.string(), url: z.string() }).nullable(),
  /** Present when finishing the level earned or upgraded a sticker. */
  sticker: StickerAward.optional(),
});
export type AttemptResponse = z.infer<typeof AttemptResponse>;

export const StartAttemptRequest = z
  .strictObject({
    mode: GameMode,
    /** Track level; 0 with `challengeId` for an Oficina level. */
    level: z.number().int().min(0),
    /** Chosen once, when the level starts (ADR-009). */
    timed: z.boolean().default(false),
    challengeId: z.string().max(64).optional(),
  })
  .refine((b) => (b.challengeId ? b.level === 0 : b.level >= 1), {
    message: 'level >= 1, or 0 with challengeId',
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
  DRAFT: z.strictObject({
    completed: z.number(),
    stars: z.number(),
    threeStars: z.number(),
    perfect: z.number(),
  }),
});
export type StatsResponse = z.infer<typeof StatsResponse>;

/** GET /v1/ranking?scope=all|week */
/** `timed`: stars from levels played against the clock, ties broken by the faster total (ADR-009). */
export const RankingScope = z.enum(['all', 'season', 'week', 'timed']);
export type RankingScope = z.infer<typeof RankingScope>;
export const RankingQuery = z.object({ scope: RankingScope.default('all') });
export const RankingEntry = z.strictObject({
  position: z.number(),
  nickname: z.string(),
  stars: z.number(),
  score: z.number(),
  title: z.string(),
  isMe: z.boolean(),
});
export const RankingResponse = z.strictObject({
  scope: RankingScope,
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
  /** /perfil/:nickname is public (GROWTH_PLAN.md 2.2); off by default. */
  publicProfile: z.boolean(),
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
  /** Arrival by a shared link: kind = level | league | profile | daily; ref from `?ref=`. */
  'link_opened',
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

/** GET /v1/daily/:date (GROWTH_PLAN.md 1.9): the same level of each mode for everyone that day. */
export const DailyResponse = z.strictObject({
  date: z.string(),
  today: z.string(),
  games: z.array(
    z.strictObject({
      mode: GameMode,
      level: z.number(),
      state: z.enum(['open', 'in_progress', 'done']),
      stars: z.number(),
      /** Share of that day's finished plays with at least one star; null below 30 plays. */
      solvedPct: z.number().nullable(),
    }),
  ),
  /** Earlier days with a challenge, newest first. */
  archive: z.array(z.string()),
});
export type DailyResponse = z.infer<typeof DailyResponse>;

/** Web path of each game's track; a level is `${GAME_PATH[mode]}/${level}`. */
export const GAME_PATH = {
  CAREER_PATH: '/career-path',
  FOOTBALL_GRID: '/grid',
  IMPOSTOR: '/impostor',
  TIMELINE: '/linha-do-tempo',
  HIGHER_LOWER: '/mais-ou-menos',
  MISSING_XI: '/escalacao',
  CONNECTIONS: '/conexoes',
  DRAFT: '/draft',
  MYSTERY_PLAYER: '/craque-misterioso',
} as const satisfies Record<GameMode, string>;

/** Ligas de amigos (GROWTH_PLAN.md 2.1). */
export const LeagueName = z
  .string()
  .trim()
  .min(3, 'O nome precisa de 3 a 40 caracteres.')
  .max(40, 'O nome precisa de 3 a 40 caracteres.');
export const CreateLeagueRequest = z.strictObject({ name: LeagueName });
export const ReportLeagueRequest = z.strictObject({ reason: z.string().trim().min(3).max(300) });
export const LeagueSummary = z.strictObject({
  code: z.string(),
  name: z.string(),
  members: z.number(),
});
export const LeaguesResponse = z.strictObject({ leagues: z.array(LeagueSummary) });
export type LeaguesResponse = z.infer<typeof LeaguesResponse>;
/** GET /v1/leagues/:code; the weekly ranking only for members. */
export const LeagueResponse = z.strictObject({
  code: z.string(),
  name: z.string(),
  members: z.number(),
  maxMembers: z.number(),
  isMember: z.boolean(),
  /** Monday 00:00 in Brasília, start of the weekly ranking. */
  weekStart: z.string(),
  ranking: z.array(
    z.strictObject({
      position: z.number(),
      nickname: z.string(),
      stars: z.number(),
      isMe: z.boolean(),
    }),
  ),
});
export type LeagueResponse = z.infer<typeof LeagueResponse>;

/** GET /v1/me/achievements (GROWTH_PLAN.md 2.3): permanent, derived from finished levels. */
export const AchievementsResponse = z.strictObject({
  items: z.array(
    z.strictObject({
      id: z.string(),
      category: z.enum(['progressao', 'especialidade', 'experiencia']),
      name: z.string(),
      description: z.string(),
      progress: z.number(),
      goal: z.number(),
      done: z.boolean(),
    }),
  ),
});
export type AchievementsResponse = z.infer<typeof AchievementsResponse>;

/** PATCH /v1/me/profile: show or hide /perfil/:nickname. */
export const UpdateProfileRequest = z.strictObject({ publicProfile: z.boolean() });
/** GET /v1/profiles/:nickname (only when the player made it public). */
/** Temporadas (GROWTH_PLAN.md 2.6): 4 weeks, a theme, a ranking that starts at zero. */
export const Season = z.strictObject({
  number: z.number(),
  theme: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
});
/** A podium place in a finished season; kept forever on the profile. */
export const Trophy = z.strictObject({
  season: z.number(),
  theme: z.string(),
  position: z.number(),
});
export const SeasonResponse = z.strictObject({ current: Season, trophies: z.array(Trophy) });
export type SeasonResponse = z.infer<typeof SeasonResponse>;

/**
 * GET /v1/round (GROWTH_PLAN.md 2.7): the week's round is the Desafio do Dia from Monday to
 * Friday. A day scores the stars of its levels played that same day; the best 3 days count.
 */
export const RoundResponse = z.strictObject({
  weekStart: z.string(),
  counted: z.number(),
  days: z.array(z.strictObject({ day: z.string(), open: z.boolean(), stars: z.number() })),
  me: z.strictObject({ position: z.number().nullable(), total: z.number() }),
  entries: z.array(RankingEntry),
});
export type RoundResponse = z.infer<typeof RoundResponse>;

export const ProfileResponse = z.strictObject({
  nickname: z.string(),
  title: Title,
  totalStars: z.number(),
  games: z.array(z.strictObject({ mode: GameMode, completed: z.number(), stars: z.number() })),
  achievements: z.array(z.strictObject({ id: z.string(), name: z.string() })),
  trophies: z.array(Trophy),
});
export type ProfileResponse = z.infer<typeof ProfileResponse>;

/** Reações (GROWTH_PLAN.md 2.5): predefined, one per player per level, undo allowed. */
export const ReactionKind = z.enum(['craque', 'na-trave', 'que-memoria', 'pegadinha']);
export type ReactionKind = z.infer<typeof ReactionKind>;
export const ReactRequest = z.strictObject({ kind: ReactionKind });
export const ReactionsResponse = z.strictObject({
  counts: z.record(ReactionKind, z.number()),
  mine: ReactionKind.nullable(),
});
export type ReactionsResponse = z.infer<typeof ReactionsResponse>;

/** Notificações opt-in (GROWTH_PLAN.md 2.9); publicKey null when the server has push off. */
export const PushKeyResponse = z.strictObject({ publicKey: z.string().nullable() });
export type PushKeyResponse = z.infer<typeof PushKeyResponse>;
export const PushSubscribeRequest = z.strictObject({
  endpoint: z.url().max(1000),
  keys: z.strictObject({ p256dh: z.string().max(200), auth: z.string().max(100) }),
  daily: z.boolean(),
  league: z.boolean(),
});
export const PushUnsubscribeRequest = z.strictObject({ endpoint: z.url().max(1000) });

/** Fantasy de conhecimento: 5 real players for the week; points when they are in a level you finish. */
export const FANTASY_SIZE = 5;
export const SaveSquadRequest = z.strictObject({
  playerIds: z.array(z.string()).length(FANTASY_SIZE),
});
/** Fantasy histórico (GROWTH_PLAN.md 3.7): the week's World Cup; only its players can be picked. */
export const FantasyCup = z.strictObject({
  season: z.string(),
  players: z.array(
    z.strictObject({ id: z.string(), name: z.string(), position: PositionGroup.nullable() }),
  ),
});
export const FantasyResponse = z.strictObject({
  weekStart: z.string(),
  cup: FantasyCup.nullable(),
  squad: z
    .array(
      z.strictObject({
        id: z.string(),
        name: z.string(),
        position: PositionGroup.nullable(),
        points: z.number(),
      }),
    )
    .nullable(),
  total: z.number(),
  me: z.strictObject({ position: z.number().nullable() }),
  entries: z.array(RankingEntry),
});
export type FantasyResponse = z.infer<typeof FantasyResponse>;

/** Copa dos Sonhos: draft an XI from the great World Cup sides and win a simulated World Cup. */
export const CopaDifficulty = z.enum(['olheiro', 'raiz']);
export const CopaFormation = z.enum(['4-3-3', '4-4-2', '3-5-2']);
export const CopaTactic = z.enum(['retranca', 'equilibrado', 'ofensivo']);
export const CopaFinish = z.enum(['Grupos', 'Oitavas', 'Quartas', 'Semifinal', 'Vice', 'Campeão']);
const CopaSlot = z.enum(['GK', 'DF', 'MF', 'FW']);
export const StartCopaRequest = z.strictObject({
  formation: CopaFormation,
  difficulty: CopaDifficulty,
});
export const CopaPickRequest = z.strictObject({ playerId: z.string().min(1).max(64) });
export const CopaPlayRequest = z.strictObject({ tactic: CopaTactic });
const CopaPlayer = z.strictObject({
  id: z.string(),
  name: z.string(),
  slot: CopaSlot,
  /** The World Cup side he comes from. */
  team: z.string(),
  season: z.string(),
  /** Hidden (null) in Raiz until the Copa ends. */
  overall: z.number().nullable(),
  facts: z
    .strictObject({ cups: z.number(), starts: z.number(), finals: z.number(), titles: z.number() })
    .nullable(),
});
const CopaSide = z.strictObject({
  team: z.string(),
  season: z.string(),
  champion: z.boolean(),
  strength: z.number().nullable(),
  stars: z.array(z.string()),
});
const CopaMatch = z.strictObject({
  stage: z.string(),
  opponent: CopaSide,
  tactic: CopaTactic,
  goalsFor: z.number(),
  goalsAgainst: z.number(),
  events: z.array(
    z.strictObject({ minute: z.number(), side: z.enum(['mine', 'theirs']), name: z.string() }),
  ),
  extraTime: z.boolean(),
  penalties: z.strictObject({ mine: z.number(), theirs: z.number() }).nullable(),
});
export const CopaRunView = z.strictObject({
  id: z.string(),
  formation: CopaFormation,
  difficulty: CopaDifficulty,
  phase: z.enum(['draft', 'group', 'knockout', 'over']),
  /** Draft: the slot being filled and its 4 candidates. */
  draft: z
    .strictObject({ round: z.number(), slot: CopaSlot, options: z.array(CopaPlayer) })
    .nullable(),
  xi: z.array(CopaPlayer),
  chemistry: z.strictObject({
    value: z.number(),
    links: z.array(z.strictObject({ a: z.string(), b: z.string(), why: z.string() })),
  }),
  strength: z.number().nullable(),
  next: z.strictObject({ stage: z.string(), opponent: CopaSide }).nullable(),
  group: z.array(
    z.strictObject({
      team: z.string(),
      season: z.string().nullable(),
      played: z.number(),
      points: z.number(),
      gf: z.number(),
      ga: z.number(),
    }),
  ),
  matches: z.array(CopaMatch),
  finish: CopaFinish.nullable(),
});
export const CopaResponse = z.strictObject({
  run: CopaRunView.nullable(),
  record: z.strictObject({ best: CopaFinish.nullable(), titles: z.number(), runs: z.number() }),
});
export type CopaRunView = z.infer<typeof CopaRunView>;
export type CopaResponse = z.infer<typeof CopaResponse>;

/** Oficina De Cabeça (GROWTH_PLAN.md 3.1–3.5): Grids built by players, reviewed by editors. */
const Criterion = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('club'), clubId: z.string().max(64) }),
  z.strictObject({ type: z.literal('nationality'), countryId: z.string().max(64) }),
  z.strictObject({ type: z.literal('position'), positionGroup: PositionGroup }),
  z.strictObject({ type: z.literal('played_in_country'), countryId: z.string().max(64) }),
]);
export type OficinaCriterion = z.infer<typeof Criterion>;
export const CreateCommunityLevelRequest = z.strictObject({
  title: z.string().trim().min(3).max(60),
  rows: z.tuple([Criterion, Criterion, Criterion]),
  cols: z.tuple([Criterion, Criterion, Criterion]),
});
export const OficinaCriteriaResponse = z.strictObject({
  clubs: z.array(z.strictObject({ id: z.string(), name: z.string() })),
  countries: z.array(z.strictObject({ id: z.string(), name: z.string() })),
});
export const CommunityList = z.enum(['recomendados', 'populares', 'novos']);
export const CommunityLevelView = z.strictObject({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  state: z.enum(['review', 'published', 'featured', 'flagged', 'archived']),
  sponsor: z.string().nullable(),
  createdAt: z.string(),
  plays: z.number(),
  /** Share of plays finished with at least one star. */
  solved: z.number(),
  up: z.number(),
  down: z.number(),
  /** Wilson lower bound of the up votes. */
  quality: z.number(),
});
export type CommunityLevelView = z.infer<typeof CommunityLevelView>;
export const VoteRequest = z.strictObject({ up: z.boolean() });
const AudienceEntry = z.strictObject({
  position: z.number(),
  nickname: z.string(),
  stars: z.number(),
  levels: z.number(),
});
export const CreatorResponse = z.strictObject({
  nickname: z.string(),
  levels: z.array(CommunityLevelView),
  plays: z.number(),
  ranking: z.array(AudienceEntry),
});
export type CreatorResponse = z.infer<typeof CreatorResponse>;
const EventView = z.strictObject({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  sponsor: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: z.enum(['upcoming', 'live', 'over']),
  levels: z.array(CommunityLevelView),
});
export const EventsResponse = z.strictObject({ events: z.array(EventView) });
export const EventResponse = EventView.extend({ ranking: z.array(AudienceEntry) });
export type EventsResponse = z.infer<typeof EventsResponse>;
export type EventResponse = z.infer<typeof EventResponse>;
