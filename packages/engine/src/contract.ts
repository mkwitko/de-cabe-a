/** Engine contract (GAME_ENGINE_CONTRACT.md §2). Pure: no I/O, clock or randomness. */

export type GameStatus = 'IN_PROGRESS' | 'WON' | 'LOST' | 'COMPLETED';

export interface SubmitOutcome<TState, TEvent> {
  state: TState;
  event: TEvent;
}

export interface GameEngine<TConfig, TState, TInput, TEvent> {
  readonly id: string;
  readonly version: number;
  /** Parses a challenge snapshot; throws ZodError when invalid. */
  validateConfig(config: unknown): TConfig;
  /** Parses a player action; throws ZodError when invalid. */
  parseInput(input: unknown): TInput;
  createInitialState(config: TConfig): TState;
  /** Returns a new state; never mutates the given one. Throws EngineRuleError on rule violations. */
  submit(state: TState, input: TInput, config: TConfig): SubmitOutcome<TState, TEvent>;
  isCompleted(state: TState): boolean;
  score(state: TState, config: TConfig): number;
  /** Safe for the client during play: never includes the answer or answer pools. */
  toPublicView(state: TState, config: TConfig): unknown;
  /** Full view after the game ends: answer, trajectory, examples. */
  toRevealView(state: TState, config: TConfig): unknown;
  buildShareText(state: TState, config: TConfig, meta: { label: string; url: string }): string;
}

export type EngineRuleCode =
  | 'GAME_ALREADY_COMPLETED'
  | 'DUPLICATE_GUESS'
  | 'CELL_ALREADY_FILLED'
  | 'PLAYER_ALREADY_USED'
  | 'HINT_ALREADY_USED'
  | 'NO_HINTS_LEFT';

/** A rule violation; the API maps it to 409 with the same code. */
export class EngineRuleError extends Error {
  constructor(readonly code: EngineRuleCode) {
    super(code);
    this.name = 'EngineRuleError';
  }
}
