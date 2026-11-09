import { useState } from 'react';
import { Link } from 'react-router';
import type { RankingScope } from '@decabeca/contracts';
import { useRanking, useSeason } from '../lib/game';
import { btnPrimary, Skeleton } from '../components/ui';
import { TrophyIcon } from '../components/Icons';
import { StarIcon } from '../components/Stars';

export function RankingPage() {
  const [scope, setScope] = useState<RankingScope>('all');
  const { data } = useRanking(scope);
  const season = useSeason().data;
  const daysLeft = season
    ? Math.max(1, Math.ceil((Date.parse(season.current.endsAt) - Date.now()) / 86400_000))
    : 0;
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-condensed text-4xl font-black uppercase">Ranking</h1>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
        {(
          [
            ['all', 'Geral'],
            ['season', 'Temporada'],
            ['week', 'Semana'],
            ['timed', 'Contra o relógio'],
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
      {scope === 'season' && season && (
        <div className="rounded-xl bg-paper px-5 py-4 text-ink">
          <p className="font-condensed text-2xl leading-none font-black uppercase">
            Temporada {season.current.number} · {season.current.theme}
          </p>
          <p className="mt-1 text-sm font-semibold">
            Termina em {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}. Depois o ranking zera e o pódio
            ganha troféu no perfil.
          </p>
        </div>
      )}
      {season && season.trophies.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Seus troféus">
          {season.trophies.map((t) => (
            <li
              key={t.season}
              className="font-condensed rounded-lg bg-cover px-3 py-1.5 font-black text-ink uppercase"
            >
              <TrophyIcon className="inline size-[0.9em] align-[-0.1em]" /> {t.position}º ·
              Temporada {t.season}
            </li>
          ))}
        </ul>
      )}
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
      <Link
        to="/fantasy"
        className="flex items-center justify-between gap-4 rounded-xl bg-cover px-5 py-4 text-ink"
      >
        <span>
          <span className="font-condensed block text-2xl leading-none font-black uppercase">
            Fantasy da semana
          </span>
          <span className="text-sm font-semibold">
            Escale 5 jogadores; eles pontuam quando aparecem nas suas fases.
          </span>
        </span>
        <span className="font-condensed shrink-0 rounded-lg bg-ink px-5 py-3 text-lg font-extrabold text-paper uppercase">
          Escalar
        </span>
      </Link>
      <Link
        to="/ligas"
        className="flex items-center justify-between gap-4 rounded-xl bg-paper px-5 py-4 text-ink"
      >
        <span>
          <span className="font-condensed block text-2xl leading-none font-black uppercase">
            Ligas de amigos
          </span>
          <span className="text-sm font-semibold">Ranking da semana só com a sua turma.</span>
        </span>
        <span className={`${btnPrimary} shrink-0`}>Ver</span>
      </Link>
      {!data ? (
        <Skeleton className="h-96" />
      ) : data.entries.length === 0 ? (
        <p className="rounded-xl border border-chalk/15 bg-chalk/[0.05] p-5 text-chalk-soft">
          {scope === 'week' || scope === 'season'
            ? `Ninguém pontuou ${scope === 'week' ? 'esta semana' : 'nesta temporada'} ainda. É a sua chance.`
            : scope === 'timed'
              ? 'Ninguém jogou contra o relógio ainda. Escolha esse modo ao abrir uma fase.'
              : 'Ninguém no ranking ainda. Termine uma fase e escolha um apelido para ser o primeiro.'}
        </p>
      ) : (
        <>
          <p className="text-sm text-chalk-soft">
            {data.entries.length} {data.entries.length === 1 ? 'jogador' : 'jogadores'} ·{' '}
            {scope === 'week'
              ? 'desde segunda'
              : scope === 'season'
                ? 'nesta temporada'
                : scope === 'timed'
                  ? 'contra o relógio'
                  : 'desde o início'}
          </p>
          {/* podium on wide screens: 2nd, 1st, 3rd; on a phone everyone is in the list */}
          <ol className="hidden grid-cols-3 items-end gap-4 sm:grid" aria-label="Pódio">
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
                  <span className="w-full font-bold break-words">{e.nickname}</span>
                  <span className="text-xs opacity-70">{e.title}</span>
                  <span className="font-condensed tabular text-lg font-black">
                    <StarIcon className="inline size-[0.85em] align-[-0.08em]" /> {e.stars}
                  </span>
                </li>
              );
            })}
          </ol>
          <ol className="flex flex-col gap-1.5">
            {data.entries.map((e) => (
              <li
                key={e.position}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${e.position <= 3 ? 'sm:hidden ' : ''}${e.isMe ? 'bg-cover text-ink' : e.position <= 3 ? 'bg-paper text-ink' : 'bg-chalk/[0.07]'}`}
              >
                <span className="font-condensed tabular w-8 text-right text-2xl font-black">
                  {e.position}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-bold break-words">{e.nickname}</span>
                  <span className="text-sm opacity-70">{e.title}</span>
                </span>
                <span
                  className="font-condensed tabular text-xl font-black"
                  aria-label={`${e.stars} estrelas`}
                >
                  <StarIcon className="inline size-[0.85em] align-[-0.08em]" /> {e.stars}
                </span>
              </li>
            ))}
          </ol>
          {data.me.position && data.me.position > 50 && (
            <p className="sticky bottom-20 rounded-lg bg-cover px-4 py-3 font-semibold text-ink sm:bottom-4">
              Você: {data.me.position}º ·{' '}
              <StarIcon className="inline size-[0.85em] align-[-0.08em]" /> {data.me.stars}
            </p>
          )}
        </>
      )}
    </div>
  );
}
