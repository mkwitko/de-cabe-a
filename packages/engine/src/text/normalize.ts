/**
 * Canonical name form for alias matching (DATA_QUALITY.md §3).
 * Used by import, search and tests: "Zé Roberto" -> "ze roberto".
 */
export function normalizeName(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
