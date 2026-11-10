/**
 * Conquistas (GROWTH_PLAN.md 2.3) as special stickers: earned ones are foil-yellow and pasted,
 * the rest are outlined slots with their progress. Grouped as progressão / especialidade /
 * experiência.
 */
import { useQuery } from '@tanstack/react-query';
import type { AchievementsResponse } from '@decabeca/contracts';
import { api } from '../lib/api';
import { achievementOpen } from '../lib/launch';
import { Skeleton } from './ui';

const GROUPS = [
  ['progressao', 'Progressão'],
  ['especialidade', 'Especialidade'],
  ['experiencia', 'Experiência'],
] as const;

export function Achievements() {
  const { data } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => api<AchievementsResponse>('/v1/me/achievements'),
  });
  if (!data) return <Skeleton className="h-64" />;
  const items = data.items.filter((x) => achievementOpen(x.id));
  const earned = items.filter((x) => x.done).length;
  return (
    <section aria-labelledby="conquistas" className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="conquistas" className="font-condensed text-3xl font-extrabold uppercase">
          Conquistas
        </h2>
        <span className="font-condensed tabular text-xl font-black">
          {earned}/{items.length}
        </span>
      </div>
      {GROUPS.filter(([key]) => items.some((x) => x.category === key)).map(([key, label]) => (
        <div key={key} className="flex flex-col gap-3">
          <h3 className="text-xs font-bold tracking-wide text-chalk-soft uppercase">{label}</h3>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {items
              .filter((x) => x.category === key)
              .map((x) => (
                <li
                  key={x.id}
                  aria-label={`${x.name}: ${x.done ? 'conquistada' : `${x.progress} de ${x.goal}`}. ${x.description}`}
                  className={`flex min-h-36 flex-col gap-1 rounded-xl p-3 ${
                    x.done
                      ? '-rotate-1 bg-cover text-ink shadow-[0_8px_18px_-8px_rgb(0_0_0/0.55)]'
                      : 'border-2 border-dashed border-chalk-soft/30 text-chalk-soft'
                  }`}
                >
                  <span className="font-condensed text-xl leading-tight font-black uppercase">
                    {x.name}
                  </span>
                  <span className="text-xs leading-snug font-semibold">{x.description}</span>
                  {!x.done && (
                    <span className="mt-auto flex flex-col gap-1" aria-hidden="true">
                      <span className="tabular text-xs font-bold">
                        {x.progress}/{x.goal}
                      </span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-chalk/15">
                        <span
                          className="block h-full rounded-full bg-chalk-soft"
                          style={{ width: `${(x.progress / x.goal) * 100}%` }}
                        />
                      </span>
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
