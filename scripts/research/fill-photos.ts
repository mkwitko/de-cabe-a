// Fills Player.photoFile/photoAuthor/photoLicense (Wikimedia Commons) for players without one.
// Targets: Career Path answers and anyone with a sticker first, then every T1/T2.
// Source order: Wikidata P18 (preferred rank first, every candidate) -> Wikipedia page image
// (pt, en) -> the Commons category of P373 (reported only, never applied: picks are unreliable). Only free licences (CC0, PD, CC BY, CC BY-SA).
// Dry run by default; --apply writes to the DB in DATABASE_URL (.env; local dev, never prod).
// Idempotent: only players with photoFile null are touched. Responses cached in .cache/.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/fill-photos.ts [--apply]
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createPrisma } from '../../apps/api/src/db';
import { cleanArtist, isFreeLicense } from './lib/photo-license';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const APPLY = process.argv.includes('--apply');
const prisma = createPrisma(process.env.DATABASE_URL!);
const UA = 'decabeca-research';
const CACHE = new URL('./.cache/photos/', import.meta.url).pathname;
mkdirSync(CACHE, { recursive: true });
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

let last = 0;
async function get<T = any>(url: string): Promise<T | null> {
  const file = CACHE + createHash('sha1').update(url).digest('hex') + '.json';
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  for (let tries = 0; tries < 4; tries++) {
    const wait = last + 500 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.ok) {
        const json = await res.json();
        writeFileSync(file, JSON.stringify(json));
        return json as T;
      }
    } catch {
      /* retried */
    }
    await new Promise((r) => setTimeout(r, 4000 * (tries + 1)));
  }
  return null;
}
const chunks = <T>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const IMG = /\.(jpe?g|png|webp)$/i;

