/**
 * Copa dos Sonhos: draft an XI from the great World Cup sides (one slot per round, 4 candidates),
 * see its chemistry (players who really played together), pick a tactic each match and take it
 * through a simulated World Cup against legendary national teams. Olheiro shows the ratings;
 * Raiz hides them until the end. Ratings come from each player's World Cup record.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teamPt, type CopaResponse, type CopaRunView } from '@decabeca/contracts';
import { api, type ApiError } from '../lib/api';
import { ShareButton } from '../components/ShareButton';
import { btnPrimary, GameHeader, Notice, Skeleton } from '../components/ui';
import { TrophyIcon } from '../components/Icons';
import { LowerThird, PerspectivePitch, TvStage } from '../components/TvStage';

type Player = CopaRunView['xi'][number];
type Side = NonNullable<CopaRunView['next']>['opponent'];
type Match = CopaRunView['matches'][number];

const SLOT = { GK: 'Goleiro', DF: 'Defensor', MF: 'Meio-campo', FW: 'Atacante' } as const;
const TACTICS = [
  { id: 'retranca', name: 'Retranca', hint: 'Sofre menos, faz menos.' },
  { id: 'equilibrado', name: 'Equilibrado', hint: 'Jogo normal.' },
  { id: 'ofensivo', name: 'Ofensivo', hint: 'Faz mais, se expõe mais.' },
] as const;
const FINISH_TEXT: Record<string, string> = {
  Campeão: 'Campeão do mundo!',
  Vice: 'Vice-campeão. Bateu na trave.',
  Semifinal: 'Caiu na semifinal.',
  Quartas: 'Caiu nas quartas.',
  Oitavas: 'Caiu nas oitavas.',
  Grupos: 'Ficou na fase de grupos.',
};
const sideName = (s: { team: string; season: string | null }) =>
  s.season ? `${teamPt(s.team)} ${s.season}` : s.team;
const why = (w: string) =>
  w.startsWith('side:')
    ? `jogaram juntos: ${sideName({ team: w.slice(5).split('|')[0]!, season: w.split('|')[1]! })}`
    : w.startsWith('club:')
      ? `mesmo clube: ${w.slice(5)}`
      : 'mesmo país';
const facts = (f: Player['facts']) =>
  f &&
  [
    `${f.cups} ${f.cups === 1 ? 'Copa' : 'Copas'}`,
    `${f.starts} jogos`,
    f.finals ? `${f.finals} ${f.finals === 1 ? 'final' : 'finais'}` : null,
    f.titles ? `${f.titles} ${f.titles === 1 ? 'título' : 'títulos'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

function Rating({ value }: { value: number | null }) {
  if (value === null) return null;
  return (
    <span
      className="font-condensed tabular grid size-12 shrink-0 place-items-center rounded-lg bg-ink text-2xl font-black text-paper"
      aria-label={`Nota ${value}`}
    >
      {value}
    </span>
  );
}

function Setup({
  onStart,
  pending,
}: {
  onStart: (f: string, d: string) => void;
  pending: boolean;
}) {
  const [formation, setFormation] = useState('4-3-3');
  const [difficulty, setDifficulty] = useState('olheiro');
  const choice = (on: boolean) =>
    `flex min-h-12 cursor-pointer flex-col justify-center rounded-xl border-2 px-4 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cover ${on ? 'border-cover bg-cover text-ink' : 'border-chalk/25 hover:bg-white/[0.08]'}`;
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        onStart(formation, difficulty);
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="font-condensed mb-2 text-xl font-extrabold uppercase">Formação</legend>
        <div className="grid grid-cols-3 gap-2">
          {['4-3-3', '4-4-2', '3-5-2'].map((f) => (
            <label key={f} className={choice(formation === f)}>
              <input
                type="radio"
                name="formation"
                checked={formation === f}
                onChange={() => setFormation(f)}
                className="sr-only"
              />
              <span className="font-condensed tabular text-center text-2xl font-black">{f}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="font-condensed mb-2 text-xl font-extrabold uppercase">
          Dificuldade
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['olheiro', 'Olheiro', 'Você vê a nota e o histórico de cada jogador em Copas.'],
            ['raiz', 'Raiz', 'Só nome e seleção. As notas aparecem no fim da Copa.'],
          ].map(([id, name, hint]) => (
            <label key={id} className={choice(difficulty === id)}>
              <input
                type="radio"
                name="difficulty"
                checked={difficulty === id}
                onChange={() => setDifficulty(id!)}
                className="sr-only"
              />
              <span className="font-condensed text-xl font-black uppercase">{name}</span>
              <span className="text-sm font-medium">{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" className={`${btnPrimary} self-start`} disabled={pending}>
        Começar o draft
      </button>
    </form>
  );
}

function Draft({
  run,
  onPick,
  pending,
}: {
  run: CopaRunView;
  onPick: (id: string) => void;
  pending: boolean;
}) {
  const d = run.draft!;
  return (
    <section aria-labelledby="draft" className="flex flex-col gap-4">
      <LowerThird id="draft" kicker="Draft">
        Rodada {d.round} de 11 · {SLOT[d.slot]}
      </LowerThird>
      <ul className="grid gap-3 sm:grid-cols-2">
        {d.options.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              disabled={pending}
              onClick={() => onPick(p.id)}
              className="flex min-h-24 w-full items-center gap-4 rounded-2xl bg-paper p-4 text-left text-ink shadow-[0_10px_24px_-12px_rgb(0_0_0/0.55)] transition-transform duration-150 ease-out-expo hover:-translate-y-0.5 disabled:opacity-60"
            >
              <Rating value={p.overall} />
              <span className="flex min-w-0 flex-col">
                <span className="font-condensed text-2xl leading-tight font-black uppercase">
                  {p.name}
                </span>
                <span className="font-semibold">{sideName(p)}</span>
                {p.facts && <span className="text-sm">{facts(p.facts)}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Team({ run }: { run: CopaRunView }) {
  const lines = (['FW', 'MF', 'DF', 'GK'] as const).map((s) => run.xi.filter((p) => p.slot === s));
  return (
    <section aria-labelledby="time" className="flex flex-col gap-3">
      <LowerThird id="time" kicker="Escalação">
        Seu time · {run.formation}
        {run.strength !== null && ` · força ${run.strength}`}
      </LowerThird>
      <PerspectivePitch>
        {lines.map((line, i) =>
          line.length ? (
            <ol key={i} className="flex flex-wrap justify-center gap-1.5">
              {line.map((p) => (
                <li
                  key={p.id}
                  className="rounded-md bg-paper px-2 py-1.5 text-center text-sm font-semibold text-ink shadow-[0_3px_0_rgb(0_0_0/0.35)]"
                >
                  {p.name}
                  {p.overall !== null && (
                    <span className="tabular ml-1 font-black">{p.overall}</span>
                  )}
                </li>
              ))}
            </ol>
          ) : null,
        )}
        {!run.xi.length && <p className="text-center text-sm text-chalk/80">Ninguém ainda.</p>}
      </PerspectivePitch>
      <div>
        <div className="flex items-baseline justify-between text-sm font-semibold">
          <span>Química</span>
          <span className="tabular">{run.chemistry.value}/100</span>
        </div>
        <div
          className="mt-1 h-2 overflow-hidden rounded-full bg-chalk/15"
          role="meter"
          aria-valuenow={run.chemistry.value}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Química do time"
        >
          <div
            className="h-full rounded-full bg-cover"
            style={{ width: `${run.chemistry.value}%` }}
          />
        </div>
        {run.chemistry.links.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1 text-sm text-chalk/80">
            {run.chemistry.links.slice(0, 6).map((l) => (
              <li key={l.a + l.b}>
                <span className="font-semibold text-chalk">
                  {l.a} e {l.b}
                </span>
                : {why(l.why)}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-chalk/75">
          Química vem de quem jogou junto de verdade: mesma seleção na mesma Copa, mesmo clube na
          mesma época ou mesmo país.
        </p>
      </div>
    </section>
  );
}

function Opponent({ side }: { side: Side }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-condensed flex items-center gap-2 text-3xl leading-none font-black uppercase">
        {sideName(side)}
        {side.champion && (
          <span className="inline-flex items-center">
            <TrophyIcon className="size-6" />
            <span className="sr-only">Campeã do mundo</span>
          </span>
        )}
      </p>
      <p className="text-sm font-semibold text-chalk/85">
        {side.strength !== null && `Força ${side.strength} · `}Destaques: {side.stars.join(', ')}
      </p>
    </div>
  );
}

/** Goals appear one by one (all at once with reduced motion). */
function Report({ match }: { match: Match }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches)
      return setShown(match.events.length);
    setShown(0);
    const id = setInterval(() => setShown((n) => (n >= match.events.length ? n : n + 1)), 650);
    return () => clearInterval(id);
  }, [match]);
  const done = shown >= match.events.length;
  const mine = match.events.slice(0, shown).filter((e) => e.side === 'mine').length;
  const theirs = shown - mine;
  return (
    <section
      aria-labelledby="partida"
      className="flex flex-col gap-3 rounded-lg border-l-8 border-gold bg-chalk/10 p-4 text-chalk"
    >
      <h2 id="partida" className="text-sm font-semibold text-chalk/80">
        {match.stage} · {match.tactic}
      </h2>
      <p
        className="font-condensed text-3xl leading-none font-black uppercase sm:text-5xl"
        aria-live="polite"
      >
        Seu time{' '}
        <span className="tabular rounded-sm bg-cover px-2 text-ink">
          {done ? match.goalsFor : mine}
        </span>{' '}
        ×{' '}
        <span className="tabular rounded-sm bg-white px-2 text-ink">
          {done ? match.goalsAgainst : theirs}
        </span>{' '}
        {sideName(match.opponent)}
      </p>
      {done && (match.extraTime || match.penalties) && (
        <p className="font-semibold">
          {match.penalties
            ? `Pênaltis: ${match.penalties.mine} × ${match.penalties.theirs}`
            : 'Decidido na prorrogação'}
        </p>
      )}
      <ol className="flex flex-col gap-1 text-sm">
        {match.events.slice(0, shown).map((e, i) => (
          <li key={i} className={e.side === 'mine' ? 'font-semibold' : ''}>
            <span className="tabular inline-block w-9">{e.minute}&apos;</span>
            {e.side === 'mine' ? 'Gol! ' : 'Gol deles: '}
            {e.name}
          </li>
        ))}
        {!match.events.length && <li>Sem gols.</li>}
      </ol>
    </section>
  );
}

