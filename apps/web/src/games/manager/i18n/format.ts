/**
 * Small ICU message formatter over Intl (ADR-017 item 3, MC-146). Supports
 * `{name}`, `{n, number}`, `{n, number, integer|percent|currency}`,
 * `{d, date, short|long}`, `{n, plural, =0 {…} one {…} other {…}}` with `#`,
 * and `{g, select, a {…} other {…}}`. Adopt a library only if this stops being enough.
 */
export type Params = Record<string, string | number | boolean | Date>;

/** In-game money is the real (ADR-017 item 5), formatted in the reader's language. */
const CURRENCY = 'BRL';

function number(locale: string, v: unknown, style?: string): string {
  const n = Number(v);
  if (style === 'percent') return new Intl.NumberFormat(locale, { style: 'percent' }).format(n);
  if (style === 'currency')
    return new Intl.NumberFormat(locale, { style: 'currency', currency: CURRENCY }).format(n);
  return new Intl.NumberFormat(
    locale,
    style === 'integer' ? { maximumFractionDigits: 0 } : {},
  ).format(n);
}

/** Splits `=0 {a} one {b {x}} other {c}` into option → body. */
function options(src: string): Map<string, string> {
  const out = new Map<string, string>();
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf('{', i);
    if (open < 0) break;
    const name = src.slice(i, open).trim();
    let depth = 0;
    let j = open;
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}' && --depth === 0) break;
    }
    out.set(name, src.slice(open + 1, j));
    i = j + 1;
  }
  return out;
}

function argument(locale: string, body: string, params: Params): string {
  const [name = '', type, ...rest] = body.split(',').map((s) => s.trim());
  const v = params[name];
  if (v === undefined) throw new Error(`missing parameter "${name}"`);
  if (!type) return v instanceof Date ? v.toLocaleDateString(locale) : String(v);
  if (type === 'number') return number(locale, v, rest[0]);
  if (type === 'date')
    return new Intl.DateTimeFormat(locale, {
      dateStyle: rest[0] === 'long' ? 'long' : 'short',
    }).format(v as Date);
  // plural and select: the option list may contain commas, so take it from the raw body.
  const opts = options(body.slice(body.indexOf(type) + type.length + 1));
  if (type === 'plural') {
    const n = Number(v);
    const branch =
      opts.get(`=${n}`) ?? opts.get(new Intl.PluralRules(locale).select(n)) ?? opts.get('other');
    if (branch === undefined) throw new Error(`plural "${name}" without "other"`);
    return format(locale, branch.replaceAll('#', number(locale, n)), params);
  }
  if (type === 'select') {
    const branch = opts.get(String(v)) ?? opts.get('other');
    if (branch === undefined) throw new Error(`select "${name}" without "other"`);
    return format(locale, branch, params);
  }
  throw new Error(`unknown argument type "${type}"`);
}

export function format(locale: string, template: string, params: Params = {}): string {
  let out = '';
  let i = 0;
  while (i < template.length) {
    const open = template.indexOf('{', i);
    if (open < 0) return out + template.slice(i);
    out += template.slice(i, open);
    let depth = 0;
    let j = open;
    for (; j < template.length; j++) {
      if (template[j] === '{') depth++;
      else if (template[j] === '}' && --depth === 0) break;
    }
    out += argument(locale, template.slice(open + 1, j), params);
    i = j + 1;
  }
  return out;
}
