/**
 * The other clubs' youth teams. A boy of another club's academy is in the world under the club
 * id `base:<club>`: out of its squad (no lineup, no strength, no wage bill read by club), yet
 * there to be scouted, searched and bought. He joins the club's first team at nineteen, or when
 * someone comes in for him.
 */
export const ACADEMY = 'base:';

/** Whether the club id is an academy's: `base:<club>`. */
export const isBase = (clubId: string | null | undefined): clubId is string =>
  !!clubId && clubId.startsWith(ACADEMY);

/** The club a player answers to: his own, or the one whose academy holds him. */
export const homeOf = (clubId: string | null): string | null =>
  isBase(clubId) ? clubId.slice(ACADEMY.length) : clubId;
