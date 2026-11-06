// Player photos from Wikidata (P18) with their Wikimedia Commons credit (author, licence), which
// free licences require next to the image. Verified players first, then the famous imported ones.
// Re-runnable: players that already have a photo are skipped. ≤ 1 request/s.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/fetch-photos.ts [--imported]
import { createPrisma } from '../../apps/api/src/db';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const UA = 'DeCabeca/0.1 (football quiz; research script)';
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
let last = 0;
async function get(url: string): Promise<unknown> {
  for (let tries = 0; tries < 4; tries++) {
    const wait = last + 1100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.ok) return res.json();
    } catch {
      /* retried */
    }
    await new Promise((r) => setTimeout(r, 5000 * (tries + 1)));
  }
  return null;
}
const strip = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);

const players = await prisma.player.findMany({
  where: {
    wikidataId: { not: null },
    photoFile: null,
    ...(process.argv.includes('--imported')
      ? { verificationStatus: 'imported', notabilityTier: { in: ['T1', 'T2'] } }
      : { verificationStatus: 'verified' }),
  },
  select: { id: true, wikidataId: true },
});
log(`${players.length} players without photo`);
let saved = 0;
for (let i = 0; i < players.length; i += 50) {
  const batch = players.slice(i, i + 50);
  const ents = (await get(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=${batch.map((p) => p.wikidataId).join('|')}`,
  )) as {
    entities?: Record<
      string,
      { claims?: { P18?: { mainsnak: { datavalue?: { value: string } } }[] } }
    >;
  } | null;
  const files = new Map<string, string>(); // playerId -> file
  for (const p of batch) {
    const f = ents?.entities?.[p.wikidataId!]?.claims?.P18?.[0]?.mainsnak.datavalue?.value;
    if (f) files.set(p.id, f);
  }
  if (!files.size) continue;
  const titles = [...new Set(files.values())].map((f) => `File:${f}`);
  const info = (await get(
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&iiextmetadatafilter=Artist|LicenseShortName&titles=${encodeURIComponent(titles.join('|'))}`,
  )) as {
    query?: {
      normalized?: { from: string; to: string }[];
      pages?: Record<
        string,
        { title: string; imageinfo?: { extmetadata?: Record<string, { value: string }> }[] }
      >;
    };
  } | null;
  const norm = new Map((info?.query?.normalized ?? []).map((n) => [n.from, n.to]));
  const byTitle = new Map(
    Object.values(info?.query?.pages ?? {}).map((pg) => [pg.title, pg.imageinfo?.[0]?.extmetadata]),
  );
  for (const [playerId, file] of files) {
    const meta = byTitle.get(norm.get(`File:${file}`) ?? `File:${file}`);
    const license = meta?.LicenseShortName?.value;
    // Only freely licensed files with a known licence (Commons hosts only those, but be explicit).
    if (!license) continue;
    await prisma.player.update({
      where: { id: playerId },
      data: {
        photoFile: file,
        photoAuthor: strip(meta?.Artist?.value ?? '') || null,
        photoLicense: license,
      },
    });
    saved++;
  }
  if ((i / 50) % 10 === 0) log(`${i + batch.length}/${players.length}, ${saved} photos`);
}
log(`done: ${saved} photos saved`);
await prisma.$disconnect();
