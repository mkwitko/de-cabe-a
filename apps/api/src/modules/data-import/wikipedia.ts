/**
 * Reads the senior career from a Wikipedia football infobox: pt ({{Info/Futebol}}, {{Info/Futebolista}}),
 * en ({{Infobox football biography}}), es ({{Ficha de futbolista}}), it ({{Sportivo}} + {{Carriera sportivo}}),
 * de ({{Infobox Fußballspieler}} + {{Team-Station}}) and fr ({{Infobox Footballeur}}).
 * Used as the second source when cross-checking Wikidata (ADR-006). Facts only, no text copied.
 */
import { normalizeName } from '@decabeca/engine';
import { USER_AGENT } from './wikidata-client';

export interface InfoboxEntry {
  index: number;
  fromYear: number | null;
  toYear: number | null;
  club: string;
  isLoan: boolean;
  /** League appearances and goals at the club, when the infobox has them. */
  appearances: number | null;
  goals: number | null;
  /** Wiki page the club cell links to ([[Target|Text]]), the precise club identity when present. */
  link: string | null;
}

/** First integer of an infobox number cell ("47", "57 (3)", "{{0}}9", "<ref/>12"). */
function count(raw: string | undefined): number | null {
  const m = /\d+/.exec(
    (raw ?? '')
      .replace(/\{\{\s*nobr\s*\|/gi, '')
      .replace(/<ref[\s\S]*?(?:\/>|<\/ref>)|\{\{[^}]*\}\}|\[\[[^\]]*\]\]/g, ' '),
  );
  return m ? Number(m[0]) : null;
}

const LOAN_MARK = /\(\s*(?:emp(?:réstimo|\.)?|loan|cedido|prestito|leihe|prêt)\s*\)/gi;

