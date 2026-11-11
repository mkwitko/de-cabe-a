/** Public profile (GROWTH_PLAN.md 2.2): only when the player turned it on in /conta. */
import { AD_SLOTS, AdSlot } from '../components/AdSlot';
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
import { Medal, MedalDefs, medalGrid } from '../components/Achievements';
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
  const h2 = 'font-condensed text-3xl font-extrabold uppercase';
  // Only what is open at launch (lib/launch.ts): seasons belong to the ranking.
  const games = p.games.filter((g) => isModeLaunched(g.mode));
  const achievements = p.achievements.filter((a) => achievementOpen(a.id));
  const trophies = isPageLaunched('ranking') ? p.trophies : [];
  const levels = games.reduce((n, g) => n + g.completed, 0);
  return (
    <div className="flex flex-col gap-8">
      <div aria-hidden="true" className="scene-art room-dim" />
      <GameHeader
        title={p.nickname}
        aside={<SignInButton className={`${btnPrimary} sm:hidden`} />}
      />
      {/* Phone: card, vitrine, medals. Wide: card | vitrine, then medals under the card. */}
      <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
        <div className="flex justify-center lg:col-span-5 lg:block">
          <MemberCard
            heading="h2"
            name={p.nickname}
            title={p.title.name}
            stars={p.totalStars}
            levels={levels}
            stickers={album.data?.owned}
            member={!!p.member}
            supporter={!!p.supporter}
            className="max-w-lg"
          />
        </div>

        <section
          aria-labelledby="vitrine"
          className="flex flex-col gap-3 lg:col-span-7 lg:row-span-2"
        >
          <h2 id="vitrine" className="font-condensed text-3xl font-extrabold uppercase">
            Vitrine
          </h2>
          {album.isPending ? (
            <Skeleton className="h-64" />
          ) : album.data?.showcase.length ? (
            <Showcase
              stickers={album.data.showcase}
              cols="grid-cols-3 lg:grid-cols-6"
              finishOf={(id) => album.data.finishes[id] ?? null}
            />
          ) : (
            <p className="text-chalk-soft">Nenhuma figurinha na vitrine ainda.</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border-2 border-dashed border-cover/50 bg-pitch-deep/70 p-4">
            <p className="min-w-0 flex-1 basis-56 text-sm text-chalk-soft">
              Acha que sabe mais de futebol que {p.nickname}? Adivinhe o jogador pela carreira e
              monte o seu álbum.
            </p>
            <Link to="/" className={`${btnPrimary} shrink-0`}>
              Jogar
            </Link>
          </div>
        </section>

        <section aria-labelledby="conquistas" className="flex flex-col gap-5 lg:col-span-5">
          <MedalDefs />
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="conquistas" className="font-condensed text-3xl font-extrabold uppercase">
              Conquistas
            </h2>
            <span className="font-condensed tabular text-lg font-black text-chalk-soft">
              {achievements.length}
            </span>
          </div>
          {achievements.length ? (
            <ul className={medalGrid}>
              {achievements.map((a) => (
                <Medal key={a.id} name={a.name} done />
              ))}
            </ul>
          ) : (
            <p className="text-chalk-soft">Nenhuma ainda.</p>
          )}
        </section>
      </div>

      {trophies.length > 0 && (
        <section aria-labelledby="trofeus" className="flex flex-col gap-4">
          <h2 id="trofeus" className={h2}>
            Troféus
          </h2>
          <ul className="flex flex-wrap gap-3">
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
        </section>
      )}

      {games.length > 1 && (
        <section aria-labelledby="por-jogo" className="flex flex-col gap-4">
          <h2 id="por-jogo" className={h2}>
            Por jogo
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
        </section>
      )}
      <AdSlot slot={AD_SLOTS.track} />
    </div>
  );
}
