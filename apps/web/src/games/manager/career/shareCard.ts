/**
 * Shareable image + text for the season and for the coach's career (Modo Clube). Drawn on a
 * canvas in the browser from what the screens already show: no server, no personal data.
 */
import { t } from '../i18n';
import type { SimView } from './sim.worker';

type Review = NonNullable<SimView['review']>;
type Entry = SimView['history'][number];
export type Club = SimView['club'];
export type CardFormat = 'square' | 'story';

const SIZE = { square: [1080, 1080], story: [1080, 1920] } as const;
const NIGHT = '#0d1f16';
const GOLD = '#f4d23c';
const TOP = 'Archivo Variable';
const font = (w: number, px: number, tight = true) =>
  `${w} ${tight ? 'condensed ' : ''}${px}px "${TOP}", sans-serif`;

/** The one line a season is remembered by. */
export function seasonHeadline(r: Review): string {
  const promoted = r.move === 'promotion';
  const h = r.fired
    ? 'fired'
    : r.champion && promoted
      ? 'titleUp'
      : r.champion
        ? 'title'
        : r.cups.length > 0
          ? 'cup'
          : promoted
            ? 'up'
            : r.move === 'relegation'
              ? 'down'
              : r.met && r.goal >= r.places - 3
                ? 'escaped'
                : r.met
                  ? 'met'
                  : 'other';
  return t('share.headline', { h, division: r.division, cup: r.cups[0] ?? '' });
}

/** Lines under the headline, shared by the image and the text. */
export function seasonLines(r: Review, club: Club): string[] {
  const top = r.used[0];
  return [
    t('share.seasonLine', { club: club.name, season: r.season }),
    t('share.posLine', { n: r.position, places: r.places, division: r.division }),
    t('share.goalLine', { met: r.met && !r.fired ? 'yes' : 'no', goal: r.goal }),
    t('share.recordLine', {
      w: r.record.won,
      d: r.record.drawn,
      l: r.record.lost,
      gf: r.record.for,
      ga: r.record.against,
    }),
    ...(top ? [t('share.topLine', { name: top.name })] : []),
  ];
}

export const seasonText = (r: Review, club: Club) =>
  [t('share.brand'), seasonHeadline(r), ...seasonLines(r, club), t('share.url')].join('\n');

/** Totals and the best season from the club history. */
export function careerSummary(history: Entry[]) {
  const rank = (h: Entry) => (h.champion ? 0 : h.move === 'promotion' ? 1 : 2);
  const best = [...history].sort(
    (a, b) => rank(a) - rank(b) || a.position - b.position || b.season - a.season,
  )[0];
  return {
    seasons: history.length,
    titles: history.filter((h) => h.champion).length,
    ups: history.filter((h) => h.move === 'promotion').length,
    clubs: [...new Set(history.map((h) => h.club))],
    best,
  };
}

export function careerLines(history: Entry[]): string[] {
  const s = careerSummary(history);
  const b = s.best;
  return [
    t('share.careerStats', { seasons: s.seasons, titles: s.titles, ups: s.ups }),
    s.clubs.join(' → '),
    ...(b
      ? [
          t(b.champion ? 'share.careerBestTitle' : 'share.careerBest', {
            season: b.season,
            n: b.position,
            division: b.division,
            club: b.club,
          }),
        ]
      : []),
  ];
}

export const careerText = (history: Entry[]) =>
  [t('share.brand'), t('share.careerTitle'), ...careerLines(history), t('share.url')].join('\n');

/** Ink on light club colours, chalk on dark ones (same rule as the crest in the UI). */
function inkOn(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  const y = 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return y > 150 ? '#0e3b21' : '#f3f1e8';
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    const next = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(next).width > max) {
      out.push(line);
      line = w;
    } else line = next;
  }
  return line ? [...out, line] : out;
}

async function draw(
  format: CardFormat,
  club: Club,
  kicker: string,
  headline: string,
  lines: string[],
): Promise<Blob> {
  await document.fonts.ready;
  const [W, H] = SIZE[format];
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  const [c1, c2] = club.colours;
  const story = format === 'story';
  const band = story ? 500 : 250;
  ctx.fillStyle = NIGHT;
  ctx.fillRect(0, 0, W, H);
  // Club colours as a slanted band, like the kit slabs on the career screens.
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, band);
  ctx.lineTo(0, band + 70);
  ctx.fill();
  ctx.fillStyle = c2;
  ctx.beginPath();
  ctx.moveTo(0, band + 70);
  ctx.lineTo(W, band);
  ctx.lineTo(W, band + 16);
  ctx.lineTo(0, band + 86);
  ctx.fill();

  const r = story ? 120 : 76;
  const cy = story ? 290 : 130;
  // Round badge with initials (a club is never a logo).
  ctx.fillStyle = c1;
  ctx.strokeStyle = c2;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(W / 2, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = inkOn(c1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font(900, r * 0.75);
  ctx.fillText(club.shortName, W / 2, cy + 4);
  ctx.textBaseline = 'alphabetic';

  let y = band + (story ? 190 : 150);
  ctx.fillStyle = GOLD;
  ctx.font = font(800, 40);
  ctx.fillText(kicker.toUpperCase(), W / 2, y);
  y += story ? 120 : 95;
  ctx.fillStyle = '#f3f1e8';
  let size = story ? 130 : 100;
  let rows: string[];
  do {
    ctx.font = font(900, size);
    rows = wrap(ctx, headline.toUpperCase(), W - 160);
    size -= 6;
  } while (rows.length > (story ? 3 : 2) && size > 50);
  for (const row of rows) {
    ctx.fillText(row, W / 2, y);
    y += size * 1.12;
  }
  y += story ? 60 : 10;
  ctx.font = font(700, story ? 46 : 38, false);
  ctx.fillStyle = 'rgba(243,241,232,0.88)';
  for (const l of lines.slice(1)) {
    for (const row of wrap(ctx, l, W - 140)) {
      ctx.fillText(row, W / 2, y);
      y += story ? 66 : 48;
    }
  }
  ctx.fillStyle = GOLD;
  ctx.font = font(900, 44);
  ctx.fillText(t('share.brand'), W / 2, H - (story ? 150 : 84));
  ctx.fillStyle = 'rgba(243,241,232,0.8)';
  ctx.font = font(700, 34, false);
  ctx.fillText(t('share.url'), W / 2, H - (story ? 96 : 38));
  return new Promise((ok, fail) =>
    cv.toBlob((b) => (b ? ok(b) : fail(new Error('canvas'))), 'image/png'),
  );
}

export const drawSeasonCard = (r: Review, club: Club, format: CardFormat) =>
  draw(format, club, seasonLines(r, club)[0]!, seasonHeadline(r), seasonLines(r, club));

export const drawCareerCard = (history: Entry[], club: Club, format: CardFormat) =>
  draw(format, club, t('share.careerTitle'), careerLines(history)[0]!, careerLines(history));
