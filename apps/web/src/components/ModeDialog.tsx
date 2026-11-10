/**
 * A closed mode, opened from its poster on the home: its art, what it is, how it plays, and the
 * vote for the mode that opens next. Anyone sees the votes; only an account votes (one vote,
 * movable). A bottom sheet on phones, a two-column panel from 768px.
 */
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import type { VotableMode } from '@decabeca/contracts';
import type { ApiError } from '../lib/api';
import { useMe, useModeVote, useModeVotes } from '../lib/game';
import { GameArt, type CoverMode } from './GameArt';
import { ModeCover } from './ModeCover';
import { SoonStamp } from '../pages/ComingSoonPage';
import { signInHref } from './SignInButton';
import { btnPrimary } from './ui';

export type Locker = {
  key: VotableMode;
  name: string;
  /** What the mode is, two or three lines. */
  rule: string;
  /** A one-line hook for the mode's poster. */
  pitch: string;
  howTo: readonly string[];
};

/** Drawings for the closed pages, in GameArt's language (its 200×120 panel, album palette). */
const PAGE_ART: Partial<Record<VotableMode, React.ReactNode>> = {
  career: (
    <>
      {/* steps from the base up to the star */}
      <path
        d="M40 98h36V80h36V62h36V44"
        fill="none"
        stroke="var(--color-chalk)"
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <path d="m160 14 5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="var(--color-cover)" />
      <circle cx={58} cy={70} r={7} fill="var(--color-paper)" />
      <path
        d="M58 77v13m-8-8 8-3 8 3"
        stroke="var(--color-paper)"
        strokeWidth={4}
        strokeLinecap="round"
      />
    </>
  ),
  copa: (
    <>
      <path d="M80 20h40v24a20 20 0 0 1-40 0z" fill="var(--color-cover)" />
      <path
        d="M80 26H66a14 14 0 0 0 16 20M120 26h14a14 14 0 0 1-16 20"
        fill="none"
        stroke="var(--color-cover)"
        strokeWidth={4}
      />
      <path d="M94 64h12v14H94z" fill="var(--color-cover)" />
      <path d="M82 80h36v12H82z" fill="var(--color-paper)" />
    </>
  ),
  oficina: (
    <>
      <path
        d="M50 14h72v72H50zM74 14v72M98 14v72M50 38h72M50 62h72"
        fill="none"
        stroke="var(--color-chalk)"
        strokeWidth={3}
      />
      <path d="m120 104 8-22 40-40 14 14-40 40z" fill="var(--color-cover)" />
      <path d="m120 104 8-22 14 14z" fill="var(--color-paper)" />
    </>
  ),
};

/** The mode's drawing on the 200×120 panel. */
export function ModeArt({ mode, className = '' }: { mode: VotableMode; className?: string }) {
  const page = PAGE_ART[mode];
  return page ? (
    <svg viewBox="0 0 200 120" aria-hidden="true" className={className}>
      {page}
    </svg>
  ) : (
    <GameArt mode={mode as CoverMode} className={className} />
  );
}

const votesLabel = (n: number) => (n === 1 ? '1 voto' : `${n} votos`);

/** The top mode by votes, when it leads alone (a tie or no votes has no leader). */
export function leaderOf(modes: { mode: VotableMode; votes: number }[] | undefined) {
  const [a, b] = modes ?? [];
  return a && a.votes > 0 && a.votes > (b?.votes ?? 0) ? a.mode : null;
}

