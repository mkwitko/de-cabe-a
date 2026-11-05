/**
 * Data quality checks DQ-01..09 (docs/DATA_QUALITY.md §2).
 * Pure functions over plain DTOs: callers load data and decide what a "block" stops
 * (a verification transition, a challenge publication).
 */

export type VerificationStatus = 'draft' | 'imported' | 'verified' | 'rejected';
export type DatePrecision = 'day' | 'month' | 'year' | 'unknown';

export interface SpellDq {
  id: string;
  clubId: string;
  spellType: 'professional' | 'loan' | 'youth';
  startDate: Date | null;
  startPrecision: DatePrecision;
  endDate: Date | null;
  loanFromClubId: string | null;
  verificationStatus: VerificationStatus;
}

export interface PlayerDq {
  id: string;
  verificationStatus: VerificationStatus;
  wikidataId: string | null;
  sourceRef: string | null;
  primaryPositionGroup: string | null;
  birthDate: Date | null;
  aliases: { normalized: string; kind: 'canonical' | 'full' | 'nickname' | 'variant' }[];
  spells: SpellDq[];
}

export interface ClubDq {
  id: string;
  verificationStatus: VerificationStatus;
  countryId: string | null;
}

export type DqRule = `DQ-0${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`;

export interface DqViolation {
  rule: DqRule;
  severity: 'block' | 'warn';
  entityId: string;
  message: string;
}

const block = (rule: DqRule, entityId: string, message: string): DqViolation => ({
  rule,
  severity: 'block',
  entityId,
  message,
});
const warn = (rule: DqRule, entityId: string, message: string): DqViolation => ({
  rule,
  severity: 'warn',
  entityId,
  message,
});

export function checkSpell(s: SpellDq): DqViolation[] {
  const out: DqViolation[] = [];
  if (s.verificationStatus === 'verified' && (!s.startDate || s.startPrecision === 'unknown'))
    out.push(
      block('DQ-01', s.id, 'Passagem verificada precisa de data de início (ao menos o ano).'),
    );
  if (s.startDate && s.endDate && s.endDate < s.startDate)
    out.push(block('DQ-02', s.id, 'Data de fim anterior à data de início.'));
  if (s.spellType === 'loan' && !s.loanFromClubId)
    out.push(block('DQ-03', s.id, 'Empréstimo sem o clube de origem.'));
  return out;
}

export function checkPlayer(p: PlayerDq): DqViolation[] {
  const out: DqViolation[] = [];
  if (p.verificationStatus === 'verified') {
    if (!p.aliases.some((a) => a.kind === 'canonical'))
      out.push(block('DQ-04', p.id, 'Jogador verificado sem alias canônico.'));
    if (!p.primaryPositionGroup)
      out.push(block('DQ-04', p.id, 'Jogador verificado sem grupo de posição.'));
  }
  if (!p.wikidataId && !p.sourceRef)
    out.push(block('DQ-07', p.id, 'Jogador sem wikidataId e sem sourceRef.'));
  for (const s of p.spells) out.push(...checkSpell(s));
  out.push(...overlappingSpells(p.spells));
  return out;
}

/** DQ-06: two spells at different clubs overlap in time and neither is a loan. */
function overlappingSpells(spells: SpellDq[]): DqViolation[] {
  const out: DqViolation[] = [];
  const end = (s: SpellDq) => s.endDate?.getTime() ?? Number.POSITIVE_INFINITY;
  const dated = spells.filter((s) => s.startDate);
  for (let i = 0; i < dated.length; i++) {
    for (let j = i + 1; j < dated.length; j++) {
      const a = dated[i]!;
      const b = dated[j]!;
      if (a.clubId === b.clubId || a.spellType === 'loan' || b.spellType === 'loan') continue;
      if (a.startDate!.getTime() < end(b) && b.startDate!.getTime() < end(a))
        out.push(
          warn('DQ-06', b.id, `Passagens sobrepostas em clubes diferentes (${a.id}, ${b.id}).`),
        );
    }
  }
  return out;
}

export function checkClub(c: ClubDq): DqViolation[] {
  return c.verificationStatus === 'verified' && !c.countryId
    ? [block('DQ-08', c.id, 'Clube verificado sem país.')]
    : [];
}

/** DQ-05: verified players sharing a normalized alias and birth year. Reports the later one. */
export function findPossibleDuplicates(players: PlayerDq[]): DqViolation[] {
  const seen = new Map<string, string>();
  const out: DqViolation[] = [];
  for (const p of players) {
    if (p.verificationStatus !== 'verified' || !p.birthDate) continue;
    const year = p.birthDate.getUTCFullYear();
    for (const alias of new Set(p.aliases.map((a) => a.normalized))) {
      const key = `${alias}|${year}`;
      const first = seen.get(key);
      if (!first) seen.set(key, p.id);
      else if (first !== p.id) {
        out.push(warn('DQ-05', p.id, `Possível duplicata de ${first} ("${alias}", ${year}).`));
        break;
      }
    }
  }
  return out;
}

/**
 * DQ-09: clubs of the challenge trajectory (verified professional/loan spells,
 * CAREER_PATH.md §4) must all be verified.
 */
export function checkTrajectoryClubs(
  p: PlayerDq,
  clubStatus: ReadonlyMap<string, VerificationStatus>,
): DqViolation[] {
  const clubIds = new Set(
    p.spells
      .filter((s) => s.verificationStatus === 'verified' && s.spellType !== 'youth')
      .map((s) => s.clubId),
  );
  return [...clubIds]
    .filter((id) => clubStatus.get(id) !== 'verified')
    .map((id) => block('DQ-09', id, `Clube ${id} da trajetória não está verificado.`));
}
