/** First end-of-level ceremony per mode per day plays in full; the rest are short. */
const key = (mode: string, today: string) => `dc_ceremony_${today}_${mode}`;

export function ceremonyLength(mode: string, today: string): 'full' | 'short' {
  try {
    return localStorage.getItem(key(mode, today)) ? 'short' : 'full';
  } catch {
    return 'full';
  }
}

export function markCeremony(mode: string, today: string): void {
  try {
    localStorage.setItem(key(mode, today), '1');
  } catch {
    /* private mode: every ceremony stays full */
  }
}

/** The ceremony is for the moment a level ends, not for revisiting a finished one. */
export function recentCompletion(completedAt: string | null, now = Date.now()): boolean {
  if (!completedAt) return false;
  const age = now - Date.parse(completedAt);
  return age >= -5000 && age <= 120_000;
}
