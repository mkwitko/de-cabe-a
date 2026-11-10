/**
 * Fantasy de conhecimento: 5 real players for the week. A level you finish whose answer is one
 * of them scores for him (5 per star, +5 for 3 stars). Locked once saved, until Sunday.
 * Fantasy histórico (3.7): when the week has a World Cup theme, picks come from its players.
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FantasyResponse, PlayerRef } from '@decabeca/contracts';
import { api, type ApiError } from '../lib/api';
import { PlayerSearch } from '../components/PlayerSearch';
import { btnPrimary, btnSecondary, GameHeader, Skeleton } from '../components/ui';
import { LowerThird, PerspectivePitch, TvStage } from '../components/TvStage';

const SIZE = 5;
const POS = { GK: 'Goleiro', DF: 'Defensor', MF: 'Meio-campo', FW: 'Atacante' } as const;
type Cup = NonNullable<FantasyResponse['cup']>;
type Choice = Pick<PlayerRef, 'id' | 'name'>;

/** The week's World Cup squad: a filter and the players by position. */
function CupList({
  cup,
  exclude,
  onSelect,
}: {
  cup: Cup;
  exclude: Set<string>;
  onSelect: (p: Choice) => void;
}) {
  const [q, setQ] = useState('');
  const norm = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const shown = cup.players.filter((p) => !exclude.has(p.id) && norm(p.name).includes(norm(q)));
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Filtrar jogadores da Copa de {cup.season}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-h-11 rounded-lg border-2 border-white/40 bg-transparent px-3 text-base font-normal"
        />
      </label>
      <div className="flex max-h-80 flex-col gap-4 overflow-y-auto pr-1">
        {(['GK', 'DF', 'MF', 'FW'] as const).map((pos) => {
          const group = shown.filter((p) => p.position === pos);
          return group.length ? (
            <section key={pos} aria-label={POS[pos]}>
              <h3 className="text-sm font-semibold text-white/80">{POS[pos]}</h3>
              <ul className="mt-1 flex flex-wrap gap-2">
                {group.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="min-h-11 rounded-lg bg-white/10 px-3 text-left font-semibold hover:bg-white/20"
                      onClick={() => onSelect(p)}
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null;
        })}
        {!shown.length && <p className="text-sm text-white/80">Ninguém com esse nome.</p>}
      </div>
    </div>
  );
}

function Picker({ cup, onSaved }: { cup: Cup | null; onSaved: (d: FantasyResponse) => void }) {
  const [picks, setPicks] = useState<Choice[]>([]);
  const save = useMutation<FantasyResponse, ApiError>({
    mutationFn: () =>
      api('/v1/fantasy', { method: 'POST', json: { playerIds: picks.map((p) => p.id) } }),
    onSuccess: onSaved,
  });
  return (
    <section className="grid gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        {picks.length < SIZE &&
          (cup ? (
            <CupList
              cup={cup}
              exclude={new Set(picks.map((p) => p.id))}
              onSelect={(p) => setPicks([...picks, p])}
            />
          ) : (
            <PlayerSearch
              label="Escale um jogador"
              exclude={new Set(picks.map((p) => p.id))}
              onSelect={(p) => p && setPicks([...picks, p])}
            />
          ))}
        <PerspectivePitch>
          <ol
            className="grid grid-cols-2 gap-2 [&>li:first-child]:col-span-2 [&>li:first-child]:mx-auto [&>li:first-child]:w-1/2 [&>li:first-child]:min-w-40"
            aria-label="Seu esquadrão"
          >
            {Array.from({ length: SIZE }, (_, i) => {
              const p = picks[i];
              return (
                <li
                  key={i}
                  className={`flex min-h-14 items-center justify-between gap-3 rounded-xl px-4 ${p ? 'bg-paper text-ink shadow-[0_3px_0_rgb(0_0_0/0.35)]' : 'border-2 border-dashed border-white/60 text-white'}`}
                >
                  <span className="font-condensed truncate text-lg font-black uppercase sm:text-xl">
                    {p ? p.name : `Vaga ${i + 1}`}
                  </span>
                  {p && (
                    <button
                      type="button"
                      className="min-h-11 shrink-0 px-2 text-sm font-semibold underline underline-offset-4"
                      onClick={() => setPicks(picks.filter((x) => x.id !== p.id))}
                    >
                      Tirar
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </PerspectivePitch>
      </div>
      <div className="flex flex-col gap-4">
        <p className="text-white/85">
          No máximo 2 da mesma posição. Depois de fechar, a escalação vale até domingo: só conta
          fase que você começar depois disso.
        </p>
        {save.error && (
          <p role="alert" className="rounded-lg bg-cover px-4 py-2 font-semibold text-ink">
            {save.error.message}
          </p>
        )}
        <button
          className={`${btnPrimary} self-start`}
          disabled={picks.length < SIZE || save.isPending}
          onClick={() => save.mutate()}
        >
          Fechar escalação da semana
        </button>
      </div>
    </section>
  );
}

export function FantasyPage() {
  const qc = useQueryClient();
  const q = useQuery<FantasyResponse, ApiError>({
    queryKey: ['fantasy'],
    queryFn: () => api('/v1/fantasy'),
  });
  if (q.isPending) return <Skeleton className="h-96" />;
  const d = q.data;
  return (
    <>
      <GameHeader title={d?.cup ? `Fantasy: Copa de ${d.cup.season}` : 'Fantasy da semana'} />
      <p className="mt-2 max-w-[60ch] text-chalk-soft">
        Escale 5 jogadores. Cada fase que você terminar com um deles na resposta vale pontos para
        ele: 5 por estrela, mais 5 se fizer 3 estrelas.
        {d?.cup && ` Esta semana só vale quem entrou em campo na Copa de ${d.cup.season}.`}
      </p>
      <TvStage tag="Fantasy" status={d?.squad ? `${d.total} pts na semana` : 'Escalação aberta'}>
        {!d ? (
          <p role="alert">{q.error?.message}</p>
        ) : !d.squad ? (
          <Picker cup={d.cup} onSaved={(next) => qc.setQueryData(['fantasy'], next)} />
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <section aria-labelledby="esquadrao">
              <LowerThird id="esquadrao" kicker="Escalação">
                Seu esquadrão · {d.total} pts
              </LowerThird>
              <div className="mt-4">
                <PerspectivePitch>
                  <ul className="grid grid-cols-2 gap-2 [&>li:first-child]:col-span-2 [&>li:first-child]:mx-auto [&>li:first-child]:w-1/2 [&>li:first-child]:min-w-40">
                    {d.squad.map((p) => (
                      <li
                        key={p.id}
                        className="flex flex-col rounded-xl bg-paper px-3 py-2.5 text-ink shadow-[0_3px_0_rgb(0_0_0/0.35)]"
                      >
                        <span className="font-condensed text-xl leading-tight font-black uppercase">
                          {p.name}
                        </span>
                        <span className="text-sm font-semibold">
                          {p.position ? POS[p.position] : 'Jogador'} ·{' '}
                          <span className="tabular">{p.points} pts</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </PerspectivePitch>
              </div>
              <p className="mt-4 text-sm text-white/85">
                Escalação fechada até domingo. Jogue fases para seus jogadores pontuarem.
              </p>
              <Link to="/" className={`${btnSecondary} mt-4`}>
                Jogar
              </Link>
            </section>
            <section aria-labelledby="fantasy-ranking">
              <LowerThird id="fantasy-ranking" kicker="Tabela">
                Ranking da semana
              </LowerThird>
              {d.entries.length ? (
                <ol className="mt-3 flex flex-col">
                  {d.entries.slice(0, 20).map((e) => (
                    <li
                      key={e.position}
                      className={`flex min-h-11 items-center gap-3 border-b border-white/15 px-2 last:border-b-0 ${e.isMe ? 'rounded-md border-transparent bg-cover text-ink' : ''}`}
                    >
                      <span className="font-condensed tabular w-6 text-right text-lg font-black">
                        {e.position}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold">{e.nickname}</span>
                      <span className="font-condensed tabular font-bold">{e.stars} pts</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-sm text-white/85">
                  Ninguém com apelido pontuou ainda.{' '}
                  <Link to="/conta" className="text-white underline underline-offset-4">
                    Escolha um apelido
                  </Link>{' '}
                  para aparecer aqui.
                </p>
              )}
            </section>
          </div>
        )}
      </TvStage>
    </>
  );
}
