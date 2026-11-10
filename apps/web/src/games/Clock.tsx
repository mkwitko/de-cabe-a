import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { AttemptResponse, GameMode } from '@decabeca/contracts';
import { useTrack } from '../lib/game';
import { isPageLaunched } from '../lib/launch';
import { play } from '../lib/sound';
import { updateSettings, useSettings } from '../lib/settings';
import { GameHeader, Skeleton } from '../components/ui';
import { ClockIcon } from '../components/Icons';

/** Time limits (ADR-009); the server holds the real deadline. */
export const TIME_LIMIT_SEC: Record<GameMode, number> = {
  CAREER_PATH: 90,
  FOOTBALL_GRID: 180,
  IMPOSTOR: 60,
  TIMELINE: 90,
  HIGHER_LOWER: 60,
  MISSING_XI: 120,
  CONNECTIONS: 120,
  DRAFT: 120,
  MYSTERY_PLAYER: 120,
};
export const formatClock = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, '0')}`;

/**
 * Before a level starts: with or without the clock (ADR-009). Levels already started or finished
 * skip it, since the mode is chosen once. The clock is offered even while the ranking is closed
 * (launch); the ranking line and link show only when it is open.
 */
export function ModeGate({
  mode,
  level,
  title,
  children,
}: {
  mode: GameMode;
  level: number;
  title: string;
  children: (timed: boolean) => React.ReactNode;
}) {
  const track = useTrack(mode);
  const [timed, setTimed] = useState<boolean | null>(null);
  const { clock } = useSettings();
  if (!track.data) return <Skeleton className="h-64" />;
  const state = track.data.levels.find((l) => l.level === level)?.state;
  if (timed !== null || state !== 'open') return children(timed ?? false);
  // remembered from the first pick; changed in Ajustes › No jogo
  if (clock !== 'ask') return children(clock === 'timed');
  const ranked = isPageLaunched('ranking');
  const options = [
    {
      timed: false,
      name: 'No seu tempo',
      text: 'Sem relógio. O tempo aparece no resultado, só como curiosidade.',
    },
    {
      timed: true,
      name: `Contra o relógio · ${formatClock(TIME_LIMIT_SEC[mode])}`,
      text: `Acabou o tempo, a fase fecha com o que você acertou.${ranked ? ' Vale ranking próprio.' : ''}`,
    },
  ];
  return (
    <div className="flex flex-col gap-6">
      <GameHeader title={title} />
      <h2 className="font-condensed text-3xl font-black uppercase">Como você quer jogar?</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {options.map((o) => (
          <button
            key={String(o.timed)}
            onClick={() => {
              play('whistle');
              updateSettings({ clock: o.timed ? 'timed' : 'free' });
              setTimed(o.timed);
            }}
            className={`flex min-h-40 flex-col gap-3 rounded-xl p-5 text-left transition-transform duration-150 ease-out-expo hover:-translate-y-0.5 ${o.timed ? 'bg-cover text-ink' : 'border-2 border-dashed border-chalk-soft/60 bg-chalk/[0.06] text-chalk'}`}
          >
            <span className="font-condensed text-2xl font-black uppercase">{o.name}</span>
            <span className="text-base leading-snug font-medium">{o.text}</span>
          </button>
        ))}
      </div>
      <p className="text-sm text-chalk-soft">
        A escolha fica lembrada para as próximas fases; troque quando quiser em Ajustes.
        {ranked && (
          <>
            {' '}
            <Link to="/ranking" className="underline underline-offset-4">
              Ver ranking contra o relógio
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

/**
 * Countdown of a timed level. It counts down from the server's `secondsLeft` using the phone's
 * monotonic timer (performance.now), never the phone's wall clock: a phone whose clock is wrong
 * neither loses nor gains time. At zero it ends the level once (the server would anyway).
 */
export function Countdown({ data, onTimeUp }: { data: AttemptResponse; onTimeUp: () => void }) {
  const { secondsLeft, status } = data.attempt;
  const running = secondsLeft != null && status === 'IN_PROGRESS';
  // Re-anchored on every server response (each action returns a fresh secondsLeft).
  const endAt = useMemo(
    () => (secondsLeft == null ? null : performance.now() + secondsLeft * 1000),
    [secondsLeft],
  );
  const [left, setLeft] = useState(() => Math.ceil(secondsLeft ?? 0));
  const fired = useRef(false);
  const timeUp = useRef(onTimeUp);
  timeUp.current = onTimeUp;
  useEffect(() => {
    if (!running || endAt === null) return;
    const tick = () => {
      const s = Math.ceil((endAt - performance.now()) / 1000);
      setLeft(s);
      if (s <= 0 && !fired.current) {
        fired.current = true;
        timeUp.current();
      }
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [running, endAt]);
  if (!running) return null;
  const low = left <= 10;
  return (
    <p
      role="timer"
      aria-label={`Tempo restante: ${formatClock(left)}`}
      className={`font-condensed tabular rounded-full px-3 py-1 text-2xl leading-none font-black ${low ? 'bg-cover text-ink' : 'border-2 border-chalk-soft/60 text-chalk'}`}
    >
      <ClockIcon className="inline size-[0.8em] align-[-0.06em]" /> {formatClock(Math.max(0, left))}
    </p>
  );
}
