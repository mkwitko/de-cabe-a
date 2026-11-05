/**
 * Dev seed (ARCHITECTURE.md §10): sources, every ISO 3166-1 country, ~50 clubs.
 * Idempotent: upserts by natural keys. Players come from the Wikidata import (slice 4).
 */
import { readFileSync } from 'node:fs';
import { createPrisma } from '../src/db';

// ISO 3166-1 alpha-2, all 249 officially assigned codes.
const ISO_CODES =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(
    ' ',
  );

const SOURCES = [
  {
    code: 'wikidata',
    name: 'Wikidata',
    license: 'CC0-1.0',
    commercialUseAllowed: true,
    url: 'https://www.wikidata.org',
  },
  {
    code: 'wikipedia-pt',
    name: 'Wikipédia em português',
    license: 'CC-BY-SA-4.0',
    commercialUseAllowed: true,
    attributionText: 'Wikipédia, a enciclopédia livre',
    url: 'https://pt.wikipedia.org',
  },
  {
    code: 'manual',
    name: 'Curadoria editorial',
    license: 'proprietary',
    commercialUseAllowed: true,
  },
];

/** [wikidataId, name, shortName, isoCode, foundedYear] — from Wikidata (CC0), see seed-data/README. */
type ClubRow = [string, string, string, string, number | null];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const prisma = createPrisma(url);
  const names = new Intl.DisplayNames(['pt-BR'], { type: 'region' });

  for (const s of SOURCES)
    await prisma.source.upsert({ where: { code: s.code }, create: s, update: s });
  const wikidata = await prisma.source.findUniqueOrThrow({ where: { code: 'wikidata' } });

  for (const isoCode of ISO_CODES) {
    const name = names.of(isoCode) ?? isoCode;
    await prisma.country.upsert({
      where: { isoCode },
      create: { isoCode, name },
      update: { name },
    });
  }
  const countryId = new Map(
    (await prisma.country.findMany({ select: { id: true, isoCode: true } })).map((c) => [
      c.isoCode,
      c.id,
    ]),
  );

  const clubs: ClubRow[] = JSON.parse(
    readFileSync(new URL('./seed-data/clubs.json', import.meta.url), 'utf8'),
  );
  for (const [wikidataId, name, shortName, iso, foundedYear] of clubs) {
    const cId = countryId.get(iso);
    if (!cId) throw new Error(`Unknown country ${iso} for club ${wikidataId}`);
    const data = {
      name,
      shortName,
      countryId: cId,
      foundedYear,
      sourceId: wikidata.id,
      sourceRef: `https://www.wikidata.org/wiki/${wikidataId}`,
    };
    // verificationStatus stays as-is on update: re-seeding never downgrades a verified club.
    await prisma.club.upsert({
      where: { wikidataId },
      create: { wikidataId, ...data },
      update: data,
    });
  }

  console.log(
    `Seeded ${SOURCES.length} sources, ${ISO_CODES.length} countries, ${clubs.length} clubs.`,
  );
  await prisma.$disconnect();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
