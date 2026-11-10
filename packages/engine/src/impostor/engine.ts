/**
 * Impostor (ADR-011): each level has 5 rounds; a round shows a club and 4 players, 3 of whom
 * played for it. Find the one who never did. One pick per round.
 */
import { z } from 'zod';
import { EngineRuleError, type GameEngine } from '../contract';

const Round = z.object({
  clubId: z.string(),
  clubName: z.string(),
  clubCountryCode: z.string().length(2),
  /** Shuffled when the level was built; the impostor is one of them. */
  players: z.array(z.object({ id: z.string(), name: z.string() })).length(4),
  impostorId: z.string(),
});

export const ImpostorConfig = z
  .object({
    engine: z.literal('impostor'),
    engineVersion: z.literal(1),
    rounds: z.array(Round).length(5),
    difficultyTier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  })
  .refine((c) => c.rounds.every((r) => r.players.some((p) => p.id === r.impostorId)), {
    message: 'the impostor must be one of the round players',
  });
export type ImpostorConfig = z.infer<typeof ImpostorConfig>;

export const ImpostorInput = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('pick'), playerId: z.string().min(1) }),
  /** Ends the level; sent when the clock runs out (ADR-009). */
  z.object({ kind: z.literal('give_up') }),
]);
export type ImpostorInput = z.infer<typeof ImpostorInput>;

export interface ImpostorState {
  status: 'IN_PROGRESS' | 'COMPLETED';
  /** Player picked in each round played so far. */
  picks: string[];
}

export type ImpostorEvent =
  { type: 'correct' | 'wrong'; round: number; impostorId: string } | { type: 'ended' };

const right = (s: ImpostorState, c: ImpostorConfig) =>
  s.picks.filter((p, i) => p === c.rounds[i]!.impostorId).length;

export const impostor: GameEngine<ImpostorConfig, ImpostorState, ImpostorInput, ImpostorEvent> = {
  id: 'impostor',
  version: 1,

  validateConfig: (config) => ImpostorConfig.parse(config),
  parseInput: (input) => ImpostorInput.parse(input),
  createInitialState: () => ({ status: 'IN_PROGRESS', picks: [] }),

  submit(state, input, config) {
    if (state.status !== 'IN_PROGRESS') throw new EngineRuleError('GAME_ALREADY_COMPLETED');
    if (input.kind === 'give_up')
      return { state: { ...state, status: 'COMPLETED' }, event: { type: 'ended' } };
    const i = state.picks.length;
    const r = config.rounds[i]!;
    if (!r.players.some((p) => p.id === input.playerId))
      throw new EngineRuleError('PLAYER_NOT_IN_ROUND');
    const picks = [...state.picks, input.playerId];
    return {
      state: { status: picks.length === config.rounds.length ? 'COMPLETED' : 'IN_PROGRESS', picks },
      event: {
        type: input.playerId === r.impostorId ? 'correct' : 'wrong',
        round: i,
        impostorId: r.impostorId,
      },
    };
  },

  isCompleted: (state) => state.status !== 'IN_PROGRESS',
  /** Right picks, 0–5. */
  score: (state, config) => right(state, config),

  toPublicView(state, config) {
    const current = state.status === 'IN_PROGRESS' ? config.rounds[state.picks.length] : null;
    return {
      status: state.status,
      round: state.picks.length,
      totalRounds: config.rounds.length,
      rounds: state.picks.map((picked, i) => {
        const r = config.rounds[i]!;
        return {
          clubName: r.clubName,
          clubCountryCode: r.clubCountryCode,
          players: r.players,
          picked,
          impostorId: r.impostorId,
          correct: picked === r.impostorId,
        };
      }),
      current: current && {
        clubName: current.clubName,
        clubCountryCode: current.clubCountryCode,
        players: current.players,
      },
    };
  },

  toRevealView: (_state, config) => ({
    rounds: config.rounds.map((r) => ({
      clubName: r.clubName,
      players: r.players,
      impostorId: r.impostorId,
    })),
  }),

  buildShareText(state, config, meta) {
    const marks = config.rounds
      .map((r, i) => (state.picks[i] === r.impostorId ? '✅' : '❌'))
      .join('');
    return `De Cabeça F.C. · ${meta.label} · ${right(state, config)}/${config.rounds.length}\n${marks}\n${meta.url}`;
  },
};
