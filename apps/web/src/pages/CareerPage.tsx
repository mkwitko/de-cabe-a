/**
 * Modo Carreira (docs/GAME_DESIGN/CAREER_MODE.md): create your footballer, train him by earning
 * stars in the minigames, play the season's matches against real opponents, take offers.
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ApiError } from '../lib/api';
import { POSITION_LABEL } from '../lib/format';
import { btnPrimary, btnSecondary, Skeleton } from '../components/ui';
import { ShareButton } from '../components/ShareButton';
import { CareerCardButton } from '../components/CareerCard';
import { ClubBadge } from '../components/ClubBadge';
import { play } from '../lib/sound';

type Attr = 'finishing' | 'passing' | 'vision' | 'defending' | 'physical';
interface Match {
  round: number;
  opponent: string;
  home: boolean;
  teamGoals: number;
  opponentGoals: number;
  playerGoals: number;
  assists: number;
  rating: number;
  headline: string;
  note: string | null;
}
interface Career {
  name: string;
  position: 'GK' | 'DF' | 'MF' | 'FW';
  overall: number;
  attributes: Record<Attr, number>;
  bank: Record<Attr, number>;
  matchCredit: number;
  creditPerMatch: number;
  totals: { matches: number; goals: number; assists: number };
  path: { season: number; club: string; tier: string }[];
  season: {
    number: number;
    club: string;
    tier: string;
    competition: string;
    round: number;
    rounds: number;
    next: string | null;
    matches: Match[];
    offers: { tier: string; clubName: string; label: string }[] | null;
  };
}

const ATTR: Record<Attr, { label: string; game: string; path: string }> = {
  finishing: { label: 'Finalização', game: 'Mais ou Menos', path: '/mais-ou-menos' },
  passing: { label: 'Passe', game: 'Football Grid', path: '/grid' },
  vision: { label: 'Visão', game: 'Career Path', path: '/career-path' },
  defending: { label: 'Defesa', game: 'Impostor', path: '/impostor' },
  physical: { label: 'Físico', game: 'Linha do tempo', path: '/linha-do-tempo' },
};
const TIER_LABEL: Record<string, string> = {
  BASE: 'Base',
  C: 'Série C',
  B: 'Série B',
  A: 'Série A',
  LIB: 'Libertadores',
  EUR: 'Europa',
  UCL: 'Champions',
};
const cost = (v: number) => (v < 70 ? 3 : v < 85 ? 4 : 5);

function useCareer() {
  return useQuery({
    queryKey: ['career'],
    queryFn: () => api<{ career: Career | null }>('/v1/career'),
  });
}
function useCareerAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ path, json }: { path: string; json?: object }) =>
      api<{ career: Career | null }>(`/v1/career${path}`, { method: 'POST', json: json ?? {} }),
    onSuccess: (data) => qc.setQueryData(['career'], data),
  });
}

function CreateCareer() {
  const opts = useQuery({
    queryKey: ['career-options'],
    queryFn: () =>
      api<{
        youth: { clubId: string; name: string }[];
        serieC: { clubId: string; name: string }[];
      }>('/v1/career/options'),
  });
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [position, setPosition] = useState<Career['position']>('FW');
  const [start, setStart] = useState<'youth' | 'serieC'>('youth');
  const [clubId, setClubId] = useState('');
  const create = useMutation({
    mutationFn: () =>
      api<{ career: Career }>('/v1/career', {
        method: 'POST',
        json: { name, position, start, clubId },
      }),
    onSuccess: (data) => {
      play('whistle');
      qc.setQueryData(['career'], data);
    },
  });
  const clubs = start === 'youth' ? opts.data?.youth : opts.data?.serieC;
  return (
    <form
      className="mx-auto flex w-full max-w-3xl flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <header>
        <h1 className="font-condensed text-5xl leading-none font-black uppercase">Modo Carreira</h1>
        <p className="mt-2 text-lg text-chalk-soft">
          Crie seu craque. Cada estrela que você ganha nos jogos vira treino, e o treino leva ele da
          base até a Europa.
        </p>
      </header>
      <label className="flex flex-col gap-1 font-semibold">
        Nome do craque
        <input
          className="min-h-12 rounded-lg border-2 border-ink/15 bg-paper px-3 text-base text-ink"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={3}
          maxLength={24}
          required
          placeholder="Ex.: Zé Craque"
        />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">Posição</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['GK', 'DF', 'MF', 'FW'] as const).map((p) => (
            <button
              type="button"
              key={p}
              aria-pressed={position === p}
              onClick={() => setPosition(p)}
              className={`font-condensed min-h-16 rounded-xl px-3 text-xl font-black uppercase ${position === p ? 'bg-cover text-ink' : 'border-2 border-dashed border-chalk-soft/60'}`}
            >
              {POSITION_LABEL[p]}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">Como começa</legend>
        <div className="grid gap-3 md:grid-cols-2">
          {(
            [
              [
                'youth',
                'Base de um clube grande',
                'Sub-20 de um clube da Série A. Brilhe e suba ao profissional, ou vá emprestado.',
              ],
              [
                'serieC',
                'Série C',
                'Profissional desde o primeiro dia, num clube pequeno. Cresça de divisão em divisão.',
              ],
            ] as const
          ).map(([k, title, text]) => (
            <button
              type="button"
              key={k}
              aria-pressed={start === k}
              onClick={() => {
                setStart(k);
                setClubId('');
              }}
              className={`flex min-h-28 flex-col gap-1 rounded-xl p-4 text-left ${start === k ? 'bg-cover text-ink' : 'border-2 border-dashed border-chalk-soft/60'}`}
            >
              <span className="font-condensed text-2xl font-black uppercase">{title}</span>
              <span className="text-sm leading-snug font-medium">{text}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1 font-semibold">
        Clube
        <select
          className="min-h-12 rounded-lg border-2 border-ink/15 bg-paper px-3 text-base text-ink"
          value={clubId}
          onChange={(e) => setClubId(e.target.value)}
          required
        >
          <option value="">{opts.isPending ? 'Carregando…' : 'Escolha o clube'}</option>
          {clubs?.map((c) => (
            <option key={c.clubId} value={c.clubId}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {create.error && (
        <p role="alert" className="rounded-lg bg-cover px-4 py-2 font-semibold text-ink">
          {(create.error as ApiError).message}
        </p>
      )}
      <button className={`${btnPrimary} self-start`} disabled={create.isPending}>
        Começar a carreira
      </button>
    </form>
  );
}

/** The player's contract: a printed sheet with ruled fields, a stamped overall and the training clauses. */
function PlayerSticker({ c }: { c: Career }) {
  return (
    <div className="sheet-in -rotate-[0.6deg] overflow-hidden rounded-[6px] bg-paper text-ink shadow-[0_18px_40px_-12px_rgb(0_0_0/0.5)]">
      <p className="font-condensed bg-ink px-4 py-2 text-sm font-bold tracking-[0.18em] text-paper uppercase">
        Contrato de atleta · Temporada {c.season.number}
      </p>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold tracking-wide text-ink/75 uppercase">
              {POSITION_LABEL[c.position]}
            </p>
            <h1 className="font-condensed border-b-2 border-ink/50 pb-1 text-4xl leading-none font-black break-words uppercase">
              {c.name}
            </h1>
            <p className="mt-2 text-sm font-semibold text-ink/80">
              {c.totals.matches} jogos · {c.totals.goals} gols · {c.totals.assists} assistências
            </p>
          </div>
          <p className="font-condensed tabular grid size-20 shrink-0 rotate-6 place-content-center rounded-full border-[3px] border-double border-[#b3261e] text-center text-[#b3261e]">
            <span className="block text-4xl leading-none font-black">{c.overall}</span>
            <span className="text-xs font-bold uppercase">geral</span>
          </p>
        </div>
        <ul className="mt-5 flex flex-col gap-3">
          {(Object.keys(ATTR) as Attr[]).map((a) => {
            const v = c.attributes[a];
            return (
              <li key={a} className="border-b border-dashed border-ink/30 pb-2">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-bold">
                    {ATTR[a].label}{' '}
                    <Link
                      to={ATTR[a].path}
                      className="font-medium text-ink/80 underline underline-offset-2"
                    >
                      treina no {ATTR[a].game}
                    </Link>
                  </span>
                  <span className="font-condensed tabular text-xl font-black">{v}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-ink/15" aria-hidden="true">
                  <div className="h-2 rounded-full bg-ink" style={{ width: `${v}%` }} />
                </div>
                <p className="mt-0.5 text-xs text-ink/75">
                  {c.bank[a]}/{cost(v)} para o próximo ponto
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** A rubber stamp: double border, condensed capitals, a little off square. */
const stamp =
  'font-condensed inline-block rounded-md border-[3px] border-double px-3 py-1 font-black tracking-wide uppercase';

function shareText(c: Career) {
  const clubs = [...new Set(c.path.map((p) => p.club))].join(' → ');
  return `Meu craque no De Cabeça: ${c.name} (${POSITION_LABEL[c.position]}, geral ${c.overall})\n${clubs}\n${c.totals.goals} gols em ${c.totals.matches} jogos\ndecabecafc.com.br/carreira`;
}

export function CareerPage() {
  const q = useCareer();
  const act = useCareerAction();
  if (q.isPending) return <Skeleton className="h-96" />;
  const c = q.data?.career;
  if (!c) return <CreateCareer />;
  const s = c.season;
  const last = s.matches.at(-1);
  const w = s.matches.filter((m) => m.teamGoals > m.opponentGoals).length;
  const d = s.matches.filter((m) => m.teamGoals === m.opponentGoals).length;
  const missing = Math.max(0, c.creditPerMatch - c.matchCredit);
  const error = act.error as ApiError | null;
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
      <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
        <PlayerSticker c={c} />
        <div className="flex flex-wrap gap-3">
          <ShareButton secondary text={shareText(c)} label="Compartilhar carreira" />
          <CareerCardButton
            text={shareText(c)}
            data={{
              name: c.name,
              position: POSITION_LABEL[c.position],
              overall: c.overall,
              attributes: (Object.keys(ATTR) as Attr[]).map((a) => ({
                label: ATTR[a].label,
                value: c.attributes[a],
              })),
              clubs: [...new Set(c.path.map((p) => p.club))],
              seasons: new Set(c.path.map((p) => p.season)).size,
              matches: c.totals.matches,
              goals: c.totals.goals,
              assists: c.totals.assists,
            }}
          />
          <button
            className="text-sm font-semibold text-chalk-soft underline underline-offset-4"
            onClick={() => {
              if (
                confirm(
                  `Aposentar ${c.name}? Ele fica no seu histórico e você começa outro craque.`,
                )
              )
                act.mutate({ path: '/retire' });
            }}
          >
            Aposentar
          </button>
        </div>
      </aside>

      <section className="flex flex-col gap-6">
        <header className="flex flex-wrap items-center gap-4">
          <ClubBadge name={s.club.replace(/^Sub-20 do /, '')} size="lg" />
          <div>
            <p className="text-sm font-bold text-chalk-soft uppercase">
              Temporada {s.number} · {TIER_LABEL[s.tier]}
            </p>
            <h2 className="font-condensed text-3xl leading-none font-black uppercase">{s.club}</h2>
            <p className="text-chalk-soft">
              {s.competition} · rodada {s.round} de {s.rounds} · {w}V {d}E{' '}
              {s.matches.length - w - d}D
            </p>
          </div>
        </header>

        {last && (
          <article
            className="relative rounded-md bg-paper p-5 text-ink shadow-[0_10px_24px_-12px_rgb(0_0_0/0.55)]"
            aria-live="polite"
          >
            <span
              className={`${stamp} absolute top-4 right-4 rotate-[-8deg] text-sm ${last.teamGoals > last.opponentGoals ? 'border-[#1d6b3a] text-[#1d6b3a]' : last.teamGoals < last.opponentGoals ? 'border-[#b3261e] text-[#b3261e]' : 'border-ink text-ink'}`}
            >
              {last.teamGoals > last.opponentGoals
                ? 'Vitória'
                : last.teamGoals < last.opponentGoals
                  ? 'Derrota'
                  : 'Empate'}
            </span>
            <p className="pr-24 text-sm font-bold text-ink/75 uppercase">
              Rodada {last.round} · {last.home ? 'em casa' : 'fora'}
            </p>
            <p className="font-condensed mt-1 text-4xl leading-none font-black uppercase">
              {s.club} {last.teamGoals} × {last.opponentGoals} {last.opponent}
            </p>
            <p className="mt-3 text-xl leading-snug font-bold">{last.headline}</p>
            <p className="mt-2 text-ink/80">
              {last.playerGoals} gols · {last.assists} assistências · nota{' '}
              <strong className="text-ink">{last.rating.toFixed(1)}</strong>
            </p>
            {last.note && <p className="mt-2 text-sm text-ink/80">{last.note}</p>}
          </article>
        )}

        {s.offers ? (
          <section className="flex flex-col gap-3">
            <h3 className="font-condensed text-3xl font-black uppercase">
              Fim de temporada: propostas
            </h3>
            {s.offers.length === 0 && (
              <p className="text-chalk-soft">
                Nenhuma proposta desta vez. Treine e brilhe na próxima.
              </p>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              {s.offers.map((o, i) => (
                <button
                  key={i}
                  className="flex min-h-24 flex-col items-start gap-1 rounded-xl bg-paper p-4 text-left text-ink shadow-[0_10px_24px_-10px_rgb(0_0_0/0.5)] hover:-translate-y-0.5"
                  onClick={() => {
                    play('win');
                    act.mutate({ path: '/offer', json: { index: i } });
                  }}
                >
                  <span className="text-xs font-bold uppercase opacity-70">
                    {TIER_LABEL[o.tier]}
                  </span>
                  <span className="font-condensed text-2xl font-black uppercase">{o.label}</span>
                </button>
              ))}
              <button
                className="flex min-h-24 flex-col items-start justify-center gap-1 rounded-xl border-2 border-dashed border-chalk-soft/60 p-4 text-left"
                onClick={() => act.mutate({ path: '/offer', json: { index: -1 } })}
              >
                <span className="font-condensed text-2xl font-black uppercase">
                  Ficar no {s.club}
                </span>
                <span className="text-sm">Mais uma temporada no clube.</span>
              </button>
            </div>
          </section>
        ) : (
          <section className="flex flex-col gap-3 rounded-2xl border border-chalk/15 bg-chalk/[0.05] p-5">
            <p className="text-sm font-bold text-chalk-soft uppercase">
              Próxima partida · rodada {s.round + 1}
            </p>
            <p className="font-condensed text-3xl leading-none font-black uppercase">
              {s.club} × {s.next}
            </p>
            {missing > 0 ? (
              <p>
                Faltam <strong>{missing}</strong> {missing === 1 ? 'estrela' : 'estrelas'} de
                treino. Jogue uma fase em qualquer jogo:{' '}
                {(Object.keys(ATTR) as Attr[]).map((a, i) => (
                  <span key={a}>
                    {i ? ', ' : ''}
                    <Link to={ATTR[a].path} className="underline underline-offset-2">
                      {ATTR[a].game}
                    </Link>
                  </span>
                ))}
                .
              </p>
            ) : (
              <button
                className={`${btnPrimary} self-start`}
                disabled={act.isPending}
                onClick={() =>
                  act.mutate(
                    { path: '/play' },
                    {
                      onSuccess: (r) => {
                        const m = r.career?.season.matches.at(-1);
                        play(
                          m && m.teamGoals > m.opponentGoals
                            ? 'correct'
                            : m && m.teamGoals < m.opponentGoals
                              ? 'wrong'
                              : 'tap',
                        );
                      },
                    },
                  )
                }
              >
                Jogar a partida
              </button>
            )}
            <p className="text-sm text-chalk-soft">
              Cada estrela dos jogos vira treino (até 15 por dia). Jogue 3 jogos diferentes no dia
              para um treino extra.
            </p>
          </section>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-cover px-4 py-2 font-semibold text-ink">
            {error.message}
          </p>
        )}

        <section>
          <h3 className="font-condensed text-2xl font-black uppercase">Trajetória</h3>
          <ol className="mt-3 flex flex-wrap gap-3">
            {c.path.map((p, i) => (
              <li
                key={p.season}
                className={`${stamp} border-chalk bg-chalk/[0.06] text-sm text-chalk ${i % 2 ? 'rotate-2' : '-rotate-2'}`}
              >
                T{p.season} · {p.club}
              </li>
            ))}
          </ol>
        </section>

        {s.matches.length > 1 && (
          <section>
            <h3 className="font-condensed text-2xl font-black uppercase">Jogos da temporada</h3>
            <ul className="mt-2 flex flex-col">
              {[...s.matches].reverse().map((m) => (
                <li
                  key={m.round}
                  className="flex items-baseline justify-between gap-3 border-b border-chalk/10 py-2 text-sm"
                >
                  <span>
                    R{m.round} · {m.home ? '' : '@ '}
                    {m.opponent}{' '}
                    <strong>
                      {m.teamGoals}×{m.opponentGoals}
                    </strong>
                  </span>
                  <span className="text-chalk-soft">
                    {m.playerGoals ? `${m.playerGoals} gol${m.playerGoals > 1 ? 's' : ''} · ` : ''}
                    nota {m.rating.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <Link to="/" className={`${btnSecondary} self-start`}>
          Voltar aos jogos
        </Link>
      </section>
    </div>
  );
}
