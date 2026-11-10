/**
 * Oficina De Cabeça (GROWTH_PLAN.md 3.1–3.5): Grids built by players. /oficina lists them
 * (Recomendados, Populares, Novos) with live events on top; /oficina/criar builds one;
 * /oficina/:id plays one, then votes; /criador/:nickname is a creator's page with the audience
 * ranking; /eventos/:slug is a dated event. Oficina levels never count for stars or titles.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CommunityLevelView,
  CreatorResponse,
  EventResponse,
  EventsResponse,
  OficinaCriterion,
} from '@decabeca/contracts';
import { api, type ApiError } from '../lib/api';
import { GridPage } from '../games/grid/GridPage';
import { ShareButton } from '../components/ShareButton';
import { btnPrimary, btnSecondary, GameHeader, Notice, Skeleton } from '../components/ui';
import { StarIcon } from '../components/Stars';

type Level = CommunityLevelView;
const STATE: Record<Level['state'], string> = {
  review: 'Em revisão',
  published: 'Publicado',
  featured: 'Destaque',
  flagged: 'Sob revisão',
  archived: 'Arquivado',
};
const pct = (x: number) => `${Math.round(x * 100)}%`;

function Sponsor({ name }: { name: string | null }) {
  return name ? <p className="text-sm font-semibold">Apresentado por {name}</p> : null;
}

function LevelCard({ l, showState = false }: { l: Level; showState?: boolean }) {
  const playable = l.state === 'published' || l.state === 'featured' || l.state === 'flagged';
  const body = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className="font-condensed text-2xl leading-tight font-black uppercase">
          {l.title}
        </span>
        {(showState || l.state === 'featured') && (
          <span className="shrink-0 rounded-full bg-ink/10 px-2.5 py-1 text-xs font-bold">
            {STATE[l.state]}
          </span>
        )}
      </span>
      <span className="text-sm font-semibold">por {l.author}</span>
      {l.sponsor && <span className="text-sm">Apresentado por {l.sponsor}</span>}
      <span className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-2 text-sm">
        <span>{l.plays} jogaram</span>
        <span>{pct(l.solved)} pontuaram</span>
        <span>
          {l.up} curtiram{l.down ? ` · ${l.down} não` : ''}
        </span>
      </span>
    </>
  );
  const cls =
    'flex min-h-36 flex-col gap-1 rounded-2xl bg-paper p-4 text-ink shadow-[0_10px_24px_-14px_rgb(0_0_0/0.55)]';
  return playable ? (
    <Link
      to={`/oficina/${l.id}`}
      className={`${cls} transition-transform duration-150 ease-out-expo hover:-translate-y-0.5`}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function LiveEvents() {
  const { data } = useQuery({
    queryKey: ['eventos'],
    queryFn: () => api<EventsResponse>('/v1/eventos'),
  });
  const live = data?.events.filter((e) => e.status !== 'over') ?? [];
  if (!live.length) return null;
  return (
    <section aria-labelledby="eventos" className="mt-8">
      <h2 id="eventos" className="font-condensed text-2xl font-extrabold uppercase">
        Eventos
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {live.map((e) => (
          <li key={e.slug}>
            <Link
              to={`/eventos/${e.slug}`}
              className="flex flex-col gap-1 rounded-2xl bg-cover p-4 text-ink"
            >
              <span className="font-condensed text-2xl font-black uppercase">{e.title}</span>
              <span className="text-sm font-semibold">
                {e.status === 'live' ? 'No ar até ' : 'Começa '}
                {new Date(e.status === 'live' ? e.endsAt : e.startsAt).toLocaleString('pt-BR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
              <Sponsor name={e.sponsor} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OficinaPage() {
  const [list, setList] = useState<'recomendados' | 'populares' | 'novos'>('recomendados');
  const q = useQuery({
    queryKey: ['oficina', list],
    queryFn: () => api<{ levels: Level[] }>(`/v1/oficina?list=${list}`),
  });
  const mine = useQuery({
    queryKey: ['oficina', 'mine'],
    queryFn: () => api<{ levels: Level[] }>('/v1/oficina/mine'),
  });
  return (
    <>
      <GameHeader title="Oficina" />
      <p className="mt-2 max-w-[62ch] text-chalk-soft">
        Grids montados por quem joga. Monte o seu com clubes, seleções e posições: o servidor
        confere se cada casa tem pelo menos 8 respostas certas e um editor aprova antes de ir ao ar.
        Desafios da Oficina não valem estrelas no ranking geral.
      </p>
      <Link to="/oficina/criar" className={`${btnPrimary} mt-5`}>
        Criar um Grid
      </Link>
      <LiveEvents />
      <section aria-labelledby="lista" className="mt-10">
        <h2 id="lista" className="sr-only">
          Desafios
        </h2>
        <div role="tablist" aria-label="Ordem" className="flex flex-wrap gap-2">
          {(['recomendados', 'populares', 'novos'] as const).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={list === k}
              onClick={() => setList(k)}
              className={`min-h-11 rounded-full px-4 font-semibold capitalize ${list === k ? 'bg-cover text-ink' : 'border border-chalk/25'}`}
            >
              {k}
            </button>
          ))}
        </div>
        {!q.data ? (
          <Skeleton className="mt-4 h-40" />
        ) : q.data.levels.length ? (
          <ul className="pin-board mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {q.data.levels.map((l) => (
              <li key={l.id}>
                <LevelCard l={l} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-chalk-soft">Nenhum desafio publicado ainda. Seja o primeiro.</p>
        )}
      </section>
      {!!mine.data?.levels.length && (
        <section aria-labelledby="meus" className="mt-10">
          <h2 id="meus" className="font-condensed text-2xl font-extrabold uppercase">
            Meus desafios
          </h2>
          <ul className="pin-board mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mine.data.levels.map((l) => (
              <li key={l.id}>
                <LevelCard l={l} showState />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

const REASON: [RegExp, string][] = [
  [/^CELL_(\d)_TOO_SMALL$/, 'A casa $1 tem menos de 8 jogadores certos na nossa base.'],
  [/^SAME_CRITERION$|^DUPLICATE_ON_AXIS$/, 'Tem critério repetido.'],
  [/^POSITION_X_POSITION$/, 'Posição cruzando com posição não dá.'],
  [/^AXIS_WITHOUT_CLUB$/, 'Cada lado precisa de pelo menos um clube.'],
  [
    /^CLUB_IN_OWN_COUNTRY$|^NATIONALITY_IN_OWN_COUNTRY$/,
    'Algum cruzamento é óbvio demais (clube ou seleção do próprio país).',
  ],
];
const reasonText = (r: string) => {
  for (const [re, text] of REASON) if (re.test(r)) return r.replace(re, text);
  return 'Combinação inválida.';
};
const cellLabel = (i: number) => `${Math.floor(i / 3) + 1}ª linha × ${(i % 3) + 1}ª coluna`;

type Kind = OficinaCriterion['type'];
function CriterionField({
  label,
  value,
  onChange,
  clubs,
  countries,
}: {
  label: string;
  value: OficinaCriterion | null;
  onChange: (c: OficinaCriterion | null) => void;
  clubs: { id: string; name: string }[];
  countries: { id: string; name: string }[];
}) {
  const [kind, setKind] = useState<Kind>(value?.type ?? 'club');
  const options =
    kind === 'club'
      ? clubs
      : kind === 'position'
        ? [
            { id: 'GK', name: 'Goleiro' },
            { id: 'DF', name: 'Defensor' },
            { id: 'MF', name: 'Meio-campista' },
            { id: 'FW', name: 'Atacante' },
          ]
        : countries;
  const current =
    value?.type === 'club'
      ? value.clubId
      : value?.type === 'position'
        ? value.positionGroup
        : (value?.countryId ?? '');
  const make = (k: Kind, id: string): OficinaCriterion | null =>
    !id
      ? null
      : k === 'club'
        ? { type: 'club', clubId: id }
        : k === 'position'
          ? { type: 'position', positionGroup: id as 'GK' }
          : { type: k, countryId: id };
  const select =
    'min-h-11 w-full rounded-lg border-2 border-ink/40 bg-paper px-2 text-base text-ink';
  return (
    <fieldset className="flex flex-col gap-1.5 rounded-xl border border-ink/25 p-3">
      <legend className="px-1 text-sm font-semibold">{label}</legend>
      <select
        aria-label={`${label}: tipo`}
        className={select}
        value={kind}
        onChange={(e) => {
          setKind(e.target.value as Kind);
          onChange(null);
        }}
      >
        <option value="club">Jogou no clube</option>
        <option value="nationality">Seleção (nacionalidade)</option>
        <option value="played_in_country">Jogou no país</option>
        <option value="position">Posição</option>
      </select>
      <select
        aria-label={`${label}: valor`}
        className={select}
        value={value?.type === kind ? current : ''}
        onChange={(e) => onChange(make(kind, e.target.value))}
      >
        <option value="">Escolha…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </fieldset>
  );
}

export function OficinaCreatePage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const criteria = useQuery({
    queryKey: ['oficina', 'criteria'],
    queryFn: () =>
      api<{ clubs: { id: string; name: string }[]; countries: { id: string; name: string }[] }>(
        '/v1/oficina/criteria',
      ),
    staleTime: Infinity,
  });
  const [title, setTitle] = useState('');
  const [rows, setRows] = useState<(OficinaCriterion | null)[]>([null, null, null]);
  const [cols, setCols] = useState<(OficinaCriterion | null)[]>([null, null, null]);
  const create = useMutation<Level, ApiError>({
    mutationFn: () => api('/v1/oficina', { method: 'POST', json: { title, rows, cols } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['oficina'] });
      void nav('/oficina');
    },
  });
  const reasons = (create.error?.details?.reasons as string[] | undefined) ?? [];
  const ready = title.trim().length >= 3 && [...rows, ...cols].every(Boolean);
  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }
  if (!criteria.data) return <Skeleton className="h-96" />;
  const set = (axis: 'row' | 'col', i: number) => (c: OficinaCriterion | null) =>
    (axis === 'row' ? setRows : setCols)((xs) => xs.map((x, j) => (j === i ? c : x)));
  return (
    <>
      <GameHeader title="Criar um Grid" />
      <p className="mt-2 max-w-[60ch] text-chalk-soft">
        Escolha 3 critérios para as linhas e 3 para as colunas, com pelo menos um clube em cada
        lado. Cada casa precisa de pelo menos 8 jogadores certos na nossa base; o servidor confere
        na hora e um editor revisa antes de publicar.
      </p>
      <div className="clipboard mt-6">
        <form onSubmit={submit} className="paper-sheet flex flex-col gap-6 text-ink">
          <label className="flex max-w-md flex-col gap-1 text-sm font-semibold">
            Nome do desafio
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              minLength={3}
              maxLength={60}
              required
              placeholder="Os gringos do Brasileirão"
              className="min-h-11 rounded-lg border-2 border-ink/40 bg-transparent px-3 text-base font-normal"
            />
          </label>
          <div className="grid gap-6 md:grid-cols-2">
            {(['row', 'col'] as const).map((axis) => (
              <div key={axis} className="flex flex-col gap-3">
                <h2 className="font-condensed text-xl font-extrabold uppercase">
                  {axis === 'row' ? 'Linhas' : 'Colunas'}
                </h2>
                {[0, 1, 2].map((i) => (
                  <CriterionField
                    key={i}
                    label={`${axis === 'row' ? 'Linha' : 'Coluna'} ${i + 1}`}
                    value={(axis === 'row' ? rows : cols)[i]!}
                    onChange={set(axis, i)}
                    clubs={criteria.data.clubs}
                    countries={criteria.data.countries}
                  />
                ))}
              </div>
            ))}
          </div>
          {create.error && (
            <div role="alert" className="rounded-xl bg-ink/10 p-4 font-semibold">
              <p>{reasons.length ? 'Esse Grid ainda não fecha:' : create.error.message}</p>
              {reasons.length > 0 && (
                <ul className="mt-2 list-disc pl-5 font-normal">
                  {[...new Set(reasons)].map((r) => (
                    <li key={r}>
                      {/^CELL_\d/.test(r) ? `${cellLabel(Number(r[5]))}: ` : ''}
                      {reasonText(r)}
                    </li>
                  ))}
                </ul>
              )}
              {create.error.code === 'NICKNAME_REQUIRED' && (
                <Link to="/conta" className="mt-2 inline-block underline underline-offset-4">
                  Escolher apelido
                </Link>
              )}
            </div>
          )}
          <button
            type="submit"
            className={`${btnPrimary} self-start`}
            disabled={!ready || create.isPending}
          >
            Enviar para revisão
          </button>
        </form>
      </div>
    </>
  );
}

function Vote({ id, myVote }: { id: string; myVote: boolean | null }) {
  const qc = useQueryClient();
  const vote = useMutation<unknown, ApiError, boolean>({
    mutationFn: (up) => api(`/v1/oficina/${id}/vote`, { method: 'PUT', json: { up } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['oficina'] }),
  });
  const [reported, setReported] = useState(false);
  const report = useMutation<unknown, ApiError>({
    mutationFn: () => api(`/v1/oficina/${id}/report`, { method: 'POST' }),
    onSuccess: () => setReported(true),
  });
  return (
    <section
      aria-labelledby="voto"
      className="flex flex-col gap-3 rounded-2xl border border-chalk/15 p-4"
    >
      <h2 id="voto" className="font-condensed text-xl font-extrabold uppercase">
        Curtiu esse desafio?
      </h2>
      <div className="flex gap-3">
        {[true, false].map((up) => (
          <button
            key={String(up)}
            type="button"
            aria-pressed={myVote === up}
            onClick={() => vote.mutate(up)}
            className={myVote === up ? btnPrimary : btnSecondary}
          >
            {up ? 'Curti' : 'Não curti'}
          </button>
        ))}
      </div>
      {vote.error && <p className="text-sm text-gold">{vote.error.message}</p>}
      <button
        type="button"
        disabled={reported}
        onClick={() => report.mutate()}
        className="min-h-11 self-start text-sm font-semibold text-chalk-soft underline underline-offset-4"
      >
        {reported ? 'Denúncia enviada para revisão' : 'Denunciar (título ou resposta errada)'}
      </button>
    </section>
  );
}

export function OficinaLevelPage() {
  const id = useParams().id ?? '';
  const q = useQuery<Level & { myVote: boolean | null; finished: boolean }, ApiError>({
    queryKey: ['oficina', 'level', id],
    queryFn: () => api(`/v1/oficina/${id}`),
    retry: false,
  });
  if (q.isPending) return <Skeleton className="h-96" />;
  if (!q.data)
    return (
      <Notice
        title="Desafio não encontrado"
        action={
          <Link to="/oficina" className={btnPrimary}>
            Ver a Oficina
          </Link>
        }
      >
        Ele pode estar em revisão ou ter sido arquivado.
      </Notice>
    );
  const l = q.data;
  return (
    <div className="flex flex-col gap-6">
      <GridPage level={0} challengeId={l.id} name={l.title} />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-chalk-soft">
          Oficina · por{' '}
          <Link
            to={`/criador/${encodeURIComponent(l.author)}`}
            className="underline underline-offset-4"
          >
            {l.author}
          </Link>
          {l.state === 'flagged' && ' · sob revisão'}
        </p>
        <Sponsor name={l.sponsor} />
      </div>
      {l.finished && <Vote id={l.id} myVote={l.myVote} />}
    </div>
  );
}

function AudienceRanking({ entries }: { entries: CreatorResponse['ranking'] }) {
  return entries.length ? (
    <ol className="mt-3 flex flex-col">
      {entries.map((e) => (
        <li
          key={e.position}
          className="flex min-h-11 items-center gap-3 border-b border-chalk/10 px-2"
        >
          <span className="font-condensed tabular w-6 text-right text-lg font-black">
            {e.position}
          </span>
          <span className="min-w-0 flex-1 truncate font-semibold">{e.nickname}</span>
          <span className="font-condensed tabular font-bold">
            <StarIcon className="inline size-[0.85em] align-[-0.08em]" /> {e.stars}
          </span>
        </li>
      ))}
    </ol>
  ) : (
    <p className="mt-3 text-sm text-chalk-soft">Ninguém com apelido jogou ainda.</p>
  );
}

export function CreatorPage() {
  const nickname = useParams().nickname ?? '';
  const q = useQuery<CreatorResponse, ApiError>({
    queryKey: ['oficina', 'creator', nickname],
    queryFn: () => api(`/v1/criador/${encodeURIComponent(nickname)}`),
    retry: false,
  });
  const share = useMemo(
    () =>
      `Joga os meus desafios no De Cabeça e vê se você me supera:\ndecabecafc.com.br/criador/${encodeURIComponent(nickname)}?ref=creator`,
    [nickname],
  );
  if (q.isPending) return <Skeleton className="h-96" />;
  if (!q.data) return <Notice title="Criador não encontrado">{q.error?.message}</Notice>;
  const c = q.data;
  return (
    <>
      <GameHeader title={c.nickname} />
      <p className="mt-2 text-chalk-soft">
        {c.levels.length} {c.levels.length === 1 ? 'desafio' : 'desafios'} na Oficina · {c.plays}{' '}
        partidas da audiência
      </p>
      <div className="mt-4">
        <ShareButton text={share} label="Chamar a audiência" />
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <ul className="pin-board grid content-start gap-5 sm:grid-cols-2">
          {c.levels.map((l) => (
            <li key={l.id}>
              <LevelCard l={l} />
            </li>
          ))}
        </ul>
        <section aria-labelledby="audiencia">
          <h2 id="audiencia" className="font-condensed text-xl font-extrabold uppercase">
            Ranking da audiência
          </h2>
          <p className="text-sm text-chalk-soft">Estrelas nos desafios deste criador.</p>
          <AudienceRanking entries={c.ranking} />
        </section>
      </div>
    </>
  );
}

export function EventPage() {
  const slug = useParams().slug ?? '';
  const q = useQuery<EventResponse, ApiError>({
    queryKey: ['eventos', slug],
    queryFn: () => api(`/v1/eventos/${slug}`),
    retry: false,
  });
  if (q.isPending) return <Skeleton className="h-96" />;
  if (!q.data) return <Notice title="Evento não encontrado">{q.error?.message}</Notice>;
  const e = q.data;
  const when = (d: string) =>
    new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  return (
    <>
      <GameHeader title={e.title} />
      <Sponsor name={e.sponsor} />
      <p className="mt-2 max-w-[60ch] text-chalk-soft">{e.description}</p>
      <p className="mt-2 text-sm font-semibold">
        {e.status === 'upcoming' ? 'Começa' : e.status === 'live' ? 'No ar' : 'Foi'} de{' '}
        {when(e.startsAt)} a {when(e.endsAt)}
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        {e.status === 'upcoming' ? (
          <p className="text-chalk-soft">Os desafios abrem quando o evento começar.</p>
        ) : (
          <ul className="pin-board grid content-start gap-5 sm:grid-cols-2">
            {e.levels.map((l) => (
              <li key={l.id}>
                <LevelCard l={l} />
              </li>
            ))}
          </ul>
        )}
        <section aria-labelledby="ranking-evento">
          <h2 id="ranking-evento" className="font-condensed text-xl font-extrabold uppercase">
            Ranking do evento
          </h2>
          <p className="text-sm text-chalk-soft">Só conta o que foi jogado dentro do horário.</p>
          <AudienceRanking entries={e.ranking} />
        </section>
      </div>
    </>
  );
}
