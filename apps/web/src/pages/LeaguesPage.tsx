/**
 * Ligas de amigos (GROWTH_PLAN.md 2.1): /ligas lists the player's leagues and creates one;
 * /liga/:code is the invite link: join, weekly ranking of stars, invite, leave, report. No chat.
 * Liga Pro (the creator's subscription): the crest in the owner's colour and lettering, 100 places,
 * the podium of past weeks and the trophy shelf.
 */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  LeagueColor,
  LeagueNameStyle,
  LeagueResponse,
  LeagueStyle,
  LeaguesResponse,
} from '@decabeca/contracts';
import { api, type ApiError } from '../lib/api';
import { ShareButton } from '../components/ShareButton';
import { suggestNickname } from '../lib/nickname';
import { btnPrimary, btnSecondary, GameHeader, Notice, Skeleton } from '../components/ui';
import { StarIcon } from '../components/Stars';
import { signInHref } from '../components/SignInButton';
import { useMe } from '../lib/game';
import { isPageLaunched } from '../lib/launch';
import { brl, checkout } from '../lib/billing';
import { CATALOG } from '@decabeca/contracts';
import { TrophyIcon } from '../components/Icons';

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
        {take.error && <p className="text-gold">{take.error.message}</p>}
      </div>
    );
  return error ? (
    <p role="alert" className="text-sm font-semibold text-gold">
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
                  className="flex min-h-14 items-center justify-between gap-3 rounded-lg bg-paper px-4 py-3 text-ink shadow-[0_6px_14px_-8px_rgb(0_0_0/0.55)] transition-transform duration-150 ease-out-expo hover:-translate-y-0.5"
                >
                  <span className="font-condensed truncate text-xl font-extrabold uppercase">
                    {l.name}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-ink/70">
                    {l.members} pessoas
                  </span>
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
  const me = useMe();
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
  const guest = !me.data?.account;
  const invite = `Entra na minha liga "${l.name}" no De Cabeça F.C.: ranking semanal de estrelas entre amigos.\ndecabecafc.com.br/liga/${l.code}?ref=invite`;
  return (
    <>
      <GameHeader title={l.name} />
      {l.pro && <LeagueCrest name={l.name} style={l.style ?? DEFAULT_STYLE} />}
      {/* the code as a ticket: stub with the people count, perforation, big code */}
      <div className="mt-4 flex w-full max-w-md items-stretch overflow-hidden rounded-lg bg-cover text-ink shadow-[0_10px_22px_-10px_rgb(0_0_0/0.6)]">
        <p className="flex flex-1 flex-col justify-center px-4 py-3">
          <span className="font-condensed text-sm font-extrabold tracking-[0.2em] uppercase">
            Código
          </span>
          <span className="font-condensed tabular text-4xl leading-none font-black tracking-[0.15em]">
            {l.code}
          </span>
        </p>
        <p className="font-condensed tabular flex shrink-0 flex-col items-center justify-center border-l-2 border-dashed border-ink/50 px-4 text-lg leading-tight font-black">
          {l.members}/{l.maxMembers}
          <span className="text-sm font-bold">pessoas</span>
        </p>
      </div>

      {!l.isMember ? (
        <div className="mt-6 flex max-w-xl flex-col items-start gap-3 rounded-xl border-2 border-dashed border-chalk-soft/50 bg-chalk/[0.06] p-5">
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
            {l.isOwner && !l.pro && !guest && isPageLaunched('clube') && <LigaPro code={l.code} />}
          </div>
          <section aria-labelledby="semana" className="mt-8">
            <h2 id="semana" className="font-condensed text-2xl font-extrabold uppercase">
              Ranking da semana
            </h2>
            <p className="text-sm text-chalk-soft">
              Estrelas desde segunda, 00h de Brasília. Só quem tem conta aparece.
            </p>
            {guest && (
              <p className="mt-2 text-sm">
                <Link to={signInHref(`/liga/${l.code}`)} className="underline underline-offset-4">
                  Entre na sua conta
                </Link>{' '}
                para somar suas estrelas com a turma.
              </p>
            )}
            <ol className="mt-4 flex flex-col overflow-hidden rounded-lg bg-paper text-ink shadow-[0_10px_22px_-12px_rgb(0_0_0/0.55)]">
              {l.ranking.map((r) => (
                <li
                  key={r.position}
                  className={`flex min-h-12 items-center gap-4 border-b border-ink/15 px-4 py-2 last:border-b-0 ${r.isMe ? 'bg-cover' : ''}`}
                >
                  <span className="font-condensed tabular w-8 text-xl font-black">
                    {r.position}º
                  </span>
                  <span className="min-w-0 flex-1 font-semibold break-words">{r.nickname}</span>
                  <span className="font-condensed tabular text-xl font-black">
                    <StarIcon className="inline size-[0.85em] align-[-0.08em]" /> {r.stars}
                  </span>
                </li>
              ))}
            </ol>
            {l.members < 4 && (
              <p className="mt-3 text-sm text-chalk-soft">
                Liga boa tem pelo menos 4 pessoas. Chame mais gente.
              </p>
            )}
          </section>
          {l.pro && <ProHistory l={l} />}
          {l.pro && l.isOwner && <CrestEditor l={l} onSaved={refresh} />}
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

/** Liga Pro (closed with the Clube page): the league's owner subscribes; the API checks ownership. */
function LigaPro({ code }: { code: string }) {
  const buy = useMutation<void, ApiError>({ mutationFn: () => checkout('liga_pro', code) });
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className={btnSecondary}
        disabled={buy.isPending}
        onClick={() => buy.mutate()}
      >
        Liga Pro · {brl(CATALOG.liga_pro.amount)}/mês
      </button>
      <p className="max-w-[44ch] text-sm text-chalk-soft">
        100 pessoas, escudo personalizado, histórico das semanas e estante de troféus.
      </p>
      {buy.error && (
        <p role="alert" className="text-sm text-chalk-soft">
          {buy.error.message}
        </p>
      )}
    </div>
  );
}

const DEFAULT_STYLE: LeagueStyle = { color: 'verde', nameStyle: 'bloco' };
const CREST: Record<LeagueColor, { name: string; fill: string }> = {
  verde: { name: 'Verde', fill: '#1f7a45' },
  azul: { name: 'Azul', fill: '#1f4fa8' },
  vermelho: { name: 'Vermelho', fill: '#b3262e' },
  preto: { name: 'Preto', fill: '#1b1d1f' },
  vinho: { name: 'Vinho', fill: '#6b1f35' },
  dourado: { name: 'Dourado', fill: '#b8860b' },
};
const LETTERING: Record<LeagueNameStyle, { name: string; className: string }> = {
  bloco: { name: 'Bloco', className: 'text-chalk' },
  contorno: {
    name: 'Contorno',
    className: 'text-transparent [-webkit-text-stroke:2px_var(--color-cover)]',
  },
  dourado: {
    name: 'Dourado',
    className: 'text-gold [text-shadow:0_-1px_0_#0007,0_2px_0_#5a4108,0_3px_8px_rgb(0_0_0/0.5)]',
  },
};
/** Up to three initials: "Resenha do Bar" → RDB. */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/** Liga Pro: a shield in the league's colour with its initials, the name in its lettering. */
function LeagueCrest({ name, style }: { name: string; style: LeagueStyle }) {
  return (
    <div className="mt-4 flex items-center gap-4">
      <svg
        viewBox="0 0 60 70"
        aria-hidden="true"
        className="h-20 w-auto shrink-0 drop-shadow-[0_8px_10px_rgb(0_0_0/0.55)]"
      >
        <path
          d="M4 6h52v28c0 16-12 26-26 32C16 60 4 50 4 34z"
          fill={CREST[style.color].fill}
          stroke="var(--color-cover)"
          strokeWidth="2.5"
        />
        <path d="M9 11h42v23c0 13-10 21-21 26C19 55 9 47 9 34z" fill="none" stroke="#fff4" />
        <text
          x="30"
          y="40"
          textAnchor="middle"
          fill="var(--color-cover)"
          className="font-condensed"
          fontSize="17"
          fontWeight="900"
        >
          {initials(name)}
        </text>
      </svg>
      <div className="min-w-0">
        <p
          className={`font-condensed text-[clamp(1.75rem,7vw,3rem)] leading-[0.9] font-black break-words uppercase ${LETTERING[style.nameStyle].className}`}
        >
          {name}
        </p>
        <p className="mt-1 text-sm font-bold tracking-[0.18em] text-cover uppercase">Liga Pro</p>
      </div>
    </div>
  );
}

const weekLabel = (iso: string) =>
  `Semana de ${new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' })}`;

/** Liga Pro: the trophy shelf, then the podium of each closed week. */
function ProHistory({ l }: { l: LeagueResponse }) {
  return (
    <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
      <section aria-labelledby="trofeus">
        <h2 id="trofeus" className="font-condensed text-2xl font-extrabold uppercase">
          Estante de troféus
        </h2>
        <p className="text-sm text-chalk-soft">Semanas vencidas nas últimas 8.</p>
        {l.trophies.length ? (
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-5 rounded-xl border-4 border-chalk-soft/30 bg-pitch-deep p-4 shadow-[inset_0_0_30px_rgb(0_0_0/0.45)]">
            {l.trophies.map((t) => (
              <li key={t.nickname} className="flex flex-col items-center gap-1">
                <span className="flex items-end gap-0.5 text-cover" aria-hidden="true">
                  {Array.from({ length: Math.min(t.wins, 4) }, (_, i) => (
                    <TrophyIcon key={i} className={i ? 'size-6' : 'size-9'} />
                  ))}
                </span>
                <span className="max-w-32 truncate text-sm font-bold">{t.nickname}</span>
                <span className="font-condensed tabular text-sm font-extrabold text-chalk-soft">
                  {t.wins} {t.wins === 1 ? 'semana' : 'semanas'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl border-2 border-dashed border-chalk-soft/40 p-4 text-chalk-soft">
            A estante enche quando a primeira semana fechar.
          </p>
        )}
      </section>
      <section aria-labelledby="historico">
        <h2 id="historico" className="font-condensed text-2xl font-extrabold uppercase">
          Semanas anteriores
        </h2>
        <p className="text-sm text-chalk-soft">O pódio de cada semana fechada.</p>
        {l.history.length ? (
          <ol className="mt-4 flex flex-col gap-3">
            {l.history.map((w) => (
              <li
                key={w.weekStart}
                className="rounded-lg bg-paper px-4 py-3 text-ink shadow-[0_10px_22px_-12px_rgb(0_0_0/0.55)]"
              >
                <p className="font-condensed text-sm font-extrabold tracking-[0.12em] uppercase">
                  {weekLabel(w.weekStart)}
                </p>
                <ol className="mt-1 flex flex-col">
                  {w.podium.map((r) => (
                    <li key={r.position} className="flex items-center gap-3">
                      <span className="font-condensed tabular w-7 font-black">{r.position}º</span>
                      <span className="min-w-0 flex-1 truncate font-semibold">{r.nickname}</span>
                      <span className="font-condensed tabular font-black">
                        <StarIcon className="inline size-[0.85em] align-[-0.08em]" /> {r.stars}
                      </span>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 rounded-xl border-2 border-dashed border-chalk-soft/40 p-4 text-chalk-soft">
            Nenhuma semana fechada ainda com estrelas na liga.
          </p>
        )}
      </section>
    </div>
  );
}

/** Liga Pro, the creator only: colour and lettering of the crest, saved at once. */
function CrestEditor({ l, onSaved }: { l: LeagueResponse; onSaved: (l: LeagueResponse) => void }) {
  const style = l.style ?? DEFAULT_STYLE;
  const save = useMutation<LeagueResponse, ApiError, LeagueStyle>({
    mutationFn: (json) => api(`/v1/leagues/${l.code}/style`, { method: 'PATCH', json }),
    onSuccess: onSaved,
  });
  const pill = (on: boolean) =>
    `flex min-h-11 items-center gap-2 rounded-full border-2 py-1 pr-4 pl-1.5 text-sm font-bold transition-colors duration-150 ${on ? 'border-cover bg-cover text-ink' : 'border-chalk/15 hover:border-chalk/40'}`;
  return (
    <section
      aria-labelledby="escudo"
      className="mt-10 flex flex-col gap-4 rounded-xl border-2 border-chalk/10 bg-pitch-deep/85 p-5"
    >
      <h2 id="escudo" className="font-condensed text-2xl font-extrabold uppercase">
        Escudo da liga
      </h2>
      <div role="radiogroup" aria-label="Cor do escudo" className="flex flex-wrap gap-2">
        {(Object.keys(CREST) as LeagueColor[]).map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={style.color === c}
            disabled={save.isPending}
            onClick={() => save.mutate({ ...style, color: c })}
            className={pill(style.color === c)}
          >
            <span
              aria-hidden="true"
              className="size-7 rounded-full shadow-[inset_0_0_0_2px_rgb(255_255_255/0.4)]"
              style={{ background: CREST[c].fill }}
            />
            {CREST[c].name}
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label="Letras do nome" className="flex flex-wrap gap-2">
        {(Object.keys(LETTERING) as LeagueNameStyle[]).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={style.nameStyle === n}
            disabled={save.isPending}
            onClick={() => save.mutate({ ...style, nameStyle: n })}
            className={`${pill(style.nameStyle === n)} pl-4`}
          >
            {LETTERING[n].name}
          </button>
        ))}
      </div>
      {save.error && (
        <p role="alert" className="text-sm font-semibold">
          {save.error.message}
        </p>
      )}
    </section>
  );
}
