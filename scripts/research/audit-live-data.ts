// Audit of what players see in Career Path and Mais ou Menos. Without arguments it checks the
// live Career Path levels against the base (a fresh build must equal the snapshot; club names;
// reserve sides; overlapping spells) and exits 1 when something is off. Mais ou Menos rules live in
// `publish-higher-lower.ts --replace-unfair --dry`.
// With --infoboxes <fetch-infoboxes.json> --propose <out.json> it also derives, from the infobox
// club links, the spells attached to the wrong club, and from the English infobox (league only by
// its convention) the league games/goals of every spell: the input of live-data-fixes.json.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/audit-live-data.ts [--infoboxes f --propose out]
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createPrisma } from '../../apps/api/src/db';
import { buildSnapshot } from '../../apps/api/src/modules/challenges/challenges.service';
import type { InfoboxEntry } from '../../apps/api/src/modules/data-import/wikipedia';
import { normalizeName } from '../../packages/engine/src/index';
import { isReserveClub } from './lib/reserve';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const arg = (k: string) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : undefined;
};

/** A short name players should not see: wiki markup, legal names, country tags, transliterations. */
const badClubName = (s: string) =>
  /[|<>=[\]{}]|\bcite\b|\bref\b|-(URU|POR|EQU|ARG|ESP)$|\(|Futbolniy|Football Club|Futebol Clube|Fútbol Club|Club de Fútbol|Sports Club|Spor Kulübü|\bKlub\b|Kulübü/.test(
    s,
  ) || s.length > 30;

const issues: string[] = [];
const canonical = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)))
      : x,
  );

// ── Career Path: every live level must equal a fresh build and show clean clubs.
const levels = await prisma.challenge.findMany({
  where: { gameMode: 'CAREER_PATH', status: 'published' },
  orderBy: { publicNumber: 'asc' },
});
type Stamp = {
  clubId: string;
  clubName: string;
  fromYear: number | null;
  toYear: number | null;
  isLoan: boolean;
};
const clubIds = new Set(
  levels.flatMap((l) => (l.snapshot as { trajectory: Stamp[] }).trajectory.map((t) => t.clubId)),
);
const clubs = new Map(
  (
    await prisma.club.findMany({
      where: { id: { in: [...clubIds] } },
      select: { id: true, name: true, shortName: true },
    })
  ).map((c) => [c.id, c]),
);
const shownBy = new Map<string, Set<string>>();
for (const l of levels) {
  const s = l.snapshot as {
    answerPlayerId: string;
    difficultyTier: 1 | 2 | 3;
    trajectory: Stamp[];
  };
  const at = `Carreira ${l.publicNumber}`;
  const fresh = await buildSnapshot(
    prisma,
    {
      mode: 'CAREER_PATH',
      params: { playerId: s.answerPlayerId },
      difficultyTier: s.difficultyTier,
    },
    l.id,
  ).catch((e: { details?: { reasons?: string[] } }) => e.details?.reasons ?? ['ERROR']);
  if (Array.isArray(fresh)) issues.push(`${at}: no longer eligible (${fresh.join(',')})`);
  else if (canonical(fresh.config) !== canonical(l.snapshot))
    issues.push(`${at}: snapshot differs from the base`);
  for (const [i, t] of s.trajectory.entries()) {
    const c = clubs.get(t.clubId)!;
    shownBy.set(t.clubName, (shownBy.get(t.clubName) ?? new Set()).add(t.clubId));
    if (badClubName(t.clubName)) issues.push(`${at}: club name "${t.clubName}"`);
    if (
      isReserveClub(c.name) &&
      !/ (B|C|II|Sub-\d\d|Feminino|Castilla|Mestalla)$|^Jong /.test(t.clubName)
    )
      issues.push(`${at}: reserve side "${c.name}" shown as "${t.clubName}"`);
    if (t.fromYear && t.toYear && t.toYear < t.fromYear)
      issues.push(`${at}: ${t.clubName} ends before it starts`);
    const next = s.trajectory[i + 1];
    if (
      next &&
      !t.isLoan &&
      !next.isLoan &&
      next.clubId === t.clubId &&
      t.toYear !== null &&
      next.fromYear! <= t.toYear
    )
      issues.push(`${at}: ${t.clubName} twice in a row`);
    // A loan turned permanent (Wigan 2006-2009 inside Villarreal 2005-2008) is one spell that
    // outlasts the first club: only a spell nested in another, or a long overlap, is an error.
    if (
      next &&
      !t.isLoan &&
      !next.isLoan &&
      t.toYear !== null &&
      next.fromYear !== null &&
      next.fromYear < t.toYear - 1 &&
      ((next.toYear !== null && next.toYear <= t.toYear) || next.fromYear < t.toYear - 2)
    )
      issues.push(
        `${at}: ${t.clubName} ${t.fromYear}-${t.toYear} overlaps ${next.clubName} ${next.fromYear}`,
      );
  }
}
for (const [name, ids] of shownBy)
  if (
    ids.size > 1 &&
    ![
      'Santos',
      'Olimpia',
      'Vicenza',
      'Seattle Sounders',
      'New York Cosmos',
      'Sanjoanense',
      'Fort Lauderdale Strikers',
    ].includes(name)
  )
    issues.push(`"${name}" names ${ids.size} different clubs`);

