/**
 * Craque Misterioso (ADR-011): guess a hidden player; every guess is compared with them
 * (nationality, position, birth year, clubs and countries in common). MAX_GUESSES tries.
 * The API loads the guessed player's facts from the base and puts them in the input: the
 * client only sends a player id.
 */
import { z } from 'zod';
import { EngineRuleError, type GameEngine } from '../contract';

export const MAX_GUESSES = 8;

export const PlayerFacts = z.object({
  playerId: z.string(),
  name: z.string(),
  nationalityCode: z.string(),
  positionGroup: z.enum(['GK', 'DF', 'MF', 'FW']).nullable(),
  birthYear: z.number().int().nullable(),
  clubs: z.array(z.object({ id: z.string(), name: z.string(), countryCode: z.string() })),
});
export type PlayerFacts = z.infer<typeof PlayerFacts>;

export const MysteryConfig = z.object({
  engine: z.literal('mystery-player'),
  engineVersion: z.literal(1),
  answer: PlayerFacts,
  difficultyTier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
export type MysteryConfig = z.infer<typeof MysteryConfig>;

export const MysteryInput = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('guess'), playerId: z.string().min(1), facts: PlayerFacts }),
  z.object({ kind: z.literal('give_up') }),
]);
export type MysteryInput = z.infer<typeof MysteryInput>;

export interface Feedback {
  nationality: boolean;
  position: boolean;
  /** Guess born before ('older'), after ('younger') or the same year as the hidden player. */
  birthYear: 'older' | 'younger' | 'same' | 'unknown';
  birthYearClose: boolean;
  sharedClubs: string[];
  sharedCountries: string[];
}
export interface MysteryState {
  status: 'IN_PROGRESS' | 'WON' | 'LOST';
  /** The guessed player's own nationality, position and birth year are shown next to the feedback. */
  guesses: {
    playerId: string;
    name: string;
    nationalityCode: string;
    positionGroup: PlayerFacts['positionGroup'];
    birthYear: number | null;
    feedback: Feedback;
  }[];
}
export type MysteryEvent =
  { type: 'won' } | { type: 'wrong'; guessesLeft: number } | { type: 'lost' };

export function compare(g: PlayerFacts, a: PlayerFacts): Feedback {
  const d = g.birthYear !== null && a.birthYear !== null ? g.birthYear - a.birthYear : null;
  const answerClubs = new Set(a.clubs.map((c) => c.id));
  const answerCountries = new Set(a.clubs.map((c) => c.countryCode));
  return {
    nationality: g.nationalityCode === a.nationalityCode,
    position: g.positionGroup !== null && g.positionGroup === a.positionGroup,
    birthYear: d === null ? 'unknown' : d < 0 ? 'older' : d > 0 ? 'younger' : 'same',
    birthYearClose: d !== null && d !== 0 && Math.abs(d) <= 2,
    sharedClubs: [...new Set(g.clubs.filter((c) => answerClubs.has(c.id)).map((c) => c.name))],
    sharedCountries: [...new Set(g.clubs.map((c) => c.countryCode))].filter((c) =>
      answerCountries.has(c),
    ),
  };
}

export const mysteryPlayer: GameEngine<MysteryConfig, MysteryState, MysteryInput, MysteryEvent> = {
  id: 'mystery-player',
  version: 1,

  validateConfig: (config) => MysteryConfig.parse(config),
  parseInput: (input) => MysteryInput.parse(input),
  createInitialState: () => ({ status: 'IN_PROGRESS', guesses: [] }),

  submit(state, input, config) {
    if (state.status !== 'IN_PROGRESS') throw new EngineRuleError('GAME_ALREADY_COMPLETED');
    if (input.kind === 'give_up')
      return { state: { ...state, status: 'LOST' }, event: { type: 'lost' } };
    if (state.guesses.some((g) => g.playerId === input.playerId))
      throw new EngineRuleError('DUPLICATE_GUESS');
    const f = input.facts;
    const guesses = [
      ...state.guesses,
      {
        playerId: input.playerId,
        name: f.name,
        nationalityCode: f.nationalityCode,
        positionGroup: f.positionGroup,
        birthYear: f.birthYear,
        feedback: compare(f, config.answer),
      },
    ];
    if (input.playerId === config.answer.playerId)
      return { state: { status: 'WON', guesses }, event: { type: 'won' } };
    const left = MAX_GUESSES - guesses.length;
    return left > 0
      ? { state: { status: 'IN_PROGRESS', guesses }, event: { type: 'wrong', guessesLeft: left } }
      : { state: { status: 'LOST', guesses }, event: { type: 'lost' } };
  },

  isCompleted: (state) => state.status !== 'IN_PROGRESS',
  /** MAX_GUESSES + 1 - guesses used when won (8 for a first-guess win), 0 when lost. */
  score: (state) => (state.status === 'WON' ? MAX_GUESSES + 1 - state.guesses.length : 0),

  toPublicView: (state) => ({
    status: state.status,
    guessesLeft: MAX_GUESSES - state.guesses.length,
    guesses: state.guesses,
  }),

  toRevealView: (_state, config) => ({ answer: config.answer }),

  buildShareText(state, _config, meta) {
    const row = (f: Feedback) =>
      [f.nationality, f.position, f.birthYear === 'same', f.sharedClubs.length > 0]
        .map((ok) => (ok ? '🟩' : '⬛'))
        .join('');
    const result =
      state.status === 'WON' ? `${state.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
    return `De Cabeça · ${meta.label} · ${result}\n${state.guesses.map((g) => row(g.feedback)).join('\n')}\n${meta.url}`;
  },
};
