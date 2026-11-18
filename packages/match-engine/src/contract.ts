/**
 * Public input/output contract of the match engine (MC-145; 01-ARQUITETURA.md §2,
 * 02-MATCH-ENGINE.md §3, §8.1, §9, §11). Types and zod schemas only: no logic.
 *
 * Rules the shapes enforce:
 * - The input never says which team belongs to the user (ADR-013 item 7): both
 *   schemas are strict, so a field like `userTeam` is rejected.
 * - The engine returns message keys and parameters, never text (ADR-017 item 2).
 * - Team 0 is the home side, team 1 the away side. Slots 0..10 are the starting
 *   eleven in the order of the plan's shapes.
 */
import { z } from 'zod';

const rating = z.number().int().min(1).max(99);
const level = z.number().int().min(1).max(5);
const unit = z.number().min(0).max(1);
const id = z.string().min(1).max(64);
const slot = z.number().int().min(0).max(10);

// ── Players (03-JOGADORES-E-BASE.md §2) ──────────────────────────────────────

export const TECHNICAL = [
  'firstTouch',
  'passing',
  'technique',
  'dribbling',
  'crossing',
  'finishing',
  'heading',
  'tackling',
  'marking',
  'setPieces',
  // ADR-019: `passing` is short passing; long balls, long shots, weaker foot and shielding apart.
  'longPassing',
  'longShots',
  'weakFoot',
  'shielding',
] as const;
export const MENTAL = [
  'decisions',
  'vision',
  'anticipation',
  'positioning',
  'offTheBall',
  'composure',
  'concentration',
  'teamwork',
  'workRate',
  'leadership',
  'aggression',
  'bravery',
  'determination',
  'flair',
] as const;
/** Perception and tactical execution (ADR-019; research 15 to 17). */
export const TACTICAL = [
  'scanning',
  'spatialAwareness',
  'tacticalReading',
  'bodyOrientation',
  'discipline',
  'timing',
  'pressing',
  'covering',
  'lossReaction',
  'communication',
] as const;
export const PHYSICAL = [
  'acceleration',
  'pace',
  'agility',
  'balance',
  'strength',
  'stamina',
  'jumping',
  'recovery',
  'deceleration',
] as const;
export const GOALKEEPING = [
  'reflexes',
  'handling',
  'oneOnOne',
  'commandOfArea',
  'distribution',
  'gkPositioning',
  'sweeping',
] as const;
export const ATTRIBUTES = [
  ...TECHNICAL,
  ...MENTAL,
  ...TACTICAL,
  ...PHYSICAL,
  ...GOALKEEPING,
] as const;
export type AttributeId = (typeof ATTRIBUTES)[number];

export const AttributesSchema = z.strictObject(
  Object.fromEntries(ATTRIBUTES.map((a) => [a, rating])) as Record<AttributeId, typeof rating>,
);
export type Attributes = z.infer<typeof AttributesSchema>;

/** Hidden attributes that act inside a match (1..20, `03` §2.3). */
export const HiddenSchema = z.strictObject({
  consistency: z.number().int().min(1).max(20),
  bigMatches: z.number().int().min(1).max(20),
  injuryProneness: z.number().int().min(1).max(20),
});

/** On-pitch behaviour traits (`03` §2.3); biases in the utility, never attribute bonuses. */
export const TRAITS = [
  'cutsInside',
  'shootsFromDistance',
  'holdsBall',
  'triesDribbles',
  'getsIntoBox',
  'playsSimple',
  'divesIntoTackles',
  'arguesWithReferee',
] as const;
export const TraitSchema = z.enum(TRAITS);

export const POSITIONS = [
  'GK',
  'CB',
  'RB',
  'LB',
  'DM',
  'CM',
  'RM',
  'LM',
  'AM',
  'RW',
  'LW',
  'SS',
  'ST',
] as const;
export const PositionSchema = z.enum(POSITIONS);