function Group({ run }: { run: CopaRunView }) {
  return (
    <section aria-labelledby="grupo">
      <LowerThird id="grupo" kicker="Tabela">
        Grupo
      </LowerThird>
      <table className="mt-2 w-full text-sm">
        <thead className="text-left text-chalk/75">
          <tr>
            <th className="py-1 font-semibold">Seleção</th>
            <th className="w-8 text-right font-semibold">J</th>
            <th className="w-8 text-right font-semibold">P</th>
            <th className="w-10 text-right font-semibold">SG</th>
          </tr>
        </thead>
        <tbody className="tabular">
          {run.group.map((r, i) => (
            <tr
              key={r.team + r.season}
              className={`border-t border-chalk/15 ${r.season ? '' : 'font-bold text-gold'}`}
            >
              <td className="py-1.5">
                {i + 1}. {sideName(r)}
              </td>
              <td className="text-right">{r.played}</td>
              <td className="text-right">{r.points}</td>
              <td className="text-right">{r.gf - r.ga}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-xs text-chalk/75">Os dois primeiros vão às oitavas.</p>
    </section>
  );
}

function shareText(run: CopaRunView) {
  const lines = run.matches.map(
    (m) =>
      `${m.stage.replace(' · jogo ', ' ')}: ${m.goalsFor}×${m.goalsAgainst} ${sideName(m.opponent)}${m.penalties ? ` (pên. ${m.penalties.mine}×${m.penalties.theirs})` : ''}`,
  );
  return `Copa dos Sonhos no De Cabeça (${run.formation}, ${run.difficulty === 'raiz' ? 'Raiz' : 'Olheiro'}): ${FINISH_TEXT[run.finish ?? '']}\n${lines.join('\n')}\nMeu time: ${run.xi.map((p) => p.name).join(', ')}\ndecabecafc.com.br/copa?ref=share`;
}

export function CopaPage() {
  const qc = useQueryClient();
  const q = useQuery<CopaResponse, ApiError>({
    queryKey: ['copa'],
    queryFn: () => api('/v1/copa'),
  });
  const set = (d: CopaResponse) => qc.setQueryData(['copa'], d);
  const start = useMutation<CopaResponse, ApiError, { formation: string; difficulty: string }>({
    mutationFn: (json) => api('/v1/copa', { method: 'POST', json }),
    onSuccess: (d) => {
      set(d);
      setRestart(false);
    },
  });
  const pick = useMutation<CopaResponse, ApiError, string>({
    mutationFn: (playerId) => api('/v1/copa/pick', { method: 'POST', json: { playerId } }),
    onSuccess: set,
  });
  const play = useMutation<CopaResponse, ApiError, string>({
    mutationFn: (tactic) => api('/v1/copa/play', { method: 'POST', json: { tactic } }),
    onSuccess: set,
  });
  const [tactic, setTactic] = useState('equilibrado');
  const [restart, setRestart] = useState(false);

  if (q.isPending) return <Skeleton className="h-96" />;
  if (!q.data) return <Notice title="Deu ruim na conexão">{q.error?.message}</Notice>;
  const { run, record } = q.data;
  const error = start.error ?? pick.error ?? play.error;
  const active = run && run.phase !== 'over' && !restart;
  const last = run?.matches.at(-1);

  return (
    <>
      <GameHeader title="Copa dos Sonhos" />
      <p className="mt-2 max-w-[64ch] text-chalk-soft">
        Monte seu time com craques das maiores seleções de todas as Copas, um por posição, e leve
        ele até a final contra seleções históricas. Notas e química vêm do histórico real em Copas:
        quem jogou junto se entende melhor.
      </p>
      {record.runs > 0 && (
        <p className="mt-3 text-sm font-semibold">
          Melhor campanha: {record.best} · {record.titles}{' '}
          {record.titles === 1 ? 'título' : 'títulos'} em {record.runs}{' '}
          {record.runs === 1 ? 'Copa' : 'Copas'}
        </p>
      )}
      <TvStage
        tag="Copa dos Sonhos"
        status={
          active && run
            ? run.phase === 'draft'
              ? `Rodada ${run.draft!.round} de 11`
              : (run.next?.stage ?? run.formation)
            : 'Nova Copa'
        }
      >
        {error && (
          <p role="alert" className="font-semibold text-gold">
            {error.message}
          </p>
        )}

        {active && run ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
            <div className="flex flex-col gap-6">
              {run.phase === 'draft' ? (
                <Draft run={run} pending={pick.isPending} onPick={(id) => pick.mutate(id)} />
              ) : (
                <>
                  {last && <Report match={last} />}
                  {run.next && (
                    <section aria-labelledby="proximo" className="flex flex-col gap-4">
                      <LowerThird id="proximo" kicker="Próximo jogo">
                        {run.next.stage}
                      </LowerThird>
                      <Opponent side={run.next.opponent} />
                      <fieldset className="flex flex-col gap-2">
                        <legend className="mb-1 font-semibold text-chalk/85">Tática</legend>
                        <div className="grid grid-cols-3 gap-2">
                          {TACTICS.map((t) => (
                            <label
                              key={t.id}
                              className={`flex min-h-12 min-w-0 cursor-pointer flex-col justify-center rounded-xl border-2 px-2.5 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cover ${tactic === t.id ? 'border-cover bg-cover text-ink' : 'border-chalk/25'}`}
                            >
                              <input
                                type="radio"
                                name="tactic"
                                checked={tactic === t.id}
                                onChange={() => setTactic(t.id)}
                                className="sr-only"
                              />
                              <span className="font-condensed text-base font-black break-words uppercase sm:text-lg">
                                {t.name}
                              </span>
                              <span className="text-xs font-medium">{t.hint}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <button
                        type="button"
                        className={`${btnPrimary} self-start`}
                        disabled={play.isPending}
                        onClick={() => play.mutate(tactic)}
                      >
                        Jogar
                      </button>
                    </section>
                  )}
                  {run.matches.length > 0 && run.matches.length <= 3 && <Group run={run} />}
                </>
              )}
            </div>
            <aside className="flex flex-col gap-4">
              <Team run={run} />
              <button
                type="button"
                className="min-h-11 self-start text-sm font-semibold underline underline-offset-4"
                onClick={() => {
                  if (confirm('Abandonar esta Copa? Ela não conta na sua campanha.'))
                    setRestart(true);
                }}
              >
                Abandonar e começar outra
              </button>
            </aside>
          </div>
        ) : (
          <>
            {run?.phase === 'over' && run.finish && !restart && (
              <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
                <div className="flex flex-col gap-4">
                  <h2 className="font-condensed text-4xl leading-none font-black uppercase">
                    {FINISH_TEXT[run.finish]}
                  </h2>
                  {last && <Report match={last} />}
                  <ol className="flex flex-col gap-1 text-sm">
                    {run.matches.map((m) => (
                      <li key={m.stage}>
                        <span className="font-semibold">{m.stage}:</span>{' '}
                        <span className="tabular">
                          {m.goalsFor}×{m.goalsAgainst}
                        </span>{' '}
                        {sideName(m.opponent)}
                        {m.penalties && ` (pênaltis ${m.penalties.mine}×${m.penalties.theirs})`}
                      </li>
                    ))}
                  </ol>
                  <div className="flex flex-wrap gap-3">
                    <ShareButton text={shareText(run)} label="Compartilhar campanha" />
                  </div>
                </div>
                <Team run={run} />
              </div>
            )}
            <Setup
              pending={start.isPending}
              onStart={(formation, difficulty) => start.mutate({ formation, difficulty })}
            />
          </>
        )}
      </TvStage>
    </>
  );
}
