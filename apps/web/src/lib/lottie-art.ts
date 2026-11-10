/**
 * Our own Lottie animations, authored as code so they take the game's colours (a rarity's, the
 * title's) at play time. Each returns plain Lottie JSON for the dotLottie player; only the lazy
 * player chunk imports this file. Frames are at 30 fps; positions are in each comp's own units.
 */
type V = number[];
type Ease = [number, number, number, number];
const OUT: Ease = [0.16, 1, 0.3, 1]; // ease-out-expo, as in the CSS
const IN_OUT: Ease = [0.45, 0, 0.55, 1];

/** Animated property from [frame, value] pairs; each segment eases with `ease`. */
const kf = (pairs: [number, V][], ease: Ease = OUT) => ({
  a: 1,
  k: pairs.map(([t, s], i) => {
    if (i === pairs.length - 1) return { t, s };
    const one = s.length === 1;
    return {
      t,
      s,
      o: { x: one ? [ease[0]] : ease[0], y: one ? [ease[1]] : ease[1] },
      i: { x: one ? [ease[2]] : ease[2], y: one ? [ease[3]] : ease[3] },
    };
  }),
});
const st = (k: unknown) => ({ a: 0, k });

/** '#rrggbb' or a computed 'rgb(r, g, b)' → Lottie's 0–1 RGBA. */
const rgb = (color: string, a = 1) => {
  const m = /^rgba?\((\d+)\D+(\d+)\D+(\d+)/.exec(color);
  if (m) return [+m[1]! / 255, +m[2]! / 255, +m[3]! / 255, a];
  const n = parseInt(color.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a];
};
const fill = (hex: string, o = 100) => ({ ty: 'fl', c: st(rgb(hex)), o: st(o), r: 1 });
const stroke = (hex: string, w: number, o = 100) => ({
  ty: 'st',
  c: st(rgb(hex)),
  o: st(o),
  w: st(w),
  lc: 2,
  lj: 2,
});
const tr = () => ({
  ty: 'tr',
  p: st([0, 0]),
  a: st([0, 0]),
  s: st([100, 100]),
  r: st(0),
  o: st(100),
});
const group = (it: object[], nm = 'g') => ({ ty: 'gr', nm, it: [...it, tr()] });
const rect = (w: number, h: number, r = 0, p: V = [0, 0]) => ({
  ty: 'rc',
  d: 1,
  p: st(p),
  s: st([w, h]),
  r: st(r),
});
const ellipse = (d: number, p: V = [0, 0]) => ({ ty: 'el', d: 1, p: st(p), s: st([d, d]) });
/** Straight-segment path through `v` (closed or open). */
const path = (v: V[], closed = true) => ({
  ty: 'sh',
  ks: st({ v, i: v.map(() => [0, 0]), o: v.map(() => [0, 0]), c: closed }),
});
const trim = (s: object, e: object) => ({ ty: 'tm', s, e, o: st(0), m: 1 });

type Ks = { o?: object; r?: object; p?: object; a?: object; s?: object };
let ind = 0;
const layer = (nm: string, shapes: object[], ks: Ks, ip: number, op: number) => ({
  ddd: 0,
  ind: ++ind,
  ty: 4,
  nm,
  sr: 1,
  ip,
  op,
  st: 0,
  bm: 0,
  ks: {
    o: ks.o ?? st(100),
    r: ks.r ?? st(0),
    p: ks.p ?? st([0, 0, 0]),
    a: ks.a ?? st([0, 0, 0]),
    s: ks.s ?? st([100, 100, 100]),
  },
  shapes,
});
const comp = (nm: string, w: number, h: number, op: number, layers: object[]) => ({
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op,
  w,
  h,
  nm,
  ddd: 0,
  assets: [],
  layers,
});

/** Seeded so every play of the same moment looks the same. */
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const polar = (cx: number, cy: number, r: number, a: number): V => [
  cx + r * Math.cos(a),
  cy + r * Math.sin(a),
];

/**
 * A rare sticker's pack: a dark foil pack edged in the rarity colour shivers, its crimp tears off,
 * and a burst of rays and sparks in that colour opens where the card will spin in. 400×400, 1.4 s.
 */
export function packBurst(colors: string[] = ['#f5c400']) {
  ind = 0;
  const color = colors[0]!;
  const C = 200;
  const W = 184;
  const H = 250;
  const top = C - H / 2;
  const rand = rng(7);
  const layers: object[] = [];
  // sparks, on top: the rarity's colours and white
  const spark = [...colors, '#ffffff'];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + rand() * 0.3;
    const to = polar(C, C, 130 + rand() * 60, a);
    layers.push(
      layer(
        `spark ${i}`,
        [group([ellipse(5 + rand() * 5), fill(spark[i % spark.length]!)])],
        {
          p: kf([
            [15, [C, C, 0]],
            [36, [...to, 0]],
          ]),
          o: kf([
            [15, [100]],
            [26, [100]],
            [38, [0]],
          ]),
          s: kf([
            [15, [100, 100, 100]],
            [38, [30, 30, 100]],
          ]),
        },
        15,
        42,
      ),
    );
  }
  // rays: lines drawn out from the centre and away again, in the rarity's colours
  colors.forEach((c, k) => {
    const n = Math.max(2, Math.round(12 / colors.length));
    const rays = Array.from({ length: n }, (_, i) => {
      const a = ((i * colors.length + k) / (n * colors.length)) * Math.PI * 2 + Math.PI / 12;
      return path([polar(0, 0, 46, a), polar(0, 0, (i + k) % 2 ? 150 : 185, a)], false);
    });
    layers.push(
      layer(
        `rays ${k}`,
        [
          ...rays,
          trim(
            kf([
              [24, [0]],
              [36, [100]],
            ]),
            kf([
              [15, [0]],
              [26, [100]],
            ]),
          ),
          stroke(c, 7),
        ],
        { p: st([C, C, 0]) },
        15,
        42,
      ),
    );
  });
  // flash
  layers.push(
    layer(
      'flash',
      [group([ellipse(220), fill('#ffffff')])],
      {
        p: st([C, C, 0]),
        o: kf([
          [15, [0]],
          [18, [55]],
          [28, [0]],
        ]),
        s: kf([
          [15, [40, 40, 100]],
          [28, [130, 130, 100]],
        ]),
      },
      15,
      30,
    ),
  );
  // the crimp: a strip with a torn, zig-zag lower edge, ripped off up and to the right
  const teeth: V[] = [];
  for (let i = 0; i <= 12; i++) teeth.push([W / 2 - (i * W) / 12, i % 2 ? 9 : 15]);
  layers.push(
    layer(
      'crimp',
      [
        group([
          path([[-W / 2, -15], [W / 2, -15], ...teeth]),
          fill(color),
          stroke('#000000', 2, 25),
        ]),
        group([rect(W - 24, 3, 1.5, [0, -4]), fill('#000000', 22)]),
      ],
      {
        p: kf(
          [
            [0, [C, top + 15, 0]],
            [12, [C, top + 15, 0]],
            [24, [C + 120, top - 70, 0]],
          ],
          [0.5, 0, 0.2, 1],
        ),
        r: kf([
          [6, [0]],
          [8, [-3]],
          [10, [3]],
          [12, [0]],
          [24, [38]],
        ]),
        o: kf([
          [0, [0]],
          [3, [100]],
          [18, [100]],
          [26, [0]],
        ]),
      },
      0,
      28,
    ),
  );
  // the pack body: dark foil, a rim and a band in the rarity colour; it drops away for the card
  layers.push(
    layer(
      'pack',
      [
        group([rect(W - 30, 4, 2, [0, -60]), fill(color, 90)]),
        group([rect(W - 30, 26, 3, [0, -30]), fill(color, 85)]),
        // the card's own crest, outlined, as the pack's mark
        group(
          [
            path([
              [-26, 14],
              [26, 14],
              [30, 18],
              [30, 52],
              [0, 72],
              [-30, 52],
              [-30, 18],
            ]),
            stroke(color, 3),
          ],
          'crest',
        ),
        group([rect(W, H - 30, 10), fill('#151b28'), stroke(color, 4)]),
      ],
      {
        p: kf(
          [
            [0, [C, C + 15, 0]],
            [16, [C, C + 15, 0]],
            [30, [C, C + 260, 0]],
          ],
          [0.55, 0, 0.8, 0.4],
        ),
        r: kf(
          [
            [6, [0]],
            [8, [3]],
            [10, [-3]],
            [12, [2]],
            [14, [0]],
            [30, [-8]],
          ],
          IN_OUT,
        ),
        s: kf([
          [0, [82, 82, 100]],
          [6, [100, 100, 100]],
        ]),
        o: kf([
          [0, [0]],
          [3, [100]],
          [22, [100]],
          [30, [0]],
        ]),
      },
      0,
      32,
    ),
  );
  return comp('Pacote rasgando', 400, 400, 42, layers);
}