export const PlayerInputSchema = z.strictObject({
  id,
  attributes: AttributesSchema,
  hidden: HiddenSchema,
  traits: z.array(TraitSchema).max(TRAITS.length),
  /** Level per position: 3 natural, 2 competent, 1 improvised; absent = unable. */
  positions: z.partialRecord(PositionSchema, z.number().int().min(1).max(3)),
  preferredFoot: z.enum(['right', 'left', 'both']),
  heightCm: z.number().int().min(150).max(210),
  /** Pre-match state (`08` §9): freshness and morale, 0..1. */
  condition: unit,
  morale: unit,
  /** Familiarity with the plan of the day, 0..1 (`02` §8.5). */
  familiarity: unit,
});
export type PlayerInput = z.infer<typeof PlayerInputSchema>;

// ── Tactics (02-MATCH-ENGINE.md §8) ──────────────────────────────────────────

export const ROLES = [
  'goalkeeper',
  'sweeperKeeper',
  'centreBack',
  'libero',
  'supportFullBack',
  'invertedFullBack',
  'wingBack',
  'anchor',
  'deepPlaymaker',
  'boxToBox',
  'playmaker',
  'wideWinger',
  'insideForward',
  'targetMan',
  'falseNine',
  'advancedForward',
] as const;
export const RoleSchema = z.enum(ROLES);
export type RoleId = z.infer<typeof RoleSchema>;

const point = z.strictObject({ x: z.number().min(0).max(105), y: z.number().min(0).max(68) });
/** Eleven slot positions in the team frame (attacking +x) for a ball on the centre spot. */
export const ShapeSchema = z.array(point).length(11);

export const PRESS_TRIGGERS = [
  'backPass',
  'poorTouch',
  'ballOnTouchline',
  'receiverFacingOwnGoal',
] as const;

export const TeamInstructionsSchema = z.strictObject({
  buildUp: z.enum(['short', 'mixed', 'long']),
  tempo: level,
  width: level,
  risk: level,
  progression: z.enum(['circulate', 'vertical', 'wide', 'central']),
  finalThird: z.strictObject({
    crosses: level,
    throughBalls: level,
    boxPresence: level,
    shootFromDistance: level,
  }),
  onLoss: z.enum(['counterPress', 'regroup']),
  onWin: z.enum(['counter', 'keep']),
  block: z.enum(['high', 'mid', 'low']),
  lineHeight: level,
  compactness: level,
  pressIntensity: level,
  pressTriggers: z.array(z.enum(PRESS_TRIGGERS)).max(PRESS_TRIGGERS.length),
  forceDirection: z.enum(['inside', 'outside']).nullable(),
  offsideTrap: z.boolean(),
  timeWasting: z.number().int().min(0).max(3),
  /** Players kept behind the ball while attacking (`02` §5.9). */
  restDefence: z.number().int().min(2).max(5),
});
export type TeamInstructions = z.infer<typeof TeamInstructionsSchema>;

/**
 * Individual instruction: a bias or an enabled/forbidden candidate of the role
 * (`02` §8.2). ponytail: open key list until MC-053 fixes it per role.
 */
export const InstructionSetSchema = z.record(
  z.string().min(1).max(32),
  z.union([level, z.boolean()]),
);

export const SET_PIECES = [
  'cornerRight',
  'cornerLeft',
  'freeKickWide',
  'freeKickDirect',
  'freeKickIndirect',
  'throwInLong',
  'penalty',
  'goalKick',
  'kickOff',
] as const;

export const TacticalPlanSchema = z.strictObject({
  shapes: z.strictObject({
    inPossession: ShapeSchema,
    outOfPossession: ShapeSchema,
    buildUp: ShapeSchema.optional(),
    lowBlock: ShapeSchema.optional(),
  }),
  team: TeamInstructionsSchema,
  roles: z.array(RoleSchema).length(11),
  individual: z.array(InstructionSetSchema).length(11),
  marking: z
    .array(
      z.strictObject({ slot, targetOpponentSlot: slot, mode: z.enum(['individual', 'press']) }),
    )
    .max(11),
  setPieces: z.partialRecord(z.enum(SET_PIECES), z.array(id).max(4)),
});
export type TacticalPlan = z.infer<typeof TacticalPlanSchema>;

// ── Match input ──────────────────────────────────────────────────────────────

