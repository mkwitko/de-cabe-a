/**
 * Night-match pitch for the Modo Clube (MC-262 direction), seen from a tilted
 * broadcast camera (2,5D): a true perspective of the ground plane, so lines
 * stay straight and the far side is smaller; players stand on their shadows
 * and the ball rises off its shadow by its real height. The stands, the
 * floodlights and the pitch are drawn once per size into an offscreen canvas;
 * each frame only blits it and draws 22 players and the ball, back to front.
 */
export const LENGTH = 1050; // decimetres, as in the frames
export const WIDTH = 680;

/** Far touchline width over near touchline width (camera tilt). */
const FAR = 0.74;
/** Pitch depth on screen over the canvas height; the rest is the stand. */
const DEPTH = 0.72;
/** Margin at each side of the near touchline, over the canvas width. */
const SIDE = 0.035;

export interface View {
  w: number;
  h: number;
  /** Pixels per decimetre on the near touchline. */
  k: number;
  /** Players and ball drawn larger on a small canvas, so they stay readable. */
  size: number;
  /** Screen point of a pitch point, and the scale there (1 near, FAR far). */
  at(x: number, y: number): { x: number; y: number; s: number };
}

/**
 * Homography of the ground plane: depth z grows linearly from the near (1) to
 * the far touchline (1 / FAR); the screen scale is 1 / z and the screen row is
 * linear in 1 / z, which is what a pinhole camera sees. The canvas shape sets
 * the tilt: a taller canvas (phone) looks down more steeply and closer.
 */
export function view(w: number, h: number): View {
  const k = (w * (1 - 2 * SIDE)) / LENGTH;
  const depth = h * DEPTH;
  const bottom = h - h * 0.05;
  const top = bottom - depth;
  const zFar = 1 / FAR;
  return {
    w,
    h,
    k,
    size: Math.min(1.5, Math.max(1, 1100 / w)),
    at(x, y) {
      const z = zFar + (1 - zFar) * (y / WIDTH);
      const s = 1 / z;
      return {
        x: w / 2 + (x - LENGTH / 2) * k * s,
        y: top + ((s - FAR) / (1 - FAR)) * depth,
        s,
      };
    },
  };
}

