/**
 * Wikidata -> knowledge base (IMPLEMENTATION_PLAN.md slice 4, DATA_QUALITY.md §1).
 * New players are created as `imported`. An existing player is never changed: each field
 * that differs becomes an open ImportDiff for the editor.
 */
import type { ImportWikidataResponse } from '@decabeca/contracts';
import type { PrismaClient } from '../../generated/prisma/client';
import type { EntityFetcher, WikidataEntity } from './wikidata-client';
import { mapClub, mapPlayer, type Lookups } from './wikidata-mapper';

const ids = (e: WikidataEntity, p: string) =>
  (e.claims?.[p] ?? [])
    .map((c) => c.mainsnak.datavalue?.value)
    .map((v) => (v && typeof v === 'object' && 'id' in v ? v.id : undefined))
    .filter((id): id is string => !!id);

const exists = (e: WikidataEntity | undefined): e is WikidataEntity => !!e && !('missing' in e);
const dateOnly = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;

export async function importWikidataPlayers(
  prisma: PrismaClient,
  wikidataIds: string[],
  fetchEntities: EntityFetcher,
): Promise<ImportWikidataResponse> {
  const result: ImportWikidataResponse = { created: [], existing: [], skipped: [] };
  const entities = await fetchEntities(wikidataIds);
  const players = wikidataIds.map((id) => entities[id]);

  const found = players.filter(exists);
  const clubQids = [...new Set(found.flatMap((p) => ids(p, 'P54')))];
  const clubs = clubQids.length ? await fetchEntities(clubQids) : {};
  const countryQids = [
    ...new Set([
      ...found.flatMap((p) => ids(p, 'P27')),
      ...Object.values(clubs)
        .filter(exists)
        .flatMap((c) => ids(c, 'P17')),
    ]),
  ];
  const positionQids = [...new Set(found.flatMap((p) => ids(p, 'P413')))];
  const related = await fetchEntities([...countryQids, ...positionQids]);
  const lookups: Lookups = {
    clubs: Object.fromEntries(Object.entries(clubs).filter(([, e]) => exists(e))),
    countryIso: Object.fromEntries(
      countryQids.map((q) => {
        const v = related[q]?.claims?.P297?.[0]?.mainsnak.datavalue?.value;
        return [q, typeof v === 'string' ? v : ''];
      }),
    ),
    positionLabels: Object.fromEntries(
      positionQids.map((q) => [q, related[q]?.labels?.en?.value ?? '']),
    ),
  };

  const countries = new Map((await prisma.country.findMany()).map((c) => [c.isoCode, c]));
  const wikidata = await prisma.source.findUniqueOrThrow({ where: { code: 'wikidata' } });
  const ref = (qid: string) => `https://www.wikidata.org/wiki/${qid}`;

  /** Club id by QID, creating the club as `imported` when new; null if its country is unknown. */
  const clubIds = new Map<string, string | null>();
  async function clubId(qid: string): Promise<string | null> {
    if (clubIds.has(qid)) return clubIds.get(qid)!;
    const known = await prisma.club.findUnique({ where: { wikidataId: qid } });
    let id = known?.id ?? null;
    if (!known && lookups.clubs[qid]) {
      const c = mapClub(lookups.clubs[qid], lookups);
      const country = c.countryIso ? countries.get(c.countryIso) : undefined;
      if (country)
        id = (
          await prisma.club.create({
            data: {
              wikidataId: qid,
              name: c.name,
              shortName: c.shortName,
              countryId: country.id,
              foundedYear: c.foundedYear,
              sourceId: wikidata.id,
              sourceRef: ref(qid),
            },
          })
        ).id;
    }
    clubIds.set(qid, id);
    return id;
  }

  for (const [i, entity] of players.entries()) {
    const wikidataId = wikidataIds[i]!;
    if (!exists(entity)) {
      result.skipped.push({ wikidataId, reason: 'NOT_FOUND' });
      continue;
    }
    const m = mapPlayer(entity, lookups);
    const nationality = m.player.nationalityIso
      ? countries.get(m.player.nationalityIso)
      : undefined;
    if (!nationality) {
      result.skipped.push({ wikidataId, reason: 'NO_NATIONALITY' });
      continue;
    }

    const current = await prisma.player.findUnique({
      where: { wikidataId },
      include: { nationality: true },
    });
    if (current) {
      const fields: [string, string | null, string | null][] = [
        ['canonicalName', current.canonicalName, m.player.canonicalName],
        ['fullName', current.fullName, m.player.fullName],
        ['birthDate', dateOnly(current.birthDate), dateOnly(m.player.birthDate)],
        ['nationality', current.nationality.isoCode, m.player.nationalityIso],
        ['primaryPositionGroup', current.primaryPositionGroup, m.player.primaryPositionGroup],
      ];
      let diffs = 0;
      for (const [field, currentValue, importedValue] of fields) {
        if (currentValue === importedValue || importedValue === null) continue;
        const open = await prisma.importDiff.findFirst({
          where: {
            entityType: 'Player',
            entityId: current.id,
            field,
            importedValue,
            status: 'open',
          },
        });
        if (open) continue;
        await prisma.importDiff.create({
          data: { entityType: 'Player', entityId: current.id, field, currentValue, importedValue },
        });
        diffs++;
      }
      result.existing.push({ wikidataId, playerId: current.id, diffs });
      continue;
    }

    const spells = [];
    for (const s of m.spells) {
      const club = await clubId(s.clubQid);
      if (!club) continue;
      spells.push({
        clubId: club,
        spellType: s.spellType,
        startDate: s.startDate,
        startPrecision: s.startPrecision,
        endDate: s.endDate,
        endPrecision: s.endPrecision,
        loanFromClubId: s.loanFromClubQid ? await clubId(s.loanFromClubQid) : null,
        sourceId: wikidata.id,
        sourceRef: ref(wikidataId),
      });
    }
    const secondary = m.player.secondaryNationalityIso
      ? countries.get(m.player.secondaryNationalityIso)
      : undefined;
    const player = await prisma.player.create({
      data: {
        wikidataId,
        canonicalName: m.player.canonicalName,
        fullName: m.player.fullName,
        birthDate: m.player.birthDate,
        birthDatePrecision: m.player.birthDatePrecision,
        nationalityCountryId: nationality.id,
        secondaryNationalityCountryId: secondary?.id ?? null,
        primaryPositionGroup: m.player.primaryPositionGroup,
        secondaryPositionGroups: m.player.secondaryPositionGroups,
        sourceId: wikidata.id,
        sourceRef: ref(wikidataId),
        aliases: { create: m.aliases },
        spells: { create: spells },
      },
    });
    result.created.push({ wikidataId, playerId: player.id, spells: spells.length });
  }
  return result;
}
