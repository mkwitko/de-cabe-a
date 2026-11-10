/**
 * Game sounds, synthesised with Web Audio (no files, nothing to license). Off by default: many
 * play on the bus. The choice and the volume live in Ajustes (`settings.ts`). The audio context
 * starts on the first sound after a tap (browsers only allow audio after a user gesture).
 * A crowd pack (Clube, Banca) swaps the broadcast roar and the win's roar for a 6 s cut of a CC0
 * recording (public/audio/torcida-*, CREDITS.md); the Clube's adds synthesised claps.
 */
import type { CrowdPack } from '@decabeca/contracts';
import { getSettings, subscribeSettings, updateSettings } from './settings';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export const soundOn = () => getSettings().sfx;
export function setSound(on: boolean) {
  updateSettings({ sfx: on });
  if (on) play('tap');
}
export const onSoundChange = (l: (on: boolean) => void) =>
  subscribeSettings(() => l(getSettings().sfx));

// The Efeitos slider moves every sound, including one already ringing.
subscribeSettings(() => {
  if (master) master.gain.value = getSettings().sfxVolume;
});

/** Every sound goes through one gain node set by the Efeitos volume. */
function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = getSettings().sfxVolume;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}
function out(): GainNode {
  audio();
  return master as GainNode;
}

function tone(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  gain = 0.15,
  to?: number,
) {
  const a = audio();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime + start);
  if (to) o.frequency.exponentialRampToValueAtTime(to, a.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, a.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(out());
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.05);
  return o;
}

/** Filtered noise: a crowd's roar (low band) or a click (short). */
function noise(start: number, dur: number, gain: number, freq: number) {
  const a = audio();
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 0.8;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, a.currentTime + start + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  src.connect(filter).connect(g).connect(out());
  src.start(a.currentTime + start);
  return { src, g };
}

let pack: CrowdPack | null = null;
const files = new Map<CrowdPack, Promise<ArrayBuffer | null>>();
const decoded = new Map<CrowdPack, Promise<AudioBuffer | null>>();
/** Ogg where it decodes, AAC for the Safari versions that cannot (as music.ts). */
const ext = () => (new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'm4a');
const fileOf = (p: CrowdPack) => {
  let f = files.get(p);
  if (!f) {
    f = fetch(`/audio/${p.replace('_', '-')}.${ext()}`)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null);
    files.set(p, f);
  }
  return f;
};
/** Decoded on the first sound (the context needs a gesture); the file is fetched ahead. */
function bufferOf(p: CrowdPack) {
  let b = decoded.get(p);
  if (!b) {
    b = fileOf(p).then((data) =>
      data
        ? audio()
            .decodeAudioData(data.slice(0))
            .catch(() => null)
        : null,
    );
    decoded.set(p, b);
  }
  return b;
}

/** The worn crowd pack (null: the synthesised roar); its file starts loading at once. */
export function setCrowdPack(p: CrowdPack | null) {
  pack = p;
  if (p) void fileOf(p);
}

/** Fades a gain to silence and stops its source (Pular on the broadcast). */
function cut(g: GainNode, src: AudioScheduledSourceNode) {
  const t = audio().currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  src.stop(t + 0.2);
}

/** The pack's recording for `dur` seconds, swelling in and fading out; falls back to the roar. */
function crowdOf(p: CrowdPack, dur: number, gain: number): () => void {
  const a = audio();
  let stop: (() => void) | null = null;
  let stopped = false;
  if (p === 'torcida_clube')
    // The Clube's chant: two bars of claps over the drums (pa, pa, pa-pa-pa).
    for (const bar of [0.35, 1.75])
      for (const t of [0, 0.3, 0.6, 0.8, 1.0]) noise(bar + t, 0.08, 0.16, 1700);
  void bufferOf(p).then((buf) => {
    if (stopped) return;
    if (!buf) {
      const { src, g } = noise(0, dur, 0.12, 1100);
      stop = () => cut(g, src);
      return;
    }
    const t = a.currentTime;
    const src = a.createBufferSource();
    const g = a.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.35);
    g.gain.setValueAtTime(gain, t + dur - 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(g).connect(out());
    src.start(t);
    src.stop(t + dur + 0.05);
    stop = () => cut(g, src);
  });
  return () => {
    stopped = true;
    stop?.();
  };
}

