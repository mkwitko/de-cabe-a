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

/** Canvas height over width. */
export const ASPECT = 0.56;
/** Far touchline width over near touchline width (camera tilt). */
const FAR = 0.74;
/** Pitch depth on screen over its top-down depth. */
const TILT = 0.62;
/** Margin at each side of the near touchline, over the canvas width. */
const SIDE = 0.035;

export interface View {
  w: number;
  h: number;
  /** Pixels per decimetre on the near touchline. */
  k: number;
  /** Screen point of a pitch point, and the scale there (1 near, FAR far). */
  at(x: number, y: number): { x: number; y: number; s: number };
}

/**
 * Homography of the ground plane: depth z grows linearly from the near (1) to
 * the far touchline (1 / FAR); the screen scale is 1 / z and the screen row is
 * linear in 1 / z, which is what a pinhole camera sees.
 */
export function view(w: number, h: number): View {
  const k = (w * (1 - 2 * SIDE)) / LENGTH;
  const depth = WIDTH * k * TILT;
  const bottom = h - h * 0.05;
  const top = bottom - depth;
  const zFar = 1 / FAR;
  return {
    w,
    h,
    k,
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

export function pitchLayer(w: number, h: number): HTMLCanvasElement {
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

  // Night sky and the stand behind the far touchline.
  const farLine = p(0, 0).y;
  const sky = c.createLinearGradient(0, 0, 0, farLine);
  sky.addColorStop(0, '#05090a');
  sky.addColorStop(1, '#101c17');
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);
  const standTop = farLine * 0.28;
  c.fillStyle = '#0d1714';
  c.fillRect(0, standTop, w, farLine - standTop);
  // The crowd: faint dots of shirts, more of the home colours near the lights.
  const dot = Math.max(1, w / 640);
  for (let i = 0; i < Math.floor(w * 1.2); i++) {
    const x = grain(i) * w;
    const y = standTop + 4 * dot + grain(i + 0.5) * (farLine - standTop - 10 * dot);
    c.fillStyle = `rgba(240,241,233,${0.04 + grain(i + 0.25) * 0.1})`;
    c.fillRect(x, y, dot, dot);
  }
  // Advertising board along the far touchline.
  c.fillStyle = '#0b1511';
  c.fillRect(0, farLine - 6 * dot, w, 5 * dot);
  c.fillStyle = 'rgba(233,198,90,0.35)';
  c.fillRect(0, farLine - 6 * dot, w, dot);

  // Grass beyond the lines, then the mown stripes across the length.
  c.fillStyle = '#163a28';
  c.fillRect(0, farLine, w, h - farLine);
  const stripes = 14;
  for (let i = 0; i < stripes; i++) {
    c.fillStyle = i % 2 === 0 ? '#22573a' : '#1c4d33';
    quad((i * LENGTH) / stripes, -30, ((i + 1) * LENGTH) / stripes + 0.5, WIDTH + 30);
    c.fill();
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
  // Light masts at the corners of the stand.
  for (const x of [0.06, 0.94]) {
    const g = c.createRadialGradient(w * x, standTop, 0, w * x, standTop, w * 0.12);
    g.addColorStop(0, 'rgba(255,253,240,0.55)');
    g.addColorStop(0.15, 'rgba(255,253,240,0.12)');
    g.addColorStop(1, 'rgba(255,253,240,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, farLine);
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
    const ha = 24.4 * v.k * a.s * TILT * 1.2;
    const hb = 24.4 * v.k * b.s * TILT * 1.2;
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
  }
  return cv;
}

export interface Kit {
  fill: string;
  edge: string;
}

/**
 * Players and ball between frames `a` and `b` at fraction `f`, back to front.
 * Home: discs; away: rounded squares (shape, not only colour, tells the sides).
 */
export function drawPlayers(
  c: CanvasRenderingContext2D,
  v: View,
  a: number[],
  b: number[],
  f: number,
  kits: [Kit, Kit],
) {
  const lerp = (i: number) => a[i]! + (b[i]! - a[i]!) * f;
  const order = Array.from({ length: 22 }, (_, p) => p).sort(
    (p, q) => lerp(5 + p * 2) - lerp(5 + q * 2),
  );
  const ball = v.at(lerp(1), lerp(2));
  const z = Math.max(0, lerp(3));
  let ballDrawn = false;
  const drawBall = () => {
    const br = Math.max(2.5, 5.5 * v.k * ball.s);
    const lift = z * v.k * ball.s;
    c.fillStyle = `rgba(0,0,0,${Math.max(0.12, 0.38 - z / 400)})`;
    c.beginPath();
    c.ellipse(ball.x, ball.y, br, br * 0.5, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#0b1511';
    c.lineWidth = Math.max(1, br * 0.3);
    c.beginPath();
    c.arc(ball.x, ball.y - br - lift, br, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    ballDrawn = true;
  };

  for (const p of order) {
    const o = v.at(lerp(4 + p * 2), lerp(5 + p * 2));
    if (!ballDrawn && ball.y < o.y) drawBall();
    const r = Math.max(4, 11 * v.k * o.s);
    const kit = kits[p < 11 ? 0 : 1];
    // Shadow on the grass, then the body standing on it.
    c.fillStyle = 'rgba(0,0,0,0.38)';
    c.beginPath();
    c.ellipse(o.x + r * 0.35, o.y, r * 1.05, r * 0.42, 0, 0, Math.PI * 2);
    c.fill();
    const y = o.y - r * 1.15;
    c.lineWidth = Math.max(1.5, r * 0.28);
    c.strokeStyle = kit.edge;
    c.fillStyle = kit.fill;
    // Keepers in a lighter shade of the same shape.
    if (p % 11 === 0) c.globalAlpha = 0.75;
    c.beginPath();
    if (p < 11) c.arc(o.x, y, r, 0, Math.PI * 2);
    else c.roundRect(o.x - r, y - r, r * 2, r * 2, r * 0.35);
    c.fill();
    c.stroke();
    c.globalAlpha = 1;
    // Floodlight sheen on the upper edge.
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = Math.max(1, r * 0.18);
    c.beginPath();
    if (p < 11) c.arc(o.x, y, r * 0.72, Math.PI * 1.15, Math.PI * 1.85);
    else {
      c.moveTo(o.x - r * 0.55, y - r * 0.6);
      c.lineTo(o.x + r * 0.55, y - r * 0.6);
    }
    c.stroke();
  }
  if (!ballDrawn) drawBall();
}
