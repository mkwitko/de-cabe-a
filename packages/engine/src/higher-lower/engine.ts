/**
 * Mais ou Menos (ADR-011): each level has 5 rounds; a round shows two real spells ("Kaká no
 * Milan" vs "Adriano na Inter") and asks who had more league goals (or games). Pick a side.
 */
import { z } from 'zod';
import { EngineRuleError, type GameEngine } from '../contract';

const Side = z.object({
  playerId: z.string(),
  playerName: z.string(),
  clubName: z.string(),
  value: z.number().int().nonnegative(),
});
const Round = z
  .object({ metric: z.enum(['goals', 'games']), a: Side, b: Side })
  .refine((r) => r.a.value !== r.b.value, { message: 'a round needs a winner' });

export const HigherLowerConfig = z.object({
  engine: z.literal('higher-lower'),
  engineVersion: z.literal(1),
  rounds: z.array(Round).length(5),
  difficultyTier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
export type HigherLowerConfig = z.infer<typeof HigherLowerConfig>;

export const HigherLowerInput = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('choose'), side: z.enum(['a', 'b']) }),
  /** Ends the level; sent when the clock runs out (ADR-009). */
  z.object({ kind: z.literal('give_up') }),
]);
export type HigherLowerInput = z.infer<typeof HigherLowerInput>;

export interface HigherLowerState {
  status: 'IN_PROGRESS' | 'COMPLETED';
  choices: ('a' | 'b')[];
}

export type HigherLowerEvent =
  { type: 'correct' | 'wrong'; round: number; values: [number, number] } | { type: 'ended' };

const winner = (r: HigherLowerConfig['rounds'][number]) => (r.a.value > r.b.value ? 'a' : 'b');
const right = (s: HigherLowerState, c: HigherLowerConfig) =>
  s.choices.filter((x, i) => x === winner(c.rounds[i]!)).length;
const hide = ({ value: _v, ...side }: z.infer<typeof Side>) => side;

export const higherLower: GameEngine<
  HigherLowerConfig,
  HigherLowerState,
  HigherLowerInput,
  HigherLowerEvent
> = {
  id: 'higher-lower',
  version: 1,

  validateConfig: (config) => HigherLowerConfig.parse(config),
  parseInput: (input) => HigherLowerInput.parse(input),
  createInitialState: () => ({ status: 'IN_PROGRESS', choices: [] }),

  submit(state, input, config) {
    if (state.status !== 'IN_PROGRESS') throw new EngineRuleError('GAME_ALREADY_COMPLETED');
    if (input.kind === 'give_up')
      return { state: { ...state, status: 'COMPLETED' }, event: { type: 'ended' } };
    const i = state.choices.length;
    const r = config.rounds[i]!;
    const choices = [...state.choices, input.side];
    return {
      state: {
        status: choices.length === config.rounds.length ? 'COMPLETED' : 'IN_PROGRESS',
        choices,
      },
      event: {
        type: input.side === winner(r) ? 'correct' : 'wrong',
        round: i,
        values: [r.a.value, r.b.value],
      },
    };
  },

  isCompleted: (state) => state.status !== 'IN_PROGRESS',
  /** Right choices, 0–5. */
  score: (state, config) => right(state, config),

  toPublicView(state, config) {
    const current = state.status === 'IN_PROGRESS' ? config.rounds[state.choices.length] : null;
    return {
      status: state.status,
      round: state.choices.length,
      totalRounds: config.rounds.length,
      rounds: state.choices.map((choice, i) => {
        const r = config.rounds[i]!;
        return { metric: r.metric, a: r.a, b: r.b, choice, correct: choice === winner(r) };
      }),
      current: current && { metric: current.metric, a: hide(current.a), b: hide(current.b) },
    };
  },

  toRevealView: (_state, config) => ({ rounds: config.rounds }),

  buildShareText(state, config, meta) {
    const marks = config.rounds
      .map((r, i) => (state.choices[i] === winner(r) ? '✅' : '❌'))
      .join('');
    return `De Cabeça · ${meta.label} · ${right(state, config)}/${config.rounds.length}\n${marks}\n${meta.url}`;
  },
};
