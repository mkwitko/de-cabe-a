/**
 * Background music: football loops recorded at stadiums and samba schools (CC0, see
 * public/audio/CREDITS.md). The track follows Ajustes: one fixed track, or `auto` (Arquibancada
 * between levels, Samba-enredo inside one). Off by default, starts only after a user gesture,
 * fades in/out, pauses with the tab, and follows the volume slider live.
 */
import { getSettings, subscribeSettings, updateSettings, type TrackId } from './settings';

export type Scene = 'menu' | 'level';

/** The slider's 100% is this loud; the loops are loudness-matched (-20 LUFS) when encoded. */
const MAX_VOLUME = 0.55;
const FADE_MS = 700;
const PREVIEW_MS = 12_000;
/** Ogg where it plays, AAC for the Safari versions that cannot decode Ogg in <audio>. */
const ext = () => (new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'm4a');

/** /career-path/3, /grid/12, ... are levels; the track page (/career-path) and the rest are menu. */
const LEVEL_RE =
  /^\/(career-path|grid|impostor|linha-do-tempo|mais-ou-menos|craque-misterioso|draft|conexoes|escalacao)\/[^/]+\/?$/;
export const sceneFor = (pathname: string): Scene => (LEVEL_RE.test(pathname) ? 'level' : 'menu');

export const trackFor = (choice: TrackId | 'auto', s: Scene): TrackId =>
  choice !== 'auto' ? choice : s === 'level' ? 'samba' : 'arquibancada';

let scene: Scene = 'menu';
let preview: TrackId | null = null;
let previewTimer = 0;
let unlocked = false; // a user gesture happened
let hidden = false;
const els: Partial<Record<TrackId, HTMLAudioElement>> = {};
const fades = new Map<HTMLAudioElement, number>();
const previewListeners = new Set<(t: TrackId | null) => void>();

export const musicOn = () => getSettings().music;
export const onMusicChange = (l: (on: boolean) => void) =>
  subscribeSettings(() => l(getSettings().music));

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
  const { music, musicVolume, track } = getSettings();
  const playing = preview ?? trackFor(track, scene);
  const want = (music || preview !== null) && unlocked && !hidden;
  const volume = musicVolume * MAX_VOLUME;
  const ids = new Set([...(Object.keys(els) as TrackId[]), ...(want ? [playing] : [])]);
  for (const id of ids) {
    let el = els[id];
    if (el && hidden) {
      // rAF is suspended in hidden tabs, so a fade would never finish: stop at once.
      cancelAnimationFrame(fades.get(el) ?? 0);
      fades.delete(el);
      el.pause();
      el.volume = 0;
      continue;
    }
    if (want && id === playing) {
      if (!el) {
        el = els[id] = new Audio(`/audio/${id}.${ext()}`);
        el.loop = true;
        el.volume = 0;
      }
      if (el.paused) void el.play().catch(() => undefined);
      fade(el, volume, false);
    } else if (el && !el.paused) fade(el, 0, true);
  }
}

// Every change in Ajustes (on/off, volume, track) applies at once.
subscribeSettings(sync);

export function setMusic(on: boolean) {
  if (on) unlocked = true; // the click that turned it on is the gesture
  updateSettings({ music: on });
}

export function setScene(s: Scene) {
  if (s === scene) return;
  scene = s;
  sync();
}

/** Plays a track for a few seconds (even with Música off); null stops the preview. */
export function previewTrack(t: TrackId | null) {
  clearTimeout(previewTimer);
  preview = t;
  if (t) {
    unlocked = true;
    previewTimer = window.setTimeout(() => previewTrack(null), PREVIEW_MS);
  }
  for (const l of previewListeners) l(t);
  sync();
}
export const previewing = () => preview;
export function onPreviewChange(l: (t: TrackId | null) => void) {
  previewListeners.add(l);
  return () => void previewListeners.delete(l);
}

if (typeof document !== 'undefined') {
  // Only these events grant user activation on touch (pointerdown does not). The listeners stay
  // until a play() actually succeeds, so a rejected first try gets another gesture.
  const GESTURES = ['pointerup', 'click', 'touchend', 'keydown'] as const;
  const unlock = () => {
    unlocked = true;
    sync();
    const el = els[preview ?? trackFor(getSettings().track, scene)];
    if (!getSettings().music || !el) return;
    void el
      .play()
      .then(() => GESTURES.forEach((e) => removeEventListener(e, unlock)))
      .catch(() => undefined);
  };
  GESTURES.forEach((e) => addEventListener(e, unlock));
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
    sync();
  });
}