// ── Proposals from the infobox cache.
const cacheFile = arg('--infoboxes');
const outFile = arg('--propose');
if (cacheFile && outFile) {
  const { result, linkQid } = JSON.parse(readFileSync(cacheFile, 'utf8')) as {
    result: Record<
      string,
      {
        source: { lang: string; entries: InfoboxEntry[] } | null;
        en: { lang: string; title: string; entries: InfoboxEntry[] } | null;
      }
    >;
    linkQid: Record<string, string>;
  };
  const GENERIC = new Set(
    'fc cf ac sc afc club clube futebol football futbol fussball sport sporting sociedade associacao atletico atletica asociacion deportivo deportiva esporte esportivo real union united city town athletic juniors junior de do da del la le los las and of the sao santo santa calcio clube regatas'.split(
      ' ',
    ),
  );
  const words = (x: string) =>
    normalizeName(x)
      .split(' ')
      .filter((w) => w.length >= 3 && !GENERIC.has(w));
  const RESERVE_TEXT = /\b(ii|b|sub[ -]?\d{2}|u[ -]?\d{2}|reservas?|juniores|amateure)\b|\bII\b/i;
  const qidOf = (lang: string, e: InfoboxEntry) =>
    e.link ? linkQid[`${lang}:${e.link}`] : undefined;
  const allClubs = await prisma.club.findMany({
    select: { id: true, wikidataId: true, shortName: true, name: true },
  });
  const clubByQid = new Map(allClubs.filter((c) => c.wikidataId).map((c) => [c.wikidataId!, c]));
  const clubById = new Map(allClubs.map((c) => [c.id, c]));
  const spells = await prisma.careerSpell.findMany({
    where: {
      verificationStatus: 'verified',
      spellType: { not: 'youth' },
      playerId: { in: Object.keys(result) },
    },
    select: {
      id: true,
      playerId: true,
      clubId: true,
      spellType: true,
      startDate: true,
      endDate: true,
      appearances: true,
      goals: true,
      player: { select: { canonicalName: true } },
    },
    orderBy: [{ playerId: 'asc' }, { sortIndex: 'asc' }],
  });
  const byPlayer = new Map<string, typeof spells>();
  for (const s of spells) byPlayer.set(s.playerId, [...(byPlayer.get(s.playerId) ?? []), s]);
  const yearOf = (d: Date | null) => d?.getUTCFullYear() ?? null;

  // --manual <json>: reviewed moves [{ spellId, qid, why? }] for spells the links cannot settle.
  const manualFile = arg('--manual');
  const manual = new Map<string, string | null>(
    (manualFile
      ? (JSON.parse(readFileSync(manualFile, 'utf8')) as { spellId: string; qid: string | null }[])
      : []
    ).map((m) => [m.spellId, m.qid]),
  );
  const spellClubs: object[] = [];
  const unresolved: object[] = [];
  const spellStats: object[] = [];
  const spellLoans: object[] = [];
  const unconfirmedWhy: {
    spellId: string;
    player: string;
    club: string;
    years: string;
    why: string;
  }[] = [];
  const leagueConfirmed: string[] = [];
  let unconfirmed = 0;
  // --careers 100,175: careers whose club sequence is broken beyond re-attaching (a club merged into
  // another, a missing club) are rebuilt from the English infobox: its linked cells, league numbers
  // and loans. Spell ids are fixed here so every copy of the base gets the same ones.
  // Level numbers (live Career Path answers) or player ids.
  const careerArgs = (arg('--careers') ?? '').split(',').filter(Boolean);
  const rebuild = new Set([
    ...levels
      .filter((l) => careerArgs.includes(String(l.publicNumber)))
      .map((l) => (l.snapshot as { answerPlayerId: string }).answerPlayerId),
    ...careerArgs.filter((x) => x.includes('-')),
  ]);
  const careers: object[] = [];
  const careerMisses: string[] = [];
  for (const playerId of rebuild) {
    const en = result[playerId]?.en;
    const player = byPlayer.get(playerId)?.[0]?.player.canonicalName ?? playerId;
    type Row = {
      club: string;
      from: number;
      to: number | null;
      loan: boolean;
      a: number | null;
      g: number | null;
    };
    const rows: Row[] = [];
    let missing = '';
    for (const e of en?.entries ?? []) {
      if (RESERVE_TEXT.test(e.club) || e.fromYear === null) continue;
      const club = clubByQid.get(qidOf('en', e) ?? '');
      if (!club || (isReserveClub(club.name) && !isReserveClub(e.club))) {
        missing ||= e.club;
        continue;
      }
      const prev = rows.at(-1);
      if (prev && prev.club === club.id && (prev.to ?? 9999) >= e.fromYear) {
        prev.to = e.toYear === null || prev.to === null ? null : Math.max(prev.to, e.toYear);
        prev.loan = prev.loan && e.isLoan;
        prev.a = prev.a === null || e.appearances === null ? null : prev.a + e.appearances;
        prev.g = prev.g === null || e.goals === null ? null : prev.g + e.goals;
        continue;
      }
      rows.push({
        club: club.id,
        from: e.fromYear,
        to: e.toYear,
        loan: e.isLoan,
        a: e.appearances,
        g: e.goals,
      });
    }
    if (missing || rows.length < 3) {
      careerMisses.push(
        `${player}: ${missing ? `"${missing}" is not a club in the base` : 'too short'}`,
      );
      continue;
    }
    let parent: string | null = null;
    careers.push({
      playerId,
      player,
      sourceRef: `https://en.wikipedia.org/wiki/${encodeURIComponent(en!.title.replace(/ /g, '_'))}`,
      spells: rows.map((r, i) => {
        const loan = r.loan && parent !== null && parent !== r.club;
        const row = {
          id: randomUUID(),
          clubId: r.club,
          loanFromClubId: loan ? parent : null,
          from: r.from,
          to: r.to,
          appearances: r.a,
          goals: r.g,
          sortIndex: i,
        };
        if (!loan) parent = r.club;
        return row;
      }),
    });
  }
  for (const [playerId, ss] of byPlayer) {
    if (rebuild.has(playerId)) continue;
    const { source, en } = result[playerId]!;
    const clubOf = new Map(ss.map((s) => [s.id, s.clubId]));
    // 1. Pairing: the source infobox cell that started the spell links to the club's page.
    // Portuguese list-style infoboxes carry no links: the English cell of the same year decides.
    for (const s of ss) {
      const qid = clubById.get(s.clubId)!.wikidataId;
      if (manual.has(s.id) && !manual.get(s.id)) continue; // reviewed: stays where it is
      const forced = manual.has(s.id) ? clubByQid.get(manual.get(s.id)!) : undefined;
      if (forced && forced.id !== s.clubId) {
        spellClubs.push({
          spellId: s.id,
          player: s.player.canonicalName,
          years: `${yearOf(s.startDate)}-${yearOf(s.endDate) ?? ''}`,
          fromClubId: s.clubId,
          from: clubById.get(s.clubId)!.shortName,
          toClubId: forced.id,
          to: forced.shortName,
          why: 'reviewed: senior spell on the reserve side',
        });
        clubOf.set(s.id, forced.id);
        continue;
      }
      const cellsOf = (side: typeof source) =>
        (side?.entries ?? []).filter(
          (e) => !RESERVE_TEXT.test(e.club) && e.fromYear === yearOf(s.startDate),
        );
      const linkedIn = (side: typeof source) => [
        ...new Set(
          cellsOf(side)
            .map((e) => qidOf(side!.lang, e))
            .filter((q): q is string => !!q),
        ),
      ];
      const fromSource = linkedIn(source);
      const linked = fromSource.length ? fromSource : linkedIn(en);
      const cands = fromSource.length ? cellsOf(source) : cellsOf(en);
      if (!linked.length || linked.includes(qid ?? '')) continue;
      const row = {
        spellId: s.id,
        player: s.player.canonicalName,
        years: `${yearOf(s.startDate)}-${yearOf(s.endDate) ?? ''}`,
        fromClubId: s.clubId,
        from: clubById.get(s.clubId)!.shortName,
        cell: cands.map((e) => e.club).join(' / '),
      };
      // The text of the cell the spell came from must name the linked club, and not the current
      // one (unless that is a reserve side sharing the senior club's words).
      const end = yearOf(s.endDate);
      const target =
        linked.length === 1 &&
        cands.length === 1 &&
        (end === null || cands[0]!.toYear === null || cands[0]!.toYear === end)
          ? clubByQid.get(linked[0]!)
          : undefined;
      const said = cellsOf(source).map((e) => words(e.club));
      const names = (c: { name: string; shortName: string }) => [
        ...words(c.name),
        ...words(c.shortName),
      ];
      const says = (c: { name: string; shortName: string }) =>
        said.some((ws) => ws.some((w) => names(c).includes(w)));
      const current = clubById.get(s.clubId)!;
      if (target && says(target)) {
        spellClubs.push({ ...row, toClubId: target.id, to: target.shortName, toName: target.name });
        clubOf.set(s.id, target.id);
      } else if (isReserveClub(current.name)) unresolved.push({ ...row, linked });
    }
    // 2. League numbers: English cells of the same club, inside the spell's years. The club is the
    // cell's link; a cell without a link counts when every word of its text names exactly one of
    // the player's clubs (and both are, or both are not, a reserve side).
    const playerClubs = [...new Set(ss.map((s) => clubOf.get(s.id)!))].map((id) =>
      clubById.get(id)!,
    );
    const textClub = (cell: string) => {
      const ws = words(cell);
      const hits = playerClubs.filter((c) => {
        const cw = [...words(c.name), ...words(c.shortName)];
        return (
          ws.length > 0 &&
          ws.every((w) => cw.includes(w)) &&
          isReserveClub(c.name) === (RESERVE_TEXT.test(cell) || isReserveClub(cell))
        );
      });
      return hits.length === 1 ? hits[0]!.id : undefined;
    };
    const enEntries = (en?.entries ?? [])
      .filter((e) => e.fromYear !== null)
      .map((e) => {
        const q = qidOf('en', e);
        const clubId = q ? clubByQid.get(q)?.id : textClub(e.club);
        return { e, clubId };
      })
      .filter((x): x is { e: InfoboxEntry; clubId: string } => !!x.clubId);
    const sums = new Map<string, { a: number; g: number; ok: boolean; n: number }>();
    const badClub = new Set<string>();
    for (const { e, clubId } of enEntries) {
      const club = clubById.get(clubId)!;
      if (RESERVE_TEXT.test(e.club) && !isReserveClub(club.name)) continue;
      const at = ss.filter((s) => clubOf.get(s.id) === club.id);
      if (!at.length) continue;
      const overlap = (s: (typeof ss)[number]) =>
        Math.min(e.toYear ?? 9999, yearOf(s.endDate) ?? 9999) -
        Math.max(e.fromYear!, yearOf(s.startDate)!);
      // The cell must lie within the spell (a year of slack each side): a 2014-2019 cell is not part
      // of a 2013-2014 spell, it is a spell the base lacks.
      const inside = (s: (typeof ss)[number]) =>
        e.fromYear! >= yearOf(s.startDate)! - 1 &&
        (e.toYear ?? 9999) <= (yearOf(s.endDate) ?? 9999) + 1;
      const best = at.filter(inside).sort((x, y) => overlap(y) - overlap(x))[0];
      if (!best) {
        badClub.add(club.id);
        continue;
      }
      const t = sums.get(best.id) ?? { a: 0, g: 0, ok: true, n: 0 };
      if (e.appearances === null || e.goals === null) t.ok = false;
      t.a += e.appearances ?? 0;
      t.g += e.goals ?? 0;
      t.n++;
      sums.set(best.id, t);
    }
    // 3. Loans listed as transfers: the English infobox marks the spell (same years) as a loan,
    // and it runs while the player was under contract at another club (the lender).
    const enLoanAt = (s: (typeof ss)[number]) => {
      const [from, to] = [yearOf(s.startDate)!, yearOf(s.endDate)];
      return enEntries.some(
        ({ e, clubId }) =>
          e.isLoan &&
          clubId === clubOf.get(s.id) &&
          Math.abs(e.fromYear! - from) <= 1 &&
          e.toYear === to,
      );
    };
    for (const s of ss) {
      if (s.spellType !== 'professional' || !enLoanAt(s)) continue;
      const from = yearOf(s.startDate)!;
      const lenders = ss.filter(
        (a) =>
          a !== s &&
          a.spellType === 'professional' &&
          clubOf.get(a.id) !== clubOf.get(s.id) &&
          !enLoanAt(a) &&
          yearOf(a.startDate)! <= from &&
          (yearOf(a.endDate) ?? 9999) > from,
      );
      const parent = lenders.length === 1 ? lenders[0] : undefined;
      if (parent)
        spellLoans.push({
          spellId: s.id,
          player: s.player.canonicalName,
          club: clubById.get(clubOf.get(s.id)!)!.shortName,
          loanFromClubId: clubOf.get(parent.id)!,
        });
    }
    for (const s of ss) {
      const t = sums.get(s.id);
      if (!t || !t.ok || badClub.has(clubOf.get(s.id)!)) {
        unconfirmed++;
        unconfirmedWhy.push({
          spellId: s.id,
          player: s.player.canonicalName,
          club: clubById.get(clubOf.get(s.id)!)!.shortName,
          years: `${yearOf(s.startDate)}-${yearOf(s.endDate) ?? ''}`,
          why: !en
            ? 'no English infobox'
            : badClub.has(clubOf.get(s.id)!)
              ? 'English years differ'
              : !t
                ? 'club not in the English infobox'
                : 'English infobox has no games/goals',
        });
        continue;
      }
      leagueConfirmed.push(s.id);
      if (t.a !== s.appearances || t.g !== s.goals)
        spellStats.push({
          spellId: s.id,
          player: s.player.canonicalName,
          club: clubById.get(clubOf.get(s.id)!)!.shortName,
          from: [s.appearances, s.goals],
          to: [t.a, t.g],
        });
    }
  }
  for (const c of careers as { spells: { id: string; appearances: number | null }[] }[])
    for (const sp of c.spells) if (sp.appearances !== null) leagueConfirmed.push(sp.id);
  for (const m of careerMisses) console.log(`career not rebuilt: ${m}`);
  writeFileSync(
    outFile,
    JSON.stringify(
      { spellClubs, unresolved, spellLoans, spellStats, leagueConfirmed, careers, unconfirmedWhy },
      null,
      1,
    ) + '\n',
  );
  console.log(
    `proposals: ${spellClubs.length} spells to re-attach, ${unresolved.length} unresolved, ${spellLoans.length} loans, ${spellStats.length} league corrections, ${leagueConfirmed.length} spells confirmed, ${unconfirmed} without English confirmation`,
  );
}

for (const i of issues) console.log(i);
console.log(`${issues.length} issues in ${levels.length} live Career Path levels`);
await prisma.$disconnect();
process.exit(issues.length ? 1 : 0);
