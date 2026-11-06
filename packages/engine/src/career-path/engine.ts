import { z } from 'zod';
import { EngineRuleError, type GameEngine } from '../contract';

const PositionGroup = z.enum(['GK', 'DF', 'MF', 'FW']);

/**
 * Challenge snapshot for career-path@2 (GAME_ENGINE_CONTRACT.md §3, ADR-007): clubs carry games,
 * goals and the lending club; the position is shown from the start, nationality is the extra hint.
 */
export const CareerPathConfig = z.object({
  engine: z.literal('career-path'),
  engineVersion: z.literal(2),
  answerPlayerId: z.string().min(1),
  maxAttempts: z.literal(6),
  trajectory: z
    .array(
      z.object({
        clubId: z.string().min(1),
        clubName: z.string().min(1),
        countryCode: z.string().length(2),
        fromYear: z.number().int().nullable(),
        toYear: z.number().int().nullable(),
        isLoan: z.boolean(),
        appearances: z.number().int().nullable(),
        goals: z.number().int().nullable(),
        loanFromName: z.string().nullable(),
      }),
    )
    .min(1),
  extraHints: z.object({
    position: PositionGroup.optional(),
    /** Other positions the player is known for (Kaká: MF, also FW); shown with the main one. */
    secondaryPositions: z.array(PositionGroup).optional(),
    nationalityCode: z.string().length(2).optional(),
  }),
  difficultyTier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
export type CareerPathConfig = z.infer<typeof CareerPathConfig>;

export const CareerPathInput = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('guess'), playerId: z.string().min(1) }),
  z.object({ kind: z.literal('skip') }),
  /** Ends the game as lost; sent when the clock runs out (ADR-009). */
  z.object({ kind: z.literal('give_up') }),
]);
export type CareerPathInput = z.infer<typeof CareerPathInput>;

export interface CareerPathState {
  status: 'IN_PROGRESS' | 'WON' | 'LOST';
  attempts: Array<{ kind: 'guess'; playerId: string; correct: boolean } | { kind: 'skip' }>;
  /** 1..trajectory.length */
  revealedClubs: number;
  /** 0..1: the nationality hint, after every club is revealed (when present in the snapshot) */
  revealedExtraHints: number;
}

export type CareerPathEvent =
  | { type: 'correct' }
  | { type: 'wrong'; revealed: 'club' | 'extraHint' | 'none' }
  | { type: 'lost' };

/** Extra hints revealed after the clubs (v2: only nationality; position is shown from the start). */
const hintKeys = (c: CareerPathConfig) =>
  (['nationalityCode'] as const).filter((k) => c.extraHints[k] !== undefined);

export const careerPath: GameEngine<
  CareerPathConfig,
  CareerPathState,
  CareerPathInput,
  CareerPathEvent
> = {
  id: 'career-path',
  version: 2,

  validateConfig: (config) => CareerPathConfig.parse(config),
  parseInput: (input) => CareerPathInput.parse(input),

  createInitialState: () => ({
    status: 'IN_PROGRESS',
    attempts: [],
    revealedClubs: 1,
    revealedExtraHints: 0,
  }),

  submit(state, input, config) {
    if (state.status !== 'IN_PROGRESS') throw new EngineRuleError('GAME_ALREADY_COMPLETED');
    if (
      input.kind === 'guess' &&
      state.attempts.some((a) => a.kind === 'guess' && a.playerId === input.playerId)
    )
      throw new EngineRuleError('DUPLICATE_GUESS');
    if (input.kind === 'give_up')
      return { state: { ...state, status: 'LOST' }, event: { type: 'lost' } };

    const correct = input.kind === 'guess' && input.playerId === config.answerPlayerId;
    const attempts = [
      ...state.attempts,
      input.kind === 'guess'
        ? { kind: 'guess' as const, playerId: input.playerId, correct }
        : input,
    ];
    if (correct)
      return { state: { ...state, attempts, status: 'WON' }, event: { type: 'correct' } };
    if (attempts.length >= config.maxAttempts)
      return { state: { ...state, attempts, status: 'LOST' }, event: { type: 'lost' } };

    if (state.revealedClubs < config.trajectory.length)
      return {
        state: { ...state, attempts, revealedClubs: state.revealedClubs + 1 },
        event: { type: 'wrong', revealed: 'club' },
      };
    if (state.revealedExtraHints < hintKeys(config).length)
      return {
        state: { ...state, attempts, revealedExtraHints: state.revealedExtraHints + 1 },
        event: { type: 'wrong', revealed: 'extraHint' },
      };
    return { state: { ...state, attempts }, event: { type: 'wrong', revealed: 'none' } };
  },

  isCompleted: (state) => state.status !== 'IN_PROGRESS',

  score: (state) => (state.status === 'WON' ? (7 - state.attempts.length) * 10 : 0),

  toPublicView(state, config) {
    const keys = hintKeys(config).slice(0, state.revealedExtraHints);
    return {
      status: state.status,
      maxAttempts: config.maxAttempts,
      attemptsUsed: state.attempts.length,
      position: config.extraHints.position ?? null,
      secondaryPositions: config.extraHints.secondaryPositions ?? [],
      revealed: config.trajectory
        .slice(0, state.revealedClubs)
        .map(({ clubId: _clubId, ...entry }) => entry),
      extraHints: Object.fromEntries(keys.map((k) => [k, config.extraHints[k]])),
      // A correct guess only exists in a finished game, where the answer is revealed anyway;
      // during play every guess in the history is wrong.
      history: state.attempts.map((a) =>
        a.kind === 'guess' && a.correct ? { kind: 'correct' } : a,
      ),
    };
  },

  toRevealView: (_state, config) => ({
    answerPlayerId: config.answerPlayerId,
    trajectory: config.trajectory,
    extraHints: config.extraHints,
  }),

  buildShareText(state, config, meta) {
    const won = state.status === 'WON';
    const squares = won
      ? state.attempts.map((a) => (a.kind === 'guess' && a.correct ? '🟩' : '⬛')).join('')
      : '⬛'.repeat(config.maxAttempts);
    const result = won
      ? `${state.attempts.length}/${config.maxAttempts}`
      : `X/${config.maxAttempts}`;
    return `De Cabeça · ${meta.label} · ${result}\n${squares}\n${meta.url}`;
  },
};
