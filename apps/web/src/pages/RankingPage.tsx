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
        <ol className="flex flex-col gap-1.5">
          {data.entries.map((e) => (
            <li
              key={e.position}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${e.isMe ? 'bg-cover text-ink' : e.position <= 3 ? 'bg-paper text-ink' : 'bg-chalk/[0.07]'}`}
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
      )}
    </div>
  );
}
