/** Sticker album: a Panini-style page per position group, with the next empty slots as teaser. */
import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AlbumResponse, Sticker } from '@decabeca/contracts';
import { api, type ApiError } from '../lib/api';
import { GameHeader, Skeleton, btnPrimary, btnSecondary } from '../components/ui';
import { RARITY_ORDER, RARITY_STYLE } from '../components/rarity';
import { StickerCard } from '../components/StickerCard';
import { useTrack } from '../lib/game';
import { nextLevel } from '../lib/track';

const GROUPS = [
  { key: 'GK', label: 'Goleiros' },
  { key: 'DF', label: 'Defensores' },
  { key: 'MF', label: 'Meio-campistas' },
  { key: 'FW', label: 'Atacantes' },
  { key: null, label: 'Outros' },
] as const;
const TEASER_SLOTS = 4;

export function AlbumPage() {
  const qc = useQueryClient();
  const q = useQuery<AlbumResponse, ApiError>({
    queryKey: ['album'],
    queryFn: () => api('/v1/me/album'),
  });
  const [picked, setPicked] = useState<Sticker | null>(null);
  const next = nextLevel(useTrack('CAREER_PATH').data);
  const promote = useMutation<AlbumResponse, ApiError, string>({
    mutationFn: (playerId) => api('/v1/me/album/promote', { method: 'POST', json: { playerId } }),
    onSuccess: (data) => {
      qc.setQueryData(['album'], data);
      setPicked(null);
    },
  });

  if (q.isPending) return <Skeleton className="h-96" />;
  if (!q.data)
    return (
      <>
        <GameHeader title="Meu álbum" />
        <p className="mt-6 text-chalk-soft">Não foi possível abrir o álbum.</p>
      </>
    );
  const a = q.data;
  const promo = a.promotions[0];

  return (
    <>
      <GameHeader title="Meu álbum" />
      <p className="font-condensed tabular mt-4 text-5xl leading-none font-black text-gold">
        {a.owned} de {a.total}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Figurinhas por raridade">
        {RARITY_ORDER.filter((r) => a.byRarity[r]).map((r) => (
          <li
            key={r}
            className="rounded-full bg-chalk/[0.08] px-3 py-1 text-sm font-semibold text-chalk-soft"
          >
            {RARITY_STYLE[r].label} · {a.byRarity[r]}
          </li>
        ))}
      </ul>

      {a.owned === 0 && (
        <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[44ch] text-lg leading-snug font-semibold">
            Álbum vazio por enquanto. Acerte uma fase do Career Path e a figurinha do jogador vem
            colada aqui.
          </p>
          <Link
            to={next ? `/career-path/${next.level}` : '/career-path'}
            className={`${btnPrimary} min-h-14 self-stretch text-xl sm:self-auto sm:px-10`}
          >
            {next ? `Jogar fase ${next.level}` : 'Ver as fases'}
          </Link>
        </div>
      )}

      {promo && (
        <div className="mt-6 rounded-xl border-2 border-cover bg-cover/10 p-4">
          <p className="font-condensed text-xl font-extrabold uppercase">
            Você está no pódio da Temporada {promo.season}: escolha uma figurinha para promover
          </p>
          {picked && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="font-semibold">Promover {picked.name} para a próxima raridade?</p>
              <button
                type="button"
                className={btnPrimary}
                disabled={promote.isPending}
                onClick={() => promote.mutate(picked.playerId)}
              >
                Promover
              </button>
              <button type="button" className={btnSecondary} onClick={() => setPicked(null)}>
                Cancelar
              </button>
            </div>
          )}
          {promote.isError && (
            <p role="alert" className="mt-2 text-sm font-semibold">
              Não deu para promover agora.
            </p>
          )}
        </div>
      )}

      {GROUPS.map(({ key, label }) => {
        const list = a.stickers.filter((s) => s.positionGroup === key);
        if (!list.length && key === null) return null;
        return (
          <section key={label} className="mt-10" aria-label={label}>
            <h2 className="font-condensed text-2xl font-extrabold uppercase">
              {label} · {list.length}
            </h2>
            <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10">
              {list.map((s) => (
                <li key={s.playerId} className="aspect-[3/4]">
                  {promo ? (
                    <button
                      type="button"
                      aria-pressed={picked?.playerId === s.playerId}
                      aria-label={`Promover ${s.name}`}
                      onClick={() => setPicked(s)}
                      className={`block h-full w-full rounded-lg text-left ${picked?.playerId === s.playerId ? 'outline-4 outline-gold' : ''}`}
                    >
                      <StickerCard sticker={s} size="sm" />
                    </button>
                  ) : (
                    <StickerCard sticker={s} size="sm" />
                  )}
                </li>
              ))}
              {key !== null &&
                Array.from({ length: TEASER_SLOTS }, (_, i) => (
                  <li
                    key={`slot-${i}`}
                    aria-hidden="true"
                    className="font-condensed tabular grid aspect-[3/4] place-items-center rounded-lg border-2 border-dashed border-chalk-soft/60 bg-chalk/[0.06] text-4xl font-black text-chalk-soft/50"
                  >
                    {list.length + i + 1}
                  </li>
                ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
