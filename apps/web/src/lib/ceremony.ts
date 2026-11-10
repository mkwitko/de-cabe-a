/** The ceremony is for the moment a level ends, not for revisiting a finished one. */
export function recentCompletion(completedAt: string | null, now = Date.now()): boolean {
  if (!completedAt) return false;
  const age = now - Date.parse(completedAt);
  return age >= -5000 && age <= 120_000;
}
