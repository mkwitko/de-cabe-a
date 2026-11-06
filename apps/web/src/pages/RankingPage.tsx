import { useState } from 'react';
import { Link } from 'react-router';
import { useRanking } from '../lib/game';
import { Skeleton } from '../components/ui';

export function RankingPage() {
  const [scope, setScope] = useState<'all' | 'week'>('all');
  const { data } = useRanking(scope);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-condensed text-4xl font-black uppercase">Ranking</h1>
      <div className="flex gap-2" role="group" aria-label="Período">
        {(
          [
            ['all', 'Geral'],
            ['week', 'Semana'],
          ] as const
        ).map(([s, label]) => (
          <button
            key={s}
            aria-pressed={scope === s}
            onClick={() => setScope(s)}
            className={`rounded-full border-2 px-4 py-1.5 font-semibold ${scope === s ? 'border-cover bg-cover text-ink' : 'border-chalk-soft/50'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {data && (
        <p className="text-chalk-soft">
          {data.me.nickname ? (
            data.me.position ? (
              <>
                Você é o <strong className="text-chalk">{data.me.position}º</strong> com{' '}
                {data.me.stars} estrelas.
              </>
            ) : (
              'Termine uma fase para entrar no ranking.'
            )
          ) : (
            <>
              <Link to="/conta" className="text-chalk underline underline-offset-4">
                Escolha um apelido
              </Link>{' '}
              para aparecer no ranking{data.me.stars ? ` com suas ${data.me.stars} estrelas` : ''}.
            </>
          )}
        </p>
      )}
      {!data ? (
        <Skeleton className="h-96" />
      ) : data.entries.length === 0 ? (
        <p className="text-chalk-soft">
          {scope === 'week'
            ? 'Ninguém pontuou esta semana ainda. É a sua chance.'
            : 'Ninguém no ranking ainda.'}
        </p>
      ) : (
        <>
          {/* podium: 2nd, 1st, 3rd */}
          <ol className="grid grid-cols-3 items-end gap-2 sm:gap-4" aria-label="Pódio">
            {[1, 0, 2].map((k) => {
              const e = data.entries[k];
              if (!e) return <li key={k} />;
              const h =
                k === 0
                  ? 'min-h-40 sm:min-h-48'
                  : k === 1
                    ? 'min-h-32 sm:min-h-40'
                    : 'min-h-28 sm:min-h-36';
              return (
                <li
                  key={k}
                  className={`flex flex-col items-center justify-end gap-1 rounded-t-xl p-3 text-center ${h} ${k === 0 ? 'bg-cover text-ink' : 'bg-paper text-ink'} ${e.isMe ? 'ring-4 ring-cover/60' : ''}`}
                >
                  <span className="font-condensed tabular text-4xl leading-none font-black">
                    {e.position}º
                  </span>
                  <span className="w-full truncate font-bold">{e.nickname}</span>
                  <span className="text-xs opacity-70">{e.title}</span>
                  <span className="font-condensed tabular text-lg font-black">★ {e.stars}</span>
                </li>
              );
            })}
          </ol>
          <ol className="flex flex-col gap-1.5" start={4}>
            {data.entries.slice(3).map((e) => (
              <li
                key={e.position}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${e.isMe ? 'bg-cover text-ink' : 'bg-chalk/[0.07]'}`}
              >
                <span className="font-condensed tabular w-8 text-right text-2xl font-black">
                  {e.position}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-bold">{e.nickname}</span>
                  <span className="text-sm opacity-70">{e.title}</span>
                </span>
                <span
                  className="font-condensed tabular text-xl font-black"
                  aria-label={`${e.stars} estrelas`}
                >
                  ★ {e.stars}
                </span>
              </li>
            ))}
          </ol>
          {data.me.position && data.me.position > 50 && (
            <p className="sticky bottom-20 rounded-lg bg-cover px-4 py-3 font-semibold text-ink sm:bottom-4">
              Você: {data.me.position}º · ★ {data.me.stars}
            </p>
          )}
        </>
      )}
    </div>
  );
}