/** A glint on a new title badge: idle while the badge spins in, then a four-point star flares. */
export function glint() {
  ind = 0;
  const star = (r: number, w: number): V[] => [
    [0, -r],
    [w, -w],
    [r, 0],
    [w, w],
    [0, r],
    [-w, w],
    [-r, 0],
    [-w, -w],
  ];
  const flare = (nm: string, at: V, r: number, from: number) =>
    layer(
      nm,
      [group([path(star(r, r * 0.13)), fill('#ffffff')])],
      {
        p: st([...at, 0]),
        s: kf([
          [from, [0, 0, 100]],
          [from + 6, [100, 100, 100]],
          [from + 16, [0, 0, 100]],
        ]),
        r: kf(
          [
            [from, [0]],
            [from + 16, [90]],
          ],
          IN_OUT,
        ),
      },
      from,
      from + 17,
    );
  return comp('Brilho do título', 120, 120, 44, [
    flare('flare', [72, 44], 40, 20),
    flare('flare small', [44, 78], 16, 25),
  ]);
}

/**
 * Three stars: two fireworks over the stands in cover yellow and chalk, then a light fall of
 * paper confetti in the album's colours across the big screen. 400×320, about 3.5 s, once.
 */
export function confetti() {
  ind = 0;
  const rand = rng(11);
  const layers: object[] = [];
  const paper = ['#f5c400', '#f4efe1', '#a3242f', '#2f9a5a', '#1d3f7a'];
  for (let i = 0; i < 22; i++) {
    const x = 20 + rand() * 360;
    const from = 8 + Math.round(rand() * 34);
    const len = 46 + Math.round(rand() * 24);
    const sway = (rand() - 0.5) * 60;
    layers.push(
      layer(
        `paper ${i}`,
        [group([rect(7, 11, 1), fill(paper[i % paper.length]!)])],
        {
          p: kf(
            [
              [from, [x, -16, 0]],
              [from + len / 2, [x + sway, 140, 0]],
              [from + len, [x - sway / 2, 336, 0]],
            ],
            [0.3, 0, 0.7, 1],
          ),
          r: kf(
            [
              [from, [rand() * 90]],
              [from + len, [rand() * 90 + 540]],
            ],
            IN_OUT,
          ),
          s: kf(
            [
              [from, [100, 100, 100]],
              [from + len / 4, [100, 20, 100]],
              [from + len / 2, [100, 100, 100]],
              [from + (3 * len) / 4, [100, 25, 100]],
              [from + len, [100, 100, 100]],
            ],
            IN_OUT,
          ),
        },
        from,
        from + len + 1,
      ),
    );
  }
  const burst = (cx: number, cy: number, from: number, color: string) => {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 54 + rand() * 18;
      const [x, y] = polar(cx, cy, r, a);
      layers.push(
        layer(
          `burst ${cx} ${i}`,
          [group([ellipse(i % 2 ? 4 : 6), fill(i % 4 ? color : '#ffffff')])],
          {
            p: kf([
              [from, [cx, cy, 0]],
              [from + 14, [x!, y!, 0]],
              [from + 30, [x!, y! + 22, 0]],
            ]),
            o: kf([
              [from, [100]],
              [from + 16, [100]],
              [from + 30, [0]],
            ]),
          },
          from,
          from + 31,
        ),
      );
    }
  };
  burst(92, 70, 0, '#f5c400');
  burst(306, 54, 10, '#e9eef8');
  // every paper lands before the comp ends (about 3.5 s)
  return comp(
    'De placa',
    400,
    320,
    Math.max(...layers.map((l) => (l as { op: number }).op)),
    layers,
  );
}

