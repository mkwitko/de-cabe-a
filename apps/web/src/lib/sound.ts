/**
 * Game sounds, synthesised with Web Audio (no files, nothing to license). Off by default: many
 * play on the bus. The choice stays on the device. The audio context starts on the first sound
 * after a tap (browsers only allow audio after a user gesture).
 */
const KEY = 'dc_sound';
let ctx: AudioContext | null = null;
const listeners = new Set<(on: boolean) => void>();

export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}
export function setSound(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* private mode: on for this visit only */
  }
  for (const l of listeners) l(on);
  if (on) play('tap');
}
export const onSoundChange = (l: (on: boolean) => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

function audio() {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
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
  o.connect(g).connect(a.destination);
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
  src.connect(filter).connect(g).connect(a.destination);
  src.start(a.currentTime + start);
  return { src, g };
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
  | 'rarity';

/** Returns a stop function for 'crowd' only (the broadcast's Pular cuts the roar). */
export function play(sound: Sound): (() => void) | void {
  if (!soundOn()) return;
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
      noise(0.1, 1.6, 0.08, 1000);
    } else if (sound === 'stamp') {
      noise(0, 0.18, 0.12, 260);
      tone(70, 0, 0.18, 'sine', 0.2, 40);
    } else if (sound === 'clunk') {
      noise(0, 0.12, 0.1, 120);
      tone(55, 0, 0.25, 'triangle', 0.2);
    } else if (sound === 'crowd') {
      // Swell: a roar that opens up, then fades.
      const { src, g } = noise(0, 3.1, 0.12, 1100);
      return () => {
        const t = audio().currentTime;
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
        src.stop(t + 0.2);
      };
    } else if (sound === 'tick') {
      tone(1400, 0, 0.03, 'square', 0.04);
    } else if (sound === 'shimmer') {
      [880, 1320, 1760, 2640].forEach((f, i) => tone(f, i * 0.07, 0.6, 'sine', 0.07));
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
