/**
 * dcaribou/transfermarkt-datasets -> knowledge base, same contract as import.service.ts:
 * new players are `imported`; an existing player or spell is never changed, each differing
 * field becomes an open ImportDiff. Players are matched by normalized alias + birth date
 * (the dataset has no Wikidata id); clubs by normalized name (+ country when the dataset
 * knows it). Clubs are never created: a spell whose club is unmatched is reported and skipped.
 */
import { normalizeName } from '@decabeca/engine';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  buildSpells,
  clubKey,
  countryIso,
  positionGroup,
  type Row,
  type TmSpell,
} from './transfermarkt-mapper';

export const TM_SOURCE = {
  code: 'transfermarkt-datasets',
  name: 'dcaribou/transfermarkt-datasets (Transfermarkt)',
  license: 'CC0-1.0 (repo); Transfermarkt ToS on underlying data',
  commercialUseAllowed: false,
  url: 'https://github.com/dcaribou/transfermarkt-datasets',
} as const;

export interface TmTables {
  players: Row[];
  transfers: Row[];
  clubs: Row[];
  competitions: Row[];
}

export interface TmReport {
  scope: number;
  newPlayers: number;
  matchedPlayers: number;
  ambiguousPlayers: number;
  skippedPlayers: Record<string, number>;
  newSpells: number;
  matchedSpells: number;
  diffs: { Player: number; CareerSpell: number };
  unmatchedClubs: Map<string, number>;
  diffSample: {
    entityType: string;
    entityId: string;
    field: string;
    current: string | null;
    imported: string;
  }[];
}

const day = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;
const ms = (d: string | null, fallback: number) => (d ? Date.parse(d) : fallback);
const MONTH = 31 * 86_400_000;
const chunks = <T>(a: T[], n = 5000) =>
  Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, (i + 1) * n));

