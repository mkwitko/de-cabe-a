/**
 * A game's track as an album page (ADR-007): done levels are pasted stickers with their stars,
 * the next level is the open slot, the rest are locked slots.
 */
import { Link } from 'react-router';
import type { GameMode } from '@decabeca/contracts';
import { GAME_NAME, GAME_PATH, useTrack } from '../lib/game';
import { Stars } from '../components/Stars';
import { GameHeader, Notice, Skeleton } from '../components/ui';

const DIFFICULTY = { 1: 'fácil', 2: 'média', 3: 'difícil' } as Record<number, string>;

export function TrackPage({ mode }: { mode: GameMode }) {
  const { data, error } = useTrack(mode);
  const levels = data?.levels ?? [];
  const stars = levels.reduce((s, l) => s + l.stars, 0);
  const done = levels.filter((l) => l.state === 'done').length;
  return (
    <div className="flex flex-col gap-6">
      <GameHeader
        title={GAME_NAME[mode]}
        aside={
          data && (
            <span
              className="font-condensed tabular text-lg font-bold"
              aria-label={`${stars} de ${levels.length * 3} estrelas`}
            >
              ★ {stars}/{levels.length * 3}
            </span>
          )
        }
      />
      {data && levels.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div
            className="h-2.5 overflow-hidden rounded-full bg-chalk/15"
            role="progressbar"
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={levels.length}
            aria-label="Fases concluídas"
          >
            <div
              className="h-full rounded-full bg-cover transition-[width] duration-500 ease-out-expo"
              style={{ width: `${(done / levels.length) * 100}%` }}
            />
          </div>
          <p className="text-sm text-chalk-soft">
            {done} de {levels.length} fases concluídas
          </p>
        </div>
      )}
      {error && <Notice title="Deu ruim na conexão">{(error as Error).message}</Notice>}
      {!data && !error && <Skeleton className="h-96" />}
      {data && levels.length === 0 && (
        <Notice title="Nenhuma fase ainda">As primeiras fases estão sendo preparadas.</Notice>
      )}
      <ol className="grid grid-cols-3 gap-3 sm:grid-cols-5" aria-label="Fases">
        {levels.map((l) => {
          const label = `Fase ${l.level}, ${DIFFICULTY[l.difficultyTier] ?? ''}`;
          if (l.state === 'locked')
            return (
              <li
                key={l.level}
                className="grid aspect-[3/4] place-items-center rounded-lg border-2 border-dashed border-chalk-soft/25 text-chalk-soft/40"
                aria-label={`${label}, trancada`}
              >
                <span className="font-condensed tabular text-3xl font-black">{l.level}</span>
              </li>
            );
          const done = l.state === 'done';
          return (
            <li key={l.level}>
              <Link
                to={`${GAME_PATH[mode]}/${l.level}`}
                aria-label={
                  done
                    ? `${label}, ${l.stars} estrelas`
                    : `${label}, ${l.state === 'in_progress' ? 'em andamento' : 'jogar'}`
                }
                className={`flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-lg p-2 text-center transition-transform duration-200 ease-out-expo hover:-translate-y-0.5 ${
                  done
                    ? 'bg-paper text-ink shadow-[0_8px_18px_-8px_rgb(0_0_0/0.5)]'
                    : 'border-2 border-cover bg-cover/10 text-chalk shadow-[0_0_0_4px_rgb(0_0_0/0.08)]'
                }`}
              >
                <span className="font-condensed tabular text-4xl leading-none font-black">
                  {l.level}
                </span>
                {done ? (
                  <Stars n={l.stars} size="size-4" />
                ) : (
                  <span className="font-condensed text-sm font-extrabold tracking-wide text-cover uppercase">
                    {l.state === 'in_progress' ? 'Continuar' : 'Jogar'}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
