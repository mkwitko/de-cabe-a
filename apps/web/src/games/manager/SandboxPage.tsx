/**
 * Modo Clube tactical sandbox (docs/GAME_DESIGN/MODO_CLUBE/TASKS.md MC-029).
 * The server simulates; this page only draws the frames it gets and sends
 * instruction changes back (ADR-015). Player coordinates never enter React
 * state: the draw loop reads them from a ref.
 */
import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { motionReduced } from '../../lib/settings';
import { btnSecondary, GameHeader, Notice } from '../../components/ui';

interface Instructions {
  width: number;
  lineHeight: number;
  inverted: 'R' | 'L' | null;
}
interface Chunk {
  frames: number[][];
  done: boolean;
}

const LENGTH = 1050; // decimetres, as in the frames
const WIDTH = 680;
const TICKS_PER_SECOND = 4;
const CHUNK = 1200;
const SPEEDS = [1, 2, 4] as const;

function drawPitch(c: CanvasRenderingContext2D, k: number) {
  c.fillStyle = '#1d4a30';
  c.fillRect(0, 0, LENGTH * k, WIDTH * k);
  c.strokeStyle = 'rgba(236, 244, 238, 0.75)';
  c.lineWidth = Math.max(1, 1.2 * k * 10);
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    c.beginPath();
    c.moveTo(x1 * k, y1 * k);
    c.lineTo(x2 * k, y2 * k);
    c.stroke();
  };
  c.strokeRect(0, 0, LENGTH * k, WIDTH * k);
  line(LENGTH / 2, 0, LENGTH / 2, WIDTH);
  c.beginPath();
  c.arc((LENGTH / 2) * k, (WIDTH / 2) * k, 91.5 * k, 0, Math.PI * 2);
  c.stroke();
  for (const x of [0, LENGTH - 165]) c.strokeRect(x * k, 138.4 * k, 165 * k, 403.2 * k);
  for (const x of [0, LENGTH - 55]) c.strokeRect(x * k, 248.4 * k, 55 * k, 183.2 * k);
}

function drawFrame(c: CanvasRenderingContext2D, k: number, a: number[], b: number[], f: number) {
  const at = (i: number) => (a[i]! + (b[i]! - a[i]!) * f) * k;
  const r = Math.max(4, 11 * k);
  for (let p = 0; p < 22; p++) {
    const x = at(3 + p * 2);
    const y = at(4 + p * 2);
    c.lineWidth = 1.5;
    c.strokeStyle = '#10241a';
    if (p < 11) {
      // Home: yellow circles. Away: white squares, so colour is not the only cue.
      c.fillStyle = '#f2c230';
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    } else {
      c.fillStyle = '#f4f4ee';
      c.fillRect(x - r, y - r, r * 2, r * 2);
      c.strokeRect(x - r, y - r, r * 2, r * 2);
    }
  }
  c.fillStyle = '#ffffff';
  c.strokeStyle = '#000000';
  c.beginPath();
  c.arc(at(1), at(2), Math.max(2.5, 5 * k), 0, Math.PI * 2);
  c.fill();
  c.stroke();
}