/** Same pseudo-random sequence on every draw, so the crowd never flickers. */
function grain(n: number) {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

/** `home` dresses the crowd: a home stadium is mostly the home colours. */
export function pitchLayer(w: number, h: number, home?: Kit): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  const v = view(w, h);
  const p = (x: number, y: number) => v.at(x, y);
  const quad = (x1: number, y1: number, x2: number, y2: number) => {
    const a = p(x1, y1);
    const b = p(x2, y1);
    const d = p(x2, y2);
    const e = p(x1, y2);
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.lineTo(d.x, d.y);
    c.lineTo(e.x, e.y);
    c.closePath();
  };

  // Night sky, then the stand behind the far touchline: two tiers under a roof.
  const farLine = p(0, 0).y;
  const sky = c.createLinearGradient(0, 0, 0, farLine);
  sky.addColorStop(0, '#05090a');
  sky.addColorStop(1, '#0f1a16');
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);
  const dot = Math.max(1, w / 560);
  const roof = farLine * 0.2;
  const tier = roof + (farLine - roof) * 0.48;
  c.fillStyle = '#121d19';
  c.fillRect(0, roof, w, farLine - roof);
  c.fillStyle = '#0a110f';
  c.fillRect(0, tier - dot, w, 2.5 * dot); // the walkway between tiers
  // Roof edge with its shadow on the upper tier.
  c.fillStyle = '#1b2723';
  c.fillRect(0, roof - 2 * dot, w, 2.5 * dot);
  const shade = c.createLinearGradient(0, roof, 0, roof + (tier - roof) * 0.6);
  shade.addColorStop(0, 'rgba(0,0,0,0.55)');
  shade.addColorStop(1, 'rgba(0,0,0,0)');
  // The crowd: shirts in rows, mostly the home colours, lit more at the front.
  const colours = home ? [home.fill, home.edge, home.fill] : [];
  for (const [top, bottom, light] of [
    [roof + dot, tier - 2 * dot, 0.55],
    [tier + 2 * dot, farLine - 7 * dot, 0.8],
  ] as const) {
    const rows = Math.max(3, Math.floor((bottom - top) / (dot * 2.2)));
    const per = Math.floor(w / (dot * 1.8));
    for (let row = 0; row < rows; row++)
      for (let k = 0; k < per; k++) {
        const n = row * 997 + k + top;
        if (grain(n) < 0.18) continue; // empty seats
        const x = (k + grain(n + 0.3) * 0.6) * dot * 1.8;
        const y = top + row * dot * 2.2 + grain(n + 0.7) * dot * 0.6;
        const g = grain(n + 0.11);
        c.globalAlpha = light * (0.35 + 0.65 * (row / rows));
        c.fillStyle =
          colours.length && g < 0.62
            ? colours[Math.floor(g * 4.8) % 3]!
            : g < 0.8
              ? '#d9dccf'
              : '#2b3531';
        c.fillRect(x, y, dot * 1.1, dot * 1.3);
      }
  }
  c.globalAlpha = 1;
  c.fillStyle = shade;
  c.fillRect(0, roof, w, tier - roof);
  // Advertising boards along the far touchline: lit panels in the mode's colours.
  const boardTop = farLine - 6 * dot;
  c.fillStyle = '#0b1511';
  c.fillRect(0, boardTop, w, 5 * dot);
  for (let k = 0, x = 0; x < w; k++) {
    const len = w * (0.08 + grain(k + 0.9) * 0.07);
    c.fillStyle = ['rgba(233,198,90,0.55)', 'rgba(114,169,212,0.45)', 'rgba(240,241,233,0.4)'][
      k % 3
    ]!;
    c.fillRect(x + dot, boardTop + dot, len - 2 * dot, 3 * dot);
    x += len;
  }

  // Grass beyond the lines, then mown stripes across the length, a lighter
  // cross cut and a fine grain so it reads as turf, not paint.
  c.fillStyle = '#163a28';
  c.fillRect(0, farLine, w, h - farLine);
  const stripes = 14;
  for (let i = 0; i < stripes; i++) {
    c.fillStyle = i % 2 === 0 ? '#22573a' : '#1c4d33';
    quad((i * LENGTH) / stripes, -30, ((i + 1) * LENGTH) / stripes + 0.5, WIDTH + 30);
    c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,0.025)';
  for (let j = 0; j < 8; j += 2) {
    quad(-20, (j * WIDTH) / 8, LENGTH + 20, ((j + 1) * WIDTH) / 8);
    c.fill();
  }
  for (let i = 0; i < Math.floor(w * h * 0.004); i++) {
    const x = grain(i + 0.13) * w;
    const y = farLine + grain(i + 0.57) * (h - farLine);
    c.fillStyle = grain(i + 0.29) < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';
    c.fillRect(x, y, dot, dot);
  }

  // Floodlights: four pools of light and the falloff to the corners.
  for (const [x, y] of [
    [LENGTH * 0.2, WIDTH * 0.15],
    [LENGTH * 0.8, WIDTH * 0.15],
    [LENGTH * 0.2, WIDTH * 0.9],
    [LENGTH * 0.8, WIDTH * 0.9],
  ] as const) {
    const o = p(x, y);
    const g = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, w * 0.32);
    g.addColorStop(0, 'rgba(255,252,235,0.07)');
    g.addColorStop(1, 'rgba(255,252,235,0)');
    c.fillStyle = g;
    c.fillRect(0, farLine, w, h - farLine);
  }
  const fall = c.createRadialGradient(w / 2, h * 0.62, h * 0.2, w / 2, h * 0.62, w * 0.75);
  fall.addColorStop(0, 'rgba(0,8,4,0)');
  fall.addColorStop(1, 'rgba(0,8,4,0.5)');
  c.fillStyle = fall;
  c.fillRect(0, farLine, w, h - farLine);
  // Light masts at the corners of the stand: a bank of lamps and its glow.
  for (const x of [0.05, 0.95]) {
    const cx = w * x;
    const cy = roof * 0.55;
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, w * 0.13);
    g.addColorStop(0, 'rgba(255,253,240,0.5)');
    g.addColorStop(0.12, 'rgba(255,253,240,0.12)');
    g.addColorStop(1, 'rgba(255,253,240,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, farLine);
    c.fillStyle = '#26312d';
    c.fillRect(cx - dot, cy, 2 * dot, farLine - cy);
    c.fillStyle = '#fffdf0';
    for (let k = -2; k < 2; k++)
      for (const row of [0, 1])
        c.fillRect(cx + k * 2.4 * dot, cy - 3 * dot + row * 2.4 * dot, 1.8 * dot, 1.8 * dot);
  }

  // Chalk lines, as polylines through the projection.
  c.strokeStyle = 'rgba(240,241,233,0.82)';
  c.lineJoin = 'round';
  c.lineWidth = Math.max(1, 1.2 * v.k);
  const path = (pts: [number, number][], close = false) => {
    c.beginPath();
    pts.forEach(([x, y], i) => {
      const o = p(x, y);
      if (i === 0) c.moveTo(o.x, o.y);
      else c.lineTo(o.x, o.y);
    });
    if (close) c.closePath();
    c.stroke();
  };
  const rect = (x1: number, y1: number, x2: number, y2: number) =>
    path(
      [
        [x1, y1],
        [x2, y1],
        [x2, y2],
        [x1, y2],
      ],
      true,
    );
  const arc = (cx: number, cy: number, r: number, from = 0, to = Math.PI * 2) => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 48; i++) {
      const a = from + ((to - from) * i) / 48;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    path(pts);
  };
  rect(0, 0, LENGTH, WIDTH);
  path([
    [LENGTH / 2, 0],
    [LENGTH / 2, WIDTH],
  ]);
  arc(LENGTH / 2, WIDTH / 2, 91.5);
  rect(0, 138.4, 165, 541.6);
  rect(LENGTH - 165, 138.4, LENGTH, 541.6);
  rect(0, 248.4, 55, 431.6);
  rect(LENGTH - 55, 248.4, LENGTH, 431.6);
  // Penalty arcs: the part of the 9,15 m circle outside the area.
  const out = Math.acos(55 / 91.5);
  arc(110, WIDTH / 2, 91.5, -out, out);
  arc(LENGTH - 110, WIDTH / 2, 91.5, Math.PI - out, Math.PI + out);
  c.fillStyle = 'rgba(240,241,233,0.82)';
  for (const x of [110, LENGTH / 2, LENGTH - 110]) {
    const o = p(x, WIDTH / 2);
    c.beginPath();
    c.ellipse(o.x, o.y, Math.max(1.5, 2 * v.k * o.s), Math.max(1, 1.3 * v.k * o.s), 0, 0, 7);
    c.fill();
  }

  // Goals: posts standing 2,44 m on the goal line, crossbar, a hint of net.
  for (const x of [0, LENGTH]) {
    const a = p(x, WIDTH / 2 - 36.6);
    const b = p(x, WIDTH / 2 + 36.6);
    const ha = 24.4 * v.k * a.s * 0.75;
    const hb = 24.4 * v.k * b.s * 0.75;
    const back = (x === 0 ? -1 : 1) * 14 * v.k;
    c.fillStyle = 'rgba(240,241,233,0.12)';
    c.beginPath();
    c.moveTo(a.x, a.y - ha);
    c.lineTo(b.x, b.y - hb);
    c.lineTo(b.x + back, b.y);
    c.lineTo(a.x + back, a.y);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(250,250,245,0.95)';
    c.lineWidth = Math.max(1.5, 1.6 * v.k);
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(a.x, a.y - ha);
    c.lineTo(b.x, b.y - hb);
    c.lineTo(b.x, b.y);
    c.stroke();
    // Net: a few strands from the posts back to the ground.
    c.strokeStyle = 'rgba(240,241,233,0.25)';
    c.lineWidth = Math.max(0.5, 0.4 * v.k);
    for (let k = 1; k < 6; k++) {
      const f = k / 6;
      const top = { x: a.x + (b.x - a.x) * f, y: a.y - ha + (b.y - hb - (a.y - ha)) * f };
      const foot = { x: a.x + back + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
      c.beginPath();
      c.moveTo(top.x, top.y);
      c.lineTo(foot.x, foot.y);
      c.stroke();
    }
  }
  // Corner flags.
  for (const [x, y] of [
    [0, 0],
    [LENGTH, 0],
    [0, WIDTH],
    [LENGTH, WIDTH],
  ] as const) {
    const o = p(x, y);
    const pole = 15 * v.k * o.s;
    c.strokeStyle = 'rgba(240,241,233,0.9)';
    c.lineWidth = Math.max(1, 0.5 * v.k);
    c.beginPath();
    c.moveTo(o.x, o.y);
    c.lineTo(o.x, o.y - pole);
    c.stroke();
    c.fillStyle = '#e9c65a';
    c.beginPath();
    c.moveTo(o.x, o.y - pole);
    c.lineTo(o.x + (x === 0 ? 1 : -1) * pole * 0.45, o.y - pole * 0.85);
    c.lineTo(o.x, o.y - pole * 0.7);
    c.fill();
  }
  return cv;
}

