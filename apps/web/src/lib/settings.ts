/**
 * Ajustes kept on this device (one JSON key): Música and Efeitos with their volumes, the track,
 * and reduced motion. Off by default for sound (many play on the bus). Older single keys
 * (`dc_music`, `dc_sfx`, `dc_sound`) are read once, so earlier choices survive the move.
 * Vibration keeps its own key in `haptics.ts`.
 */
import { useSyncExternalStore } from 'react';

export const TRACKS = [
  {
    id: 'torcida-organizada',
    name: 'Torcida organizada',
    about: 'Torcida brasileira cantando no estádio',
  },
  { id: 'hinchada', name: 'Hinchada', about: 'Torcida argentina, cantos e festa na rua' },
  { id: 'murga', name: 'Murga', about: 'Bombos e redoblantes de Buenos Aires' },
  { id: 'maracana', name: 'Maracanã', about: 'Estádio lotado rugindo no Rio' },
  { id: 'batucada', name: 'Batucada', about: 'Surdo, caixa e repique' },
] as const;
export type TrackId = (typeof TRACKS)[number]['id'];
/** `auto`: Torcida organizada between levels, Batucada inside one. A saved track that no longer exists falls back to `auto`. */
export type TrackChoice = 'auto' | TrackId;

export type Settings = {
  music: boolean;
  musicVolume: number; // 0..1
  sfx: boolean;
  sfxVolume: number; // 0..1
  track: TrackChoice;
  /** null follows the system (`prefers-reduced-motion`). */
  reduceMotion: boolean | null;
};

export const DEFAULTS: Settings = {
  music: false,
  musicVolume: 0.6,
  sfx: false,
  sfxVolume: 0.8,
  track: 'auto',
  reduceMotion: null,
};

const KEY = 'dc_settings';
const clamp = (n: unknown, d: number) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : d;
const isTrack = (t: unknown): t is TrackChoice => t === 'auto' || TRACKS.some((x) => x.id === t);

/** Saved settings, or the old keys migrated; anything unreadable falls back to the default. */
export function readSettings(store: Pick<Storage, 'getItem'>): Settings {
  let saved: Partial<Settings> | null;
  try {
    saved = JSON.parse(store.getItem(KEY) ?? 'null') as Partial<Settings> | null;
  } catch {
    saved = null;
  }
  if (saved && typeof saved === 'object')
    return {
      music: saved.music === true,
      musicVolume: clamp(saved.musicVolume, DEFAULTS.musicVolume),
      sfx: saved.sfx === true,
      sfxVolume: clamp(saved.sfxVolume, DEFAULTS.sfxVolume),
      track: isTrack(saved.track) ? saved.track : DEFAULTS.track,
      reduceMotion: typeof saved.reduceMotion === 'boolean' ? saved.reduceMotion : null,
    };
  return {
    ...DEFAULTS,
    music: store.getItem('dc_music') === 'on',
    sfx: (store.getItem('dc_sfx') ?? store.getItem('dc_sound')) === 'on',
  };
}

let current: Settings = DEFAULTS;
try {
  current = readSettings(localStorage);
} catch {
  /* storage blocked: defaults */
}
const listeners = new Set<() => void>();

export const getSettings = () => current;
export function subscribeSettings(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}
export const useSettings = () => useSyncExternalStore(subscribeSettings, getSettings, getSettings);

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* private mode: this visit only */
  }
  applyMotion();
  for (const l of listeners) l();
}

const systemReduce = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** The system asks for less motion: the switch shows it and cannot turn motion back on. */
export const systemReducesMotion = systemReduce;
export const motionReduced = () => current.reduceMotion ?? systemReduce();

/** `data-motion="reduce"` on <html> stills every CSS animation and transition (index.css). */
function applyMotion() {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  if (current.reduceMotion) el.dataset.motion = 'reduce';
  else delete el.dataset.motion;
}
applyMotion();
