/**
 * Reads the senior career from the pt.wikipedia football infobox ({{Info/Futebol}}):
 * `|anoN = 1993–1994` + `|clubeN = {{Futebol Cruzeiro}}` or `[[Club|Name]]`.
 * Used as the second source when cross-checking Wikidata (ADR-006). Facts only, no text copied.
 */
import { USER_AGENT } from './wikidata-client';

export interface InfoboxEntry {
  index: number;
  fromYear: number | null;
  toYear: number | null;
  club: string;
  isLoan: boolean;
}

function clean(raw: string): string {
  return raw
    .replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/g, '')
    .replace(/\{\{\s*Futebol\s+([^}|]+)[^}]*\}\}/gi, '$1')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/\{\{[^}]*\}\}|<[^>]+>|'''?|→/g, '')
    .replace(/\(emp(?:réstimo|\.)?\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const year = (s: string | undefined) => (s && /^\d{4}$/.test(s) ? Number(s) : null);

function entry(index: number, years: string, raw: string): InfoboxEntry {
  const [from, to] = years.split(/[–—-]/).map((s) => s.trim());
  return {
    index,
    fromYear: year(from),
    toYear: to === undefined ? year(from) : year(to),
    club: clean(raw),
    isLoan: /\(emp(?:réstimo|\.)?\)|→/i.test(raw),
  };
}

/** Senior career from {{Info/Futebol}} (numbered anoN/clubeN) or {{Info/Futebolista}} (ano/clubes lists). */
export function parseInfoboxCareer(wikitext: string): InfoboxEntry[] | null {
  const start = wikitext.search(/\{\{\s*Info\/Futebol/i);
  if (start < 0) return null;
  const box = wikitext.slice(start);
  const numbered = (name: string) => new RegExp(`^\\s*\\|\\s*${name}(\\d+)\\s*=(.*)$`, 'gm');
  const years = new Map<number, string>();
  for (const m of box.matchAll(numbered('ano'))) years.set(Number(m[1]), m[2]!.trim());
  const out: InfoboxEntry[] = [];
  for (const m of box.matchAll(numbered('clube')))
    out.push(entry(Number(m[1]), years.get(Number(m[1])) ?? '', m[2]!));
  if (out.length) return out.sort((a, b) => a.index - b.index);

  const list = (name: string) =>
    new RegExp(`^\\s*\\|\\s*${name}\\s*=(.*)$`, 'm').exec(box)?.[1]?.split(/<br\s*\/?>/i) ?? [];
  const clubs = list('clubes');
  const yearList = list('ano');
  return clubs
    .map((raw, i) => entry(i + 1, yearList[i]?.replace(/<[^>]+>/g, '').trim() ?? '', raw))
    .filter((e) => e.club);
}

let last = 0;
/** Wikitext of a pt.wikipedia page via the MediaWiki API (≤ 1 req/s). */
export async function fetchPtWikitext(title: string): Promise<string | null> {
  const wait = last + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const params = new URLSearchParams({
    action: 'parse',
    format: 'json',
    prop: 'wikitext',
    page: title,
    redirects: '1',
  });
  const res = await fetch(`https://pt.wikipedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { parse?: { wikitext?: { '*': string } } };
  return body.parse?.wikitext?.['*'] ?? null;
}
