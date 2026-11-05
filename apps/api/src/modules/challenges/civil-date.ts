export const TIMEZONE = 'America/Sao_Paulo';

/** Civil date (YYYY-MM-DD) of an instant in America/Sao_Paulo; daily rollover at 00:00 there. */
export function civilDate(at: Date, timeZone = TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/** A civil date as the UTC-midnight Date that Prisma uses for @db.Date columns. */
export const dateColumn = (civil: string) => new Date(`${civil}T00:00:00Z`);

export const addDays = (civil: string, days: number) =>
  new Date(dateColumn(civil).getTime() + days * 86400_000).toISOString().slice(0, 10);
