/** Public profile (GROWTH_PLAN.md 2.2): only when the player turned it on in /conta. */
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { ProfileAlbumResponse, ProfileResponse } from '@decabeca/contracts';
import { api, type ApiError } from '../lib/api';
import { GAME_NAME } from '../lib/game';
import { StarIcon } from '../components/Stars';
import { btnPrimary, GameHeader, Notice, Skeleton } from '../components/ui';
import { TrophyIcon } from '../components/Icons';
import { Showcase } from '../components/Showcase';
import { MemberCard } from '../components/MemberCard';
import { SignInButton } from '../components/SignInButton';
import { achievementOpen, isModeLaunched, isPageLaunched } from '../lib/launch';

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
  // Only what is open at launch (lib/launch.ts): seasons belong to the ranking.
  const games = p.games.filter((g) => isModeLaunched(g.mode));
  const achievements = p.achievements.filter((a) => achievementOpen(a.id));
  const trophies = isPageLaunched('ranking') ? p.trophies : [];
  return (
    <>
      <GameHeader title={p.nickname} aside={<SignInButton />} />
      <div className="mt-5">
        <MemberCard
          heading="h2"
          name={p.nickname}
          title={p.title.name}
          stars={p.totalStars}
          levels={games.reduce((n, g) => n + g.completed, 0)}
        />
      </div>

      {trophies.length > 0 && (
        <>
          <h2 className={h2}>Troféus</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {trophies.map((t) => (
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
          <div className="mt-4">
            <Showcase stickers={album.data.showcase} />
          </div>
        </>
      )}

      {games.length > 1 && (
        <>
          <h2 className={h2}>Por jogo</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {games.map((g) => (
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
        </>
      )}

      <h2 className={h2}>Conquistas · {achievements.length}</h2>
      {achievements.length ? (
        <ul className="mt-4 flex flex-wrap gap-3">
          {achievements.map((a) => (
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
