/**
 * Conquistas (GROWTH_PLAN.md 2.3) as medals on a ribbon: earned ones are struck in gold with a
 * star, the rest are an empty dashed mould with their progress inside.
 */
import { useQuery } from '@tanstack/react-query';
import type { AchievementsResponse } from '@decabeca/contracts';
import { api } from '../lib/api';
import { achievementOpen } from '../lib/launch';
import { Skeleton } from './ui';

/** One medal: ribbon, disc, name; the progress sits in the empty mould. Decorative SVG. */
export function Medal({
  name,
  description,
  done,
  progress,
  goal,
}: {
  name: string;
  description?: string;
  done: boolean;
  progress?: number;
  goal?: number;
}) {
  return (
    <li
      aria-label={`${name}: ${done ? 'conquistada' : `${progress} de ${goal}`}.${description ? ` ${description}` : ''}`}
      className="flex flex-col items-center gap-1.5 text-center"
    >
      <span aria-hidden="true" className="relative grid h-[4.75rem] w-16 place-items-end">
        <svg viewBox="0 0 64 76" className="absolute inset-0 size-full">
          <path
            d="M18 0h12l6 30H24zM34 0h12l-6 30H28z"
            fill={done ? 'var(--color-cover)' : 'none'}
            stroke={done ? 'var(--color-ink)' : 'var(--color-chalk-soft)'}
            strokeOpacity={done ? 0.35 : 0.3}
            strokeWidth="1.5"
            strokeDasharray={done ? undefined : '3 3'}
          />
          {done && <path d="M24 0h4l6 30h-4z" fill="var(--color-ink)" opacity="0.55" />}
          <circle
            cx="32"
            cy="48"
            r="25"
            fill={done ? 'url(#medal-gold)' : 'rgb(0 0 0 / 0.25)'}
            stroke={done ? '#8a6a2c' : 'var(--color-chalk-soft)'}
            strokeOpacity={done ? 1 : 0.35}
            strokeWidth="2.5"
            strokeDasharray={done ? undefined : '4 4'}
          />
          {done && (
            <>
              <circle cx="32" cy="48" r="19" fill="none" stroke="#8a6a2c" strokeOpacity="0.5" />
              <polygon
                points="32.0,38.0 34.9,45.0 42.5,45.6 36.7,50.5 38.5,57.9 32.0,54.0 25.5,57.9 27.3,50.5 21.5,45.6 29.1,45.0"
                fill="var(--color-ink)"
              />
            </>
          )}
        </svg>
        {!done && (
          <span className="tabular relative mb-[1.15rem] w-full text-center text-xs font-bold text-chalk-soft">
            {progress}/{goal}
          </span>
        )}
      </span>
      <span
        className={`font-condensed text-sm leading-tight font-black uppercase ${done ? 'text-chalk' : 'text-chalk-soft'}`}
      >
        {name}
      </span>
      {description && (
        <span className="max-w-[16ch] text-xs leading-snug text-chalk-soft">{description}</span>
      )}
    </li>
  );
}

/** Shared gradient for the struck medals (one per page is enough; ids are global). */
export function MedalDefs() {
  return (
    <svg aria-hidden="true" className="absolute size-0">
      <defs>
        <radialGradient id="medal-gold" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff1b8" />
          <stop offset="0.45" stopColor="#e7c26a" />
          <stop offset="1" stopColor="#a47b2c" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export const medalGrid = 'grid grid-cols-[repeat(auto-fill,minmax(5.75rem,1fr))] gap-x-2 gap-y-5';

export function Achievements() {
  const { data } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => api<AchievementsResponse>('/v1/me/achievements'),
  });
  if (!data) return <Skeleton className="h-64" />;
  // Earned first, then the closest to earning.
  const items = data.items
    .filter((x) => achievementOpen(x.id))
    .sort((a, b) => Number(b.done) - Number(a.done) || b.progress / b.goal - a.progress / a.goal);
  const earned = items.filter((x) => x.done).length;
  return (
    <section aria-labelledby="conquistas" className="flex flex-col gap-5">
      <MedalDefs />
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="conquistas" className="font-condensed text-3xl font-extrabold uppercase">
          Conquistas
        </h2>
        <span className="font-condensed tabular text-lg font-black text-chalk-soft">
          {earned} de {items.length}
        </span>
      </div>
      <ul className={medalGrid}>
        {items.map((x) => (
          <Medal
            key={x.id}
            name={x.name}
            description={x.description}
            done={x.done}
            progress={x.progress}
            goal={x.goal}
          />
        ))}
      </ul>
    </section>
  );
}
