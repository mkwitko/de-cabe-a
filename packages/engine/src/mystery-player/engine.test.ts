import { describe, expect, it } from 'vitest';
import { EngineRuleError } from '../contract';
import { starsFor } from '../stars';
import { MAX_GUESSES, mysteryPlayer, type MysteryConfig, type PlayerFacts } from './engine';

const facts = (id: string, o: Partial<PlayerFacts> = {}): PlayerFacts => ({
  playerId: id,
  name: `Jogador ${id}`,
  nationalityCode: 'BR',
  positionGroup: 'MF',
  birthYear: 1982,
  clubs: [
    { id: 'spfc', name: 'São Paulo', countryCode: 'BR' },
    { id: 'milan', name: 'Milan', countryCode: 'IT' },
  ],
  ...o,
});
const cfg: MysteryConfig = {
  engine: 'mystery-player',
  engineVersion: 1,
  answer: facts('kaka', { name: 'Kaká' }),
  difficultyTier: 1,
};
const guess = (f: PlayerFacts) => ({ kind: 'guess' as const, playerId: f.playerId, facts: f });

describe('mystery-player engine', () => {
  it('compares each guess with the hidden player', () => {
    const s = mysteryPlayer.createInitialState(cfg);
    const out = mysteryPlayer.submit(
      s,
      guess(
        facts('x', {
          nationalityCode: 'AR',
          positionGroup: 'MF',
          birthYear: 1978,
          clubs: [
            { id: 'milan', name: 'Milan', countryCode: 'IT' },
            { id: 'boca', name: 'Boca Juniors', countryCode: 'AR' },
          ],
        }),
      ),
      cfg,
    );
    expect(out.event).toMatchObject({ type: 'wrong', guessesLeft: MAX_GUESSES - 1 });
    expect(out.state.guesses[0]!.feedback).toEqual({
      nationality: false,
      position: true,
      birthYear: 'older', // the hidden player was born later: guess is older
      birthYearClose: false,
      sharedClubs: ['Milan'],
      sharedCountries: ['IT'],
    });
  });

  it('a right guess wins; score rewards fewer guesses; repeats rejected', () => {
    let s = mysteryPlayer.createInitialState(cfg);
    s = mysteryPlayer.submit(s, guess(facts('x', { birthYear: 1981 })), cfg).state;
    expect(s.guesses[0]!.feedback.birthYearClose).toBe(true);
    expect(() => mysteryPlayer.submit(s, guess(facts('x')), cfg)).toThrow(EngineRuleError);
    const won = mysteryPlayer.submit(s, guess(cfg.answer), cfg);
    expect(won.event.type).toBe('won');
    expect(won.state.status).toBe('WON');
    expect(mysteryPlayer.score(won.state, cfg)).toBe(MAX_GUESSES - 1);
    expect(starsFor('mystery-player', MAX_GUESSES - 1)).toBe(3);
  });

  it(`loses after ${MAX_GUESSES} wrong guesses; the view hides the answer until the end`, () => {
    let s = mysteryPlayer.createInitialState(cfg);
    for (let i = 0; i < MAX_GUESSES; i++)
      s = mysteryPlayer.submit(s, guess(facts(`x${i}`)), cfg).state;
    expect(s.status).toBe('LOST');
    expect(mysteryPlayer.score(s, cfg)).toBe(0);
    expect(
      JSON.stringify(mysteryPlayer.toPublicView(mysteryPlayer.createInitialState(cfg), cfg)),
    ).not.toContain('kaka');
    expect(mysteryPlayer.toRevealView(s, cfg)).toMatchObject({ answer: { name: 'Kaká' } });
  });

  it('stars: 3 for 1–3 guesses, 2 for 4–5, 1 for 6–8, 0 when lost', () => {
    expect([8, 6, 5, 4, 3, 1, 0].map((n) => starsFor('mystery-player', n))).toEqual([
      3, 3, 2, 2, 1, 1, 0,
    ]);
  });
});
