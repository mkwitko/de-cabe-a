/**
 * Probe for scripts/determinism.mjs (ADR-020): whole matches of the engine and one season of the
 * big fictional pack, hashed bit by bit, so Node and every browser can be compared.
 */
// A dev probe, not shipped code: it reads the engine's fixture helper, which the root does not export.
// eslint-disable-next-line no-restricted-imports
import { matchInput } from '../../../packages/match-engine/src/match/fixture';
import { advanceMatch } from '@decabeca/match-engine';
import { benchSeason, toJson } from '../../../packages/club-domain/src/bench/world';
import { generateDevPack } from '../../../packages/club-domain/src/generate/pack';
import { startSeason } from '../../../packages/club-domain/src/competition/season';

const fnv = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16);
};

export function probe(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const seed of [1, 2, 3, 4, 5]) {
    const c = advanceMatch(matchInput(seed), [], 0, 40_000);
    out[`match${seed}`] =
      `${fnv(JSON.stringify(c.frames))}.${fnv(JSON.stringify(c.events))}.${c.score.join('-')}`;
  }
  const pack = generateDevPack();
  benchSeason(() => 0, pack);
  out.season = fnv(toJson(startSeason(pack, { seed: 7 })));
  return out;
}
(globalThis as { probe?: typeof probe }).probe = probe;
