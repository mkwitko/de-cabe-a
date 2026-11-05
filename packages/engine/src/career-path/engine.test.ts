import { describe, expect, it } from 'vitest';
import { EngineRuleError } from '../contract';
import {
  careerPathV1,
  type CareerPathConfig,
  type CareerPathInput,
  type CareerPathState,
} from './engine';

const ANSWER = 'answer-player-id';
const club = (n: number) => ({
  clubId: `c${n}`,
  clubName: `Clube ${n}`,
  countryCode: 'BR',
  fromYear: 1990 + n,
  toYear: 1991 + n,
  isLoan: false,
});
const config = (clubs = 5, extraHints: CareerPathConfig['extraHints'] = {}): CareerPathConfig =>
  careerPathV1.validateConfig({
    engine: 'career-path',
    engineVersion: 1,
    answerPlayerId: ANSWER,
    maxAttempts: 6,
    trajectory: Array.from({ length: clubs }, (_, i) => club(i + 1)),
    extraHints,
    difficultyTier: 1,
  });

const wrong = (n: number): CareerPathInput => ({ kind: 'guess', playerId: `wrong-${n}` });
const right: CareerPathInput = { kind: 'guess', playerId: ANSWER };
const skip: CareerPathInput = { kind: 'skip' };

function play(cfg: CareerPathConfig, inputs: CareerPathInput[]) {
  let state = careerPathV1.createInitialState(cfg);
  const events = [];
  for (const input of inputs) {
    const out = careerPathV1.submit(state, input, cfg);
    state = out.state;
    events.push(out.event);
  }
  return { state, events };
}

describe('careerPathV1.validateConfig', () => {
  it('rejects a config without a trajectory or with another maxAttempts', () => {
    expect(() => careerPathV1.validateConfig({ ...config(), trajectory: [] })).toThrow();
    expect(() => careerPathV1.validateConfig({ ...config(), maxAttempts: 5 })).toThrow();
    expect(() => careerPathV1.validateConfig({ ...config(), engine: 'football-grid' })).toThrow();
  });
});

