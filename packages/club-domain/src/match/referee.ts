/**
 * Referees (mapa de conhecimento §2.12, entrega 9): who whistles each match and how strict he is.
 * The game's referees are fictional, as its agents are (ADR-022); their spread is the real one.
 *
 * - Série A 2025: over five cards a match on average, the strictest referee near 7.3 and the most
 *   lenient near 4.0 (Itatiaia, Correio Braziliense: per-referee averages), and a record 83
 *   sendings-off in 27 rounds, about 0.31 a match (ge, via 90min).
 * - A referee's strictness, 0..100, sets his cards: 4.0 a match at 0, 7.3 at 100; the pool leans
 *   lenient so the league averages about 5.2. Sendings-off follow at 0.31 a match on average.
 *
 * Pure functions of the season's seed and the match id, so the season and the save agree.
 * Every number is a PARÂMETRO.
 */
import { fork, pick, rngFrom } from '@decabeca/match-engine';
import { seedOf, type SeasonState } from '../competition/season';
import { FIRST_NAMES, LAST_NAMES } from '../generate/names';

export interface Referee {
  id: string;
  name: string;
  /** 0 (lets the game run) .. 100 (books everything). */
  strictness: number;
}

/** Referees on the national panel. */
const PANEL = 40;
/** Cards a match at strictness 0 and 100, in tenths. */
const CARDS_LOW = 40;
const CARDS_HIGH = 73;
/** Sendings-off a match for a referee of the pool's average strictness, in hundredths. */
const REDS = 31;

const panels = new Map<number, Referee[]>();

/** The national panel of a season (its seed). */
export function panelOf(seed: number): Referee[] {
  const known = panels.get(seed);
  if (known) return known;
  const root = fork(rngFrom(seed), 'referees');
  const out: Referee[] = [];
  for (let k = 0; k < PANEL; k++) {
    const r = fork(root, `ref:${k}`);
    const name = `${FIRST_NAMES[pick(r, FIRST_NAMES.length)]} ${LAST_NAMES[pick(r, LAST_NAMES.length)]}`;
    // The lower of two draws: most referees sit on the lenient side, a few are very strict.
    const strictness = Math.min(pick(r, 101), pick(r, 101));
    out.push({ id: `ref-${k}`, name, strictness });
  }
  panels.set(seed, out);
  return out;
}

/** The referee of match `id`. */
export function refereeOf(s: SeasonState, id: string): Referee {
  const panel = panelOf(s.seed);
  return panel[seedOf(s.seed, `referee:${id}`) % panel.length]!;
}

/** Cards a match this referee shows on average, both sides together. */
export const cardsOf = (ref: Referee): number =>
  (CARDS_LOW + ((CARDS_HIGH - CARDS_LOW) * ref.strictness) / 100) / 10;

/** Sendings-off a match: 0.21 at the most lenient, 0.52 at the strictest, 0.31 for the pool. */
export const redsOf = (ref: Referee): number => (REDS * (67 + ref.strictness)) / 100 / 100;

/**
 * Cards in a derby, per cent of an ordinary match: the big Brazilian derbies since 2016 ran 6.4
 * to 7.8 cards a match (Bolavip via Super Rádio Tupi: Atlético-MG x Cruzeiro 7.8, Fla-Flu 6.9,
 * Gre-Nal 6.8, Fluminense x Vasco 6.4) against about five in the league. PARÂMETRO.
 */
export const DERBY_CARDS = 130;

/** What `quickResult` reads of the referee of match `id`; more of everything in a derby. */
export function whistleOf(
  s: SeasonState,
  id: string,
  derby = false,
): { cards: number; reds: number } {
  const ref = refereeOf(s, id);
  const k = derby ? DERBY_CARDS / 100 : 1;
  return { cards: cardsOf(ref) * k, reds: redsOf(ref) * k };
}