export interface Kit {
  fill: string;
  edge: string;
  /** Shirt design; the pack has no field for it yet, so it comes from the club id. */
  pattern?: Pattern;
  /** Goalkeeper shirt, unlike both outfield kits. */
  keeper?: string;
}
export type Pattern = 'plain' | 'stripes' | 'hoops' | 'sash' | 'halves';
const PATTERNS: Pattern[] = ['plain', 'stripes', 'hoops', 'sash', 'halves'];
const KEEPER = ['#f2c94c', '#8e5bd6', '#2fb86b', '#1c1c1c', '#f08a3c', '#e8e8e8'];

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const distance = (a: string, b: string) => {
  const [x, y] = [rgb(a), rgb(b)];
  return Math.hypot(x[0]! - y[0]!, x[1]! - y[1]!, x[2]! - y[2]!);
};

/** Both kits for a match: pattern from the club id, keepers in a colour far from both sides. */
/** PARÂMETRO: below this colour distance two shirts read as the same team on a phone. */
const CLASH = 120;

export function kitsFor(
  home: { id: string; colours: [string, string] },
  away: { id: string; colours: [string, string] },
): [Kit, Kit] {
  const hash = (id: string) => [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  // Away kit (as in real football): when the shirts would look alike, the visitors wear their
  // second colour, or white or black, whichever stands out most from the home shirt.
  let awayColours = away.colours;
  if (distance(away.colours[0], home.colours[0]) < CLASH) {
    const options: [string, string][] = [
      [away.colours[1], away.colours[0]],
      ['#f4f4ef', away.colours[0]],
      ['#15171a', away.colours[0]],
    ];
    awayColours = options.reduce((best, o) =>
      distance(o[0], home.colours[0]) > distance(best[0], home.colours[0]) ? o : best,
    );
  }
  const outfield = [...home.colours, ...awayColours];
  const far = (skip: string[]) =>
    KEEPER.filter((k) => !skip.includes(k)).sort(
      (a, b) =>
        Math.min(...outfield.map((o) => distance(b, o))) -
        Math.min(...outfield.map((o) => distance(a, o))),
    )[0]!;
  const homeKeeper = far([]);
  const kit = (id: string, colours: [string, string], keeper: string): Kit => ({
    fill: colours[0],
    edge: colours[1],
    pattern: PATTERNS[hash(id) % PATTERNS.length]!,
    keeper,
  });
  return [kit(home.id, home.colours, homeKeeper), kit(away.id, awayColours, far([homeKeeper]))];
}

/** Shirt design inside the current path (already filled with the main colour). */
function pattern(c: CanvasRenderingContext2D, k: Kit, x: number, y: number, r: number) {
  if (!k.pattern || k.pattern === 'plain') return;
  c.save();
  c.clip();
  c.fillStyle = k.edge;
  if (k.pattern === 'stripes')
    for (let i = -1; i <= 1; i += 2)
      c.fillRect(x + i * r * 0.45 - r * 0.17, y - r, r * 0.34, r * 2);
  else if (k.pattern === 'hoops') c.fillRect(x - r, y - r * 0.2, r * 2, r * 0.4);
  else if (k.pattern === 'halves') c.fillRect(x, y - r, r, r * 2);
  else {
    c.beginPath();
    c.moveTo(x - r, y - r * 0.55);
    c.lineTo(x - r * 0.55, y - r);
    c.lineTo(x + r, y + r * 0.55);
    c.lineTo(x + r * 0.55, y + r);
    c.closePath();
    c.fill();
  }
  c.restore();
}

const SKIN = ['#f1c9a5', '#d9a47a', '#b97d52', '#8a5a3b', '#5e3b26'];
const BOOT = '#111814';
const GLOVE = '#f4f7ef';
/** Stride phase per player, carried between draws. */
const phase = new Float64Array(22);
let lastNow = 0;

interface Pose {
  x: number;
  y: number;
  r: number;
  team: number;
  kit: Kit;
  keeper: boolean;
  skin: string;
  /** Unit screen heading. */
  hx: number;
  hy: number;
  /** 0 standing … 1 sprinting. */
  amp: number;
  phase: number;
  /** Screen direction of the strike when this player kicks the ball. */
  kick: [number, number] | null;
  dive: boolean;
  handsUp: boolean;
}

/**
 * One athlete standing on (x, y), drawn in a frame where up is -y and the unit
 * is r: boots, socks, shorts, shirt (disc at home, rounded square away), arms,
 * head. Leans into the run; a keeper dives sideways with the arms stretched.
 */
function athlete(c: CanvasRenderingContext2D, q: Pose) {
  const { r, kit } = q;
  const shirt = q.keeper ? (kit.keeper ?? kit.fill) : kit.fill;
  const side = q.hx >= 0 ? 1 : -1;
  // Shadow on the grass, longer when diving.
  c.fillStyle = 'rgba(0,0,0,0.38)';
  c.beginPath();
  c.ellipse(q.x + r * 0.3, q.y, r * (q.dive ? 1.9 : 1), r * 0.38, 0, 0, Math.PI * 2);
  c.fill();

  c.save();
  c.translate(q.x, q.y);
  c.rotate(q.dive ? side * 1.15 : q.hx * q.amp * 0.16);
  const bob = Math.abs(Math.sin(q.phase)) * r * 0.12 * q.amp;
  const swing = Math.sin(q.phase) * r * 0.75 * q.amp;
  const hipY = -r * 1.25 - bob;
  const lw = Math.max(1.2, r * 0.3);
  c.lineCap = 'round';

  // Legs: sock to boot, the swinging foot lifted off the grass.
  const leg = (dx: number, s: number, kicking: boolean) => {
    let fx = dx + s * q.hx;
    let fy = -Math.max(0, Math.cos(q.phase) * s) * 0.35;
    if (kicking && q.kick) [fx, fy] = [q.kick[0] * r * 1.1, -r * 0.45];
    if (q.dive) [fx, fy] = [dx * 0.6 - side * r * 0.5, 0];
    c.strokeStyle = kit.fill;
    c.lineWidth = lw;
    c.beginPath();
    c.moveTo(dx * 0.7, hipY);
    c.lineTo(fx, fy - bob * 0.2);
    c.stroke();
    c.fillStyle = BOOT;
    c.beginPath();
    c.ellipse(fx + side * r * 0.12, fy - r * 0.05, r * 0.24, r * 0.13, 0, 0, Math.PI * 2);
    c.fill();
  };
  leg(-r * 0.28, swing, false);
  leg(r * 0.28, -swing, true);

  // Shorts.
  c.fillStyle = kit.edge;
  c.beginPath();
  c.roundRect(-r * 0.52, hipY - r * 0.3, r * 1.04, r * 0.45, r * 0.12);
  c.fill();

  // Arms behind the shirt swing against the legs; a keeper's go up.
  const ty = hipY - r * 0.92;
  const arm = (dx: number, s: number) => {
    let hx2 = dx * 1.25 - s * q.hx * 0.7;
    let hy2 = ty + r * 0.85;
    if (q.handsUp) [hx2, hy2] = [dx * 1.3, ty - r * 1.3];
    if (q.dive) [hx2, hy2] = [dx * 0.4 + side * r * 0.2, ty - r * 1.8];
    c.strokeStyle = shirt;
    c.lineWidth = lw * 0.85;
    c.beginPath();
    c.moveTo(dx, ty - r * 0.45);
    c.lineTo(hx2, hy2);
    c.stroke();
    c.fillStyle = q.keeper ? GLOVE : q.skin;
    c.beginPath();
    c.arc(hx2, hy2, r * (q.keeper ? 0.2 : 0.14), 0, Math.PI * 2);
    c.fill();
  };
  arm(-r * 0.56, -swing);
  arm(r * 0.56, swing);

  // Shirt: the shape tells the side (disc at home, rounded square away).
  const tr = r * 0.6;
  const body = () => {
    c.beginPath();
    if (q.team === 0) c.ellipse(0, ty, tr, tr * 1.2, 0, 0, Math.PI * 2);
    else c.roundRect(-tr, ty - tr * 1.2, tr * 2, tr * 2.4, tr * 0.4);
  };
  c.lineWidth = Math.max(1.2, r * 0.2);
  c.strokeStyle = q.keeper ? BOOT : kit.edge;
  c.fillStyle = shirt;
  body();
  c.fill();
  if (!q.keeper) {
    body();
    pattern(c, kit, 0, ty, tr);
  }
  body();
  c.stroke();

  // Head, turned a little towards the run, with hair.
  const hr = r * 0.4;
  const hx3 = q.hx * hr * 0.25;
  const hy3 = ty - tr * 1.2 - hr * 0.85;
  c.fillStyle = q.skin;
  c.beginPath();
  c.arc(hx3, hy3, hr, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#1a1410';
  c.beginPath();
  c.arc(hx3 - q.hx * hr * 0.2, hy3, hr, Math.PI * 1.05, Math.PI * 1.95);
  c.fill();
  c.restore();
  c.lineCap = 'butt';
}

/**
 * Players and ball between frames `a` and `b` at fraction `f`, back to front.
 * Athletes with legs, arms and head; the shirt is a disc at home and a rounded
 * square away (shape, not only colour, tells the sides).
 * `now` drives the running bob and the ball spin; both stop with reduced motion
 * because the caller then holds `f` and passes a fixed `now`.
 */
export function drawPlayers(
  c: CanvasRenderingContext2D,
  v: View,
  a: number[],
  b: number[],
  f: number,
  kits: [Kit, Kit],
  now = 0,
) {
  const lerp = (i: number) => a[i]! + (b[i]! - a[i]!) * f;
  const order = Array.from({ length: 22 }, (_, p) => p).sort(
    (p, q) => lerp(5 + p * 2) - lerp(5 + q * 2),
  );
  const ball = v.at(lerp(1), lerp(2));
  const from = v.at(a[1]!, a[2]!);
  const z = Math.max(0, lerp(3));
  // Ball speed in decimetres per frame (4 frames a second).
  const pace = Math.hypot(b[1]! - a[1]!, b[2]! - a[2]!);
  let ballDrawn = false;
  const drawBall = () => {
    const br = Math.max(2.5, 5.5 * v.k * ball.s * v.size);
    const lift = z * v.k * ball.s;
    // Shadow: smaller and softer the higher the ball.
    const spread = 1 + z / 120;
    c.fillStyle = `rgba(0,0,0,${Math.max(0.1, 0.4 - z / 350)})`;
    c.beginPath();
    c.ellipse(ball.x, ball.y, br * spread, br * 0.5 * spread, 0, 0, Math.PI * 2);
    c.fill();
    const y = ball.y - br - lift;
    // A struck ball leaves a short streak behind it.
    if (pace > 25) {
      const dx = ball.x - from.x;
      const dy = ball.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      const tail = Math.min(br * 6, (pace / 25) * br * 1.5);
      const g = c.createLinearGradient(
        ball.x,
        y,
        ball.x - (dx / len) * tail,
        y - (dy / len) * tail,
      );
      g.addColorStop(0, 'rgba(255,255,255,0.45)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.strokeStyle = g;
      c.lineWidth = br * 1.4;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(ball.x, y);
      c.lineTo(ball.x - (dx / len) * tail, y - (dy / len) * tail);
      c.stroke();
      c.lineCap = 'butt';
    }
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#0b1511';
    c.lineWidth = Math.max(1, br * 0.25);
    c.beginPath();
    c.arc(ball.x, y, br, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    // Panels that turn with the roll.
    const spin = ((lerp(1) + lerp(2)) / 25) % (Math.PI * 2);
    c.fillStyle = '#1d2a25';
    for (let k = 0; k < 3; k++) {
      const ang = spin + (k * Math.PI * 2) / 3;
      c.beginPath();
      c.arc(
        ball.x + Math.cos(ang) * br * 0.5,
        y + Math.sin(ang) * br * 0.5,
        br * 0.24,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
    ballDrawn = true;
  };

  // Who strikes the ball this frame: the nearest player when it leaves fast.
  let kicker = -1;
  if (pace > 25) {
    let best = 20; // decimetres
    for (let p = 0; p < 22; p++) {
      const d = Math.hypot(a[4 + p * 2]! - a[1]!, a[5 + p * 2]! - a[2]!);
      if (d < best) [best, kicker] = [d, p];
    }
  }
  const dt = lastNow === 0 || now === 0 ? 0 : Math.min(100, now - lastNow);
  lastNow = now;

  for (const p of order) {
    const o = v.at(lerp(4 + p * 2), lerp(5 + p * 2));
    if (!ballDrawn && ball.y < o.y) drawBall();
    const r = Math.max(4, 11 * v.k * o.s * v.size);
    const team = p < 11 ? 0 : 1;
    // Screen heading: where the player runs, else towards the ball.
    const pa = v.at(a[4 + p * 2]!, a[5 + p * 2]!);
    const pb = v.at(b[4 + p * 2]!, b[5 + p * 2]!);
    const run = Math.hypot(b[4 + p * 2]! - a[4 + p * 2]!, b[5 + p * 2]! - a[5 + p * 2]!);
    let hx = pb.x - pa.x;
    let hy = pb.y - pa.y;
    if (run < 2) [hx, hy] = [ball.x - o.x, ball.y - o.y];
    const hl = Math.hypot(hx, hy) || 1;
    // Stride: the phase advances with the distance run, so the legs match the pace.
    const amp = Math.min(1, run / 18);
    phase[p] = (phase[p]! + (dt / 1000) * (4 + 7 * amp) * Math.PI) % (Math.PI * 2);
    const near = Math.hypot(lerp(4 + p * 2) - lerp(1), lerp(5 + p * 2) - lerp(2));
    athlete(c, {
      x: o.x,
      y: o.y,
      r,
      team,
      kit: kits[team],
      keeper: p % 11 === 0,
      skin: SKIN[(p * 7) % SKIN.length]!,
      hx: hx / hl,
      hy: hy / hl,
      amp,
      phase: phase[p]!,
      kick:
        p === kicker
          ? [(ball.x - from.x) / (Math.hypot(ball.x - from.x, ball.y - from.y) || 1), 0]
          : null,
      // A keeper moving fast with the ball close is diving; close enough, his hands go up.
      dive: p % 11 === 0 && run > 16 && near < 50,
      handsUp: p % 11 === 0 && near < 90 && z > 3,
    });
  }
  if (!ballDrawn) drawBall();
}