/** The coach of the day (ADR-019): independent dimensions, 1..99. */
export const COACH_ATTRIBUTES = [
  'tacticalKnowledge',
  'gameReading',
  'planning',
  'teaching',
  'communication',
  'development',
  'manManagement',
  'matchManagement',
  'training',
  'flexibility',
] as const;
export const CoachSchema = z.strictObject(
  Object.fromEntries(COACH_ATTRIBUTES.map((a) => [a, rating])) as Record<
    (typeof COACH_ATTRIBUTES)[number],
    typeof rating
  >,
);
export type Coach = z.infer<typeof CoachSchema>;

export const TeamInputSchema = z
  .strictObject({
    /** Starting eleven first (index = slot), then the bench. */
    players: z.array(PlayerInputSchema).min(11).max(23),
    plan: TacticalPlanSchema,
    /** Rival coach behaviour (`02` §10); the same for every team, user or not. */
    coach: CoachSchema,
  })
  .refine((t) => new Set(t.players.map((p) => p.id)).size === t.players.length, {
    message: 'duplicate player id',
    path: ['players'],
  });
export type TeamInput = z.infer<typeof TeamInputSchema>;

export const ConditionsSchema = z.strictObject({
  /** 0 = neutral ground; 1 = full home crowd (`02` §11: never removes all of it). */
  crowd: unit,
  altitudeM: z.number().int().min(0).max(4500),
  pitch: z.enum(['good', 'average', 'poor']),
  weather: z.enum(['clear', 'rain', 'heat']),
  /** Referee strictness drawn from the pack. */
  refereeStrictness: unit,
});

export const RulesSchema = z.strictObject({
  substitutions: z.number().int().min(0).max(5),
  substitutionWindows: z.number().int().min(0).max(5),
  /** A tie after 90 minutes goes to extra time and/or penalties (ADR-016). */
  extraTime: z.boolean(),
  penalties: z.boolean(),
  /** Video referee: offside margin error is zero. */
  videoReferee: z.boolean(),
});

export const MatchInputSchema = z
  .strictObject({
    engineVersion: z.number().int().min(0),
    seed: z.number().int().min(0).max(0x7fffffff),
    teams: z.tuple([TeamInputSchema, TeamInputSchema]),
    conditions: ConditionsSchema,
    rules: RulesSchema,
  })
  .refine(
    (m) => {
      const ids = [...m.teams[0].players, ...m.teams[1].players].map((p) => p.id);
      return new Set(ids).size === ids.length;
    },
    { message: 'player in both teams', path: ['teams'] },
  );
export type MatchInput = z.infer<typeof MatchInputSchema>;

// ── Live commands (02-MATCH-ENGINE.md §9) ────────────────────────────────────

export const SHOUTS = ['intensity', 'focus', 'calm', 'press', 'directness', 'encourage'] as const;

export const CommandSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('team'), set: TeamInstructionsSchema.partial() }),
  z.strictObject({
    kind: z.literal('player'),
    slot,
    set: z.union([z.strictObject({ role: RoleSchema }), InstructionSetSchema]),
  }),
  z.strictObject({ kind: z.literal('mark'), slot, target: slot.nullable() }),
  z.strictObject({ kind: z.literal('swap'), a: slot, b: slot }),
  z.strictObject({ kind: z.literal('sub'), out: slot, inPlayerId: id }),
  z.strictObject({ kind: z.literal('shout'), shout: z.enum(SHOUTS) }),
]);
export type Command = z.infer<typeof CommandSchema>;

/** A command as stored: stamped by the server with the match clock, for one team. */
export const TimedCommandSchema = z.strictObject({
  atMs: z.number().int().min(0),
  team: z.union([z.literal(0), z.literal(1)]),
  command: CommandSchema,
});
export type TimedCommand = z.infer<typeof TimedCommandSchema>;

// ── Output (02-MATCH-ENGINE.md §11) ──────────────────────────────────────────

/** Text for the person, as a translation key plus parameters (ADR-017). */
export const MessageSchema = z.strictObject({
  key: z.string().regex(/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/),
  params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
});
export type Message = z.infer<typeof MessageSchema>;

