/**
 * Throwaway visual study (dev only, `/dev/cards`): the current StickerCard next to three
 * candidate directions, same players and rarities. `?d=current|a|b|c` shows one direction.
 * Every direction normalises the cut-out the same way: head width, head top and centre are read
 * from the alpha channel, and exposure from the luminance percentiles, so uneven Commons photos
 * land at one scale and one exposure before the rarity's grade is applied.
 */
import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import type { Sticker, StickerRarity } from '@decabeca/contracts';
import { StickerCard } from '../components/StickerCard';
import { RARITY_STYLE } from '../components/rarity';
import { Flag } from '../components/Flag';
import './cards-lab.css';

type Player = {
  id: string;
  name: string;
  short: string;
  pos: 'GOL' | 'DEF' | 'MEI' | 'ATA';
  group: 'GK' | 'DF' | 'MF' | 'FW';
  country: string;
  code: string;
  rating: number;
  rarity: StickerRarity;
  stats: [string, number][];
};

// Mock numbers for the study only (the real card reads them from the API).
const PLAYERS: Player[] = [
  { id: '01a1ac22-8fa8-71fb-be0e-a5e70f37c92e', name: 'Pelé', short: 'Pelé', pos: 'ATA', group: 'FW', country: 'Brasil', code: 'BR', rating: 99, rarity: 'lenda', stats: [['JOG', 709], ['GOL', 643], ['CLU', 2], ['TEM', 21], ['SEL', 14], ['GDE', 656]] },
  { id: '01a1ad4f-3b3f-7419-aa35-4018ec053cbc', name: 'Johan Cruijff', short: 'Cruijff', pos: 'ATA', group: 'FW', country: 'Holanda', code: 'NL', rating: 96, rarity: 'idolo', stats: [['JOG', 514], ['GOL', 290], ['CLU', 5], ['TEM', 20], ['SEL', 7], ['GDE', 459]] },
  { id: '01a1ac22-92cc-7159-932d-1a8df8e6fb90', name: 'Cristiano Ronaldo', short: 'C. Ronaldo', pos: 'ATA', group: 'FW', country: 'Portugal', code: 'PT', rating: 95, rarity: 'selecao_temporada', stats: [['JOG', 812], ['GOL', 598], ['CLU', 5], ['TEM', 24], ['SEL', 22], ['GDE', 690]] },
  { id: '01a1ad4f-3b18-76a6-9965-dedba47094e5', name: 'Kylian Mbappé', short: 'Mbappé', pos: 'ATA', group: 'FW', country: 'França', code: 'FR', rating: 92, rarity: 'destaque_rodada', stats: [['JOG', 341], ['GOL', 259], ['CLU', 3], ['TEM', 10], ['SEL', 19], ['GDE', 300]] },
  { id: '01a1ac22-91b4-757e-a8cc-1c47cb225358', name: 'Zico', short: 'Zico', pos: 'MEI', group: 'MF', country: 'Brasil', code: 'BR', rating: 90, rarity: 'ouro_brilhante', stats: [['JOG', 498], ['GOL', 331], ['CLU', 3], ['TEM', 18], ['SEL', 11], ['GDE', 431]] },
  { id: '01a1ac22-9104-7044-abbf-c0b5bbf363c6', name: 'Casemiro', short: 'Casemiro', pos: 'MEI', group: 'MF', country: 'Brasil', code: 'BR', rating: 84, rarity: 'ouro', stats: [['JOG', 486], ['GOL', 44], ['CLU', 4], ['TEM', 15], ['SEL', 12], ['GDE', 402]] },
  { id: '01a1ad60-f2d7-75fa-95da-0d3bd1d08e83', name: 'Gianluigi Buffon', short: 'Buffon', pos: 'GOL', group: 'GK', country: 'Itália', code: 'IT', rating: 80, rarity: 'prata', stats: [['JOG', 657], ['GOL', 0], ['CLU', 3], ['TEM', 28], ['SEL', 17], ['GDE', 560]] },
  { id: '01a1ac29-00ea-7126-bfb6-82cc909afdda', name: 'Juan', short: 'Juan', pos: 'DEF', group: 'DF', country: 'Brasil', code: 'BR', rating: 72, rarity: 'bronze', stats: [['JOG', 312], ['GOL', 18], ['CLU', 5], ['TEM', 16], ['SEL', 9], ['GDE', 190]] },
];

