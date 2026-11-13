/**
 * Injuries in a match (02 §6.5; MC-041). FACT (03 §6, research 02): 20.5 match
 * injuries per 1,000 h in the Série A, 27.5 in Europe. About a quarter come
 * from contact; the rest are non-contact and grow with fatigue.
 * PARAMETERS: the split, the fatigue and proneness multipliers.
 */
export const NON_CONTACT_PER_HOUR = 0.017;
export const CONTACT_PER_FOUL = 0.012;

interface Exposed {
  stamina: number;
  input: { hidden: { injuryProneness: number } };
}

/** Chance of a non-contact injury over `seconds` of match clock. */
export function injuryRisk(p: Exposed, seconds: number): number {
  const tired = p.stamina < 0.3 ? 2 : 1;
  const prone = 0.6 + 0.04 * p.input.hidden.injuryProneness;
  return (NON_CONTACT_PER_HOUR * tired * prone * seconds) / 3600;
}