/**
 * One frame at 4 Hz, flat integers in decimetres:
 * [tick, ballX, ballY, ballZ, p0x, p0y, …, p21x, p21y] — 48 values; players in
 * slot order, team 0 first. A sent-off or substituted-off slot repeats its last spot.
 */
export const FRAME_LENGTH = 4 + 44;
export const FrameSchema = z.array(z.number().int()).length(FRAME_LENGTH);
export type Frame = z.infer<typeof FrameSchema>;

export const EVENT_KINDS = [
  'pass',
  'reception',
  'interception',
  'tackle',
  'dribble',
  'foul',
  'card',
  'offside',
  'shot',
  'save',
  'goal',
  'corner',
  'throwIn',
  'goalKick',
  'freeKick',
  'penalty',
  'substitution',
  'injury',
  'command',
  'phaseChange',
  'taskAssigned',
  'periodStart',
  'periodEnd',
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const MatchEventSchema = z.strictObject({
  /** Sequential within the match; explanation evidence points here. */
  id: z.number().int().min(0),
  kind: z.enum(EVENT_KINDS),
  atMs: z.number().int().min(0),
  team: z.union([z.literal(0), z.literal(1)]).nullable(),
  playerId: id.nullable(),
  /** Second player: receiver, tackler, assister, player coming on… */
  otherId: id.nullable(),
  /** World-frame position in decimetres. */
  at: z.tuple([z.number().int(), z.number().int()]).nullable(),
  /** Kind-specific numbers: `xg`, `psxg`, `card` (1 yellow, 2 red), `outcome` codes… */
  data: z.record(z.string(), z.number()),
});
export type MatchEvent = z.infer<typeof MatchEventSchema>;

export const TeamStatsSchema = z.strictObject({
  goals: z.number().int().min(0),
  shots: z.number().int().min(0),
  shotsOnTarget: z.number().int().min(0),
  xg: z.number().min(0),
  /** Share of possession, 0..1. */
  possession: unit,
  passes: z.number().int().min(0),
  passesCompleted: z.number().int().min(0),
  fouls: z.number().int().min(0),
  yellowCards: z.number().int().min(0),
  redCards: z.number().int().min(0),
  corners: z.number().int().min(0),
  offsides: z.number().int().min(0),
});
export type TeamStats = z.infer<typeof TeamStatsSchema>;

export const PlayerStatsSchema = z.strictObject({
  playerId: id,
  minutes: z.number().int().min(0).max(130),
  /** Match rating, 0..10, one decimal. */
  rating: z.number().min(0).max(10),
  /** Remaining freshness at the end, 0..1. */
  stamina: unit,
  distanceM: z.number().int().min(0),
});

/** One factor of the match explanation, with its evidence (02 §11, MC-249). */
export const FactorSchema = z.strictObject({
  message: MessageSchema,
  evidence: z.strictObject({
    metric: z.string().min(1),
    value: z.number(),
    reference: z.number(),
    /** Match minutes the metric covers, [from, to). */
    window: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
    events: z.array(z.number().int().min(0)),
  }),
  /** Share of the xG difference this factor accounts for (creation) or of goals minus xG (conversion). */
  weight: z.number(),
  /** Decision that would affect this factor, if any (none for luck). */
  decision: z.string().nullable(),
});
export type Factor = z.infer<typeof FactorSchema>;

export const ExplanationSchema = z.strictObject({
  /** Goal difference split: xG difference (creation) and goals minus xG (conversion). */
  creation: z.number(),
  conversion: z.number(),
  factors: z.array(FactorSchema).max(12),
  /** Creation the factors do not account for; never spread over them. */
  unexplained: z.number(),
});
export type Explanation = z.infer<typeof ExplanationSchema>;

export const MatchResultSchema = z.strictObject({
  engineVersion: z.number().int().min(0),
  score: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
  /** Penalty shoot-out score when the rules ask for one. */
  shootout: z.tuple([z.number().int().min(0), z.number().int().min(0)]).nullable(),
  stats: z.tuple([TeamStatsSchema, TeamStatsSchema]),
  players: z.array(PlayerStatsSchema),
  events: z.array(MatchEventSchema),
  explanation: ExplanationSchema,
});
export type MatchResult = z.infer<typeof MatchResultSchema>;
