/** Pieces shared by both games' level screens (ADR-007): end-of-level panel and level errors. */
import { AD_SLOTS, AdSlot } from '../components/AdSlot';
import { formatClock } from './Clock';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router';
import type { AttemptResponse, GameMode, PlayerRef } from '@decabeca/contracts';
import { track } from '../lib/analytics';
import { api, type ApiError } from '../lib/api';
import { GAME_PATH, useDaily, useLevelRanking, useMe, useStats, useTrack } from '../lib/game';
import { ShareButton } from '../components/ShareButton';
import { ResultCardButton } from '../components/ResultCard';
import { Reactions } from '../components/Reactions';
import { Stars, StarIcon } from '../components/Stars';
import { Broadcast, type Hero } from '../components/Broadcast';
import { StickerReveal } from '../components/StickerReveal';
import { ceremonyLength, markCeremony, recentCompletion } from '../lib/ceremony';
import { btnPrimary, btnSecondary, Notice } from '../components/ui';
import { ClockIcon } from '../components/Icons';
import { TitleBadge } from '../components/TitleBadge';
import { SignInButton } from '../components/SignInButton';
import { promotedTo, TITLE_LADDER, titleTone } from '../lib/format';
import { isPageLaunched } from '../lib/launch';
import { nextLevel } from '../lib/track';
import { POSITION } from '../components/StickerCard';
import { RARITY_STYLE } from '../components/rarity';

const INVITE_KEY = 'decabeca:save-invite';

export function LevelError({
  error,
  mode,
  retry,
}: {
  error: ApiError;
  mode: GameMode;
  retry: () => void;
}) {
  // The player's real next level: a locked or missing link leads there, not to a dead end.
  const next = nextLevel(useTrack(mode).data);
  const go = next ? (
    <Link to={`${GAME_PATH[mode]}/${next.level}`} className={btnPrimary}>
      {next.inProgress ? 'Continuar' : 'Jogar'} fase {next.level}
    </Link>
  ) : null;
  const back = (
    <Link to={GAME_PATH[mode]} className={go ? btnSecondary : btnPrimary}>
      Ver as fases
    </Link>
  );
  if (error.code === 'LEVEL_LOCKED')
    return (
      <Notice
        title="Essa fase ainda está trancada"
        action={
          <div className="flex flex-wrap gap-3">
            {go}
            {isPageLaunched('daily') && (
              <Link to="/d/hoje" className={btnSecondary}>
                Desafio do Dia
              </Link>
            )}
            {back}
          </div>
        }
      >
        Ela abre quando você terminar as anteriores
        {next ? `. A sua vez é a fase ${next.level}.` : '.'}
      </Notice>
    );
  if (error.code === 'LEVEL_NOT_FOUND')
    return (
      <Notice
        title="Fase não encontrada"
        action={
          <div className="flex flex-wrap gap-3">
            {go}
            {back}
          </div>
        }
      >
        Essa fase não existe (ainda). As fases novas entram na trilha.
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
      A fase não carregou. Confira a internet e tente de novo.
    </Notice>
  );
}