function Vote({ locker, names }: { locker: Locker; names: Map<VotableMode, string> }) {
  const me = useMe().data;
  const votes = useModeVotes();
  const vote = useModeVote();
  const data = votes.data;
  const mine = data?.mine ?? null;
  const here = data?.modes.find((m) => m.mode === locker.key)?.votes ?? 0;
  const error = vote.error as ApiError | null;
  const back = `/?modo=${locker.key}`;

  return (
    <section aria-labelledby="vote-title" className="flex flex-col gap-4">
      <div>
        <h3
          id="vote-title"
          className="font-condensed text-2xl leading-none font-black text-chalk uppercase"
        >
          Qual abre primeiro?
        </h3>
        <p className="mt-1.5 text-sm text-chalk-soft">
          O modo mais votado entra na fila para abrir. Um voto por conta; dá para trocar quando
          quiser.
        </p>
      </div>

      {!me ? null : !me.account ? (
        <div className="flex flex-col gap-2.5 rounded-xl border-2 border-dashed border-cover/50 bg-pitch/60 p-4">
          <p className="text-sm font-semibold text-chalk">
            Só quem tem conta vota: assim cada pessoa vale um voto. Suas estrelas deste aparelho vão
            junto para a conta.
          </p>
          <Link to={signInHref(back)} className={`${btnPrimary} self-start`}>
            Entrar para votar
          </Link>
        </div>
      ) : mine === locker.key ? (
        <div className="flex flex-col gap-2 rounded-xl bg-cover p-4 text-ink">
          <p className="font-condensed text-2xl leading-none font-black uppercase">
            Seu voto está aqui
          </p>
          <p className="text-sm font-semibold">
            {here <= 1
              ? 'Por enquanto, o único voto aqui.'
              : `${votesLabel(here)} aqui, contando o seu.`}{' '}
            Mudou de ideia? Vote em outro armário.
          </p>
          <button
            type="button"
            className="min-h-11 self-start text-sm font-bold underline underline-offset-4"
            onClick={() => vote.mutate(null)}
            disabled={vote.isPending}
          >
            Tirar meu voto
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className={`${btnPrimary} min-h-14 w-full text-xl sm:w-auto sm:self-start`}
            onClick={() => vote.mutate(locker.key)}
            disabled={vote.isPending || !data}
          >
            {vote.isPending ? 'Votando…' : mine ? 'Mudar meu voto para cá' : 'Quero esse primeiro'}
          </button>
          {mine && (
            <p className="text-sm text-chalk-soft">
              Seu voto hoje vai para {names.get(mine)}; votar aqui tira de lá.
            </p>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-cover">
          {error.status === 401 ? (
            <>
              Sua sessão expirou.{' '}
              <Link to={signInHref(back)} className="underline underline-offset-4">
                Entre de novo para votar
              </Link>
              .
            </>
          ) : (
            `${error.message} Tente de novo.`
          )}
        </p>
      )}

      {votes.isError ? (
        <p className="text-sm text-chalk-soft">A contagem não carregou. Confira a internet.</p>
      ) : (
        data && (
          <div>
            <p className="text-sm font-bold text-chalk" aria-live="polite">
              {data.total === 0
                ? 'Nenhum voto ainda: o seu pode decidir.'
                : `${votesLabel(data.total)} no total`}
            </p>
            <ol className="mt-2 flex flex-col" aria-label="Votos por modo">
              {data.modes
                .filter((m) => names.has(m.mode))
                .map((m, i) => {
                  const current = m.mode === locker.key;
                  return (
                    <li
                      key={m.mode}
                      aria-current={current ? 'true' : undefined}
                      className={`vote-row grid min-h-9 grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 text-sm ${current ? 'bg-chalk/10 font-bold text-chalk' : 'text-chalk-soft'}`}
                      style={
                        {
                          '--share': data.total ? m.votes / data.total : 0,
                        } as React.CSSProperties
                      }
                    >
                      <span className="font-condensed tabular text-right font-black">{i + 1}</span>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{names.get(m.mode)}</span>
                        {m.mode === mine && (
                          <span className="font-condensed shrink-0 rounded bg-cover px-1.5 text-xs leading-5 font-black text-ink uppercase">
                            Seu voto
                          </span>
                        )}
                      </span>
                      <span className="tabular font-semibold">{votesLabel(m.votes)}</span>
                    </li>
                  );
                })}
            </ol>
          </div>
        )
      )}
    </section>
  );
}

export function ModeDialog({
  locker,
  lockers,
  onClose,
}: {
  locker: Locker | null;
  lockers: Locker[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (locker && !d.open) d.showModal();
    if (!locker && d.open) d.close();
  }, [locker]);
  const names = new Map(lockers.map((l) => [l.key, l.name]));

  return (
    <dialog
      ref={ref}
      aria-labelledby="mode-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      className="mode-sheet text-chalk backdrop:bg-black/60"
    >
      {locker && (
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Fechar"
          className="absolute top-2 right-2 z-10 grid size-11 place-items-center rounded-full bg-black/45 text-chalk hover:bg-black/65"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
      {locker && (
        <div className="max-h-[inherit] overflow-y-auto overscroll-contain">
          <div className="relative">
            {locker.key in PAGE_ART ? (
              <div className="obj-dark flex flex-col gap-3 bg-[radial-gradient(120%_90%_at_30%_20%,#34493f,#1f2d26)] px-5 pt-14 pb-5">
                <div className="mx-auto w-full max-w-sm border-4 border-[#8a5a33] bg-pitch-deep px-3 py-2">
                  <ModeArt
                    mode={locker.key}
                    className="mx-auto h-auto max-h-20 w-full sm:max-h-32"
                  />
                </div>
                <h2
                  id="mode-title"
                  className="font-condensed text-4xl leading-[0.9] font-black text-chalk uppercase sm:text-5xl"
                >
                  {locker.name}
                </h2>
              </div>
            ) : (
              <div className="flex">
                <ModeCover
                  mode={locker.key as CoverMode}
                  name={locker.name}
                  heading="h2"
                  headingId="mode-title"
                  compact
                />
              </div>
            )}
          </div>
          <div className="grid gap-7 px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:grid-cols-2 md:gap-8 md:px-7">
            <div className="flex flex-col gap-5">
              <SoonStamp className="self-start text-sm" />
              <p className="max-w-[48ch] text-lg leading-snug font-semibold">{locker.rule}</p>
              <section aria-labelledby="how-title">
                <h3
                  id="how-title"
                  className="font-condensed text-2xl leading-none font-black uppercase"
                >
                  Como se joga
                </h3>
                <ol className="mt-3 flex flex-col gap-3">
                  {locker.howTo.map((step, i) => (
                    <li key={step} className="flex gap-3">
                      <span className="font-condensed tabular grid size-7 shrink-0 place-items-center rounded-full bg-paper text-base font-black text-ink">
                        {i + 1}
                      </span>
                      <span className="leading-snug text-chalk/90">{step}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
            <Vote locker={locker} names={names} />
          </div>
        </div>
      )}
    </dialog>
  );
}
