/**
 * Regulations as data (mapa de conhecimento §2.7, entrega 7). Each rule the game applies has a
 * jurisdiction, a period it is in force, a source and a value; the game asks for the rule in
 * force on a date, so a change for 2027 never rewrites 2026. A rule added here needs a source.
 */

export type Jurisdiction = 'FIFA' | 'CBF';

export interface Rule<T> {
  jurisdiction: Jurisdiction;
  /** First day in force, ISO. */
  from: string;
  /** Last day in force, ISO; absent while it holds. */
  until?: string;
  source: string;
  value: T;
}

/** The transfer windows of a year: month-day spans, ISO `MM-DD`. */
export interface Windows {
  first: [string, string];
  domestic: [string, string] | null;
  second: [string, string];
}

/** FIFA's loan limits (RSTP art. 10). */
export interface LoanLimits {
  /** Players out on loan and in on loan at once, each. */
  atOnce: number;
  /** Loans between the same two clubs in a season, each way. */
  samePair: number;
  /** Boys of this age or under the club formed do not count. */
  exemptAge: number;
}

export const RULES = {
  windows: [
    {
      jurisdiction: 'CBF',
      from: '2026-01-01',
      source:
        'CBF, calendário 2026: 1ª janela 5/1 a 3/3, doméstica 4/3 a 27/3, 2ª janela 20/7 a 11/9 (Itatiaia; Descomplica). O jogo abre a 1ª com o ano.',
      value: {
        first: ['01-01', '03-03'],
        domestic: ['03-04', '03-27'],
        second: ['07-20', '09-11'],
      },
    },
  ] as Rule<Windows>[],
  loans: [
    {
      jurisdiction: 'FIFA',
      from: '2022-07-01',
      until: '2023-06-30',
      source: 'FIFA, regras de empréstimo de 2022 (inside.fifa.com): 8 de cada lado',
      value: { atOnce: 8, samePair: 3, exemptAge: 21 },
    },
    {
      jurisdiction: 'FIFA',
      from: '2023-07-01',
      until: '2024-06-30',
      source: 'FIFA, regras de empréstimo de 2022, segunda etapa: 7 de cada lado',
      value: { atOnce: 7, samePair: 3, exemptAge: 21 },
    },
    {
      jurisdiction: 'FIFA',
      from: '2024-07-01',
      source: 'FIFA, regras de empréstimo de 2022, a partir de julho de 2024: 6 de cada lado',
      value: { atOnce: 6, samePair: 3, exemptAge: 21 },
    },
  ] as Rule<LoanLimits>[],
  solidarity: [
    {
      jurisdiction: 'FIFA',
      from: '2001-09-01',
      source:
        'FIFA RSTP, anexo 5: até 5% de uma transferência internacional; CBF, solidariedade nacional: 6% entre clubes do país (Máquina do Esporte)',
      value: { abroad: 5, here: 6 },
    },
  ] as Rule<{ abroad: number; here: number }>[],
  foreignersPerMatch: [
    {
      jurisdiction: 'CBF',
      from: '2024-01-01',
      until: '2026-12-31',
      source: 'CBF: até 9 estrangeiros por súmula desde 2024 (Lance)',
      value: 9,
    },
    {
      jurisdiction: 'CBF',
      from: '2027-01-01',
      until: '2027-12-31',
      source: 'CBF aprova redução gradual: 8 em 2027, até 5 em 2030 (SBT News)',
      value: 8,
    },
    {
      jurisdiction: 'CBF',
      from: '2028-01-01',
      until: '2028-12-31',
      source: 'CBF, redução gradual (SBT News): 7 em 2028 (a confirmar)',
      value: 7,
    },
    {
      jurisdiction: 'CBF',
      from: '2029-01-01',
      until: '2029-12-31',
      source: 'CBF, redução gradual (SBT News): 6 em 2029 (a confirmar)',
      value: 6,
    },
    {
      jurisdiction: 'CBF',
      from: '2030-01-01',
      source: 'CBF, redução gradual: 5 a partir de 2030 (SBT News)',
      value: 5,
    },
  ] as Rule<number>[],
} as const;

export type RuleId = keyof typeof RULES;
type ValueOf<K extends RuleId> = (typeof RULES)[K][number]['value'];

/**
 * The rule in force on a date (ISO). Before the first version, the first one applies; the
 * rules are kept in order, newest last.
 */
export function ruleOn<K extends RuleId>(id: K, iso: string): ValueOf<K> {
  const list = RULES[id] as readonly Rule<ValueOf<K>>[];
  let found = list[0]!;
  for (const r of list) if (r.from <= iso && (!r.until || iso <= r.until)) found = r;
  return found.value;
}
