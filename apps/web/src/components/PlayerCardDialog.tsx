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
  size = 'size-10',
}: {
  name: string;
  photo?: string | null;
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
      loading="lazy"
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
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="card-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-paper p-0 text-ink backdrop:bg-black/55"
    >
      {!c ? (
        <Skeleton className="m-5 h-64" />
      ) : (
        <div className="flex flex-col">
          {c.photo ? (
            <figure>
              <img
                src={c.photo.url}
                alt={`Foto de ${c.name}`}
                className="aspect-[4/3] w-full rounded-t-2xl bg-ink/10 object-cover object-top"
              />
              <figcaption className="px-5 pt-1 text-xs text-ink/60">
                Foto:{' '}
                <a href={c.photo.page} target="_blank" rel="noreferrer" className="underline">
                  {c.photo.author ?? 'Wikimedia Commons'}
                </a>{' '}
                · {c.photo.license} · Wikimedia Commons
              </figcaption>
            </figure>
          ) : null}
          <div className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-3">
              {!c.photo && <Avatar name={c.name} size="size-14" />}
              <div>
                <h2
                  id="card-title"
                  className="font-condensed text-3xl leading-none font-black uppercase"
                >
                  {c.name}
                </h2>
                {c.fullName && <p className="text-sm text-ink/70">{c.fullName}</p>}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {[
                ['Nascimento', c.birthYear ?? '—'],
                ['Nacionalidade', c.nationalityCode ? countryName(c.nationalityCode) : '—'],
                ['Posição', c.positions.map((p) => POSITION_LABEL[p]).join(' / ') || '—'],
                ['Formado no', c.formationClub ?? '—'],
                [
                  'Mais jogos no',
                  c.mostGamesClub
                    ? `${c.mostGamesClub.name}${c.mostGamesClub.games ? ` (${c.mostGamesClub.games})` : ''}`
                    : '—',
                ],
                ['Também chamado', c.aliases.join(', ') || '—'],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-xs font-semibold text-ink/60 uppercase">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <button
              className="font-condensed mt-2 self-start rounded-lg bg-ink px-4 py-2 font-extrabold text-paper uppercase"
              onClick={() => dialog.current?.close()}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