/** The sticker this level put in the album, as a small face (finish + portrait), linking to the album. */
function StickerWon({
  award,
  onPaper = false,
}: {
  award: NonNullable<AttemptResponse['sticker']>;
  /** Pasted on the passport page: ink on paper, no card. */
  onPaper?: boolean;
}) {
  const { sticker, isNew, upgradedFrom } = award;
  const style = RARITY_STYLE[sticker.rarity];
  return (
    <Link
      to="/album"
      className={`group flex items-center gap-3 transition-colors duration-150 ${onPaper ? 'rounded-lg p-1.5 hover:bg-[#1d2a4f]/[0.06]' : 'rounded-xl border border-chalk/15 bg-chalk/[0.05] p-3 hover:bg-chalk/[0.09]'}`}
    >
      <span
        aria-hidden="true"
        className={`${style.className} aspect-[3/4] w-12 shrink-0 -rotate-3 rounded-[6px] bg-(--edge) p-[3px] shadow-[3px_5px_10px_rgb(0_0_0/0.45)] transition-transform duration-200 ease-out-expo group-hover:rotate-0`}
      >
        <span className="grid size-full place-items-center overflow-hidden rounded-[4px] bg-(image:--face) text-(--ink)">
          {sticker.photo ? (
            <img
              src={sticker.photo}
              alt=""
              draggable={false}
              className="size-full object-cover object-[50%_20%]"
            />
          ) : (
            <span className="font-condensed text-lg font-black">
              {sticker.positionGroup ? POSITION[sticker.positionGroup] : '?'}
            </span>
          )}
        </span>
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-condensed truncate text-lg leading-none font-extrabold uppercase">
          {sticker.name}
        </span>
        <span
          className={`text-xs font-semibold whitespace-nowrap ${onPaper ? 'text-[#6d5c3a]' : 'text-chalk-soft'}`}
        >
          {isNew
            ? `${style.label} · nova`
            : upgradedFrom
              ? `Subiu para ${style.label}`
              : `${style.label} · já colada`}
        </span>
        <span
          className={`text-sm font-bold underline underline-offset-4 ${onPaper ? 'text-[#7a2633]' : 'text-gold'}`}
        >
          Álbum
        </span>
      </span>
    </Link>
  );
}

