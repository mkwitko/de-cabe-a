// Some players carry their full registry name as the main name ("Marcelo Vieira da Silva
// Júnior"). The name fans use is the title of their Wikipedia article, minus the "(footballer,
// born 1988)" part: "Marcelo". For every player whose main name has 3+ words, take the shorter
// of the Portuguese and English article titles (Portuguese on a tie: "Everton Cebolinha") when
// it has fewer words, and keep the old name as a search alias. Re-runnable. --dry lists only.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/common-names.ts [--dry]
import { normalizeName } from '../../packages/engine/src/text/normalize';
import { createPrisma } from '../../apps/api/src/db';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const DRY = process.argv.includes('--dry');
const words = (s: string) => s.trim().split(/\s+/).length;

/** The common name, or null to keep the current one. */
export function commonName(current: string, titles: { pt?: string; en?: string }) {
  const clean = (t?: string) => t?.replace(/\s*\([^)]*\)\s*$/, '').trim() || null;
  const pt = clean(titles.pt);
  const en = clean(titles.en);
  const best = [pt, en]
    .filter((t): t is string => Boolean(t) && !/[,:]/.test(t!))
    .sort((a, b) => words(a) - words(b))[0];
  // A bare Wikidata id ('Q165772') is a name nobody uses.
  if (/^Q\d+$/.test(current)) return best ?? null;
  return best && words(best) < words(current) ? best : null;
}
if (
  commonName('Marcelo Vieira da Silva Júnior', {
    pt: 'Marcelo Vieira da Silva Júnior',
    en: 'Marcelo (footballer, born 1988)',
  }) !== 'Marcelo' ||
  commonName('Everton Sousa Soares', { pt: 'Everton Cebolinha', en: 'Everton Soares' }) !==
    'Everton Cebolinha' ||
  commonName('Kaká', { pt: 'Kaká', en: 'Kaká' }) !== null
)
  throw new Error('commonName self-check failed');

const players = (
  await prisma.player.findMany({
    where: { verificationStatus: { not: 'rejected' }, wikidataId: { not: null } },
    select: { id: true, canonicalName: true, wikidataId: true },
  })
).filter((p) => words(p.canonicalName) >= 3 || /^Q\d+$/.test(p.canonicalName));
console.log(`${players.length} players with 3+ word names`);
let changed = 0;
let last = 0;
for (let i = 0; i < players.length; i += 50) {
  const batch = players.slice(i, i + 50);
  const wait = last + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks|labels&languages=pt|en|es|it|fr|de&sitefilter=ptwiki|enwiki&ids=${batch.map((p) => p.wikidataId).join('|')}`;
  let res: {
    entities?: Record<
      string,
      { sitelinks?: Record<string, { title: string }>; labels?: Record<string, { value: string }> }
    >;
  } = {};
  // Wikidata answers "too many requests" as text now and then: back off and retry.
  for (let tries = 0; tries < 5; tries++) {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'DeCabeca/0.1 (football quiz; research script)' },
    }).catch(() => null);
    const body = r?.ok ? await r.json().catch(() => null) : null;
    if (body) {
      res = body;
      break;
    }
    await new Promise((ok) => setTimeout(ok, 10_000 * (tries + 1)));
  }
  for (const p of batch) {
    const s = res.entities?.[p.wikidataId!]?.sitelinks ?? {};
    const labels = res.entities?.[p.wikidataId!]?.labels ?? {};
    // No article at all: any label beats a bare Wikidata id.
    const label = Object.values(labels)[0]?.value;
    const name =
      commonName(p.canonicalName, { pt: s.ptwiki?.title, en: s.enwiki?.title }) ??
      (/^Q\d+$/.test(p.canonicalName) && label ? label : null);
    if (!name) continue;
    changed++;
    if (changed <= 15 || DRY) console.log(`${p.canonicalName} -> ${name}`);
    if (DRY) continue;
    await prisma.$transaction([
      prisma.player.update({ where: { id: p.id }, data: { canonicalName: name } }),
      // The registry name stays searchable.
      prisma.playerAlias.updateMany({
        where: { playerId: p.id, kind: 'canonical' },
        data: { kind: 'full', isPrimary: false },
      }),
      prisma.playerAlias.upsert({
        where: { playerId_normalized: { playerId: p.id, normalized: normalizeName(name) } },
        create: {
          playerId: p.id,
          alias: name,
          normalized: normalizeName(name),
          kind: 'canonical',
          isPrimary: true,
        },
        update: { alias: name, kind: 'canonical', isPrimary: true },
      }),
    ]);
  }
}
console.log(`${DRY ? 'would rename' : 'renamed'} ${changed} players`);
await prisma.$disconnect();
