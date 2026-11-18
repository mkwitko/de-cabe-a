// Modo Clube staging: current squads of Brazilian clubs (Série A–D 2026) from pt.wikipedia
// (CC BY-SA 4.0) + birth date / nationality from Wikidata (CC0). Open sources only.
//
// Flow: master.json BR clubs -> ptwiki title (Wikidata sitelink) -> page wikitext -> "Elenco" section
// -> squad template (usually {{Elenco atual de futebol}}, transcluded from Predefinição:Elenco ...)
// -> players (name, number, position, wiki link) -> link -> QID -> birth date, nationalities.
// Division membership comes from the four 2026 season articles (table "Participantes").
// Never invents: a field the page does not carry is absent. Pages without a squad are recorded.
// All HTTP is cached under .cache/ptwiki (gitignored) and throttled to 1 request/second.
// Output: data/squads-ptwiki.json and out/squads-ptwiki-coverage.json.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/club-pack/enrich-ptwiki.ts [--refresh]
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('./', import.meta.url);
const CACHE = new URL('.cache/ptwiki/', ROOT);
mkdirSync(CACHE, { recursive: true });
mkdirSync(new URL('data/', ROOT), { recursive: true });
const REFRESH = process.argv.includes('--refresh');
const UA =
  'DeCabecaImport/0.1 (open football data import; pt.wikipedia + wikidata reader; CC BY-SA attribution kept)';
const PT = 'https://pt.wikipedia.org/w/api.php';
const WD = 'https://www.wikidata.org/w/api.php';
const SEASON = 'Campeonato Brasileiro de Futebol de 2026 - Série ';
const DIVISIONS = ['A', 'B', 'C', 'D'] as const;
const COLLECTED = new Date().toISOString().slice(0, 10);
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const chunks = <T>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

// ---------- HTTP: cached, 1 req/s ----------
let last = 0;
async function api(base: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({
    format: 'json',
    formatversion: '2',
    ...(base === PT ? { maxlag: '5' } : {}),
    ...params,
  });
  const url = `${base}?${qs}`;
  const file = new URL(createHash('sha1').update(url).digest('hex') + '.json', CACHE);
  if (!REFRESH && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  for (let tries = 0; ; tries++) {
    const wait = last + 1100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    let res: Response | null = null;
    let body: any = null;
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip' } });
      body = res.ok ? await res.json() : null;
    } catch (e) {
      if (tries >= 5) throw e;
    }
    if (body && !body.error) {
      writeFileSync(file, JSON.stringify(body));
      return body;
    }
    if (tries >= 5) throw new Error(`${base} ${res?.status} ${JSON.stringify(body?.error ?? '')}`);
    await new Promise((r) => setTimeout(r, 5000 * (tries + 1)));
  }
}

// ---------- pt.wikipedia helpers ----------
interface Rev {
  title: string;
  revid: number;
  timestamp: string;
  wikitext: string;
}
async function getRev(title: string): Promise<Rev | null> {
  const r = await api(PT, {
    action: 'query',
    prop: 'revisions',
    rvprop: 'ids|timestamp|content',
    rvslots: 'main',
    redirects: '1',
    titles: title,
  });
  const p = r.query?.pages?.[0];
  const rv = p?.revisions?.[0];
  if (!p || p.missing || !rv) return null;
  return {
    title: p.title,
    revid: rv.revid,
    timestamp: rv.timestamp,
    wikitext: rv.slots.main.content,
  };
}
const oldid = (r: Rev) =>
  `https://pt.wikipedia.org/w/index.php?title=${encodeURIComponent(r.title.replace(/ /g, '_'))}&oldid=${r.revid}`;

/** titles -> wikibase item (pt.wikipedia pageprops), following redirects. */
async function titlesToQids(titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const part of chunks([...new Set(titles)], 50)) {
    const r = await api(PT, {
      action: 'query',
      prop: 'pageprops',
      ppprop: 'wikibase_item',
      redirects: '1',
      titles: part.join('|'),
    });
    const alias = new Map<string, string>(); // requested -> final title
    for (const n of r.query?.normalized ?? []) alias.set(n.from, n.to);
    for (const n of r.query?.redirects ?? []) alias.set(alias.get(n.from) ?? n.from, n.to);
    const qidOf = new Map<string, string>(
      (r.query?.pages ?? [])
        .filter((p: any) => p.pageprops?.wikibase_item)
        .map((p: any) => [p.title, p.pageprops.wikibase_item]),
    );
    for (const t of part) {
      const n1 = alias.get(t) ?? t;
      const q = qidOf.get(alias.get(n1) ?? n1);
      if (q) out.set(t, q);
    }
  }
  return out;
}

