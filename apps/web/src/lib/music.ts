/**
 * Background music: two CC0 loops (see public/audio/CREDITS.md). Menu everywhere, level inside a
 * level route. Off by default, starts only after a user gesture, fades in/out, pauses with the tab.
 */
export type Scene = 'menu' | 'level';

const KEY = 'dc_music';
const VOLUME = 0.35;
const FADE_MS = 700;
const SRC: Record<Scene, string> = { menu: '/audio/menu.ogg', level: '/audio/level.ogg' };

/** /career-path/3, /grid/12, ... are levels; the track page (/career-path) and the rest are menu. */
const LEVEL_RE =
  /^\/(career-path|grid|impostor|linha-do-tempo|mais-ou-menos|craque-misterioso|draft|conexoes|escalacao)\/[^/]+\/?$/;
export const sceneFor = (pathname: string): Scene => (LEVEL_RE.test(pathname) ? 'level' : 'menu');

export const readMusic = (store: Pick<Storage, 'getItem'>) => store.getItem(KEY) === 'on';

let enabled = false;
try {
  enabled = readMusic(localStorage);
} catch {
  /* storage blocked: off */
}
let scene: Scene = 'menu';
let unlocked = false; // a user gesture happened
let hidden = false;
const listeners = new Set<(on: boolean) => void>();
const els: Partial<Record<Scene, HTMLAudioElement>> = {};
const fades = new Map<HTMLAudioElement, number>();

export const musicOn = () => enabled;
export const onMusicChange = (l: (on: boolean) => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

function fade(el: HTMLAudioElement, to: number, pauseAtEnd: boolean) {
  const prev = fades.get(el);
  if (prev) cancelAnimationFrame(prev);
  const from = el.volume;
  const t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / FADE_MS);
    el.volume = from + (to - from) * k;
    if (k < 1) fades.set(el, requestAnimationFrame(step));
    else {
      fades.delete(el);
      if (pauseAtEnd) el.pause();
    }
  };
  fades.set(el, requestAnimationFrame(step));
}

function sync() {
  const want = enabled && unlocked && !hidden;
  for (const s of ['menu', 'level'] as const) {
    const active = want && s === scene;
    let el = els[s];
    if (active) {
      if (!el) {
        el = els[s] = new Audio(SRC[s]);
        el.loop = true;
        el.volume = 0;
      }
      if (el.paused) void el.play().catch(() => undefined);
      fade(el, VOLUME, false);
    } else if (el && !el.paused) fade(el, 0, true);
  }
}

export function setMusic(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* private mode: this visit only */
  }
  if (on) unlocked = true; // the click that turned it on is the gesture
  for (const l of listeners) l(on);
  sync();
}

export function setScene(s: Scene) {
  if (s === scene) return;
  scene = s;
  sync();
}

if (typeof document !== 'undefined') {
  const unlock = () => {
    unlocked = true;
    sync();
    for (const e of ['pointerdown', 'keydown'] as const) removeEventListener(e, unlock);
  };
  for (const e of ['pointerdown', 'keydown'] as const) addEventListener(e, unlock);
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
    sync();
  });
}
