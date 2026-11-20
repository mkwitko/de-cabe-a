// Kits (home/away colours) of the Brazilian clubs from the Wikipedia infoboxes (CC BY-SA 4.0 text,
// colour codes are facts): pt "Info/Clube de futebol" (corpo1, braçoesquerdo1, calções1, meias1) and
// en "Infobox football club" (body1, leftarm1, shorts1, socks1, pattern_b1). Wikidata sitelinks give
// the page titles; clubs without a QID are searched by name on pt.wikipedia (flagged match:'name').
// Raw responses are cached under .cache/kits (gitignored); 1 request/second, retries.
// Output: data/kits.json, keyed by FM club uid. No crests or logos are read, only colour codes.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/club-pack/fetch-kits.ts <csv-dir>
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseCsv } from './lib/csv.ts';

const ROOT = new URL('./', import.meta.url);
const CACHE = new URL('.cache/kits/', ROOT);
mkdirSync(CACHE, { recursive: true });
const UA = 'modo-clube-pack-builder/1.0 (open football data; colour codes of kit infoboxes)';
const API = { pt: 'https://pt.wikipedia.org/w/api.php', en: 'https://en.wikipedia.org/w/api.php' };
const WD = 'https://www.wikidata.org/w/api.php';
const dir = process.argv[2];
if (!dir) throw new Error('usage: fetch-kits.ts <csv-dir>');

