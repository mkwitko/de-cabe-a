import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon } from './Icon';

/** Primary action: the album-cover yellow on ink. */
export const btnPrimary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cover px-5 font-condensed text-lg font-extrabold uppercase tracking-wide text-ink shadow-[0_3px_8px_-2px_rgb(0_0_0/0.4)] transition-[transform,box-shadow] duration-150 ease-out-expo hover:-translate-y-px active:translate-y-0.5 active:shadow-none disabled:pointer-events-none disabled:opacity-45';
export const btnSecondary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-chalk-soft/60 px-4 font-condensed text-lg font-extrabold uppercase tracking-wide text-chalk hover:border-chalk hover:bg-chalk/[0.06] disabled:opacity-45';

export function GameHeader({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Link
        to="/"
        className="-ml-2 grid size-11 place-items-center rounded-lg hover:bg-chalk/10"
        aria-label="Voltar aos jogos"
      >
        <Icon name="back" />
      </Link>
      <h1 className="font-condensed text-2xl leading-none font-extrabold uppercase sm:text-3xl">
        {title}
      </h1>
      {aside && <div className="ml-auto">{aside}</div>}
    </header>
  );
}

/** Attempt markers (UX_SPEC.md §8); text label for screen readers, never colour alone. */
export function AttemptDots({ used, max, won }: { used: number; max: number; won: boolean }) {
  return (
    <div
      className="flex items-center gap-1.5"
      role="img"
      aria-label={`${used} de ${max} tentativas usadas`}
    >
      {Array.from({ length: max }, (_, i) => {
        const isWin = won && i === used - 1;
        return (
          <span
            key={i}
            className={`grid size-5 place-items-center rounded-[5px] border-2 ${
              isWin
                ? 'border-cover bg-cover text-ink'
                : i < used
                  ? 'border-chalk-soft bg-chalk-soft/80 text-pitch'
                  : 'border-dashed border-chalk-soft/50'
            }`}
          >
            {isWin ? (
              <Icon name="check" className="size-3.5" />
            ) : i < used ? (
              <Icon name="cross" className="size-3" />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

export function Notice({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border-2 border-dashed border-chalk-soft/50 p-6">
      <h2 className="font-condensed text-2xl font-extrabold uppercase">{title}</h2>
      {children && <p className="max-w-[48ch] text-chalk-soft">{children}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-chalk/10 motion-reduce:animate-none ${className}`}
      aria-hidden="true"
    />
  );
}

export function useOnline() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    addEventListener('online', on);
    addEventListener('offline', off);
    return () => {
      removeEventListener('online', on);
      removeEventListener('offline', off);
    };
  }, []);
  return online;
}