// ---------- wikitext helpers ----------
/** Splits `s` on top-level `|` (not inside {{ }} or [[ ]]). */
function splitPipes(s: string): string[] {
  const parts: string[] = [];
  let depthT = 0,
    depthL = 0,
    cur = '';
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    if (two === '{{') {
      depthT++;
      cur += two;
      i++;
    } else if (two === '}}') {
      depthT--;
      cur += two;
      i++;
    } else if (two === '[[') {
      depthL++;
      cur += two;
      i++;
    } else if (two === ']]') {
      depthL--;
      cur += two;
      i++;
    } else if (s[i] === '|' && depthT === 0 && depthL === 0) {
      parts.push(cur);
      cur = '';
    } else cur += s[i];
  }
  parts.push(cur);
  return parts;
}
/** Body of the first template whose name matches `re`, balanced braces; null if none. */
function findTemplate(text: string, re: RegExp): string | null {
  const m = re.exec(text);
  if (!m) return null;
  let depth = 0;
  for (let i = m.index; i < text.length; i++) {
    const two = text.slice(i, i + 2);
    if (two === '{{') {
      depth++;
      i++;
    } else if (two === '}}' && --depth === 0) return text.slice(m.index + 2, i);
    else if (two === '}}') i++;
  }
  return null;
}
const stripNoise = (s: string) =>
  s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref(?:\s[^>]*)?\/>/gi, '')
    .replace(/<ref(?:\s[^>]*)?>(?:(?!<ref[\s>])[\s\S])*?<\/ref\s*>/gi, '');

interface Section {
  heading: string;
  level: number;
  body: string;
}
function sections(w: string): Section[] {
  const hs = [...w.matchAll(/^(={2,6})\s*(.+?)\s*\1\s*$/gm)];
  return hs.map((m, i) => ({
    heading: m[2]!,
    level: m[1]!.length,
    body: w.slice(m.index! + m[0].length, hs[i + 1]?.index ?? w.length),
  }));
}

// ---------- squad parsing ----------
interface PlayerRow {
  name: string;
  fullNameHint?: string;
  shirtNumber?: number;
  positionRaw?: string;
  flagRaw?: string; // flag template code on the page (e.g. BRA), not normalised
  link?: string; // pt.wikipedia article title when the name is linked
  loan?: { fromClub?: string };
  notes?: string[];
}
/** Display name + link target from a name cell; markers stay in `notes`. */
function parseName(raw: string): Omit<PlayerRow, 'shirtNumber' | 'positionRaw'> | null {
  let s = stripNoise(raw).trim();
  const notes: string[] = [];
  let flag: string | undefined;
  // {{Tooltip|shown|full}} / {{Nowrap|...}} wrappers
  let full: string | undefined;
  for (let i = 0; i < 4; i++) {
    s = s.replace(/\{\{\s*nowrap\s*\|([^{}]*)\}\}/gi, '$1');
    s = s.replace(/\{\{\s*tooltip\s*\|([^|{}]*)(?:\|([^{}]*))?\}\}/gi, (_, a, b) => {
      if (b) full = b.trim();
      return a;
    });
  }
  s = s.replace(/\[\[(?:Ficheiro|File|Imagem|Image):[^\]]*\]\]/gi, '');
  s = s.replace(/\{\{\s*(?:Capit[aã]o|Les[aã]o|Empr[eé]stimo)\s*\}\}/gi, (m) => {
    notes.push(m.replace(/[{}\s]/g, '').toLowerCase());
    return '';
  });
  s = s.replace(/\{\{\s*([A-Z]{2,4})b?\s*\}\}/g, (_, c) => {
    flag = c;
    return '';
  });
  let link: string | undefined;
  s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_, t, l) => {
    link ??= t.trim().replace(/#.*$/, '');
    return (l ?? t).trim();
  });
  // trailing markers such as (C), (Emp.), (emp.) – kept verbatim, never interpreted into new facts
  s = s.replace(/\s*\(([^)]{1,30})\)\s*$/, (_, n) => {
    notes.push(n);
    return '';
  });
  s = s
    .replace(/<[^>]+>/g, '')
    .replace(/'{2,}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  s = s
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/^\(?\d{1,2}\)?\s*[-–.]\s+/, '')
    .trim();
  if (!s || /^[-–—?]$/.test(s)) return null;
  return {
    name: s,
    ...(flag ? { flagRaw: flag } : {}),
    ...(full ? { fullNameHint: full } : {}),
    ...(link ? { link } : {}),
    ...(notes.length ? { notes } : {}),
  };
}
const toNum = (s: string | undefined) => {
  const n = Number((s ?? '').replace(/\D/g, ''));
  return s && /\d/.test(s) && n >= 0 && n < 1000 ? n : undefined;
};