export function SandboxPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef({
    seed: Math.floor(Math.random() * 1e6),
    frames: [] as number[][],
    /** Float index into `frames`. */
    head: 0,
    speed: 1,
    paused: false,
    commands: [] as { tick: number; instructions: Instructions }[],
    generation: 0,
    loading: false,
    done: false,
  });
  const [instructions, setInstructions] = useState<Instructions>({
    width: 3,
    lineHeight: 3,
    inverted: null,
  });
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [status, setStatus] = useState('Carregando a prancheta…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const s = sim.current;
    const still = motionReduced();
    let raf = 0;
    let last = performance.now();
    let lastStatus = '';

    const load = () => {
      if (s.loading || s.done) return;
      s.loading = true;
      const generation = s.generation;
      api<Chunk>('/v1/manager/sandbox', {
        method: 'POST',
        json: { seed: s.seed, from: s.frames.length, count: CHUNK, commands: s.commands },
      })
        .then((chunk) => {
          if (generation !== s.generation) return;
          s.frames.push(...chunk.frames);
          s.done = chunk.done;
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => {
          s.loading = false;
        });
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const seconds = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (s.frames.length - s.head < 400) load();
      if (s.frames.length < 2) return;
      if (!s.paused)
        s.head = Math.min(s.frames.length - 1, s.head + seconds * TICKS_PER_SECOND * s.speed);

      const width = canvas.clientWidth;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(width * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(((width * WIDTH) / LENGTH) * dpr);
      }
      const k = canvas.width / LENGTH;
      // Reduced motion: one still position per second instead of continuous movement.
      const head = still ? Math.floor(s.head / TICKS_PER_SECOND) * TICKS_PER_SECOND : s.head;
      const i = Math.floor(head);
      const a = s.frames[i]!;
      const b = s.frames[Math.min(i + 1, s.frames.length - 1)]!;
      drawPitch(ctx, k);
      drawFrame(ctx, k, a, b, head - i);

      const minute = Math.floor(a[0]! / TICKS_PER_SECOND / 60);
      const third =
        a[1]! < LENGTH / 3 ? 'na defesa' : a[1]! < (LENGTH * 2) / 3 ? 'no meio' : 'no ataque';
      const text = `Minuto ${minute}. Bola ${third} do time amarelo.`;
      if (text !== lastStatus) setStatus((lastStatus = text));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /** The change is valid from the tick on screen; frames after it are simulated again. */
  function change(next: Instructions) {
    const s = sim.current;
    setInstructions(next);
    if (s.frames.length === 0) {
      s.commands = [{ tick: 0, instructions: next }];
      return;
    }
    const keep = Math.floor(s.head) + 1;
    const tick = s.frames[keep - 1]![0]!;
    s.commands = [...s.commands.filter((c) => c.tick < tick), { tick, instructions: next }].slice(
      -40,
    );
    s.frames.length = keep;
    s.generation++;
    s.loading = false;
    s.done = false;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <GameHeader title="Prancheta" />
      <p className="text-chalk-soft">
        Teste da engine do Modo Clube. O time amarelo segue as instruções abaixo; a bola circula
        sozinha. Mude uma instrução e veja o time se reposicionar.
      </p>
      {error && <Notice title="Não deu para carregar">{error}</Notice>}
      <canvas
        ref={canvasRef}
        className="aspect-[105/68] w-full rounded-lg"
        role="img"
        aria-label="Campo visto de cima com os 22 jogadores e a bola"
      />
      <p aria-live="polite" className="text-sm text-chalk-soft">
        {status}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={btnSecondary}
          onClick={() => {
            sim.current.paused = !paused;
            setPaused(!paused);
          }}
        >
          {paused ? 'Continuar' : 'Pausar'}
        </button>
        <div role="group" aria-label="Velocidade" className="flex gap-2">
          {SPEEDS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={speed === v}
              className={`${btnSecondary} ${speed === v ? 'border-cover text-cover' : ''}`}
              onClick={() => {
                sim.current.speed = v;
                setSpeed(v);
              }}
            >
              {v}×
            </button>
          ))}
        </div>
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 font-condensed text-xl font-extrabold uppercase">
          Instruções do time amarelo
        </legend>
        <label className="flex flex-col gap-1">
          Largura: {instructions.width} de 5
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={instructions.width}
            className="min-h-11 w-full accent-cover"
            onChange={(e) => change({ ...instructions, width: Number(e.target.value) })}
          />
        </label>
        <label className="flex flex-col gap-1">
          Altura da linha de defesa: {instructions.lineHeight} de 5
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={instructions.lineHeight}
            className="min-h-11 w-full accent-cover"
            onChange={(e) => change({ ...instructions, lineHeight: Number(e.target.value) })}
          />
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            className="size-6 accent-cover"
            checked={instructions.inverted === 'R'}
            onChange={(e) => change({ ...instructions, inverted: e.target.checked ? 'R' : null })}
          />
          Lateral direito por dentro com a bola
        </label>
      </fieldset>
    </div>
  );
}