function clean(raw: string): string {
  return raw
    .replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/g, '')
    .replace(/\{\{\s*(?:Futebol|Calcio)\s+([^}|]+)[^}]*\}\}/gi, '$1')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/\{\{[^}]*\}\}|<[^>]+>|'''?|→|\{\{|\}\}|&nbsp;/g, ' ')
    .replace(LOAN_MARK, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function entry(
  index: number,
  years: string,
  raw: string,
  apps?: string,
  goals?: string,
): InfoboxEntry {
  // "1993–1994", "2004–", "{{0}}2013", "2013", "2009-13", "2025-act.", "[[2009 en football|2009]]-…":
  // first year, second year, open or single.
  const y = years.replace(/\{\{[^}]*\}\}|\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1').trim();
  const found = [...y.matchAll(/\d{4}/g)].map((m) => Number(m[0]));
  const short = /(\d{2})\d{2}\s*[–—-]\s*(\d{2})(?!\d)/.exec(y);
  if (found.length === 1 && short) found.push(Number(short[1]! + short[2]!));
  const open = /\d{4}\s*[–—-]\s*(?:act\.?|presente|heute)?\s*$/i.test(y);
  return {
    index,
    fromYear: found[0] ?? null,
    toYear: found[1] ?? (open ? null : (found[0] ?? null)),
    club: clean(raw),
    isLoan: new RegExp(`${LOAN_MARK.source}|→|\\{\\{\\s*(?:emp|seta) fut`, 'i').test(raw),
    appearances: count(apps),
    goals: count(goals),
    link:
      /\[\[([^\]|#]+)/.exec(raw.replace(/<ref[\s\S]*?(?:\/>|<\/ref>)/g, ''))?.[1]?.trim() ?? null,
  };
}

/**
 * Senior career from {{Info/Futebol}} (numbered anoN/clubeN), {{Info/Futebolista}} (ano/clubes lists)
 * or the English {{Infobox football biography}} (yearsN/clubsN).
 */
export function parseInfoboxCareer(wikitext: string): InfoboxEntry[] | null {
  const start = wikitext.search(/\{\{\s*(?:Info\/Futebol|Infobox football biography)/i);
  if (start < 0) return parseOtherInfobox(wikitext);
  // One field per line: English infoboxes often chain `| years1 = … | clubs1 = …` on one line.
  const box = wikitext.slice(start).replace(/[ \t]\|\s*([a-zç-]+\d*)\s*=/gi, '\n|$1 =');
  const numbered = (name: string) => new RegExp(`^\\s*\\|\\s*${name}(\\d+)\\s*=(.*)$`, 'gm');
  const years = new Map<number, string>();
  for (const m of box.matchAll(numbered('(?:ano|years)'))) years.set(Number(m[1]), m[2]!.trim());
  const field = (name: string) =>
    new Map([...box.matchAll(numbered(name))].map((m) => [Number(m[1]), m[2]!]));
  const apps = field('(?:jogos|caps)');
  const goals = field('(?:gols|goals)');
  const out: InfoboxEntry[] = [];
  for (const m of box.matchAll(numbered('(?:clube|clubs)'))) {
    const i = Number(m[1]);
    out.push(entry(i, years.get(i) ?? '', m[2]!, apps.get(i), goals.get(i)));
  }
  if (out.length) return out.sort((a, b) => a.index - b.index);

  const list = (name: string) =>
    new RegExp(`^\\s*\\|\\s*${name}\\s*=(.*)$`, 'm').exec(box)?.[1]?.split(/<br\s*\/?>/i) ?? [];
  const clubs = list('clubes');
  const yearList = list('ano');
  // Either separate `jogos`/`gols` lists or one combined `jogos(golos)` list: "36 (19)".
  const combined = list('jogos\\(golos\\)');
  const appList = combined.length ? combined : list('jogos');
  const goalList = combined.length
    ? combined.map((c) => /\((\d+)\)/.exec(c.replace(/\{\{[^}]*\}\}/g, ''))?.[1] ?? '')
    : list('gols');
  return clubs
    .map((raw, i) =>
      entry(i + 1, yearList[i]?.replace(/<[^>]+>/g, '').trim() ?? '', raw, appList[i], goalList[i]),
    )
    .filter((e) => e.club);
}

/** Splits a template row on top-level pipes (not inside [[ ]] or {{ }}). */
function cells(row: string): string[] {
  const out: string[] = [];
  let cur = '';
  let depth = 0;
  for (let i = 0; i < row.length; i++) {
    const two = row.slice(i, i + 2);
    if (two === '[[' || two === '{{' || two === ']]' || two === '}}') {
      depth += two === '[[' || two === '{{' ? 1 : -1;
      cur += two;
      i++;
    } else if (row[i] === '|' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += row[i];
  }
  return [...out, cur].map((c) => c.trim());
}

/** Body of the template that the pattern opens (the pattern ends with `{{`), up to its matching `}}`. */
function templateBody(text: string, opener: RegExp): string | null {
  const m = opener.exec(text);
  if (!m) return null;
  const from = m.index + m[0].length;
  let depth = 1;
  for (let i = from; i < text.length - 1; i++) {
    const two = text.slice(i, i + 2);
    if (two === '{{') depth++;
    else if (two === '}}' && --depth === 0) return text.slice(from, i);
    else continue;
    i++;
  }
  return null;
}

/** Infobox field value: from `| name =` up to the next field line. */
function fieldValue(text: string, name: RegExp): string | null {
  const m = name.exec(text);
  if (!m) return null;
  const rest = text.slice(m.index + m[0].length);
  const end = rest.search(/\n\s*\|/);
  return end < 0 ? rest : rest.slice(0, end);
}

/** Rows `|years|club|apps (goals)` of {{Carriera sportivo}} / {{trois colonnes}}; parameter lines skipped. */
function rowEntries(body: string): InfoboxEntry[] {
  return body
    .split('\n')
    .filter((l) => /^\s*\|/.test(l))
    .map((l) => cells(l.replace(/^\s*\|/, '')))
    .filter((c) => !c[0]!.includes('=') && /\d{4}/.test(c[0]!) && c[1])
    .map((c, i) => entry(i + 1, c[0]!, c[1]!, c[2], goalsOf(c[2])));
}

const goalsOf = (cell: string | undefined) =>
  /\((\d+)\)/.exec((cell ?? '').replace(/<ref[\s\S]*?(?:\/>|<\/ref>)|\{\{\s*0[^}]*\}\}/g, ''))?.[1];

function parseOtherInfobox(wikitext: string): InfoboxEntry[] | null {
  let out: InfoboxEntry[];
  if (/\{\{\s*Infobox Fußballspieler/i.test(wikitext)) {
    // de: {{Team-Station|2009–2013|[[FC Santos]]|177 (107)}} rows of the senior table.
    const table = fieldValue(wikitext, /^\s*\|\s*vereine_tabelle\s*=/m) ?? '';
    out = [...table.matchAll(/\{\{\s*Team-Station\s*\|/g)].flatMap((m, i) => {
      const c = cells(templateBody(table.slice(m.index), /\{\{/) ?? '').slice(1);
      return c[0] && c[1] ? [entry(i + 1, c[0], c[1], c[2], goalsOf(c[2]))] : [];
    });
  } else if (/\{\{\s*Sportivo/i.test(wikitext)) {
    // it: |Squadre = {{Carriera sportivo |2009-2013|Santos|179 (107) …}}
    out = rowEntries(templateBody(wikitext, /\|\s*Squadre\s*=\s*\{\{/) ?? '');
  } else if (/\{\{\s*Infobox Footballeur/i.test(wikitext)) {
    // fr: | parcours senior = {{trois colonnes |[[2009 en football|2009]]-…|{{BRA-d}} [[Santos FC]]|{{nobr|230 (138)}} …}}
    out = rowEntries(templateBody(wikitext, /\|\s*parcours senior\s*=\s*\{\{/) ?? '');
  } else if (/\{\{\s*Ficha de futbolista/i.test(wikitext)) {
    // es: | equipos = * [[Santos Futebol Clube|Santos F. C.]] (2009-13)
    const list = fieldValue(wikitext, /\|\s*equipos\s*=/) ?? '';
    out = list
      .split('\n')
      .map((l) => l.replace(/^\s*\*\s*/, '').trim())
      .filter(Boolean)
      .flatMap((l, i) => {
        const years = /\(([^()]*\d{4}[^()]*)\)/.exec(l);
        return years ? [entry(i + 1, years[1]!, l.replace(years[0], ''))] : [];
      });
  } else return null;
  return out.filter((e) => e.club);
}

const POSITION_WORDS: [string, 'GK' | 'DF' | 'MF' | 'FW'][] = [
  ...[
    'goleiro',
    'guarda redes',
    'goalkeeper',
    'portero',
    'arquero',
    'portiere',
    'torwart',
    'torhuter',
    'gardien',
  ].map((w) => [w, 'GK'] as [string, 'GK']),
  ...[
    'zagueiro',
    'lateral',
    'defensor',
    'libero',
    'defesa',
    'defender',
    'back',
    'defensa',
    'difensore',
    'terzino',
    'verteidiger',
    'abwehr',
    'innenverteidiger',
    'defenseur',
    'arriere',
  ].map((w) => [w, 'DF'] as [string, 'DF']),
  ...[
    'meia',
    'volante',
    'meio campo',
    'meio campista',
    'medio',
    'midfielder',
    'centrocampista',
    'mediocampista',
    'mittelfeld',
    'milieu',
  ].map((w) => [w, 'MF'] as [string, 'MF']),
  ...[
    'atacante',
    'ponta',
    'centroavante',
    'avancado',
    'extremo',
    'forward',
    'striker',
    'winger',
    'delantero',
    'attaccante',
    'ala',
    'punta',
    'sturmer',
    'sturm',
    'flugel',
    'flugelspieler',
    'attaquant',
    'ailier',
    'avant centre',
  ].map((w) => [w, 'FW'] as [string, 'FW']),
];

// An attacking midfielder (Kaká, Neymar) is a midfielder who also plays as a forward.
const ATTACKING_MIDFIELDER =
  / (?:meia atacante|attacking midfielder|mediapunta|mediocampista ofensivo|trequartista|offensives mittelfeld|milieu offensif) /;

/**
 * Positions from the infobox field (pt posição, en/de position, es posición, it Ruolo, fr poste),
 * in the order they appear: the first is the main one ("Volante e zagueiro" is MF, also DF).
 */
export function positionsFromInfobox(wikitext: string): ('GK' | 'DF' | 'MF' | 'FW')[] {
  const raw =
    /^\s*\|\s*(?:posi[cç][aã]o|position|posici[oó]n|ruolo|poste)\s*=(.*)$/im.exec(wikitext)?.[1] ??
    '';
  const text = ` ${normalizeName(raw.replace(/<ref[\s\S]*?(?:\/>|<\/ref>)/g, '').replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1'))} `;
  const found: { at: number; group: 'GK' | 'DF' | 'MF' | 'FW' }[] = [];
  for (const [word, group] of POSITION_WORDS) {
    const at = text.indexOf(` ${word}`);
    if (at >= 0) found.push({ at, group });
  }
  const groups = [...new Set(found.sort((a, b) => a.at - b.at).map((f) => f.group))];
  if (ATTACKING_MIDFIELDER.test(text) && !groups.includes('FW')) groups.push('FW');
  return groups;
}

/** Main position: the first one in the field ("Meia-atacante" is a midfielder). */
export const positionFromInfobox = (wikitext: string) => positionsFromInfobox(wikitext)[0] ?? null;

let last = 0;
/** Wikitext of a Wikipedia page via the MediaWiki API (≤ 1 req/s). */
export type WikiLang = 'pt' | 'en' | 'es' | 'it' | 'de' | 'fr';
export async function fetchWikitext(lang: WikiLang, title: string): Promise<string | null> {
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