const cut = (p: Player) => `/cutouts/${p.id}.webp`;

/** deep · mid · light · accent per rarity (shadows, mids, highlights, foil/spot). */
const PAL: Record<StickerRarity, [string, string, string, string]> = {
  bronze: ['#24130a', '#8a5330', '#f6dcc0', '#d79a63'],
  prata: ['#12161c', '#66717f', '#f2f5f9', '#c9d2de'],
  ouro: ['#241800', '#9a7300', '#fff3c2', '#f5c400'],
  ouro_brilhante: ['#2a1600', '#b98400', '#fff7d6', '#ffd84a'],
  destaque_rodada: ['#06180f', '#1d7347', '#eaffea', '#f5c400'],
  selecao_temporada: ['#081032', '#2c4cae', '#e6eeff', '#8fb4ff'],
  idolo: ['#24090e', '#8a2632', '#f8e8c8', '#e2c37a'],
  lenda: ['#0f0820', '#5a2a9e', '#f5ebff', '#e3c8ff'],
};
const TOP: StickerRarity[] = ['selecao_temporada', 'idolo', 'lenda'];

type Frame = { hw: number; cx: number; top: number; ratio: number; lo: number; hi: number; gamma: number };

/** Reads head width/centre/top and exposure from the cut-out's pixels (96px-wide sample). */
function analyse(img: HTMLImageElement): Frame {
  const W = 96;
  const H = Math.round((W * img.naturalHeight) / img.naturalWidth);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  const spans: ([number, number] | null)[] = [];
  const lum: number[] = [];
  for (let y = 0; y < H; y++) {
    let l = -1;
    let r = -1;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (d[i + 3]! < 160) continue;
      if (l < 0) l = x;
      r = x;
      lum.push((0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!) / 255);
    }
    spans.push(r - l >= 2 ? [l, r] : null);
  }
  const top = Math.max(0, spans.findIndex(Boolean));
  const med = (a: number[]) => [...a].sort((p, q) => p - q)[Math.floor(a.length / 2)] ?? 0;
  const band = (a: number, b: number) => spans.slice(Math.round(a), Math.round(b)).filter(Boolean) as [number, number][];
  // pass 1: rough head width from the crown; pass 2: the face band of a head that size
  const hw0 = med(band(top + H * 0.02, top + H * 0.08).map(([l, r]) => r - l)) || W * 0.3;
  const rows = band(top + hw0 * 0.2, top + hw0 * 0.95);
  const hw = med(rows.map(([l, r]) => r - l)) || hw0;
  const cx = med(rows.map(([l, r]) => (l + r) / 2)) || W / 2;
  lum.sort((p, q) => p - q);
  const lo = lum[Math.floor(lum.length * 0.03)] ?? 0;
  const hi = lum[Math.floor(lum.length * 0.97)] ?? 1;
  const mid = ((lum[Math.floor(lum.length / 2)] ?? 0.5) - lo) / Math.max(0.05, hi - lo);
  const gamma = Math.min(2, Math.max(0.5, Math.log(0.5) / Math.log(Math.min(0.95, Math.max(0.05, mid)))));
  return { hw: hw / W, cx: cx / W, top: top / H, ratio: H / W, lo, hi, gamma };
}

function useFrame(src: string) {
  const [f, setF] = useState<Frame | null>(null);
  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.decode().then(() => setF(analyse(img)), () => {});
  }, [src]);
  return f;
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

/**
 * Per-card SVG filter: levels + gamma from the photo's own stats, then either a gradient map
 * over luminance (`map`, `discrete` posterises it) or colour kept with lower saturation.
 */