/** Plays a pack's win (Ajustes, Clube), even with Efeitos off; null plays the standard roar. */
export function previewCrowd(p: CrowdPack | null) {
  const worn = pack;
  pack = p;
  play('win', true);
  pack = worn;
}

export type Sound =
  | 'whistle'
  | 'correct'
  | 'wrong'
  | 'win'
  | 'tap'
  | 'stamp'
  | 'clunk'
  | 'crowd'
  | 'tick'
  | 'shimmer'
  | 'rarity'
  | 'rip'
  | 'star'
  | 'promote';

/** Returns a stop function for 'crowd' only (the broadcast's Pular cuts the roar). */
export function play(sound: Sound, force = false): (() => void) | void {
  if (!soundOn() && !force) return;
  try {
    if (sound === 'whistle') {
      // Referee's whistle: two short trills.
      for (const t of [0, 0.32]) {
        const o = tone(2900, t, 0.22, 'sine', 0.12);
        const lfo = audio().createOscillator();
        const depth = audio().createGain();
        lfo.frequency.value = 38;
        depth.gain.value = 120;
        lfo.connect(depth).connect(o.frequency);
        lfo.start(audio().currentTime + t);
        lfo.stop(audio().currentTime + t + 0.25);
      }
    } else if (sound === 'correct') {
      [523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.08, 0.22, 'triangle', 0.14));
      noise(0.05, 0.7, 0.05, 900);
    } else if (sound === 'wrong') {
      // The crowd's "uhh": a falling low voice.
      tone(240, 0, 0.45, 'sawtooth', 0.05, 150);
      noise(0, 0.45, 0.03, 400);
    } else if (sound === 'win') {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.1, 0.35, 'triangle', 0.14));
      // Charanga answers the fanfare with its own brass stab.
      if (pack === 'torcida_charanga')
        [392, 523.25].forEach((f) => tone(f, 0.45, 0.5, 'sawtooth', 0.05));
      if (pack) crowdOf(pack, 4, 0.75);
      else noise(0.1, 1.6, 0.08, 1000);
    } else if (sound === 'stamp') {
      noise(0, 0.18, 0.12, 260);
      tone(70, 0, 0.18, 'sine', 0.2, 40);
    } else if (sound === 'clunk') {
      noise(0, 0.12, 0.1, 120);
      tone(55, 0, 0.25, 'triangle', 0.2);
    } else if (sound === 'crowd') {
      if (pack) return crowdOf(pack, 3.1, 0.7);
      // Swell: a roar that opens up, then fades.
      const { src, g } = noise(0, 3.1, 0.12, 1100);
      return () => cut(g, src);
    } else if (sound === 'tick') {
      tone(1400, 0, 0.03, 'square', 0.04);
    } else if (sound === 'shimmer') {
      [880, 1320, 1760, 2640].forEach((f, i) => tone(f, i * 0.07, 0.6, 'sine', 0.07));
    } else if (sound === 'rip') {
      // Paper tearing: a short bright burst.
      noise(0, 0.22, 0.1, 3800);
    } else if (sound === 'star') {
      // One earned star: a bright two-note ping.
      tone(988, 0, 0.18, 'triangle', 0.12);
      tone(1319, 0.09, 0.4, 'sine', 0.1);
    } else if (sound === 'promote') {
      // Promotion to a new title: rising fanfare over a short roar.
      [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(f, i * 0.09, 0.4, 'triangle', 0.13),
      );
      tone(1046.5, 0.5, 0.9, 'sine', 0.1);
      if (pack) crowdOf(pack, 3, 0.7);
      else noise(0.2, 1.4, 0.07, 1000);
    } else if (sound === 'rarity') {
      tone(392, 0, 0.5, 'triangle', 0.15);
      tone(587, 0.12, 0.7, 'triangle', 0.15);
    } else {
      noise(0, 0.04, 0.05, 2500);
    }
  } catch {
    /* audio unavailable: silent */
  }
}
