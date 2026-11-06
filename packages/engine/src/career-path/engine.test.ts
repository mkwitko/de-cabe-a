import { describe, expect, it } from 'vitest';
import { EngineRuleError } from '../contract';
import {
  careerPath,
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
  appearances: 30 + n,
  goals: n,
  loanFromName: null,
});
const config = (clubs = 5, extraHints: CareerPathConfig['extraHints'] = {}): CareerPathConfig =>
  careerPath.validateConfig({
    engine: 'career-path',
    engineVersion: 2,
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
  let state = careerPath.createInitialState(cfg);
  const events = [];
  for (const input of inputs) {
    const out = careerPath.submit(state, input, cfg);
    state = out.state;
    events.push(out.event);
  }
  return { state, events };
}

describe('careerPath.validateConfig', () => {
  it('rejects a config without a trajectory or with another maxAttempts', () => {
    expect(() => careerPath.validateConfig({ ...config(), trajectory: [] })).toThrow();
    expect(() => careerPath.validateConfig({ ...config(), maxAttempts: 5 })).toThrow();
    expect(() => careerPath.validateConfig({ ...config(), engine: 'football-grid' })).toThrow();
  });
});

describe('careerPath transitions (CAREER_PATH.md §1, §7)', () => {
  it('starts in progress with the first club revealed', () => {
    expect(careerPath.createInitialState(config())).toEqual({
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
    expect(careerPath.score(state, config())).toBe((7 - n) * 10);
    expect(careerPath.isCompleted(state)).toBe(true);
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
    expect(careerPath.score(state, config(8))).toBe(0);
    expect(state.revealedClubs).toBe(6);
  });

  it('with 3 clubs, extra attempts reveal the nationality, then nothing (v2)', () => {
    const cfg = config(3, { position: 'FW', nationalityCode: 'BR' });
    const { state, events } = play(cfg, [skip, skip, skip, skip]);
    expect(events.map((e) => (e.type === 'wrong' ? e.revealed : e.type))).toEqual([
      'club',
      'club',
      'extraHint',
      'none',
    ]);
    expect(state.revealedClubs).toBe(3);
    expect(state.revealedExtraHints).toBe(1);
    expect(careerPath.toPublicView(state, cfg)).toMatchObject({
      position: 'FW',
      extraHints: { nationalityCode: 'BR' },
    });
  });

  it('shows the position from the first attempt (v2)', () => {
    const cfg = config(5, { position: 'MF', nationalityCode: 'AR' });
    expect(careerPath.toPublicView(careerPath.createInitialState(cfg), cfg)).toMatchObject({
      position: 'MF',
      extraHints: {},
    });
  });

  it('shows secondary positions from the start too, never as a hint (Kaká: MF, also FW)', () => {
    const cfg = config(5, { position: 'MF', secondaryPositions: ['FW'], nationalityCode: 'BR' });
    expect(careerPath.toPublicView(careerPath.createInitialState(cfg), cfg)).toMatchObject({
      position: 'MF',
      secondaryPositions: ['FW'],
      extraHints: {},
    });
    const old = config(5, { position: 'MF' });
    expect(careerPath.toPublicView(careerPath.createInitialState(old), old)).toMatchObject({
      secondaryPositions: [],
    });
  });

  it('skips the nationality hint when the snapshot does not have it', () => {
    const { events } = play(config(3, { position: 'FW' }), [skip, skip, skip]);
    expect(events.map((e) => (e.type === 'wrong' ? e.revealed : e.type))).toEqual([
      'club',
      'club',
      'none',
    ]);
  });

  it('a repeated guess throws DUPLICATE_GUESS and consumes nothing', () => {
    const { state } = play(config(), [wrong(1)]);
    expect(() => careerPath.submit(state, wrong(1), config())).toThrow(
      expect.objectContaining({ code: 'DUPLICATE_GUESS' }),
    );
    expect(state.attempts).toHaveLength(1);
  });

  it('submitting after the end throws GAME_ALREADY_COMPLETED', () => {
    const { state } = play(config(), [right]);
    let err: unknown;
    try {
      careerPath.submit(state, skip, config());
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(EngineRuleError);
    expect(err).toMatchObject({ code: 'GAME_ALREADY_COMPLETED' });
  });

  it('never mutates the previous state', () => {
    const s0 = careerPath.createInitialState(config());
    const frozen = structuredClone(s0);
    careerPath.submit(s0, wrong(1), config());
    expect(s0).toEqual(frozen);
  });
});

describe('careerPath views', () => {
  it('public view shows only the revealed clubs, without club ids', () => {
    const { state } = play(config(), [skip]);
    expect(careerPath.toPublicView(state, config())).toEqual({
      status: 'IN_PROGRESS',
      maxAttempts: 6,
      attemptsUsed: 1,
      position: null,
      secondaryPositions: [],
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
    expect(careerPath.toRevealView(state, config())).toEqual({
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
      if (JSON.stringify(careerPath.toPublicView(state, cfg)).includes(ANSWER)) leaks.push(path);
      if (careerPath.isCompleted(state)) return;
      moves.forEach((m, i) => {
        const input = m.kind === 'guess' && m.playerId !== ANSWER ? wrong(depth) : m;
        explore(careerPath.submit(state, input, cfg).state, depth + 1, path + i);
      });
    };
    explore(careerPath.createInitialState(cfg), 0, '');
    expect(leaks).toEqual([]);
  });
});

describe('careerPath.buildShareText (CAREER_PATH.md §12)', () => {
  const meta = { label: 'Career Path #123', url: 'decabeca.app/c/123' };

  it('win in 3: one square per attempt, no spoilers', () => {
    const { state } = play(config(), [wrong(1), skip, right]);
    expect(careerPath.buildShareText(state, config(), meta)).toBe(
      'De Cabeça · Career Path #123 · 3/6\n⬛⬛🟩\ndecabeca.app/c/123',
    );
  });

  it('loss: X/6 and six black squares', () => {
    const { state } = play(config(), [skip, skip, skip, skip, skip, skip]);
    const text = careerPath.buildShareText(state, config(), meta);
    expect(text).toBe('De Cabeça · Career Path #123 · X/6\n⬛⬛⬛⬛⬛⬛\ndecabeca.app/c/123');
    expect(text).not.toContain('Clube');
  });
});