function Grade({ id, f, map, discrete, sat = 0.85 }: { id: string; f: Frame; map?: string[]; discrete?: boolean; sat?: number }) {
  const slope = 1 / Math.max(0.05, f.hi - f.lo);
  const lin = { type: 'linear', slope: String(slope), intercept: String(-f.lo * slope) } as const;
  const gam = { type: 'gamma', amplitude: '1', exponent: String(f.gamma), offset: '0' } as const;
  const cols = map?.map(rgb);
  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }}>
      <filter id={id} colorInterpolationFilters="sRGB">
        {map && <feColorMatrix type="saturate" values="0" />}
        <feComponentTransfer>
          <feFuncR {...lin} />
          <feFuncG {...lin} />
          <feFuncB {...lin} />
        </feComponentTransfer>
        <feComponentTransfer>
          <feFuncR {...gam} />
          <feFuncG {...gam} />
          <feFuncB {...gam} />
        </feComponentTransfer>
        {cols ? (
          <feComponentTransfer>
            {(['R', 'G', 'B'] as const).map((ch, k) => {
              const props = { type: discrete ? 'discrete' : 'table', tableValues: cols.map((c) => c[k]!.toFixed(3)).join(' ') };
              return ch === 'R' ? <feFuncR key={ch} {...props} /> : ch === 'G' ? <feFuncG key={ch} {...props} /> : <feFuncB key={ch} {...props} />;
            })}
          </feComponentTransfer>
        ) : (
          <feColorMatrix type="saturate" values={String(sat)} />
        )}
      </filter>
    </svg>
  );
}

/**
 * The cut-out placed by its head: `head` = head width in % of card width, `y` = head top in % of
 * card height. Children are layers clipped to the player's silhouette.
 */
function Figure({ src, f, head, y, filter, children, className = '' }: { src: string; f: Frame; head: number; y: number; filter: string; children?: ReactNode; className?: string }) {
  const w = head / f.hw; // cqw
  const h = w * f.ratio;
  const style = {
    width: `${w}cqw`,
    height: `${h}cqw`,
    left: `${50 - f.cx * w}cqw`,
    top: `${y * (4 / 3) - f.top * h}cqw`,
    '--m': `url(${src})`,
  } as CSSProperties;
  return (
    <div className={`lab-fig ${className}`} style={style}>
      <img src={src} alt="" style={{ filter: `url(#${filter})` }} />
      {children}
    </div>
  );
}

function Stats({ p, className }: { p: Player; className: string }) {
  return (
    <dl className={className}>
      {p.stats.map(([k, v]) => (
        <div key={k}>
          <dd>{v}</dd>
          <dt>{k}</dt>
        </div>
      ))}
    </dl>
  );
}

const fit = (s: string, room: number) => `min(${room / 6.5}cqw, ${(room / (s.length * 0.46)).toFixed(2)}cqw)`;
const palVars = (r: StickerRarity) => {
  const [deep, mid, light, acc] = PAL[r];
  return { '--deep': deep, '--mid': mid, '--light': light, '--acc': acc } as CSSProperties;
};

/* ---------- A · Refletor: night floodlight, tritone + rim light, chamfered foil frame ---------- */
function CardA({ p }: { p: Player; i?: number }) {
  const id = useId().replace(/:/g, '');
  const f = useFrame(cut(p));
  const [deep, mid, light] = PAL[p.rarity];
  const top = TOP.includes(p.rarity);
  return (
    <article className={`la ${top ? 'la-top' : ''}`} style={palVars(p.rarity)}>
      <div className="la-face">
        <div className="la-beam" />
        <div className="la-stage">
          {f && (
            <>
              <Grade id={id} f={f} map={[deep, mid, light, '#ffffff']} />
              <Figure src={cut(p)} f={f} head={29} y={15} filter={id}>
                <div className="lab-rim" />
              </Figure>
            </>
          )}
        </div>
        <div className="la-rate">
          <b>{p.rating}</b>
          <span>{p.pos}</span>
          <Flag code={p.code} name={p.country} className="la-flag" />
        </div>
        <span className="la-tier">{RARITY_STYLE[p.rarity].label}</span>
        <div className="la-foot">
          <h3 style={{ fontSize: fit(p.short, 84) }}>{p.short}</h3>
          <Stats p={p} className="la-stats" />
        </div>
        <div className="lab-grain" />
      </div>
    </article>
  );
}