type Info = { license: string; author: string; free: boolean };
const infoCache = new Map<string, Info | null>();
/** Licence + author of Commons files (batched, 50 titles a request). */
async function fileInfo(files: string[]) {
  const todo = [...new Set(files)].filter((f) => !infoCache.has(f));
  for (const batch of chunks(todo, 50)) {
    const r = await get(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&iiextmetadatafilter=Artist|LicenseShortName&titles=${encodeURIComponent(batch.map((f) => `File:${f}`).join('|'))}`,
    );
    const norm = new Map<string, string>((r?.query?.normalized ?? []).map((n: any) => [n.from, n.to]));
    const byTitle = new Map<string, any>(
      Object.values<any>(r?.query?.pages ?? {}).map((p) => [p.title, p.imageinfo?.[0]?.extmetadata]),
    );
    for (const f of batch) {
      const m = byTitle.get(norm.get(`File:${f}`) ?? `File:${f}`);
      const license = m?.LicenseShortName?.value as string | undefined;
      infoCache.set(f, license ? { license, author: cleanArtist(m?.Artist?.value), free: isFreeLicense(license) } : null);
    }
  }
  return (f: string) => infoCache.get(f) ?? null;
}

// --- targets
const stickerIds = (await prisma.sticker.findMany({ distinct: ['playerId'], select: { playerId: true } })).map((s) => s.playerId);
const answerIds = (
  await prisma.challengePlayerUsage.findMany({
    where: { role: 'answer', challenge: { gameMode: 'CAREER_PATH' } },
    distinct: ['playerId'],
    select: { playerId: true },
  })
).map((s) => s.playerId);
const priority = new Set([...answerIds, ...stickerIds]);
const select = { id: true, canonicalName: true, wikidataId: true, notabilityTier: true } as const;
const missing = await prisma.player.findMany({
  where: { photoFile: null, OR: [{ id: { in: [...priority] } }, { notabilityTier: { in: ['T1', 'T2'] } }] },
  select,
});
missing.sort((a, b) => Number(priority.has(b.id)) - Number(priority.has(a.id)));
const tiers = async () =>
  Object.fromEntries(
    (await prisma.player.groupBy({ by: ['notabilityTier'], _count: true, where: { photoFile: null, OR: [{ id: { in: [...priority] } }, { notabilityTier: { in: ['T1', 'T2'] } }] } })).map(
      (g) => [g.notabilityTier, g._count],
    ),
  );
const before = await tiers();
log(`targets without photo: ${missing.length} (priority ${missing.filter((p) => priority.has(p.id)).length})`, before);

// --- Wikidata: P18 candidates, P373 category, sitelinks
type Cand = { file: string; source: string };
const cands = new Map<string, Cand[]>();
const meta = new Map<string, { cat?: string; pt?: string; en?: string }>();
const withQ = missing.filter((p) => p.wikidataId);
for (const batch of chunks(withQ, 50)) {
  const r = await get(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|sitelinks&ids=${batch.map((p) => p.wikidataId).join('|')}`,
  );
  for (const p of batch) {
    const e = r?.entities?.[p.wikidataId!];
    const p18: any[] = (e?.claims?.P18 ?? []).filter((c: any) => c.rank !== 'deprecated' && c.mainsnak?.datavalue?.value);
    p18.sort((a, b) => Number(b.rank === 'preferred') - Number(a.rank === 'preferred'));
    cands.set(p.id, p18.map((c) => ({ file: c.mainsnak.datavalue.value as string, source: 'wikidata-P18' })).filter((c) => IMG.test(c.file)));
    meta.set(p.id, {
      cat: e?.claims?.P373?.[0]?.mainsnak?.datavalue?.value,
      pt: e?.sitelinks?.ptwiki?.title,
      en: e?.sitelinks?.enwiki?.title,
    });
  }
}
await fileInfo([...cands.values()].flat().map((c) => c.file));

type Pick = Cand & Info;
const picked = new Map<string, Pick>();
const rejected = new Map<string, string[]>(); // playerId -> "file (licence)"
const tryCands = (id: string, list: Cand[]) => {
  for (const c of list) {
    const i = infoCache.get(c.file);
    if (!i) continue;
    if (i.free) return void picked.set(id, { ...c, ...i });
    rejected.set(id, [...(rejected.get(id) ?? []), `${c.file} (${i.license})`]);
  }
};
for (const p of withQ) tryCands(p.id, cands.get(p.id) ?? []);

// --- fallback 1: Wikipedia page image (pt, then en)
for (const lang of ['pt', 'en'] as const) {
  const left = withQ.filter((p) => !picked.has(p.id) && meta.get(p.id)?.[lang]);
  for (const batch of chunks(left, 50)) {
    const titles = batch.map((p) => meta.get(p.id)![lang]!);
    const r = await get(
      `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=name&redirects=1&titles=${encodeURIComponent(titles.join('|'))}`,
    );
    const alias = new Map<string, string>();
    for (const k of ['normalized', 'redirects']) for (const n of r?.query?.[k] ?? []) alias.set(n.from, n.to);
    const img = new Map<string, string>(Object.values<any>(r?.query?.pages ?? {}).filter((pg) => pg.pageimage).map((pg) => [pg.title, pg.pageimage]));
    const found = new Map<string, string>();
    for (const p of batch) {
      let t = meta.get(p.id)![lang]!;
      for (let i = 0; i < 3 && alias.has(t); i++) t = alias.get(t)!;
      const f = img.get(t);
      if (f && IMG.test(f)) found.set(p.id, f.replaceAll('_', ' '));
    }
    await fileInfo([...found.values()]);
    for (const [id, file] of found) tryCands(id, [{ file, source: `wikipedia-${lang}-pageimage` }]);
  }
}

// --- fallback 2: Commons category of P373 (first free image; category is named after the person)
for (const p of withQ.filter((p) => !picked.has(p.id) && meta.get(p.id)?.cat)) {
  const r = await get(
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=categorymembers&cmtype=file&cmlimit=15&cmtitle=${encodeURIComponent('Category:' + meta.get(p.id)!.cat)}`,
  );
  const files: string[] = (r?.query?.categorymembers ?? []).map((m: any) => (m.title as string).replace(/^File:/, '')).filter((f: string) => IMG.test(f));
  await fileInfo(files);
  tryCands(p.id, files.map((file) => ({ file, source: 'commons-category' })));
}

// --- report / apply
const bySource: Record<string, number> = {};
for (const v of picked.values()) bySource[v.source] = (bySource[v.source] ?? 0) + 1;
const nameOf = new Map(missing.map((p) => [p.id, `${p.canonicalName} [${p.notabilityTier}${priority.has(p.id) ? ',prio' : ''}]`]));
const noQ = missing.filter((p) => !p.wikidataId).map((p) => nameOf.get(p.id));
const nonFree = [...rejected].filter(([id]) => !picked.has(id)).map(([id, l]) => `${nameOf.get(id)}: ${l.join('; ')}`);
const still = missing.filter((p) => !picked.has(p.id));
log('found', picked.size, bySource);
log(`skipped for non-free licence only (${nonFree.length}):`, nonFree.slice(0, 40));
log(`no wikidataId (${noQ.length})`);
for (const p of missing.filter((p) => /ronaldinho/i.test(p.canonicalName))) {
  log('Ronaldinho:', nameOf.get(p.id), picked.get(p.id) ?? 'no photo found');
}
writeFileSync(
  new URL('./.cache/photos-report.json', import.meta.url),
  JSON.stringify({ found: [...picked].map(([id, v]) => ({ player: nameOf.get(id), ...v })), nonFree, noWikidataId: noQ, still: still.map((p) => nameOf.get(p.id)) }, null, 1),
);

if (APPLY) {
  let saved = 0;
  for (const [id, v] of picked) {
    if (v.source === 'commons-category') continue; // unreliable (coins, crowd shots): review by hand
    const r = await prisma.player.updateMany({
      where: { id, photoFile: null },
      data: { photoFile: v.file, photoAuthor: v.author || null, photoLicense: v.license },
    });
    saved += r.count;
  }
  log(`applied: ${saved} photos`, 'before', before, 'after', await tiers());
} else {
  log('dry run (no writes). Use --apply');
}
const notable = still.filter((p) => priority.has(p.id) || p.notabilityTier === 'T1').map((p) => nameOf.get(p.id));
log(`still without photo: ${still.length}; priority/T1 (${notable.length}):`, notable.slice(0, 60));
await prisma.$disconnect();