/** {{Elenco atual de futebol |cN_jM_num/pos/nome ...}} */
function parseElencoAtual(body: string): { players: PlayerRow[]; params: Record<string, string> } {
  const params: Record<string, string> = {};
  for (const part of splitPipes(stripNoise(body)).slice(1)) {
    const eq = part.indexOf('=');
    if (eq > 0) params[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  const slots = new Set<string>();
  for (const k of Object.keys(params)) {
    const m = /^(c\d+_j\d+)_/.exec(k);
    if (m) slots.add(m[1]!);
  }
  const players: PlayerRow[] = [];
  for (const sl of [...slots].sort((a, b) => {
    const [ca, ja] = a.slice(1).split('_j').map(Number) as [number, number];
    const [cb, jb] = b.slice(1).split('_j').map(Number) as [number, number];
    return ca - cb || ja - jb;
  })) {
    const nm = parseName(params[`${sl}_nome`] ?? '');
    if (!nm) continue;
    const row: PlayerRow = { ...nm };
    const num = toNum(params[`${sl}_num`]);
    if (num !== undefined) row.shirtNumber = num;
    const pos = params[`${sl}_pos`]?.replace(/<[^>]+>/g, '').trim();
    if (pos) row.positionRaw = pos;
    players.push(row);
  }
  return { players, params };
}

/** {{Elenco de Futebol |g1num= |g1= {{BRAb}} Name ...}}: key letters are the position. */
function parseElencoPosKeys(body: string): PlayerRow[] {
  const params: Record<string, string> = {};
  for (const part of splitPipes(stripNoise(body)).slice(1)) {
    const eq = part.indexOf('=');
    if (eq > 0) params[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  const players: PlayerRow[] = [];
  for (const [k, v] of Object.entries(params)) {
    const m = /^([a-z]{1,3})(\d+)$/.exec(k);
    if (!m) continue;
    const lead = /^(?:\{\{[^{}]*\}\}\s*)*\(?(\d{1,2})\)?\s*[-–.]\s+/.exec(v);
    const nm = parseName(v);
    if (!nm) continue;
    const row: PlayerRow = { ...nm, positionRaw: m[1]!.toUpperCase() };
    const num = toNum(params[`${k}num`]) ?? toNum(lead?.[1]);
    if (num !== undefined) row.shirtNumber = num;
    if (row.notes?.includes('empréstimo') || row.notes?.includes('emprestimo')) row.loan = {};
    players.push(row);
  }
  return players;
}
/** {{football squad2 player|no=|name=|pos=}} lines inside a Navbox. */
function parseSquad2(text: string): PlayerRow[] {
  const players: PlayerRow[] = [];
  for (const m of text.matchAll(
    /\{\{\s*football squad2 player\b([^{}]*(?:\{\{[^{}]*\}\}[^{}]*)*)\}\}/gi,
  )) {
    const ps: Record<string, string> = {};
    for (const part of splitPipes('x' + m[1]!).slice(1)) {
      const eq = part.indexOf('=');
      if (eq > 0) ps[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    }
    const nm = parseName(ps.name ?? '');
    if (!nm) continue;
    const row: PlayerRow = { ...nm };
    const num = toNum(ps.no);
    if (num !== undefined) row.shirtNumber = num;
    if (ps.pos) row.positionRaw = ps.pos;
    players.push(row);
  }
  return players;
}
/** Tries the squad formats seen on pt.wikipedia, in order. */
function extractPlayers(text: string): { players: PlayerRow[]; format: string } | null {
  const t = stripNoise(text);
  const a = findTemplate(t, /\{\{\s*Elenco atual de futebol\b/i);
  if (a) {
    const r = parseElencoAtual(a).players;
    if (r.length) return { players: r, format: 'Elenco atual de futebol' };
  }
  const b = findTemplate(t, /\{\{\s*Elenco de futebol\b/i);
  if (b) {
    const r = parseElencoPosKeys(b);
    if (r.length) return { players: r, format: 'Elenco de Futebol' };
  }
  const c = parseSquad2(t);
  if (c.length) return { players: c, format: 'football squad2 player' };
  return null;
}

/** Unnamed rows of {{Bloco de navegação ...}} (the page's navbox list), e.g. "Elenco Vila Nova FC". */
const blocoRows = (text: string) => {
  const b = findTemplate(text, /\{\{\s*Bloco de navega[cç][aã]o\b/i);
  return b
    ? splitPipes(b)
        .slice(1)
        .filter((x) => !x.includes('=') && x.trim())
        .map((x) => x.trim())
    : [];
};
// ---------- model ----------
interface MasterClub {
  id: string;
  wikidataId: string | null;
  name: string | null;
  shortName: string | null;
  country: string | null;
}
const master = JSON.parse(readFileSync(new URL('out/master.json', ROOT), 'utf8')) as {
  clubs: MasterClub[];
};

interface Target {
  clubId: string;
  wikidataId: string;
  ptwikiTitle: string | null;
  name: string | null;
  inMaster: boolean;
  divisions: string[];
}
const targets = new Map<string, Target>(); // by QID

// 1. master BR clubs -> ptwiki sitelink
const brMaster = master.clubs.filter((c) => c.country === 'BR' && c.wikidataId);
for (const part of chunks(brMaster, 50)) {
  const r = await api(WD, {
    action: 'wbgetentities',
    props: 'sitelinks',
    sitefilter: 'ptwiki',
    ids: part.map((c) => c.wikidataId!).join('|'),
  });
  for (const c of part) {
    targets.set(c.wikidataId!, {
      clubId: c.id,
      wikidataId: c.wikidataId!,
      name: c.name ?? c.shortName,
      inMaster: true,
      divisions: [],
      ptwikiTitle: r.entities?.[c.wikidataId!]?.sitelinks?.ptwiki?.title ?? null,
    });
  }
}
log(
  `master BR clubs with QID: ${brMaster.length}, with ptwiki sitelink: ${[...targets.values()].filter((t) => t.ptwikiTitle).length}`,
);

// 2. division membership from the 2026 season articles (first <td> link of each row of "Participantes")
interface DivSource {
  division: string;
  title: string;
  revid: number;
  timestamp: string;
  url: string;
  clubs: number;
}
const divSources: DivSource[] = [];
for (const d of DIVISIONS) {
  const rev = await getRev(SEASON + d);
  if (!rev) {
    log(`season article missing: Série ${d}`);
    continue;
  }
  const idx =
    sections(rev.wikitext).findIndex((s) => /^participantes$/i.test(s.heading.trim())) + 1;
  if (!idx) {
    log(`no Participantes section: Série ${d}`);
    continue;
  }
  const html = (
    await api(PT, {
      action: 'parse',
      oldid: String(rev.revid),
      section: String(idx),
      prop: 'text',
      disablelimitreport: '1',
    })
  ).parse.text as string;
  const titles: string[] = [];
  for (const row of html.split(/<tr/).slice(1)) {
    const td = /<td[^>]*>([\s\S]*?)<\/td>/.exec(row)?.[1];
    const a = td && /<a href="\/wiki\/[^"]*" title="([^"]+)"/.exec(td)?.[1];
    if (a)
      titles.push(
        a
          .replace(/&amp;/g, '&')
          .replace(/&#0?39;/g, "'")
          .replace(/&quot;/g, '"'),
      );
  }
  const qids = await titlesToQids(titles);
  for (const t of titles) {
    const q = qids.get(t);
    if (!q) {
      log(`  no QID for participant "${t}" (Série ${d})`);
      continue;
    }
    const cur = targets.get(q);
    if (cur) cur.divisions.push(d);
    else
      targets.set(q, {
        clubId: `wd-${q}`,
        wikidataId: q,
        ptwikiTitle: t,
        name: t,
        inMaster: false,
        divisions: [d],
      });
  }
  divSources.push({
    division: d,
    title: rev.title,
    revid: rev.revid,
    timestamp: rev.timestamp,
    url: oldid(rev),
    clubs: titles.length,
  });
  log(`Série ${d} 2026: ${titles.length} participants`);
}
// participants added from the season table use the article title as ptwiki title already;
// master clubs without a sitelink but listed in a division: take the title from the table.

// ---------- squads ----------
interface Source {
  name: 'pt.wikipedia';
  licence: 'CC-BY-SA-4.0';
  url: string;
  revisionId: number;
  revisionTimestamp: string;
  page: string;
  collectedAt: string;
  attribution: string;
}
const srcOf = (r: Rev): Source => ({
  name: 'pt.wikipedia',
  licence: 'CC-BY-SA-4.0',
  url: oldid(r),
  revisionId: r.revid,
  revisionTimestamp: r.timestamp,
  page: r.title,
  collectedAt: COLLECTED,
  attribution: `Wikipédia, "${r.title}", revisão ${r.revid}, autores em ${oldid(r).replace(/oldid=\d+/, 'action=history')}, CC BY-SA 4.0`,
});
interface ClubOut {
  clubId: string;
  wikidataId: string;
  name: string | null;
  inMaster: boolean;
  divisions: string[];
  ptwikiTitle: string | null;
  revisionId: number | null;
  revisionTimestamp: string | null;
  sourceUrl: string | null;
  squadSource?: Source & { via: 'template' | 'inline'; format: string; template?: string };
  status:
    | 'ok'
    | 'no-sitelink'
    | 'page-missing'
    | 'no-squad-section'
    | 'unparsed-squad'
    | 'excluded-womens';
  detail?: string;
  players: (PlayerRow & {
    wikidataId?: string;
    birthDate?: string;
    nationalities?: string[];
    source?: Source;
  })[];
}
const outClubs: ClubOut[] = [];
const sortedTargets = [...targets.values()].sort((a, b) =>
  a.wikidataId.localeCompare(b.wikidataId, 'en', { numeric: true }),
);
let n = 0;
for (const t of sortedTargets) {
  n++;
  const base: ClubOut = {
    clubId: t.clubId,
    wikidataId: t.wikidataId,
    name: t.name,
    inMaster: t.inMaster,
    divisions: t.divisions,
    ptwikiTitle: t.ptwikiTitle,
    revisionId: null,
    revisionTimestamp: null,
    sourceUrl: null,
    status: 'ok',
    players: [],
  };
  outClubs.push(base);
  if (!t.ptwikiTitle) {
    base.status = 'no-sitelink';
    continue;
  }
  const page = await getRev(t.ptwikiTitle);
  if (!page) {
    base.status = 'page-missing';
    continue;
  }
  if (/feminin/i.test(page.title)) {
    base.status = 'excluded-womens';
    base.detail = "Wikidata item resolves to a women's team page";
    continue;
  }
  Object.assign(base, {
    ptwikiTitle: page.title,
    revisionId: page.revid,
    revisionTimestamp: page.timestamp,
    sourceUrl: oldid(page),
  });
  const body = stripNoise(page.wikitext);
  // Candidates, best first: squad templates inside an "Elenco" section (with its subsections), then
  // anywhere on the page. Women's / youth / other-sport squads are skipped by name.
  const secs = sections(body);
  const si = secs.findIndex((s) =>
    /^elenco|^plantel|^jogadores$|^equipe atual/i.test(s.heading.replace(/'/g, '').trim()),
  );
  let scope = '';
  if (si >= 0) {
    scope = secs[si]!.body;
    for (let k = si + 1; k < secs.length && secs[k]!.level > secs[si]!.level; k++)
      scope += '\n' + secs[k]!.body;
  }
  const SKIP =
    /feminin|sub-?\d|\bbase\b|futsal|basquet|v[oô]lei|\be-?sports?\b|hist[oó]ric|anterior|\b(19\d\d|20[01]\d|202[0-5])\b|treinador|t[eé]cnico/i;
  const names = (text: string) =>
    [
      ...[...text.matchAll(/\{\{\s*((?:Elenco|Plantel)[^{}|\n]*?)\s*(?:\|[^{}]*)?\}\}/gi)].map(
        (m) => m[1]!.trim(),
      ),
      ...blocoRows(text).filter((x) => /^(?:Elenco|Plantel)/i.test(x)),
    ].filter((x) => !SKIP.test(x));
  const plain = (x: string) =>
    x
      .replace(/\s*\(.*\)\s*$/, '')
      .trim()
      .toLowerCase();
  // the club's own navbox ({{Club name}}) often carries the squad when the article does not
  const own = new Set([plain(page.title), plain(t.name ?? '')]);
  const navboxes = [...body.slice(-4000).matchAll(/\{\{\s*([^{}|\n]+?)\s*\}\}/g)]
    .map((m) => m[1]!.trim())
    .filter((x) => own.has(plain(x)));
  const queue = [
    ...new Set([
      ...names(scope),
      ...names(body),
      ...navboxes,
      ...blocoRows(body).filter((x) => own.has(plain(x))),
    ]),
  ];
  const seen = new Set<string>();
  let found: { players: PlayerRow[]; format: string } | null = null;
  let template: Rev | null = null;
  let via: 'template' | 'inline' = 'inline';
  const tried: string[] = [];
  found = extractPlayers(scope) ?? null;
  for (let qi = 0; !found && qi < queue.length && qi < 12; qi++) {
    const nm = queue[qi]!;
    if (seen.has(nm.toLowerCase()) || /^Elenco atual de futebol$/i.test(nm)) continue;
    seen.add(nm.toLowerCase());
    const rev = await getRev('Predefinição:' + nm);
    if (!rev) {
      tried.push(`${nm}: not found`);
      continue;
    }
    const got = extractPlayers(rev.wikitext);
    if (got) {
      found = got;
      template = rev;
      via = 'template';
      break;
    }
    const inner = names(stripNoise(rev.wikitext)).filter((x) => !seen.has(x.toLowerCase()));
    queue.push(...inner);
    tried.push(
      `${nm}: ${stripNoise(rev.wikitext).trim().slice(0, 40).replace(/\s+/g, ' ') || 'empty'}`,
    );
  }
  if (!found) {
    base.status = si < 0 && queue.length === 0 ? 'no-squad-section' : 'unparsed-squad';
    base.detail = tried.length
      ? tried.join(' ; ')
      : si >= 0
        ? `section "${secs[si]!.heading}" has no known squad format`
        : undefined;
    log(`${n}/${sortedTargets.length} ${page.title}: ${base.status} ${base.detail ?? ''}`);
    continue;
  }
  const { players, format } = found;
  base.players = players;
  const sr = template ?? page;
  base.squadSource = {
    ...srcOf(sr),
    via,
    format,
    ...(template ? { template: template.title } : {}),
  };
  // the revision that matters for staleness is the one holding the squad
  base.revisionId = sr.revid;
  base.revisionTimestamp = sr.timestamp;
  base.sourceUrl = oldid(sr);
  log(
    `${n}/${sortedTargets.length} ${page.title}: ${players.length} players (${via}, ${sr.timestamp.slice(0, 10)})`,
  );
}

// ---------- player links -> QID -> birth date, nationality (Wikidata) ----------
const allLinks = [
  ...new Set(outClubs.flatMap((c) => c.players.flatMap((p) => (p.link ? [p.link] : [])))),
];
const linkQid = await titlesToQids(allLinks);
const qids = [...new Set(linkQid.values())];
interface Wd {
  human: boolean;
  birthDate?: string;
  countries: string[];
}
const wd = new Map<string, Wd>();
const claimIds = (e: any, p: string): string[] =>
  (e.claims?.[p] ?? []).flatMap((c: any) =>
    c.rank !== 'deprecated' && c.mainsnak?.datavalue?.value?.id
      ? [c.mainsnak.datavalue.value.id]
      : [],
  );
for (const part of chunks(qids, 50)) {
  const r = await api(WD, { action: 'wbgetentities', props: 'claims', ids: part.join('|') });
  for (const q of part) {
    const e = r.entities?.[q];
    if (!e || e.missing !== undefined) continue;
    const bd = (e.claims?.P569 ?? []).find((c: any) => c.rank !== 'deprecated')?.mainsnak?.datavalue
      ?.value;
    // precision 11 = day; coarser dates are not a birth date we can use
    const birthDate =
      bd && bd.precision >= 11 ? /^\+?(\d{4}-\d{2}-\d{2})/.exec(bd.time)?.[1] : undefined;
    wd.set(q, {
      human: claimIds(e, 'P31').includes('Q5'),
      ...(birthDate ? { birthDate } : {}),
      countries: claimIds(e, 'P27'),
    });
  }
}
const countryIds = [...new Set([...wd.values()].flatMap((w) => w.countries))];
const iso = new Map<string, string>();
for (const part of chunks(countryIds, 50)) {
  const r = await api(WD, { action: 'wbgetentities', props: 'claims', ids: part.join('|') });
  for (const q of part) {
    const v = r.entities?.[q]?.claims?.P297?.[0]?.mainsnak?.datavalue?.value;
    if (typeof v === 'string') iso.set(q, v);
  }
}
let linked = 0,
  human = 0,
  withBirth = 0,
  withNat = 0,
  totalPlayers = 0;
for (const c of outClubs)
  for (const p of c.players) {
    totalPlayers++;
    const q = p.link ? linkQid.get(p.link) : undefined;
    const w = q ? wd.get(q) : undefined;
    if (!q || !w) continue;
    linked++;
    if (!w.human) {
      p.notes = [...(p.notes ?? []), `link resolves to non-human item ${q}`];
      continue;
    }
    human++;
    p.wikidataId = q;
    p.source = c.squadSource;
    if (w.birthDate) {
      p.birthDate = w.birthDate;
      withBirth++;
    }
    const nat = [...new Set(w.countries.flatMap((k) => (iso.get(k) ? [iso.get(k)!] : [])))];
    if (nat.length) {
      p.nationalities = nat;
      withNat++;
    }
  }
for (const c of outClubs) for (const p of c.players) p.source ??= c.squadSource;
log(
  `players ${totalPlayers}, linked ${linked}, human QID ${human}, birthDate ${withBirth}, nationality ${withNat}`,
);

// ---------- output + coverage ----------
writeFileSync(
  new URL('data/squads-ptwiki.json', ROOT),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      licence: 'CC-BY-SA-4.0 (pt.wikipedia text); birth date / nationality from Wikidata CC0-1.0',
      divisionSources: divSources,
      clubs: outClubs,
    },
    null,
    1,
  ) + '\n',
);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length
    ? s.length % 2
      ? s[(s.length - 1) / 2]!
      : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2
    : 0;
};
const CUT = '2026-01-01';
const ageDays = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / 864e5);
const coverage = [...DIVISIONS, 'none'].map((d) => {
  const cs = outClubs.filter((c) =>
    d === 'none' ? c.divisions.length === 0 : c.divisions.includes(d),
  );
  const sizes = cs.map((c) => c.players.length);
  const ages = cs.flatMap((c) => (c.revisionTimestamp ? [ageDays(c.revisionTimestamp)] : []));
  return {
    division: d === 'none' ? 'fora de A-D 2026' : `Série ${d}`,
    clubs: cs.length,
    withSquad: cs.filter((c) => c.players.length > 0).length,
    thinUnder11: cs
      .filter((c) => c.players.length > 0 && c.players.length < 11)
      .map((c) => `${c.name ?? c.wikidataId} (${c.players.length})`),
    atLeast22: cs.filter((c) => c.players.length >= 22).length,
    medianSquad: median(sizes),
    medianRevisionAgeDays: median(ages),
    staleBefore2026: cs
      .filter((c) => c.revisionTimestamp && c.revisionTimestamp < CUT)
      .map((c) => c.name ?? c.wikidataId),
    noSquad: cs
      .filter((c) => c.players.length === 0)
      .map((c) => `${c.name ?? c.wikidataId} [${c.status}]`),
  };
});
writeFileSync(
  new URL('out/squads-ptwiki-coverage.json', ROOT),
  JSON.stringify(
    {
      cutoff: CUT,
      byDivision: coverage,
      players: { totalPlayers, linked, human, withBirth, withNat },
    },
    null,
    1,
  ) + '\n',
);
console.log(
  JSON.stringify(
    coverage.map((c) => ({
      ...c,
      staleBefore2026: c.staleBefore2026.length,
      noSquad: c.noSquad.length,
      thinUnder11: c.thinUnder11.length,
    })),
    null,
    1,
  ),
);
