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
