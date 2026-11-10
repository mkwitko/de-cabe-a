/** Public profile (GROWTH_PLAN.md 2.2): only when the player turned it on in /conta. */
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { ProfileAlbumResponse, ProfileResponse } from '@decabeca/contracts';
import { api, type ApiError } from '../lib/api';
import { GAME_NAME } from '../lib/game';
import { StarIcon } from '../components/Stars';
import { btnPrimary, GameHeader, Notice, Skeleton } from '../components/ui';
import { TrophyIcon } from '../components/Icons';
import { StickerCard } from '../components/StickerCard';

export function ProfilePage() {
  const nickname = useParams().nickname ?? '';
  const q = useQuery<ProfileResponse, ApiError>({
    queryKey: ['profile', nickname],
    queryFn: () => api(`/v1/profiles/${encodeURIComponent(nickname)}`),
    retry: false,
  });
  const album = useQuery<ProfileAlbumResponse, ApiError>({
    queryKey: ['profile-album', nickname],
    queryFn: () => api(`/v1/profiles/${encodeURIComponent(nickname)}/album`),
    retry: false,
  });
  if (q.isPending) return <Skeleton className="h-96" />;
  if (!q.data)
    return (
      <>
        <GameHeader title="Perfil" />
        <div className="mt-6">
          <Notice
            title="Perfil privado ou inexistente"
            action={
              <Link to="/" className={btnPrimary}>
                Jogar
              </Link>
            }
          >
            Perfis só aparecem quando o jogador escolhe mostrar.
          </Notice>
        </div>
      </>
    );
  const p = q.data;
  return (
    <>
      <GameHeader title={p.nickname} />
      <p className="font-condensed mt-4 text-4xl leading-none font-black text-cover uppercase">
        {p.title.name}
      </p>
      <p className="font-condensed tabular mt-2 flex items-center gap-1 text-2xl font-bold">
        <StarIcon /> {p.totalStars} estrelas
      </p>

      {p.trophies.length > 0 && (
        <>
          <h2 className="font-condensed mt-10 text-2xl font-extrabold uppercase">Troféus</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {p.trophies.map((t) => (
              <li key={t.season} className="rounded-xl bg-cover px-4 py-3 text-ink">
                <span className="font-condensed block text-2xl leading-none font-black">
                  <TrophyIcon className="inline size-[0.85em] align-[-0.1em]" /> {t.position}º
                </span>
                <span className="text-sm font-semibold">
                  Temporada {t.season} · {t.theme}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {album.data && album.data.showcase.length > 0 && (
        <>
          <h2 className="font-condensed mt-10 text-2xl font-extrabold uppercase">
            Vitrine · {album.data.owned} figurinhas
          </h2>
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {album.data.showcase.map((s) => (
              <li key={s.playerId} className="aspect-[3/4]">
                <StickerCard sticker={s} size="sm" />
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="font-condensed mt-10 text-2xl font-extrabold uppercase">Por jogo</h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {p.games.map((g) => (
          <li key={g.mode} className="rounded-xl bg-chalk/[0.06] p-4">
            <span className="block text-sm font-semibold text-chalk-soft">{GAME_NAME[g.mode]}</span>
            <span className="font-condensed tabular text-2xl font-black">
              <StarIcon className="inline size-[0.85em] align-[-0.08em]" /> {g.stars}
            </span>
            <span className="block text-xs text-chalk-soft">{g.completed} fases</span>
          </li>
        ))}
      </ul>

      <h2 className="font-condensed mt-10 text-2xl font-extrabold uppercase">
        Conquistas · {p.achievements.length}
      </h2>
      {p.achievements.length ? (
        <ul className="mt-4 flex flex-wrap gap-3">
          {p.achievements.map((a) => (
            <li
              key={a.id}
              className="font-condensed -rotate-1 rounded-lg bg-cover px-3 py-2 text-lg font-black text-ink uppercase"
            >
              {a.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-chalk-soft">Nenhuma ainda.</p>
      )}
    </>
  );
}