export async function importTransfermarkt(
  prisma: PrismaClient,
  t: TmTables,
  opts: { dryRun?: boolean; today?: string; scopeBrazil?: boolean } = {},
): Promise<TmReport> {
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const report: TmReport = {
    scope: 0,
    newPlayers: 0,
    matchedPlayers: 0,
    ambiguousPlayers: 0,
    skippedPlayers: {},
    newSpells: 0,
    matchedSpells: 0,
    diffs: { Player: 0, CareerSpell: 0 },
    unmatchedClubs: new Map(),
    diffSample: [],
  };
  const skip = (why: string) =>
    (report.skippedPlayers[why] = (report.skippedPlayers[why] ?? 0) + 1);

  // --- club tables -> country per Transfermarkt club
  const compCountry = new Map(t.competitions.map((c) => [c.competition_id, c.country_name]));
  const tmClubIso = new Map<string, string | null>();
  const brClubs = new Set<string>();
  for (const c of t.clubs) {
    const country = compCountry.get(c.domestic_competition_id);
    tmClubIso.set(c.club_id, country ? countryIso(country) : null);
    if (country === 'Brazil') brClubs.add(c.club_id);
  }

  // --- scope: Brazilian citizens, or anyone with a transfer to/from a Brazilian club
  const transfersByPlayer = new Map<string, Row[]>();
  for (const r of t.transfers) {
    const list = transfersByPlayer.get(r.player_id);
    if (list) list.push(r);
    else transfersByPlayer.set(r.player_id, [r]);
  }
  const inScope = (p: Row) =>
    !opts.scopeBrazil ||
    p.country_of_citizenship === 'Brazil' ||
    (transfersByPlayer.get(p.player_id) ?? []).some(
      (r) => brClubs.has(r.from_club_id) || brClubs.has(r.to_club_id),
    );
  const players = t.players.filter(inScope);
  report.scope = players.length;

  // --- our clubs by stripped name; ambiguity (two clubs, same key+country) = unmatched
  const ours = await prisma.club.findMany({
    select: {
      id: true,
      name: true,
      shortName: true,
      country: { select: { isoCode: true } },
      _count: { select: { spells: true } },
    },
  });
  const byKey = new Map<string, Map<string, { id: string; iso: string; spells: number }>>();
  for (const c of ours)
    for (const n of new Set([c.name, c.shortName])) {
      const k = clubKey(n);
      if (!k) continue;
      const m = byKey.get(k) ?? new Map();
      m.set(c.id, { id: c.id, iso: c.country.isoCode, spells: c._count.spells });
      byKey.set(k, m);
    }
  const clubCache = new Map<string, string | null>();
  const tmClubName = new Map(t.clubs.map((c) => [c.club_id, c.name]));
  /** "Santos U20" is the youth side of Santos. Ties (Santos FC vs Santos AP) go to the club with more history. */
  const resolveClub = (tmId: string, name: string): string | null => {
    if (clubCache.has(tmId)) return clubCache.get(tmId)!;
    const iso = tmClubIso.get(tmId);
    let id: string | null = null;
    for (const n of [name, tmClubName.get(tmId)]) {
      const cands = [
        ...(byKey.get(clubKey(n?.replace(/\s+U-?\d{2}$/i, '') ?? '')) ?? new Map()).values(),
      ]
        .filter((c) => !iso || c.iso === iso)
        .sort((a, b) => b.spells - a.spells);
      if (cands.length === 1 || (cands.length > 1 && iso)) id = cands[0]!.id;
      if (id) break;
    }
    clubCache.set(tmId, id);
    return id;
  };

  // --- existing players by alias + birth date
  const keyOf = (p: Row) => [
    ...new Set(
      [p.name, `${p.first_name} ${p.last_name}`].map(normalizeName).filter((n) => n.length > 0),
    ),
  ];
  const wanted = [...new Set(players.flatMap(keyOf))];
  const aliasRows = (
    await Promise.all(
      chunks(wanted).map((normalized) =>
        prisma.playerAlias.findMany({
          where: { normalized: { in: normalized }, player: { birthDate: { not: null } } },
          select: {
            normalized: true,
            player: {
              select: {
                id: true,
                birthDate: true,
                primaryPositionGroup: true,
                nationality: { select: { isoCode: true } },
              },
            },
          },
        }),
      ),
    )
  ).flat();
  const byAlias = new Map<string, typeof aliasRows>();
  for (const a of aliasRows) byAlias.set(a.normalized, [...(byAlias.get(a.normalized) ?? []), a]);

  const countries = new Map((await prisma.country.findMany()).map((c) => [c.isoCode, c.id]));
  const source = opts.dryRun
    ? await prisma.source.findUnique({ where: { code: TM_SOURCE.code } })
    : await prisma.source.upsert({
        where: { code: TM_SOURCE.code },
        update: {},
        create: TM_SOURCE,
      });

  // --- split players into matched (id) / new / skipped
  type Match = { id: string; current: (typeof aliasRows)[number]['player'] };
  const matched = new Map<string, Match>();
  const fresh: Row[] = [];
  for (const p of players) {
    const dob = p.date_of_birth.slice(0, 10);
    const hits = new Map<string, Match>();
    for (const k of keyOf(p))
      for (const a of byAlias.get(k) ?? [])
        if (dob && day(a.player.birthDate) === dob)
          hits.set(a.player.id, { id: a.player.id, current: a.player });
    if (hits.size > 1) report.ambiguousPlayers++;
    else if (hits.size === 1) matched.set(p.player_id, [...hits.values()][0]!);
    else if (!dob) skip('no birth date');
    else if (
      !countryIso(p.country_of_citizenship) ||
      !countries.has(countryIso(p.country_of_citizenship)!)
    )
      skip('unknown nationality');
    else fresh.push(p);
  }
  report.matchedPlayers = matched.size;

  /** TM spells with a resolved club; unmatched clubs are counted by name. */
  const spellsOf = (p: Row) =>
    buildSpells(transfersByPlayer.get(p.player_id) ?? [], today).flatMap((s) => {
      const clubId = resolveClub(s.clubId, s.clubName);
      if (!clubId) {
        report.unmatchedClubs.set(s.clubName, (report.unmatchedClubs.get(s.clubName) ?? 0) + 1);
        return [];
      }
      return [
        {
          s,
          clubId,
          loanFromClubId: s.loanFromClubId ? resolveClub(s.loanFromClubId, s.clubName) : null,
        },
      ];
    });
  const sourceRef = (p: Row) =>
    p.url || `https://www.transfermarkt.com/-/profil/spieler/${p.player_id}`;
  const spellData = (s: TmSpell, clubId: string, loanFromClubId: string | null, ref: string) => ({
    clubId,
    spellType: s.spellType,
    startDate: s.start ? new Date(s.start) : null,
    startPrecision: s.start ? ('day' as const) : ('unknown' as const),
    endDate: s.end ? new Date(s.end) : null,
    endPrecision: s.end ? ('day' as const) : ('unknown' as const),
    loanFromClubId,
    sourceId: source?.id ?? null,
    sourceRef: ref,
  });

  // --- new players
  for (const p of fresh) {
    const spells = spellsOf(p);
    if (!spells.length) {
      skip('no spell with a known club');
      continue;
    }
    report.newPlayers++;
    report.newSpells += spells.length;
    if (opts.dryRun) continue;
    const full = `${p.first_name} ${p.last_name}`.trim();
    const aliases: { alias: string; kind: 'canonical' | 'full' }[] = [
      { alias: p.name, kind: 'canonical' },
    ];
    if (full && normalizeName(full) !== normalizeName(p.name))
      aliases.push({ alias: full, kind: 'full' });
    await prisma.player.create({
      data: {
        canonicalName: p.name,
        fullName: full && full !== p.name ? full : null,
        birthDate: new Date(p.date_of_birth.slice(0, 10)),
        birthDatePrecision: 'day',
        nationalityCountryId: countries.get(countryIso(p.country_of_citizenship)!)!,
        primaryPositionGroup: positionGroup(p.position),
        sourceId: source?.id ?? null,
        sourceRef: sourceRef(p),
        aliases: {
          create: aliases.map((a) => ({
            ...a,
            normalized: normalizeName(a.alias),
            isPrimary: a.kind === 'canonical',
          })),
        },
        spells: {
          create: spells.map((x) => spellData(x.s, x.clubId, x.loanFromClubId, sourceRef(p))),
        },
      },
    });
  }

  // --- matched players: new spells, diffs for everything that differs
  const ids = [...matched.values()].map((m) => m.id);
  const existingSpells = (
    await Promise.all(
      chunks(ids).map((playerId) =>
        prisma.careerSpell.findMany({ where: { playerId: { in: playerId } } }),
      ),
    )
  ).flat();
  const spellsByPlayer = new Map<string, typeof existingSpells>();
  for (const s of existingSpells)
    spellsByPlayer.set(s.playerId, [...(spellsByPlayer.get(s.playerId) ?? []), s]);
  const openDiffs = new Set(
    (
      await Promise.all(
        chunks([...ids, ...existingSpells.map((s) => s.id)]).map((entityId) =>
          prisma.importDiff.findMany({ where: { entityId: { in: entityId }, status: 'open' } }),
        ),
      )
    )
      .flat()
      .map((d) => `${d.entityId}|${d.field}|${d.importedValue}`),
  );
  const diffs: {
    entityType: string;
    entityId: string;
    field: string;
    currentValue: string | null;
    importedValue: string;
  }[] = [];
  const diff = (
    entityType: string,
    entityId: string,
    field: string,
    cur: string | null,
    imp: string | null,
  ) => {
    if (imp === null || cur === imp || openDiffs.has(`${entityId}|${field}|${imp}`)) return;
    openDiffs.add(`${entityId}|${field}|${imp}`);
    diffs.push({ entityType, entityId, field, currentValue: cur, importedValue: imp });
    report.diffs[entityType as 'Player']++;
    if (report.diffSample.length < 400)
      report.diffSample.push({ entityType, entityId, field, current: cur, imported: imp });
  };
  const newSpells: Prisma.CareerSpellCreateManyInput[] = [];

  for (const p of players) {
    const m = matched.get(p.player_id);
    if (!m) continue;
    const iso = countryIso(p.country_of_citizenship);
    diff('Player', m.id, 'nationality', m.current.nationality.isoCode, iso);
    diff(
      'Player',
      m.id,
      'primaryPositionGroup',
      m.current.primaryPositionGroup,
      positionGroup(p.position),
    );
    const mine = spellsByPlayer.get(m.id) ?? [];
    for (const { s, clubId, loanFromClubId } of spellsOf(p)) {
      const sStart = ms(s.start, -Infinity);
      const sEnd = ms(s.end, Infinity);
      const hit = mine
        .filter(
          (e) =>
            e.clubId === clubId &&
            ms(day(e.startDate), -Infinity) <= sEnd &&
            ms(day(e.endDate), Infinity) >= sStart,
        )
        .sort(
          (a, b) =>
            Math.abs(ms(day(a.startDate), 0) - sStart) - Math.abs(ms(day(b.startDate), 0) - sStart),
        )[0];
      if (!hit) {
        newSpells.push({ playerId: m.id, ...spellData(s, clubId, loanFromClubId, sourceRef(p)) });
        report.newSpells++;
        continue;
      }
      report.matchedSpells++;
      // A date conflicts only at the precision we hold: a year-precision 2012 agrees with 2012-07-15.
      const far = (cur: Date | null, prec: string, imp: string | null) =>
        imp !== null &&
        (!cur ||
          (prec === 'year'
            ? cur.getUTCFullYear() !== Number(imp.slice(0, 4))
            : prec === 'month'
              ? day(cur)!.slice(0, 7) !== imp.slice(0, 7)
              : Math.abs(cur.getTime() - Date.parse(imp)) > MONTH));
      if (far(hit.startDate, hit.startPrecision, s.start))
        diff('CareerSpell', hit.id, 'startDate', day(hit.startDate), s.start);
      if (far(hit.endDate, hit.endPrecision, s.end))
        diff('CareerSpell', hit.id, 'endDate', day(hit.endDate), s.end);
      diff('CareerSpell', hit.id, 'spellType', hit.spellType, s.spellType);
    }
  }

  if (!opts.dryRun) {
    for (const c of chunks(newSpells, 2000)) await prisma.careerSpell.createMany({ data: c });
    for (const c of chunks(diffs, 2000)) await prisma.importDiff.createMany({ data: c });
  }
  return report;
}
