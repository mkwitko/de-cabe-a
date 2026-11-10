/** Tilt, shrink and fade of a carousel card by its distance (in cards) from the stage centre. */
export function cardTransform(distance: number): {
  rotateY: number;
  scale: number;
  opacity: number;
} {
  const d = Math.max(-1, Math.min(1, distance));
  return { rotateY: -d * 12, scale: 1 - 0.1 * Math.abs(d), opacity: 1 - 0.25 * Math.abs(d) };
}
