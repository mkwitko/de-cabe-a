// Repairs club short names wrongly copied between clubs by the curator's fuzzy matching
// ("Bayer 04 Leverkusen" shown as "Bayern de Munique", Dortmund as Mönchengladbach, Argentinos
// Juniors as Boca Juniors). For each short name shared by several clubs: the club whose own name
// has the short name's distinctive word keeps it; reserve/youth/women teams get a suffix; the
// others get their Wikipedia title (pt, else en) via Wikidata sitelinks. Their spells lose
// games/goals (they may have come from the other club's infobox entry). Prints the affected
// club ids for replacing levels. Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/repair-club-names.ts [--dry]
import { writeFileSync } from 'node:fs';
import { createPrisma } from '../../apps/api/src/db';
import { fetchEntities } from '../../apps/api/src/modules/data-import/wikidata-client';
import { normalizeName } from '../../packages/engine/src/index';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const dry = process.argv.includes('--dry');
const GENERIC = new Set(
  'fc cf ac sc afc club clube futebol football futbol fussball sport sporting sociedade associacao atletico atletica asociacion deportivo deportiva esporte esportivo real union united city town athletic juniors junior de do da del la le los las and e of the 1 2 04 05 1893 1899 1900 1907'.split(
    ' ',
  ),
);
const words = (s: string) =>
  normalizeName(s)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !GENERIC.has(w));
const RESERVE =
  /(\bII\b|\bB\b|\bC\b|Jong|Juvenil|Youth|Junior Team|Sub-?\d+|U\d{2}|Women|feminino|Feminino|Femenino|Frauen)/;
const suffixOf = (name: string) => {
  if (/Women|feminino|Femenino|Frauen/i.test(name)) return 'Feminino';
  if (/\bII\b/.test(name)) return 'II';
  if (/\bB\b|Jong|\bC\b/.test(name)) return 'B';
  return 'Sub-20';
};

const clubs = await prisma.club.findMany({
  select: {
    id: true,
    name: true,
    shortName: true,
    wikidataId: true,
    _count: { select: { spells: true } },
  },
});
const groups = new Map<string, typeof clubs>();
for (const c of clubs) groups.set(c.shortName, [...(groups.get(c.shortName) ?? []), c]);

const changes: { id: string; from: string; to: string; reason: string }[] = [];
const toTitle: typeof clubs = [];
for (const [short, cs] of groups) {
  if (cs.length < 2) continue;
  const key = words(short);
  // Owner: the club whose own name shares the most distinctive words with the short name
  // (exact or prefix: Lyon/Lyonnais), then the one with the most history.
  const hit = (w: string, xs: string[]) =>
    xs.some(
      (x) => x === w || (x.length >= 4 && w.length >= 4 && (x.startsWith(w) || w.startsWith(x))),
    );
  const score = (c: (typeof cs)[number]) => key.filter((w) => hit(w, words(c.name))).length;
  const owner = cs
    .filter((c) => !RESERVE.test(c.name))
    .sort((a, b) => score(b) - score(a) || b._count.spells - a._count.spells)[0];
  for (const c of cs) {
    if (c === owner) continue;
    if (RESERVE.test(c.name) && owner && words(c.name).some((w) => words(owner.name).includes(w)))
      changes.push({
        id: c.id,
        from: short,
        to: `${short} ${suffixOf(c.name)}`,
        reason: 'reserve',
      });
    else toTitle.push(c);
  }
}
// Wikipedia titles for the clubs that had another club's name.
const ids = toTitle.map((c) => c.wikidataId).filter((x): x is string => Boolean(x));
const ents: Awaited<ReturnType<typeof fetchEntities>> = {};
for (let i = 0; i < ids.length; i += 50)
  for (let tries = 0; tries < 5; tries++) {
    try {
      Object.assign(ents, await fetchEntities(ids.slice(i, i + 50)));
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 4000 * (tries + 1))); // DNS / network hiccups
    }
  }
for (const c of toTitle) {
  const e = c.wikidataId ? ents[c.wikidataId] : undefined;
  const title = (e?.sitelinks?.ptwiki?.title ?? e?.sitelinks?.enwiki?.title ?? c.name)
    .replace(/\s*\(.*\)\s*$/, '')
    .trim();
  const oldW = words(c.shortName);
  const newW = words(title);
  const has = (xs: string[], w: string) =>
    xs.some(
      (x) => x === w || (x.length >= 4 && w.length >= 4 && (x.startsWith(w) || w.startsWith(x))),
    );
  if (oldW.every((w) => has(newW, w)) && newW.every((w) => has(oldW, w))) continue; // same name
  // Old name inside the new one ("Flamengo" -> "Clube de Regatas do Flamengo", "Lyon" ->
  // "Lyon-La Duchère"): renamed, numbers kept. Otherwise it was another club's name: numbers
  // may have come from that club's infobox entry, so they are cleared.
  changes.push({
    id: c.id,
    from: c.shortName,
    to: title,
    reason: oldW.every((w) => has(newW, w)) ? 'longer name' : 'wrong name',
  });
}
console.log(
  `${changes.length} clubs to rename (${changes.filter((c) => c.reason === 'wrong name').length} had another club's name)`,
);
for (const c of changes.filter((x) => x.reason === 'wrong name').slice(0, 40))
  console.log(`  ${c.from} -> ${c.to}`);
writeFileSync(
  new URL('./club-name-repair.json', import.meta.url),
  JSON.stringify({ ranAt: new Date().toISOString(), changes }, null, 1) + '\n',
);
if (!dry) {
  for (const c of changes)
    await prisma.club.update({ where: { id: c.id }, data: { shortName: c.to } });
  const wrong = changes.filter((c) => c.reason === 'wrong name').map((c) => c.id);
  const cleared = await prisma.careerSpell.updateMany({
    where: { clubId: { in: wrong }, verificationStatus: 'verified' },
    data: { appearances: null, goals: null },
  });
  console.log(
    `renamed ${changes.length}; cleared games/goals of ${cleared.count} spells at clubs that had another club's name`,
  );
}
await prisma.$disconnect();