/* ---------- B · Cartaz: screen-printed poster sticker, posterised + halftone, die-cut outline ---------- */
function CardB({ p, i = 0 }: { p: Player; i?: number }) {
  const id = useId().replace(/:/g, '');
  const f = useFrame(cut(p));
  const [deep, mid, light] = PAL[p.rarity];
  return (
    <article className="lb" style={{ ...palVars(p.rarity), '--tilt': `${[-1.5, 1, -0.5, 1.5][i % 4]}deg` } as CSSProperties}>
      <div className="lb-face">
        <div className="lb-dots" />
        <b className="lb-rate">{p.rating}</b>
        <div className="lb-stage">
          {f && (
            <>
              <Grade id={id} f={f} map={[deep, mid, light, '#fbf7ec']} discrete />
              <Figure src={cut(p)} f={f} head={31} y={20} filter={id} className="lb-fig">
                <div className="lab-halftone" />
              </Figure>
            </>
          )}
        </div>
        <span className="lb-pos">{p.pos}</span>
        <div className="lb-band">
          <h3 style={{ fontSize: fit(p.short, 80) }}>{p.short}</h3>
          <Stats p={p} className="lb-stats" />
        </div>
      </div>
      <div className="lb-paper">
        <Flag code={p.code} name={p.country} className="lb-flag" />
        <span>{RARITY_STYLE[p.rarity].label}</span>
        <span>Nº {String(i + 1).padStart(3, '0')}</span>
      </div>
    </article>
  );
}

/* ---------- C · Vitrine: studio backdrop, colour kept but levelled, glass plate, foil ring ---------- */
function CardC({ p }: { p: Player; i?: number }) {
  const id = useId().replace(/:/g, '');
  const f = useFrame(cut(p));
  const top = TOP.includes(p.rarity);
  return (
    <article className={`lc ${top ? 'lc-top' : ''}`} style={palVars(p.rarity)}>
      <div className="lc-face">
        <div className="lc-rings" />
        <div className="lc-stage">
          {f && (
            <>
              <Grade id={id} f={f} sat={0.8} />
              <Figure src={cut(p)} f={f} head={27} y={13} filter={id}>
                <div className="lc-tone" />
                <div className="lab-rim" />
              </Figure>
            </>
          )}
        </div>
        <div className="lc-tab">
          <b>{p.rating}</b>
          <span>{p.pos}</span>
        </div>
        <div className="lc-meta">
          <Flag code={p.code} name={p.country} className="lc-flag" />
          <span>{RARITY_STYLE[p.rarity].label}</span>
        </div>
        <div className="lc-plate">
          <h3 style={{ fontSize: fit(p.short, 80) }}>{p.short}</h3>
          <Stats p={p} className="lc-stats" />
        </div>
      </div>
    </article>
  );
}

function Current({ p }: { p: Player; i?: number }) {
  const s: Sticker = {
    playerId: p.id,
    name: p.name,
    positionGroup: p.group,
    nationality: p.country,
    nationalityCode: p.code,
    ...Object.fromEntries(
      p.stats.map(([k, v]) => [{ JOG: 'games', GOL: 'goals', CLU: 'clubs', TEM: 'seasons', SEL: 'nationalGames', GDE: 'bigClubGames' }[k]!, v]),
    ),
    rating: p.rating,
    photo: null,
    cutout: cut(p),
    photoCredit: 'Foto: Wikimedia Commons',
    rarity: p.rarity,
    mode: 'CAREER_PATH',
    earnedAt: '2026-11-01T00:00:00Z',
  };
  return <StickerCard sticker={s} size="lg" />;
}

const DIRS = [
  { key: 'current', title: 'Atual', note: 'StickerCard de produção, sem mudanças.', Card: Current },
  { key: 'a', title: 'A · Refletor', note: 'Noite de estádio: tritom por raridade, luz de recorte, moldura chanfrada em foil.', Card: CardA },
  { key: 'b', title: 'B · Cartaz', note: 'Serigrafia de álbum: posterizado em 4 tons, retícula, contorno recortado, papel.', Card: CardB },
  { key: 'c', title: 'C · Vitrine', note: 'Estúdio: cor real nivelada, fundo de refletor, placa de vidro, anel de foil.', Card: CardC },
] as const;

export default function CardsLab() {
  const d = new URLSearchParams(location.search).get('d');
  const dirs = DIRS.filter((x) => !d || x.key === d);
  return (
    <div className="lab-page">
      {dirs.map(({ key, title, note, Card }) => (
        <section key={key} data-dir={key}>
          <h2>{title}</h2>
          <p>{note}</p>
          <div className="lab-grid">
            {PLAYERS.map((p, i) => (
              <div key={p.id} className="lab-cell">
                <Card p={p} i={i} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
