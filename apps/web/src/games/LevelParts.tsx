/** Pieces shared by both games' level screens (ADR-007): end-of-level panel and level errors. */
import { Link } from 'react-router';
import type { AttemptResponse, GameMode } from '@decabeca/contracts';
import { track } from '../lib/analytics';
import type { ApiError } from '../lib/api';
import { GAME_PATH, useLevelRanking, useMe, useTrack } from '../lib/game';
import { ShareButton } from '../components/ShareButton';
import { Stars } from '../components/Stars';
import { btnPrimary, btnSecondary, Notice } from '../components/ui';

export function LevelError({
  error,
  mode,
  retry,
}: {
  error: ApiError;
  mode: GameMode;
  retry: () => void;
}) {
  const back = (
    <Link to={GAME_PATH[mode]} className={btnPrimary}>
      Ver fases
    </Link>
  );
  if (error.code === 'LEVEL_LOCKED')
    return (
      <Notice title="Fase trancada" action={back}>
        Termine a fase anterior para liberar esta.
      </Notice>
    );
  if (error.code === 'LEVEL_NOT_FOUND')
    return (
      <Notice title="Fase não encontrada" action={back}>
        Essa fase não existe (ainda).
      </Notice>
    );
  return (
    <Notice
      title="Deu ruim na conexão"
      action={
        <button className={btnPrimary} onClick={retry}>
          Tentar de novo
        </button>
      }
    >
      {error.message}
    </Notice>
  );
}

/** Stars, share, next level and the level's top 10. */
export function LevelEnd({ data }: { data: AttemptResponse }) {
  const { mode, level, stars } = data.attempt;
  const trackQ = useTrack(mode);
  const top = useLevelRanking(mode, level, true);
  const me = useMe();
  const next = trackQ.data?.levels.find((l) => l.level > level && l.state !== 'done');
  return (
    <section aria-labelledby="level-end" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id="level-end" className="sr-only">
          Fim da fase
        </h2>
        <Stars n={stars} size="size-10" />
        <p className="font-condensed text-2xl font-extrabold uppercase">
          {stars === 3
            ? 'Craque!'
            : stars === 2
              ? 'Mandou bem'
              : stars === 1
                ? 'Passou raspando'
                : 'Fica pra próxima'}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {next ? (
          <Link to={`${GAME_PATH[mode]}/${next.level}`} className={btnPrimary}>
            Próxima fase · {next.level}
          </Link>
        ) : (
          <Link to={GAME_PATH[mode]} className={btnPrimary}>
            Ver fases
          </Link>
        )}
        {data.share && (
          <ShareButton
            secondary
            text={data.share.text}
            onShared={(method) => track('result_shared', { mode, level, method })}
          />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="font-condensed text-xl font-extrabold uppercase">Top 10 da fase</h3>
        {me.data && !me.data.nickname && (
          <p className="text-sm text-chalk-soft">
            <Link to="/conta" className="text-chalk underline underline-offset-4">
              Escolha um apelido
            </Link>{' '}
            para aparecer no ranking.
          </p>
        )}
        {top.data?.entries.length ? (
          <ol className="flex flex-col gap-1">
            {top.data.entries.map((e) => (
              <li
                key={e.position}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 ${e.isMe ? 'bg-cover text-ink' : 'bg-chalk/[0.07]'}`}
              >
                <span className="font-condensed tabular w-6 text-right text-lg font-black">
                  {e.position}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{e.nickname}</span>
                <Stars n={e.stars} size="size-4" />
                <span className="font-condensed tabular w-10 text-right font-bold">{e.score}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-chalk-soft">Ninguém com apelido terminou essa fase ainda.</p>
        )}
      </div>
      <Link to={GAME_PATH[mode]} className={`${btnSecondary} self-start`}>
        Voltar às fases
      </Link>
    </section>
  );
}
