// Compares each club's country (clubs with a verified spell) with its Wikidata country (P17, the
// preferred statement, else any) and writes the disagreements: the input of the clubCountries fixes
// in live-data-fixes-2.json. Clubs whose Wikidata countries include ours are left alone (a Yugoslav
// club now in Serbia lists both).
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/check-club-countries.ts <out.json>
import { writeFileSync } from 'node:fs';
import { createPrisma } from '../../apps/api/src/db';
import { fetchEntities } from '../../apps/api/src/modules/data-import/wikidata-client';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const out = process.argv[2];
if (!out) throw new Error('usage: check-club-countries.ts <out.json>');
const prisma = createPrisma(process.env.DATABASE_URL!);
const clubs = await prisma.club.findMany({
  where: {
    wikidataId: { not: null },
    spells: { some: { verificationStatus: 'verified', spellType: { not: 'youth' } } },
  },
  select: { id: true, wikidataId: true, shortName: true, country: { select: { isoCode: true } } },
});
const ents = await fetchEntities(clubs.map((c) => c.wikidataId!));
// Country ids -> ISO codes (P297), as the importer does: our Country rows carry no Wikidata id.
const countryQids = new Set(
  Object.values(ents).flatMap((e) =>
    (e.claims?.P17 ?? []).map((cl) => (cl.mainsnak.datavalue?.value as { id?: string })?.id ?? ''),
  ),
);
countryQids.delete('');
// Country entities are large: 50 per request silently comes back empty, so 10 at a time.
const isoByQid = new Map<string, string>();
const qs = [...countryQids];
for (let i = 0; i < qs.length; i += 10)
  for (const e of Object.values(await fetchEntities(qs.slice(i, i + 10)))) {
    const iso = e.claims?.P297?.[0]?.mainsnak.datavalue?.value;
    if (typeof iso === 'string') isoByQid.set(e.id, iso);
  }
console.log(`${isoByQid.size} of ${qs.length} countries have an ISO code`);
const rows = [];
for (const c of clubs) {
  const claims = ents[c.wikidataId!]?.claims?.P17 ?? [];
  const qid = (cl: (typeof claims)[number]) =>
    (cl.mainsnak.datavalue?.value as { id?: string } | undefined)?.id;
  const all = claims.map(qid).filter((q): q is string => !!q);
  if (!all.length) continue;
  const preferred = claims.filter((cl) => cl.rank === 'preferred').map(qid);
  const isos = [...new Set(all.map((q) => isoByQid.get(q)).filter((x): x is string => !!x))];
  if (isos.includes(c.country.isoCode)) continue;
  rows.push({
    id: c.id,
    wikidataId: c.wikidataId,
    club: c.shortName,
    from: c.country.isoCode,
    wikidata: all,
    to: isoByQid.get(preferred[0] ?? all[0]!) ?? null,
  });
}
writeFileSync(out, JSON.stringify(rows, null, 1) + '\n');
console.log(`${clubs.length} clubs checked; ${rows.length} with another country on Wikidata`);
await prisma.$disconnect();
