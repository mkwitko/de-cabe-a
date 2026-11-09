/**
 * Ligas de amigos (GROWTH_PLAN.md 2.1): /ligas lists the player's leagues and creates one;
 * /liga/:code is the invite link: join, weekly ranking of stars, invite, leave, report. No chat.
 */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LeagueResponse, LeaguesResponse } from '@decabeca/contracts';
import { api, type ApiError } from '../lib/api';
import { ShareButton } from '../components/ShareButton';
import { suggestNickname } from '../lib/nickname';
import { btnPrimary, btnSecondary, GameHeader, Notice, Skeleton } from '../components/ui';

/** Errors of create/join; without a nickname, one tap takes a suggested one and tries again. */
function NeedNickname({ error, retry }: { error: ApiError | null; retry: () => void }) {
  const qc = useQueryClient();
  const [suggestion] = useState(suggestNickname);
  const take = useMutation<unknown, ApiError>({
    mutationFn: () => api('/v1/me', { method: 'PATCH', json: { nickname: suggestion } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me'] });
      retry();
    },
  });
  if (error?.code === 'NICKNAME_REQUIRED')
    return (
      <div role="alert" className="flex flex-col items-start gap-2 text-sm font-semibold">
        <p>Para entrar em ligas você precisa de um apelido: é o nome que seus amigos veem.</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={btnSecondary}
            onClick={() => take.mutate()}
            disabled={take.isPending}
          >
            Usar “{suggestion}”
          </button>
          <Link
            to="/conta"
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Escolher o meu
          </Link>
        </div>
        {take.error && <p className="text-cover">{take.error.message}</p>}
      </div>
    );
  return error ? (
    <p role="alert" className="text-sm font-semibold text-cover">
      {error.message}
    </p>
  ) : null;
}

export function LeaguesPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const { data } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => api<LeaguesResponse>('/v1/leagues'),
  });
  const create = useMutation<LeagueResponse, ApiError>({
    mutationFn: () => api('/v1/leagues', { method: 'POST', json: { name } }),
    onSuccess: (l) => {
      void qc.invalidateQueries({ queryKey: ['leagues'] });
      void nav(`/liga/${l.code}`);
    },
  });
  function onCreate(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }
  function onJoin(e: FormEvent) {
    e.preventDefault();
    if (code.trim()) void nav(`/liga/${code.trim().toUpperCase()}`);
  }
  return (
    <>
      <GameHeader title="Ligas" />
      <p className="mt-2 max-w-[48ch] text-chalk-soft">
        Ranking semanal de estrelas só entre amigos. Até 20 pessoas por liga, entrada por link.
      </p>

      <section aria-labelledby="minhas" className="mt-8">
        <h2 id="minhas" className="font-condensed text-2xl font-extrabold uppercase">
          Minhas ligas
        </h2>
        {!data ? (
          <Skeleton className="mt-4 h-20" />
        ) : data.leagues.length === 0 ? (
          <p className="mt-3 text-chalk-soft">Você ainda não está em nenhuma liga.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.leagues.map((l) => (
              <li key={l.code}>
                <Link
                  to={`/liga/${l.code}`}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-chalk/15 bg-chalk/[0.06] px-4 py-3 hover:bg-chalk/[0.09]"
                >
                  <span className="font-condensed truncate text-xl font-extrabold uppercase">
                    {l.name}
                  </span>
                  <span className="shrink-0 text-sm text-chalk-soft">{l.members} pessoas</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <form onSubmit={onCreate} className="flex flex-col gap-3">
          <h2 className="font-condensed text-2xl font-extrabold uppercase">Criar liga</h2>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Nome da liga
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={3}
              maxLength={40}
              required
              placeholder="Pelada de quinta"
              className="min-h-11 rounded-lg border-2 border-chalk-soft/50 bg-transparent px-3 text-base font-normal"
            />
          </label>
          <NeedNickname error={create.error} retry={() => create.mutate()} />
          <button type="submit" className={`${btnPrimary} self-start`} disabled={create.isPending}>
            Criar e convidar
          </button>
        </form>
        <form onSubmit={onJoin} className="flex flex-col gap-3">
          <h2 className="font-condensed text-2xl font-extrabold uppercase">Tenho um código</h2>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Código de 6 letras
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              pattern="[A-Za-z0-9]{6}"
              maxLength={6}
              required
              autoCapitalize="characters"
              className="tabular min-h-11 rounded-lg border-2 border-chalk-soft/50 bg-transparent px-3 text-base font-normal tracking-[0.2em] uppercase"
            />
          </label>
          <button type="submit" className={`${btnSecondary} self-start`}>
            Ver liga
          </button>
        </form>
      </div>
    </>
  );
}

export function LeaguePage() {
  const code = (useParams().code ?? '').toUpperCase();
  const nav = useNavigate();
  const qc = useQueryClient();
  const key = ['league', code];
  const q = useQuery<LeagueResponse, ApiError>({
    queryKey: key,
    queryFn: () => api(`/v1/leagues/${code}`),
    retry: false,
  });
  const refresh = (l: LeagueResponse) => {
    qc.setQueryData(key, l);
    void qc.invalidateQueries({ queryKey: ['leagues'] });
  };
  const join = useMutation<LeagueResponse, ApiError>({
    mutationFn: () => api(`/v1/leagues/${code}/join`, { method: 'POST' }),
    onSuccess: refresh,
  });
  const leave = useMutation<void, ApiError>({
    mutationFn: () => api(`/v1/leagues/${code}/leave`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['leagues'] });
      void nav('/ligas');
    },
  });
  const [reported, setReported] = useState(false);
  const report = useMutation<void, ApiError>({
    mutationFn: () =>
      api(`/v1/leagues/${code}/report`, {
        method: 'POST',
        json: { reason: 'Nome da liga inadequado' },
      }),
    onSuccess: () => setReported(true),
  });

  if (q.isPending)
    return (
      <>
        <GameHeader title="Liga" />
        <Skeleton className="mt-6 h-80" />
      </>
    );
  if (!q.data)
    return (
      <>
        <GameHeader title="Liga" />
        <div className="mt-6">
          <Notice
            title="Liga não encontrada"
            action={
              <Link to="/ligas" className={btnPrimary}>
                Ver ligas
              </Link>
            }
          >
            {q.error?.message}
          </Notice>
        </div>
      </>
    );

  const l = q.data;
  const invite = `Entra na minha liga "${l.name}" no De Cabeça: ranking semanal de estrelas entre amigos.\ndecabecafc.com.br/liga/${l.code}`;
  return (
    <>
      <GameHeader title={l.name} />
      <p className="mt-2 text-chalk-soft">
        Código <span className="tabular font-bold tracking-[0.15em] text-chalk">{l.code}</span> ·{' '}
        {l.members}/{l.maxMembers} pessoas
      </p>

      {!l.isMember ? (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-xl border border-chalk/15 bg-chalk/[0.06] p-5">
          <p className="max-w-[44ch]">
            Entre para ver o ranking da semana e somar suas estrelas com a turma.
          </p>
          <NeedNickname error={join.error} retry={() => join.mutate()} />
          <button
            type="button"
            className={btnPrimary}
            onClick={() => join.mutate()}
            disabled={join.isPending}
          >
            Entrar na liga
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-3">
            <ShareButton text={invite} label="Convidar amigos" />
          </div>
          <section aria-labelledby="semana" className="mt-8">
            <h2 id="semana" className="font-condensed text-2xl font-extrabold uppercase">
              Ranking da semana
            </h2>
            <p className="text-sm text-chalk-soft">Estrelas desde segunda, 00h de Brasília.</p>
            <ol className="mt-4 flex flex-col gap-2">
              {l.ranking.map((r) => (
                <li
                  key={r.position}
                  className={`flex min-h-12 items-center gap-4 rounded-lg px-4 py-2 ${r.isMe ? 'bg-cover text-ink' : 'bg-chalk/[0.06]'}`}
                >
                  <span className="font-condensed tabular w-8 text-xl font-black">
                    {r.position}º
                  </span>
                  <span className="min-w-0 flex-1 font-semibold break-words">{r.nickname}</span>
                  <span className="font-condensed tabular text-xl font-black">★ {r.stars}</span>
                </li>
              ))}
            </ol>
            {l.members < 4 && (
              <p className="mt-3 text-sm text-chalk-soft">
                Liga boa tem pelo menos 4 pessoas. Chame mais gente.
              </p>
            )}
          </section>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold">
            <button
              type="button"
              className="min-h-11 underline underline-offset-4"
              onClick={() => {
                if (confirm('Sair da liga? Você pode voltar pelo link.')) leave.mutate();
              }}
            >
              Sair da liga
            </button>
            <button
              type="button"
              className="min-h-11 text-chalk-soft underline underline-offset-4"
              disabled={reported || report.isPending}
              onClick={() => report.mutate()}
            >
              {reported ? 'Denúncia enviada' : 'Denunciar nome da liga'}
            </button>
          </div>
        </>
      )}
    </>
  );
}
