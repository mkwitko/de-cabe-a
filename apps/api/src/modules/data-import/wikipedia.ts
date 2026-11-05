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
    .replace(/\(emp(?:réstimo|\.)?\)|\(loan\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function entry(index: number, years: string, raw: string): InfoboxEntry {
  // "1993–1994", "2004–", "{{0}}2013", "2013": first year, second year, open or single.
  const found = [...years.replace(/\{\{[^}]*\}\}/g, '').matchAll(/\d{4}/g)].map((m) =>
    Number(m[0]),
  );
  const open = /\d{4}\s*[–—-]\s*$/.test(years.trim());
  return {
    index,
    fromYear: found[0] ?? null,
    toYear: found[1] ?? (open ? null : (found[0] ?? null)),
    club: clean(raw),
    isLoan: /\(emp(?:réstimo|\.)?\)|\(loan\)|→|\{\{\s*(?:emp|seta) fut/i.test(raw),
  };
}

/**
 * Senior career from {{Info/Futebol}} (numbered anoN/clubeN), {{Info/Futebolista}} (ano/clubes lists)
 * or the English {{Infobox football biography}} (yearsN/clubsN).
 */
export function parseInfoboxCareer(wikitext: string): InfoboxEntry[] | null {
  const start = wikitext.search(/\{\{\s*(?:Info\/Futebol|Infobox football biography)/i);
  if (start < 0) return null;
  // One field per line: English infoboxes often chain `| years1 = … | clubs1 = …` on one line.
  const box = wikitext.slice(start).replace(/[ \t]\|\s*([a-zç-]+\d*)\s*=/gi, '\n|$1 =');
  const numbered = (name: string) => new RegExp(`^\\s*\\|\\s*${name}(\\d+)\\s*=(.*)$`, 'gm');
  const years = new Map<number, string>();
  for (const m of box.matchAll(numbered('(?:ano|years)'))) years.set(Number(m[1]), m[2]!.trim());
  const out: InfoboxEntry[] = [];
  for (const m of box.matchAll(numbered('(?:clube|clubs)')))
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
/** Wikitext of a Wikipedia page via the MediaWiki API (≤ 1 req/s). */
export async function fetchWikitext(lang: 'pt' | 'en', title: string): Promise<string | null> {
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
  const res = await fetch(`https://${lang}.wikipedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { parse?: { wikitext?: { '*': string } } };
  return body.parse?.wikitext?.['*'] ?? null;
}

export const fetchPtWikitext = (title: string) => fetchWikitext('pt', title);
