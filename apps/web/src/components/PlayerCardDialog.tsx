/** "Ficha" of a player from the search: who they are, with the photo credit the licence asks. */
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PlayerCard } from '@decabeca/contracts';
import { api } from '../lib/api';
import { countryName, POSITION_LABEL } from '../lib/format';
import { Skeleton } from './ui';

export function Avatar({
  name,
  photo,
  credit,
  size = 'size-10',
}: {
  name: string;
  photo?: string | null;
  /** Shown on hover / long press: CC licences require the credit where the photo shows. */
  credit?: string | undefined;
  size?: string;
}) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return photo ? (
    <img
      src={photo}
      alt=""
      title={credit}
      loading="lazy"
      decoding="async"
      className={`${size} shrink-0 rounded-full bg-ink/10 object-cover object-top`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`${size} font-condensed grid shrink-0 place-items-center rounded-full bg-ink/10 text-sm font-black text-ink/70`}
    >
      {initials}
    </span>
  );
}

/** Sticker-album card ("figurinha"): photo sticker with a name band, facts beside it. */
export function PlayerCardDialog({
  playerId,
  onClose,
}: {
  playerId: string | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const q = useQuery({
    queryKey: ['player-card', playerId],
    queryFn: () => api<PlayerCard>(`/v1/players/${playerId}/card`),
    enabled: Boolean(playerId),
    staleTime: Infinity,
  });
  useEffect(() => {
    if (playerId) dialog.current?.showModal();
    else dialog.current?.close();
  }, [playerId]);
  const c = q.data;
  const facts: [string, string][] = c
    ? [
        ['Nascimento', c.birthYear ? String(c.birthYear) : '—'],
        ['Nacionalidade', c.nationalityCode ? countryName(c.nationalityCode) : '—'],
        ['Formado no', c.formationClub ?? '—'],
        [
          'Mais jogos no',
          c.mostGamesClub
            ? `${c.mostGamesClub.name}${c.mostGamesClub.games ? ` · ${c.mostGamesClub.games} jogos` : ''}`
            : '—',
        ],
      ]
    : [];
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="card-title"
      className="m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto rounded-2xl bg-pitch-deep p-0 text-chalk backdrop:bg-black/60"
    >
      <button
        type="button"
        onClick={() => dialog.current?.close()}
        aria-label="Fechar ficha"
        className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full bg-chalk/10 text-xl font-bold hover:bg-chalk/20"
      >
        ×
      </button>
      {!c ? (
        <Skeleton className="m-6 h-72" />
      ) : (
        <div className="grid gap-6 p-5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:p-7">
          {/* The sticker: photo (or initials) with the name on a cover-yellow band. */}
          <figure className="mx-auto w-48 sm:w-full">
            <div className="-rotate-2 rounded-[12px] bg-paper p-2 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.55)]">
              <div className="relative overflow-hidden rounded-[6px] bg-ink/10">
                {c.photo ? (
                  <img
                    src={c.photo.url}
                    alt={`Foto de ${c.name}`}
                    decoding="async"
                    className="aspect-[3/4] w-full object-cover object-top"
                  />
                ) : (
                  <div className="font-condensed grid aspect-[3/4] place-items-center bg-pitch text-6xl font-black text-chalk/70">
                    {c.name
                      .split(/\s+/)
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
                <p className="font-condensed absolute inset-x-0 bottom-0 bg-cover px-2 py-1.5 text-center text-lg leading-tight font-black text-ink uppercase">
                  {c.name}
                </p>
              </div>
            </div>
            {c.photo && (
              <figcaption className="mt-3 text-center text-xs leading-snug text-chalk-soft">
                Foto:{' '}
                <a href={c.photo.page} target="_blank" rel="noreferrer" className="underline">
                  {c.photo.author ?? 'Wikimedia Commons'}
                </a>
                <br />
                {c.photo.license} · Wikimedia Commons
              </figcaption>
            )}
          </figure>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="pr-10">
              <h2
                id="card-title"
                className="font-condensed text-4xl leading-[0.95] font-black uppercase"
              >
                {c.name}
              </h2>
              {c.fullName && <p className="mt-1 text-chalk-soft">{c.fullName}</p>}
            </div>
            {c.positions.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Posições">
                {c.positions.map((p, i) => (
                  <li
                    key={p}
                    className={`font-condensed rounded-full px-3 py-1 text-base font-black uppercase ${i === 0 ? 'bg-cover text-ink' : 'border-2 border-cover/70 text-gold'}`}
                  >
                    {POSITION_LABEL[p]}
                  </li>
                ))}
              </ul>
            )}
            <dl className="grid grid-cols-2 gap-3">
              {facts.map(([k, v]) => (
                <div key={k} className="rounded-xl bg-chalk/[0.07] px-3 py-2.5">
                  <dt className="text-xs font-bold tracking-wide text-chalk-soft uppercase">{k}</dt>
                  <dd className="font-condensed text-xl leading-tight font-black">{v}</dd>
                </div>
              ))}
            </dl>
            {c.aliases.length > 0 && (
              <p className="text-sm text-chalk-soft">
                <span className="font-bold text-chalk">Também chamado: </span>
                {c.aliases.join(' · ')}
              </p>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