/** Empty and error states (chalk = the page text colour): a ball flies into the net, the net gives, the ball drops. 160×120, loops. */
export function goal(colors: string[] = ['#f2f5ef']) {
  ind = 0;
  const chalk = colors[0]!; // the page's text colour, so the goal reads in both themes
  const net: object[] = [];
  for (let x = 40; x <= 120; x += 10)
    net.push(
      path(
        [
          [x - 80, -28],
          [x - 80, 38],
        ],
        false,
      ),
    );
  for (let y = 40; y <= 90; y += 10)
    net.push(
      path(
        [
          [-48, y - 62],
          [48, y - 62],
        ],
        false,
      ),
    );
  const ball = [
    group([
      path([
        [0, -4.6],
        [4.4, -1.4],
        [2.7, 3.7],
        [-2.7, 3.7],
        [-4.4, -1.4],
      ]),
      fill('#1d2a1f'),
    ]),
    group([ellipse(19), fill('#ffffff'), stroke('#1d2a1f', 1.6)]),
  ];
  return comp('Bola na rede', 160, 120, 72, [
    layer(
      'ball',
      ball,
      {
        p: kf([
          [0, [70, 140, 0]],
          [14, [82, 62, 0]],
          [20, [83, 66, 0]],
          [32, [86, 92, 0]],
          [37, [87, 86, 0]],
          [42, [88, 92, 0]],
        ]),
        s: kf([
          [0, [190, 190, 100]],
          [14, [100, 100, 100]],
          [20, [88, 88, 100]],
        ]),
        r: kf([
          [0, [0]],
          [42, [420]],
        ]),
        o: kf([
          [0, [100]],
          [58, [100]],
          [68, [0]],
        ]),
      },
      0,
      72,
    ),
    layer(
      'frame',
      [
        group([
          path(
            [
              [30, 100],
              [30, 30],
              [130, 30],
              [130, 100],
            ],
            false,
          ),
          stroke(chalk, 4),
        ]),
        group([
          path(
            [
              [8, 100],
              [152, 100],
            ],
            false,
          ),
          stroke(chalk, 2, 60),
        ]),
      ],
      {},
      0,
      72,
    ),
    layer(
      'net',
      [group([...net, stroke(chalk, 1.2, 45)])],
      {
        p: st([82, 62, 0]),
        a: st([2, 0, 0]),
        s: kf([
          [14, [100, 100, 100]],
          [18, [86, 88, 100]],
          [26, [104, 103, 100]],
          [34, [100, 100, 100]],
        ]),
      },
      0,
      72,
    ),
  ]);
}

export const ART: Record<
  'packBurst' | 'glint' | 'confetti' | 'goal',
  (colors?: string[]) => Record<string, unknown>
> = { packBurst, glint, confetti, goal };
export type Art = keyof typeof ART;
