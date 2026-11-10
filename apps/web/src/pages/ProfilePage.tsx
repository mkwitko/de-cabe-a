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
  const h2 = 'font-condensed mt-10 text-2xl font-extrabold uppercase';
  return (
    <>
      <GameHeader title={p.nickname} />
      {/* Carteirinha de sócio: leans toward the finger that presses it. */}
      <div className="lean mt-5 w-full max-w-md -rotate-1 rounded-[14px] bg-paper p-2.5 text-ink shadow-[0_18px_40px_-12px_rgb(0_0_0/0.5)] sm:mx-0">
        <div className="flex items-center justify-between rounded-t-[8px] bg-ink px-4 py-2 text-paper">
          <span className="font-condensed text-sm font-extrabold tracking-[0.2em] uppercase">
            Sócio · De Cabeça F.C.
          </span>
          <span className="tabular text-sm font-bold">
            <StarIcon className="inline size-[0.9em] align-[-0.1em] text-gold" /> {p.totalStars}
          </span>
        </div>
        <div className="flex items-center gap-4 rounded-b-[8px] bg-cover px-4 py-4">
          <span
            aria-hidden="true"
            className="font-condensed grid size-16 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-paper text-3xl font-black uppercase"
          >
            {p.nickname.slice(0, 2)}
          </span>
          <div className="min-w-0">
            <p className="font-condensed text-4xl leading-none font-black uppercase">
              {p.title.name}
            </p>
            <p className="font-condensed tabular mt-1.5 flex items-center gap-1 text-xl font-bold">
              <StarIcon /> {p.totalStars} estrelas
            </p>
          </div>
        </div>
      </div>

      {p.trophies.length > 0 && (
        <>
          <h2 className={h2}>Troféus</h2>
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
          <h2 className={h2}>Vitrine · {album.data.owned} figurinhas</h2>
          {/* glass case: shelf line under each row of stickers */}
          <ul className="obj-dark mt-4 grid grid-cols-3 gap-x-3 gap-y-5 rounded-xl border-4 border-chalk-soft/40 bg-pitch-deep p-3 shadow-[inset_0_0_30px_rgb(0_0_0/0.45)] sm:grid-cols-6">
            {album.data.showcase.map((s) => (
              <li
                key={s.playerId}
                className="aspect-[3/4] shadow-[0_8px_0_-4px_rgb(255_255_255/0.2)]"
              >
                <StickerCard sticker={s} size="sm" />
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className={h2}>Por jogo</h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {p.games.map((g) => (
          <li
            key={g.mode}
            className="rounded-lg border-t-[6px] border-double border-gold bg-paper p-4 text-ink"
          >
            <span className="block text-sm font-semibold text-ink/70">{GAME_NAME[g.mode]}</span>
            <span className="font-condensed tabular text-3xl font-black">
              <StarIcon className="inline size-[0.85em] align-[-0.08em]" /> {g.stars}
            </span>
            <span className="block text-sm text-ink/70">{g.completed} fases</span>
          </li>
        ))}
      </ul>

      <h2 className={h2}>Conquistas · {p.achievements.length}</h2>
      {p.achievements.length ? (
        <ul className="mt-4 flex flex-wrap gap-3">
          {p.achievements.map((a) => (
            <li
              key={a.id}
              className="font-condensed -rotate-1 rounded-lg border-2 border-dashed border-ink/40 bg-cover px-3 py-2 text-lg font-black text-ink uppercase"
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
