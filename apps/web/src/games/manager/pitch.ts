/**
 * Night-match pitch for the Modo Clube (MC-262 direction): mown stripes,
 * floodlight falloff, chalk lines. Drawn once per size into an offscreen
 * canvas; each frame only blits it and draws 22 players and the ball.
 */
export const LENGTH = 1050; // decimetres, as in the frames
export const WIDTH = 680;

export function pitchLayer(w: number, h: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  const k = w / LENGTH;
  const stripes = 14;
  for (let i = 0; i < stripes; i++) {
    c.fillStyle = i % 2 === 0 ? '#1f5236' : '#1a4830';
    c.fillRect((i * w) / stripes, 0, w / stripes + 1, h);
  }
  // Four floodlights: brighter in the middle, falling off to the corners.
  const g = c.createRadialGradient(w / 2, h / 2, h * 0.15, w / 2, h / 2, w * 0.7);
  g.addColorStop(0, 'rgba(255,255,240,0.07)');
  g.addColorStop(1, 'rgba(0,8,4,0.45)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(240, 248, 240, 0.8)';
  c.lineWidth = Math.max(1, 1.2 * k); // 12 cm lines
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    c.beginPath();
    c.moveTo(x1 * k, y1 * k);
    c.lineTo(x2 * k, y2 * k);
    c.stroke();
  };
  c.strokeRect(c.lineWidth / 2, c.lineWidth / 2, w - c.lineWidth, h - c.lineWidth);
  line(LENGTH / 2, 0, LENGTH / 2, WIDTH);
  c.beginPath();
  c.arc((LENGTH / 2) * k, (WIDTH / 2) * k, 91.5 * k, 0, Math.PI * 2);
  c.stroke();
  for (const x of [0, LENGTH - 165]) c.strokeRect(x * k, 138.4 * k, 165 * k, 403.2 * k);
  for (const x of [0, LENGTH - 55]) c.strokeRect(x * k, 248.4 * k, 55 * k, 183.2 * k);
  for (const x of [110, LENGTH - 110]) {
    c.beginPath();
    c.arc(x * k, (WIDTH / 2) * k, Math.max(1.5, 2 * k), 0, Math.PI * 2);
    c.fillStyle = 'rgba(240, 248, 240, 0.8)';
    c.fill();
  }
  // Goals.
  c.fillStyle = 'rgba(240, 248, 240, 0.9)';
  c.fillRect(0, 303.4 * k, 6 * k, 73.2 * k);
  c.fillRect(w - 6 * k, 303.4 * k, 6 * k, 73.2 * k);
  return cv;
}

export interface Kit {
  fill: string;
  edge: string;
}

/** Players and ball between frames `a` and `b` at fraction `f`. Home: discs; away: squares. */
export function drawPlayers(
  c: CanvasRenderingContext2D,
  k: number,
  a: number[],
  b: number[],
  f: number,
  kits: [Kit, Kit],
) {
  const at = (i: number) => (a[i]! + (b[i]! - a[i]!) * f) * k;
  const r = Math.max(4.5, 11 * k);
  for (let p = 0; p < 22; p++) {
    const x = at(4 + p * 2);
    const y = at(5 + p * 2);
    const kit = kits[p < 11 ? 0 : 1];
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.beginPath();
    c.ellipse(x + r * 0.25, y + r * 0.35, r, r * 0.7, 0, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = Math.max(1.5, r * 0.28);
    c.strokeStyle = kit.edge;
    c.fillStyle = kit.fill;
    // Keepers in a lighter shade of the same shape.
    if (p % 11 === 0) c.globalAlpha = 0.75;
    if (p < 11) {
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    } else {
      c.beginPath();
      c.roundRect(x - r, y - r, r * 2, r * 2, r * 0.35);
      c.fill();
      c.stroke();
    }
    c.globalAlpha = 1;
  }
  // Ball: its height lifts it off its shadow.
  const bx = at(1);
  const by = at(2);
  const z = Math.max(0, at(3));
  const br = Math.max(3, 5.5 * k);
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath();
  c.ellipse(bx + z * 0.4, by + z * 0.6, br, br * 0.7, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#ffffff';
  c.strokeStyle = '#0b1a12';
  c.lineWidth = Math.max(1, br * 0.3);
  c.beginPath();
  c.arc(bx, by - z * 0.5, br * (1 + z / 300), 0, Math.PI * 2);
  c.fill();
  c.stroke();
}