/** Where the player stands on the title ladder after this level. */
function TitleProgress({ total, onPaper = false }: { total: number; onPaper?: boolean }) {
  const i = TITLE_LADDER.findLastIndex((t) => total >= t.min);
  const cur = TITLE_LADDER[i]!;
  const next = TITLE_LADDER[i + 1];
  const pct = next ? ((total - cur.min) / (next.min - cur.min)) * 100 : 100;
  return (
    <div
      className={`flex min-w-0 flex-col justify-center gap-1.5 ${onPaper ? 'p-1.5' : 'rounded-xl border border-chalk/15 bg-chalk/[0.05] p-3'}`}
    >
      <p className="flex items-center gap-2">
        <TitleBadge name={cur.name} className="size-7 shrink-0" />
        <span className="font-condensed min-w-0 text-lg leading-none font-extrabold uppercase">
          {cur.name}
        </span>
      </p>
      <div
        className={`h-2 overflow-hidden rounded-full ${onPaper ? 'bg-[#1d2a4f]/15' : 'bg-chalk/15'}`}
        role="progressbar"
        aria-label={next ? `Estrelas até ${next.name}` : 'Título máximo'}
        aria-valuemin={cur.min}
        aria-valuemax={next?.min ?? total}
        aria-valuenow={total}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out-expo ${onPaper ? 'bg-[#1d2a4f]' : 'bg-cover'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p
        className={`text-sm leading-tight font-semibold ${onPaper ? 'text-[#6d5c3a]' : 'text-chalk-soft'}`}
      >
        <StarIcon
          className={`inline size-[0.85em] align-[-0.08em] ${onPaper ? 'text-[#1d2a4f]' : 'text-gold'}`}
        />{' '}
        <span className={`tabular font-bold ${onPaper ? 'text-[#1d2a4f]' : 'text-chalk'}`}>
          {total}
        </span>
        {next ? ` · faltam ${next.min - total} para ${next.name}` : ' · título máximo'}
      </p>
    </div>
  );
}

const PAGE =
  'rounded-[8px] bg-[#f3ead2] text-[#1d2a4f] [background-image:repeating-linear-gradient(0deg,transparent_0_27px,#c9b98f55_27px_28px),radial-gradient(circle_at_50%_45%,#f8f1dc,#f3ead2_60%,#e2d5b3)]';
const quietLink =
  'inline-flex min-h-11 items-center gap-2 text-sm font-bold text-chalk-soft underline-offset-4 hover:text-chalk hover:underline';

function Points({ data }: { data: AttemptResponse }) {
  return (
    <p className="font-condensed tabular text-right leading-none font-black uppercase">
      <span className="text-3xl">{data.attempt.score}</span>
      <span className="ml-1 text-base">pts</span>
      {data.attempt.durationSec !== null && (
        <span className="mt-1 block text-sm font-bold normal-case">
          <ClockIcon className="inline size-[0.9em] align-[-0.1em]" />{' '}
          {formatClock(data.attempt.durationSec)}
          {data.attempt.timed ? ' · contra o relógio' : ''}
        </span>
      )}
    </p>
  );
}

/** The way on, as a boarding pass: a stub with the level number, then the action and its arrow. */
function Ticket({ to, label, stub }: { to: string; label: string; stub: number | null }) {
  return (
    <Link
      to={to}
      className="group flex min-h-20 items-stretch overflow-hidden rounded-xl bg-cover text-ink shadow-[0_14px_28px_-12px_rgb(0_0_0/0.55)] transition-[transform,box-shadow] duration-200 ease-out-expo hover:-translate-y-0.5 hover:shadow-[0_18px_32px_-12px_rgb(0_0_0/0.6)] active:translate-y-0 motion-reduce:transform-none"
    >
      {stub !== null && (
        <span
          aria-hidden="true"
          className="font-condensed flex w-16 shrink-0 flex-col items-center justify-center border-r-2 border-dashed border-ink/35 leading-none font-black uppercase sm:w-24"
        >
          <span className="text-xs tracking-[0.2em]">Fase</span>
          <span className="tabular text-4xl sm:text-5xl">{stub}</span>
        </span>
      )}
      <span className="font-condensed flex flex-1 items-center justify-between gap-3 px-4 text-xl leading-none font-black uppercase sm:px-5 sm:text-3xl">
        {label}
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-8 shrink-0 fill-none stroke-current stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round] motion-safe:animate-[nudge-x_1.6s_var(--ease-out-expo)_infinite]"
        >
          <path d="M5 12h13M13 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}

/**
 * End of a level, one screen: the result pasted as an album sticker (verdict, answer, stars,
 * points), the sticker won and the title progress, then "Próxima fase" (shares secondary). Reactions
 * and the level's top 10 only while the ranking is open.
 */
export function LevelEnd({
  data,
  headline,
  detail,
  answer,
  starRule,
  passport,
}: {
  data: AttemptResponse;
  headline: string;
  detail: ReactNode;
  /** How the mode earns its stars, printed under them ("Até 2 tentativas: 3 estrelas…"). */
  starRule?: string;
  /** The finished passport (Career Path): the end screen becomes its open spread, the verdict
   * stamped on the left page beside it. */
  passport?: ReactNode;
  /** The player the level was about (single-answer modes): the broadcast's star. */
  answer?: PlayerRef;
}) {
  const { mode, level, stars, score } = data.attempt;
  // Only the moment a level ends gets the ceremony and the promotion; reopening an old one does not.
  const [justFinished] = useState(() => recentCompletion(data.attempt.completedAt));
  // Broadcast, then the sticker (if any), then the usual end screen. Losses skip both.
  const [stage, setStage] = useState<'broadcast' | 'sticker' | 'end'>(
    stars > 0 && justFinished ? 'broadcast' : 'end',
  );
  // His Wikimedia Commons portrait, credited: the sticker's (larger) first, else the answer's.
  const [hero] = useState<Hero | undefined>(() => {
    if (!answer) return undefined;
    const s = data.sticker?.sticker.playerId === answer.id ? data.sticker.sticker : null;
    return s?.photo
      ? { name: answer.name, photo: s.photo, credit: s.photoCredit }
      : { name: answer.name, photo: answer.photo ?? null, credit: answer.photoCredit ?? null };
  });
  const today = new Date().toLocaleDateString('en-CA');
  const [short] = useState(() => ceremonyLength(mode, today) === 'short');
  useEffect(() => {
    if (stage === 'broadcast') markCeremony(mode, today);
  }, [stage, mode, today]);
  /** Oficina levels (no track number) have no next level, track ranking or training. */
  const oficina = level === 0;
  const trackQ = useTrack(mode);
  const top = useLevelRanking(mode, level, !oficina && isPageLaunched('ranking'));
  const me = useMe();
  // The track's real next level: never a locked one, and never back into this one. After a
  // Desafio do Dia level far ahead, that is the player's own place in the track.
  const next = trackQ.data?.levels.find(
    (l) => l.level !== level && (l.state === 'open' || l.state === 'in_progress'),
  );
  // Stats are invalidated when the level closes; once refetched, totalStars includes these stars.
  const stats = useStats();
  const promoted =
    justFinished && !oficina && stats.data && !stats.isFetching
      ? promotedTo(stats.data.totalStars, stars)
      : null;
  // One-time "save your progress" invite after a guest's first win (remembered on the device).
  const [inviteSeen] = useState(() => {
    try {
      return localStorage.getItem(INVITE_KEY) === '1';
    } catch {
      return true;
    }
  });
  const showInvite = !inviteSeen && stars > 0 && !oficina && !!me.data && !me.data.account;
  useEffect(() => {
    if (showInvite && stage === 'end')
      try {
        localStorage.setItem(INVITE_KEY, '1');
      } catch {
        /* private mode: the invite may show again */
      }
  }, [showInvite, stage]);
  const dailyQ = useDaily('hoje');
  const daily = isPageLaunched('daily')
    ? dailyQ.data?.games.find((g) => g.mode === mode && g.level === level)
    : undefined;
  if (stage === 'broadcast')
    return (
      <Broadcast
        stars={stars}
        score={score}
        headline={headline}
        detail={detail}
        short={short}
        promoted={promoted}
        hero={hero}
        onDone={() => setStage(data.sticker ? 'sticker' : 'end')}
      />
    );
  if (stage === 'sticker' && data.sticker)
    return <StickerReveal award={data.sticker} short={short} onDone={() => setStage('end')} />;
  const award = data.sticker;
  const total = stats.data?.totalStars;
  const social = !oficina && isPageLaunched('ranking');
  const primary = oficina
    ? { to: '/oficina', label: 'Mais desafios da Oficina', stub: null }
    : daily
      ? { to: '/d/hoje', label: 'Voltar ao Desafio do Dia', stub: null }
      : next
        ? {
            to: `${GAME_PATH[mode]}/${next.level}`,
            label: `Próxima fase\u00a0·\u00a0${next.level}`,
            stub: next.level,
          }
        : { to: GAME_PATH[mode], label: 'Ver as fases', stub: null };
  return (
    <section aria-labelledby="level-end" className="flex flex-col gap-5">
      {passport ? (
        <>
          <div className="rounded-[18px] p-2 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.7)] [background:radial-gradient(circle_at_30%_20%,#7a2633,#5b1a24_55%,#3d1018)] sm:p-3">
            <div className="grid gap-2 lg:grid-cols-2 lg:gap-1">
              <div className={`${PAGE} flex flex-col gap-4 p-4 sm:p-6 lg:rounded-r-[4px]`}>
                <p
                  aria-hidden="true"
                  className="flex justify-between gap-3 text-[11px] font-extrabold tracking-[0.18em] text-[#6d5c3a] uppercase"
                >
                  <span>Visto de entrada</span>
                  <span>Fase {level}</span>
                </p>
                {/* The verdict, stamped onto the page like an official entry stamp. */}
                <div
                  className="stamp-hit relative max-w-full self-start rounded-[10px] border-[3px] border-current px-4 py-3 sm:px-6 sm:py-4"
                  style={
                    {
                      color: stars > 0 ? '#1d3f7a' : '#a3242f',
                      '--rot': '-2deg',
                      transform: 'rotate(-2deg)',
                    } as React.CSSProperties
                  }
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-[5px] rounded-[6px] border-[1.5px] border-current opacity-70"
                  />
                  <h2
                    id="level-end"
                    className="font-condensed text-4xl leading-[0.9] font-black text-balance uppercase sm:text-5xl xl:text-6xl"
                  >
                    {headline}
                  </h2>
                  <div className="mt-2 leading-snug font-semibold text-[#1d2a4f] sm:text-lg">
                    {detail}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-4 border-t-2 border-current/25 pt-3">
                    <Stars n={stars} size="size-8 sm:size-9" onCover animate />
                    <Points data={data} />
                  </div>
                </div>
                {starRule && <p className="text-sm font-semibold text-[#6d5c3a]">{starRule}</p>}
                {promoted && (
                  <p
                    className="flex items-center gap-3 self-start rounded-lg px-4 py-2 text-ink"
                    style={{ background: titleTone(promoted) }}
                  >
                    <TitleBadge name={promoted} className="size-9" />
                    <span className="font-condensed text-2xl leading-none font-black uppercase">
                      Promovido a {promoted}
                    </span>
                  </p>
                )}
                <div className="lg:order-last">
                  <Ticket to={primary.to} stub={primary.stub} label={primary.label} />
                </div>
                {!oficina && (award || total !== undefined) && (
                  <div
                    className={`grid gap-3 border-t border-[#c9b98f] pt-3 lg:mt-auto ${award && total !== undefined ? 'grid-cols-2' : ''}`}
                  >
                    {award && <StickerWon award={award} onPaper />}
                    {total !== undefined && <TitleProgress total={total} onPaper />}
                  </div>
                )}
              </div>
              <div className="h-[28rem] sm:h-[34rem] lg:h-auto lg:min-h-[max(30rem,calc(100dvh-14rem))]">
                {passport}
              </div>
            </div>
          </div>
          {/* Second things, quietly: share, and keep the progress. */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            {data.share && (
              <>
                <ShareButton
                  className={quietLink}
                  label="Copiar resultado"
                  text={data.share.text}
                  onShared={(method) => track('result_shared', { mode, level, method })}
                />
                <ResultCardButton
                  className={quietLink}
                  data={data}
                  onShared={() => track('result_shared', { mode, level, method: 'image' })}
                />
              </>
            )}
            {showInvite && (
              <p className="text-sm text-chalk-soft sm:ml-auto">
                Suas estrelas ficam só neste aparelho.{' '}
                <SignInButton className="font-bold text-chalk underline underline-offset-4 hover:text-gold" />{' '}
                para levar a qualquer um.
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="-rotate-1 rounded-[12px] bg-paper p-2 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.45),0_2px_4px_rgb(0_0_0/0.2)] motion-safe:animate-[paste_520ms_var(--ease-out-expo)]">
            <div className="rounded-[6px] bg-cover px-4 pt-4 pb-3 text-ink sm:px-5 sm:pt-5">
              <h2
                id="level-end"
                className="font-condensed text-3xl leading-[0.92] font-black text-balance uppercase sm:text-5xl"
              >
                {headline}
              </h2>
              <div className="mt-2 leading-snug font-semibold sm:text-lg">{detail}</div>
              <div className="mt-3 flex items-center justify-between gap-4 border-t-2 border-ink/15 pt-3">
                <Stars n={stars} size="size-8 sm:size-9" onCover animate />
                <p className="font-condensed tabular text-right leading-none font-black uppercase">
                  <span className="text-3xl">{score}</span>
                  <span className="ml-1 text-base">pts</span>
                  {data.attempt.durationSec !== null && (
                    <span className="mt-1 block text-sm font-bold normal-case">
                      <ClockIcon className="inline size-[0.9em] align-[-0.1em]" />{' '}
                      {formatClock(data.attempt.durationSec)}
                      {data.attempt.timed ? ' · contra o relógio' : ''}
                    </span>
                  )}
                </p>
              </div>
              {starRule && <p className="mt-2 text-sm font-semibold text-ink/75">{starRule}</p>}
            </div>
          </div>

          {promoted && (
            <p
              className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-ink"
              style={{ background: titleTone(promoted) }}
            >
              <TitleBadge name={promoted} className="size-10" />
              <span className="font-condensed text-2xl leading-none font-black uppercase">
                Promovido a {promoted}
              </span>
            </p>
          )}

          {!oficina && (award || total !== undefined) && (
            <div className={`grid gap-3 ${award && total !== undefined ? 'grid-cols-2' : ''}`}>
              {award && <StickerWon award={award} />}
              {total !== undefined && <TitleProgress total={total} />}
            </div>
          )}

          {/* Both shares share a row at every width, so neither falls under the phone's bottom bar. */}
          <div className="grid grid-cols-2 gap-3">
            {oficina ? (
              <Link to="/oficina" className={`${btnPrimary} min-h-14 text-xl col-span-2`}>
                Mais desafios da Oficina
              </Link>
            ) : daily ? (
              <Link to="/d/hoje" className={`${btnPrimary} min-h-14 text-xl col-span-2`}>
                Voltar ao Desafio do Dia
              </Link>
            ) : next ? (
              <Link
                to={`${GAME_PATH[mode]}/${next.level}`}
                className={`${btnPrimary} min-h-14 text-xl col-span-2`}
              >
                Próxima fase · {next.level}
              </Link>
            ) : (
              <Link to={GAME_PATH[mode]} className={`${btnPrimary} min-h-14 text-xl col-span-2`}>
                Ver as fases
              </Link>
            )}
            {data.share && (
              <>
                <ShareButton
                  secondary
                  label={
                    <>
                      Copiar<span className="max-sm:sr-only"> resultado</span>
                    </>
                  }
                  text={data.share.text}
                  onShared={(method) => track('result_shared', { mode, level, method })}
                />
                <ResultCardButton
                  data={data}
                  onShared={() => track('result_shared', { mode, level, method: 'image' })}
                />
              </>
            )}
          </div>

          {showInvite && (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border-2 border-cover/70 px-4 py-3">
              <p className="min-w-0 flex-1 basis-56">
                <span className="font-condensed block text-xl leading-none font-extrabold uppercase">
                  Salve seu progresso
                </span>
                <span className="text-sm text-chalk-soft">
                  Crie uma conta e leve suas estrelas e figurinhas para qualquer aparelho.
                </span>
              </p>
              <SignInButton />
            </div>
          )}
        </>
      )}
      {stars > 0 && !oficina && isPageLaunched('career') && (
        <Link
          to="/carreira"
          className="text-sm font-semibold text-chalk-soft underline underline-offset-4 hover:text-chalk"
        >
          +{stars} de treino para o seu craque no Modo Carreira
        </Link>
      )}

      {social && <Reactions mode={mode} level={level} />}

      {social && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-condensed text-xl font-extrabold uppercase">Top 10 da fase</h3>
            <Link
              to={GAME_PATH[mode]}
              className="text-sm font-semibold text-chalk-soft underline underline-offset-4 hover:text-chalk"
            >
              Voltar às fases
            </Link>
          </div>
          {me.data && !me.data.nickname && (
            <p className="text-sm text-chalk-soft">
              <Link to="/conta" className="text-chalk underline underline-offset-4">
                Escolha um apelido
              </Link>{' '}
              para aparecer aqui.
            </p>
          )}
          {top.data?.entries.length ? (
            <ol className="flex flex-col">
              {top.data.entries.map((e) => (
                <li
                  key={e.position}
                  className={`flex min-h-11 items-center gap-3 border-b border-chalk/10 px-2 last:border-b-0 ${e.isMe ? 'rounded-md border-transparent bg-cover text-ink' : ''}`}
                >
                  <span className="font-condensed tabular w-6 text-right text-lg font-black">
                    {e.position}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{e.nickname}</span>
                  <Stars n={e.stars} size="size-4" onCover={e.isMe} />
                  <span className="font-condensed tabular w-10 text-right font-bold">
                    {e.score}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-lg border-2 border-dashed border-chalk-soft/40 px-4 py-3 text-sm text-chalk-soft">
              Ninguém com apelido terminou essa fase ainda. O lugar 1 está vago.
            </p>
          )}
        </div>
      )}
      {!oficina && <ReportError mode={mode} level={level} />}
      <AdSlot slot={AD_SLOTS.result} />
    </section>
  );
}

const REASONS: Record<GameMode, [string, string][]> = {
  CAREER_PATH: [
    ['position', 'Posição errada'],
    ['club_missing', 'Clube faltando, sobrando ou fora de ordem'],
    ['wrong_stats', 'Jogos, gols ou anos errados'],
    ['other', 'Outra coisa'],
  ],
  MYSTERY_PLAYER: [
    ['wrong_stats', 'Nacionalidade, posição ou idade errada'],
    ['club_missing', 'Clube faltando ou que ele não jogou'],
    ['other', 'Outra coisa'],
  ],
  DRAFT: [
    ['club_missing', 'O certo não foi titular nesse jogo'],
    ['answer_refused', 'Outra opção também foi titular nesse jogo'],
    ['position', 'Posição errada'],
    ['other', 'Outra coisa'],
  ],
  CONNECTIONS: [
    ['club_missing', 'Um jogador não pertence ao grupo'],
    ['wrong_stats', 'Jogador cabe em dois grupos'],
    ['other', 'Outra coisa'],
  ],
  MISSING_XI: [
    ['club_missing', 'Jogador que não foi titular nessa final'],
    ['wrong_stats', 'Posição ou número errado'],
    ['other', 'Outra coisa'],
  ],
  HIGHER_LOWER: [
    ['wrong_stats', 'Número de jogos ou gols errado'],
    ['club_missing', 'Ele não jogou nesse clube'],
    ['other', 'Outra coisa'],
  ],
  TIMELINE: [
    ['club_missing', 'Clube que ele não jogou, ou faltando'],
    ['wrong_stats', 'Anos errados ou ordem errada'],
    ['other', 'Outra coisa'],
  ],
  IMPOSTOR: [
    ['club_missing', 'Um dos "jogou aqui" nunca jogou no clube'],
    ['answer_refused', 'O impostor jogou, sim, no clube'],
    ['other', 'Outra coisa'],
  ],
  FOOTBALL_GRID: [
    ['answer_refused', 'Uma resposta certa foi recusada'],
    ['position', 'Posição errada de algum jogador'],
    ['club_missing', 'Clube ou país errado de algum jogador'],
    ['other', 'Outra coisa'],
  ],
};

/** "Essa fase tem um erro?": goes to the editorial panel (and the AI curator), after the level. */
function ReportError({ mode, level }: { mode: GameMode; level: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState(REASONS[mode][0]![0]);
  const [note, setNote] = useState('');
  const send = useMutation({
    mutationFn: () =>
      api(`/v1/levels/${mode}/${level}/report`, {
        method: 'POST',
        json: { reason, ...(note.trim() ? { note: note.trim() } : {}) },
      }),
  });
  return (
    <div className="flex flex-col items-center gap-2 border-t border-chalk/10 pt-4 text-center">
      {send.isSuccess ? (
        <p role="status" className="text-chalk-soft">
          Valeu! A gente vai conferir essa fase.
        </p>
      ) : (
        <button
          type="button"
          className="text-sm font-semibold text-chalk-soft underline underline-offset-4 hover:text-chalk"
          onClick={() => dialog.current?.showModal()}
        >
          Essa fase tem um erro?
        </button>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="report-title"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-paper p-5 text-left text-ink backdrop:bg-black/55"
      >
        <form
          method="dialog"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate(undefined, { onSuccess: () => dialog.current?.close() });
          }}
        >
          <h2 id="report-title" className="font-condensed text-2xl font-black uppercase">
            O que está errado?
          </h2>
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Motivo</legend>
            {REASONS[mode].map(([value, label]) => (
              <label key={value} className="flex min-h-11 items-center gap-3 font-semibold">
                <input
                  type="radio"
                  name="reason"
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                  className="size-5 accent-ink"
                />
                {label}
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-1 font-semibold">
            Detalhe (opcional)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Ex.: o Kaká era meia, não atacante"
              className="rounded-lg border-2 border-ink/15 bg-white px-3 py-2 text-base"
            />
          </label>
          {send.error && (
            <p role="alert" className="rounded-lg bg-cover px-3 py-2 font-semibold">
              {(send.error as ApiError).message}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button className={btnPrimary} disabled={send.isPending}>
              Enviar
            </button>
            <button
              type="button"
              className={`${btnSecondary} border-ink/30 text-ink hover:border-ink hover:bg-ink/5`}
              onClick={() => dialog.current?.close()}
            >
              Cancelar
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