let last = 0;
async function api(base: string, params: Record<string, string>): Promise<any> {
  const url = `${base}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  const file = new URL(createHash('sha1').update(url).digest('hex') + '.json', CACHE);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  for (let tries = 0; ; tries++) {
    const wait = last + 1100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      const body = res.ok ? await res.json() : null;
      if (body && !body.error) {
        writeFileSync(file, JSON.stringify(body));
        return body;
      }
    } catch {
      /* retry */
    }
    if (tries >= 5) throw new Error(`request failed: ${url}`);
    await new Promise((r) => setTimeout(r, 4000 * (tries + 1)));
  }
}
const chunks = <T>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ── Clubs in scope: Brazilian men's clubs of the FM save, with Wikidata QID and state from the geo file
const geo = JSON.parse(readFileSync(new URL('data/br-club-geo.json', ROOT), 'utf8')) as {
  cities: Record<string, { state: string | null }>;
  clubs: Record<string, { qid: string; city?: string }>;
};
const clubs = parseCsv(readFileSync(`${dir}/clubs.csv`, 'utf8'))
  .filter((c) => c.nation_id === '189' && c.gender === 'men')
  .map((c) => {
    const g = geo.clubs[c.uid!];
    return {
      uid: c.uid!,
      name: c.name!,
      short: c.short_name || c.name!,
      qid: g?.qid,
      state: (g?.city && geo.cities[g.city]?.state) || null,
    };
  });

// ── Titles: Wikidata sitelinks for the QIDs, a pt.wikipedia search for the rest
const titles = new Map<string, { pt?: string; en?: string; by: 'qid' | 'name' }>();
for (const batch of chunks(
  clubs.filter((c) => c.qid),
  50,
)) {
  const r = await api(WD, {
    action: 'wbgetentities',
    props: 'sitelinks',
    sitefilter: 'ptwiki|enwiki',
    ids: batch.map((c) => c.qid!).join('|'),
  });
  for (const c of batch) {
    const s = r.entities?.[c.qid!]?.sitelinks ?? {};
    titles.set(c.uid, { pt: s.ptwiki?.title, en: s.enwiki?.title, by: 'qid' });
  }
}
for (const c of clubs.filter((c) => !c.qid)) {
  const want = fold(c.short)
    .split(' ')
    .filter((w) => w.length > 2);
  const r = await api(API.pt, {
    action: 'query',
    list: 'search',
    srsearch: `${c.name} clube de futebol`,
    srlimit: '3',
  });
  const hit = (r.query?.search ?? []).find((h: { title: string }) =>
    want.every((w) => fold(h.title).includes(w)),
  );
  if (hit) titles.set(c.uid, { pt: hit.title, by: 'name' });
}

// ── Wikitext of every title, 20 a request
async function wikitexts(lang: 'pt' | 'en', all: string[]) {
  const out = new Map<string, { text: string; title: string }>();
  for (const batch of chunks([...new Set(all)], 20)) {
    const r = await api(API[lang], {
      action: 'query',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      redirects: '1',
      titles: batch.join('|'),
    });
    const alias = new Map<string, string>();
    for (const x of [...(r.query?.normalized ?? []), ...(r.query?.redirects ?? [])])
      alias.set(x.from, x.to);
    const resolve = (t: string) => {
      for (let i = 0; i < 3 && alias.has(t); i++) t = alias.get(t)!;
      return t;
    };
    const pages = new Map<string, string>(
      (r.query?.pages ?? []).map((p: any) => [
        p.title,
        p.revisions?.[0]?.slots?.main?.content ?? '',
      ]),
    );
    for (const t of batch) {
      const title = resolve(t);
      if (pages.get(title)) out.set(t, { text: pages.get(title)!, title });
    }
  }
  return out;
}
const pt = await wikitexts(
  'pt',
  [...titles.values()].flatMap((t) => (t.pt ? [t.pt] : [])),
);
const en = await wikitexts(
  'en',
  [...titles.values()].flatMap((t) => (t.en ? [t.en] : [])),
);

// ── Infobox parameters -> kit
const param = (text: string, keys: string[]) => {
  for (const k of keys) {
    const m = new RegExp(`^\\s*\\|\\s*${k}\\s*=\\s*(.*)$`, 'im').exec(text);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return undefined;
};
const hex = (v: string | undefined) => {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})\b/i.exec(v ?? '');
  if (!m) return undefined;
  const h = m[1]!.toLowerCase();
  return '#' + (h.length === 3 ? [...h].map((x) => x + x).join('') : h);
};
/** The infobox names the pattern by a file ("_redhoops"): map the words to our four pattern ids. */
const patternOf = (raw: string | undefined) => {
  const v = (raw ?? '').toLowerCase();
  if (/hoop|horiz|faixa/.test(v)) return 'hoops';
  if (/sash|diag|transv|banda/.test(v)) return 'sash';
  if (/half|metade/.test(v)) return 'halves';
  if (/stripe|vert|listr/.test(v)) return 'stripes';
  return undefined;
};
type Kit = { body: string; sleeves: string; shorts: string; socks: string; pattern?: string };
function kitOf(n: 1 | 2, ptText?: string, enText?: string): Kit | undefined {
  const get = (ptKeys: string[], enKeys: string[]) =>
    hex(
      ptText &&
        param(
          ptText,
          ptKeys.map((k) => k + n),
        ),
    ) ??
    hex(
      enText &&
        param(
          enText,
          enKeys.map((k) => k + n),
        ),
    );
  const body = get(['corpo'], ['body']);
  if (!body) return undefined;
  const sleeves = get(['braçoesquerdo', 'braçodireito'], ['leftarm', 'rightarm']) ?? body;
  const shorts = get(['calções', 'calcoes'], ['shorts']) ?? body;
  const socks = get(['meias'], ['socks']) ?? shorts;
  const pattern = patternOf(
    (ptText && param(ptText, [`padrão_corpo${n}`, `padrao_corpo${n}`, `pattern_b${n}`])) ||
      (enText && param(enText, [`pattern_b${n}`])) ||
      undefined,
  );
  return { body, sleeves, shorts, socks, ...(pattern ? { pattern } : {}) };
}

const urlOf = (lang: 'pt' | 'en', title: string) =>
  `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
const out: Record<string, unknown> = {};
const cov = { clubs: clubs.length, home: 0, away: 0, byName: 0 };
for (const c of clubs) {
  const t = titles.get(c.uid);
  const p = t?.pt ? pt.get(t.pt) : undefined;
  const e = t?.en ? en.get(t.en) : undefined;
  const home = kitOf(1, p?.text, e?.text);
  if (!home) continue;
  const away = kitOf(2, p?.text, e?.text);
  cov.home++;
  if (away) cov.away++;
  if (t!.by === 'name') cov.byName++;
  out[c.uid] = {
    ...(c.qid ? { qid: c.qid } : {}),
    name: c.name,
    state: c.state,
    match: t!.by,
    source: p ? urlOf('pt', p.title) : urlOf('en', e!.title),
    home,
    ...(away ? { away } : {}),
  };
}
writeFileSync(
  new URL('data/kits.json', ROOT),
  JSON.stringify(
    {
      source:
        'pt.wikipedia Info/Clube de futebol + en.wikipedia Infobox football club (kit colour parameters; CC BY-SA 4.0), titles via Wikidata sitelinks (CC0); see FONTES.md',
      fetchedAt: new Date().toISOString().slice(0, 10),
      coverage: cov,
      clubs: out,
    },
    null,
    1,
  ),
);
console.log(cov);