describe('careerPathV1 transitions (CAREER_PATH.md §1, §7)', () => {
  it('starts in progress with the first club revealed', () => {
    expect(careerPathV1.createInitialState(config())).toEqual({
      status: 'IN_PROGRESS',
      attempts: [],
      revealedClubs: 1,
      revealedExtraHints: 0,
    });
  });

  it.each([1, 2, 3, 4, 5, 6])('a correct guess on attempt %i wins with score (7 - n) * 10', (n) => {
    const inputs = [...Array.from({ length: n - 1 }, (_, i) => (i % 2 ? skip : wrong(i))), right];
    const { state, events } = play(config(), inputs);
    expect(state.status).toBe('WON');
    expect(state.attempts).toHaveLength(n);
    expect(events.at(-1)).toEqual({ type: 'correct' });
    expect(careerPathV1.score(state, config())).toBe((7 - n) * 10);
    expect(careerPathV1.isCompleted(state)).toBe(true);
  });

  it('a wrong guess or a skip reveals the next club', () => {
    const { state, events } = play(config(), [wrong(1), skip]);
    expect(events).toEqual([
      { type: 'wrong', revealed: 'club' },
      { type: 'wrong', revealed: 'club' },
    ]);
    expect(state.revealedClubs).toBe(3);
    expect(state.status).toBe('IN_PROGRESS');
  });

  it('records guesses and skips as attempts', () => {
    const { state } = play(config(), [wrong(1), skip]);
    expect(state.attempts).toEqual([
      { kind: 'guess', playerId: 'wrong-1', correct: false },
      { kind: 'skip' },
    ]);
  });

  it('the sixth failed attempt loses with score 0 and emits lost', () => {
    const { state, events } = play(config(8), [
      wrong(1),
      wrong(2),
      wrong(3),
      wrong(4),
      wrong(5),
      skip,
    ]);
    expect(state.status).toBe('LOST');
    expect(events.at(-1)).toEqual({ type: 'lost' });
    expect(careerPathV1.score(state, config(8))).toBe(0);
    expect(state.revealedClubs).toBe(6);
  });

  it('with 3 clubs, attempts 4-6 reveal position, then nationality, then nothing', () => {
    const cfg = config(3, { position: 'FW', nationalityCode: 'BR' });
    const { state, events } = play(cfg, [skip, skip, skip, skip, skip]);
    expect(events.map((e) => (e.type === 'wrong' ? e.revealed : e.type))).toEqual([
      'club',
      'club',
      'extraHint',
      'extraHint',
      'none',
    ]);
    expect(state.revealedClubs).toBe(3);
    expect(state.revealedExtraHints).toBe(2);
  });

  it('skips extra hints that the snapshot does not have', () => {
    const { events, state } = play(config(3, { nationalityCode: 'BR' }), [skip, skip, skip, skip]);
    expect(events.map((e) => (e.type === 'wrong' ? e.revealed : e.type))).toEqual([
      'club',
      'club',
      'extraHint',
      'none',
    ]);
    expect(careerPathV1.toPublicView(state, config(3, { nationalityCode: 'BR' }))).toMatchObject({
      extraHints: { nationalityCode: 'BR' },
    });
  });

  it('a repeated guess throws DUPLICATE_GUESS and consumes nothing', () => {
    const { state } = play(config(), [wrong(1)]);
    expect(() => careerPathV1.submit(state, wrong(1), config())).toThrow(
      expect.objectContaining({ code: 'DUPLICATE_GUESS' }),
    );
    expect(state.attempts).toHaveLength(1);
  });

  it('submitting after the end throws GAME_ALREADY_COMPLETED', () => {
    const { state } = play(config(), [right]);
    let err: unknown;
    try {
      careerPathV1.submit(state, skip, config());
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(EngineRuleError);
    expect(err).toMatchObject({ code: 'GAME_ALREADY_COMPLETED' });
  });

  it('never mutates the previous state', () => {
    const s0 = careerPathV1.createInitialState(config());
    const frozen = structuredClone(s0);
    careerPathV1.submit(s0, wrong(1), config());
    expect(s0).toEqual(frozen);
  });
});

describe('careerPathV1 views', () => {
  it('public view shows only the revealed clubs, without club ids', () => {
    const { state } = play(config(), [skip]);
    expect(careerPathV1.toPublicView(state, config())).toEqual({
      status: 'IN_PROGRESS',
      maxAttempts: 6,
      attemptsUsed: 1,
      revealed: [1, 2].map((n) => {
        const { clubId: _omit, ...rest } = club(n);
        return rest;
      }),
      extraHints: {},
      history: [{ kind: 'skip' }],
    });
  });

  it('reveal view has the answer and the whole trajectory', () => {
    const { state } = play(config(), [right]);
    expect(careerPathV1.toRevealView(state, config())).toEqual({
      answerPlayerId: ANSWER,
      trajectory: config().trajectory,
      extraHints: {},
    });
  });

  it('public view never contains the answer, in any reachable state', () => {
    const cfg = config(3, { position: 'MF', nationalityCode: 'AR' });
    const moves = [right, skip, wrong(0)];
    const leaks: string[] = [];
    const explore = (state: CareerPathState, depth: number, path: string) => {
      if (JSON.stringify(careerPathV1.toPublicView(state, cfg)).includes(ANSWER)) leaks.push(path);
      if (careerPathV1.isCompleted(state)) return;
      moves.forEach((m, i) => {
        const input = m.kind === 'guess' && m.playerId !== ANSWER ? wrong(depth) : m;
        explore(careerPathV1.submit(state, input, cfg).state, depth + 1, path + i);
      });
    };
    explore(careerPathV1.createInitialState(cfg), 0, '');
    expect(leaks).toEqual([]);
  });
});

describe('careerPathV1.buildShareText (CAREER_PATH.md §12)', () => {
  const meta = { label: 'Career Path #123', url: 'decabeca.app/c/123' };

  it('win in 3: one square per attempt, no spoilers', () => {
    const { state } = play(config(), [wrong(1), skip, right]);
    expect(careerPathV1.buildShareText(state, config(), meta)).toBe(
      'De Cabeça · Career Path #123 · 3/6\n⬛⬛🟩\ndecabeca.app/c/123',
    );
  });

  it('loss: X/6 and six black squares', () => {
    const { state } = play(config(), [skip, skip, skip, skip, skip, skip]);
    const text = careerPathV1.buildShareText(state, config(), meta);
    expect(text).toBe('De Cabeça · Career Path #123 · X/6\n⬛⬛⬛⬛⬛⬛\ndecabeca.app/c/123');
    expect(text).not.toContain('Clube');
  });
});
