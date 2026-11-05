/**
 * Editorial calendar (UX_SPEC.md §7): a week per game, create, validate, schedule, publish,
 * retire, preview. Grid criteria are entered as JSON with a live eligibility check.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, ErrorNote } from './AdminApp';

interface Row {
  id: string;
  gameMode: 'CAREER_PATH' | 'FOOTBALL_GRID';
  kind: 'daily' | 'practice';
  status: string;
  scheduledFor: string | null;
  publicNumber: number | null;
  difficultyTier: number;
  answer: string | null;
  attempts: number;
  retiredReason: string | null;
}

const cell = 'border-b border-ink/10 px-2 py-1.5 text-left align-top';
const input = 'rounded-md border border-ink/30 bg-paper px-2 py-1 text-sm';
const btn =
  'rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-paper hover:bg-ink/85 disabled:opacity-40';
const btnGhost = 'rounded-md border border-ink/30 px-2 py-1 text-xs font-semibold hover:bg-ink/5';

const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const plusDays = (d: string, n: number) =>
  new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);

const GRID_EXAMPLE = JSON.stringify(
  {
    rows: [
      { type: 'club', clubId: '<id>' },
      { type: 'club', clubId: '<id>' },
      { type: 'position', positionGroup: 'FW' },
    ],
    cols: [
      { type: 'club', clubId: '<id>' },
      { type: 'nationality', countryId: '<id>' },
      { type: 'played_in_country', countryId: '<id>' },
    ],
  },
  null,
  1,
);

export function ChallengesPage() {
  const qc = useQueryClient();
  const [from, setFrom] = useState(today);
  const to = plusDays(from, 6);
  const list = useQuery({
    queryKey: ['admin-challenges', from],
    queryFn: () => adminApi<{ items: Row[] }>(`/challenges?from=${from}&to=${to}`),
  });
  const practice = useQuery({
    queryKey: ['admin-challenges', 'practice'],
    queryFn: () => adminApi<{ items: Row[] }>(`/challenges?kind=practice`),
  });
  const act = useMutation({
    mutationFn: ({ path, json }: { path: string; json?: unknown }) =>
      adminApi(path, { method: 'POST', json: json ?? {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-challenges'] }),
  });

  const days = Array.from({ length: 7 }, (_, i) => plusDays(from, i));
  const byDay = (d: string, mode: Row['gameMode']) =>
    list.data?.items.filter(
      (c) => c.scheduledFor === d && c.gameMode === mode && c.status !== 'retired',
    ) ?? [];

  function Actions({ c }: { c: Row }) {
    return (
      <span className="flex flex-wrap gap-1">
        {c.status === 'draft' && (
          <button
            className={btnGhost}
            onClick={() => act.mutate({ path: `/challenges/${c.id}/validate` })}
          >
            Validar
          </button>
        )}
        {(c.status === 'validated' || c.status === 'scheduled') && (
          <button
            className={btnGhost}
            onClick={() => act.mutate({ path: `/challenges/${c.id}/publish` })}
          >
            Publicar
          </button>
        )}
        {c.status === 'published' && (
          <button
            className={btnGhost}
            onClick={() => {
              const reason = prompt('Motivo da retirada?');
              if (reason) act.mutate({ path: `/challenges/${c.id}/retire`, json: { reason } });
            }}
          >
            Retirar
          </button>
        )}
        <a
          className={btnGhost}
          href={`/v1/admin/challenges/${c.id}/preview`}
          onClick={(e) => {
            e.preventDefault();
            void adminApi(`/challenges/${c.id}/preview`).then((s) =>
              alert(JSON.stringify((s as { snapshot: unknown }).snapshot, null, 1)),
            );
          }}
        >
          Snapshot
        </a>
      </span>
    );
  }

  const label = (c: Row) =>
    `${c.publicNumber ? `#${c.publicNumber} · ` : ''}${c.answer ?? 'Grid'} · ${c.status} · T${c.difficultyTier}${c.attempts ? ` · ${c.attempts} partidas` : ''}`;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-condensed text-3xl font-extrabold uppercase">Desafios</h1>
          <button className={btnGhost} onClick={() => setFrom(plusDays(from, -7))}>
            ← semana
          </button>
          <input
            type="date"
            className={input}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="Início da semana"
          />
          <button className={btnGhost} onClick={() => setFrom(plusDays(from, 7))}>
            semana →
          </button>
        </div>
        <ErrorNote error={act.error ?? list.error} />
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Data', 'Career Path', 'Grid'].map((h) => (
                <th key={h} className={`${cell} font-bold`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d} className={d === today() ? 'bg-cover/30' : ''}>
                <td className={`${cell} whitespace-nowrap`}>{d}</td>
                {(['CAREER_PATH', 'FOOTBALL_GRID'] as const).map((m) => (
                  <td key={m} className={cell}>
                    {byDay(d, m).length === 0 ? (
                      <span className="text-red-800">vazio</span>
                    ) : (
                      byDay(d, m).map((c) => (
                        <div key={c.id} className="flex flex-col gap-1">
                          <span>{label(c)}</span>
                          <Actions c={c} />
                        </div>
                      ))
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <CreateForm onCreated={() => qc.invalidateQueries({ queryKey: ['admin-challenges'] })} />

      <section className="flex flex-col gap-2">
        <h2 className="font-condensed text-xl font-extrabold uppercase">Treino</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {practice.data?.items.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2">
              <span>
                {c.gameMode === 'CAREER_PATH' ? 'Career Path' : 'Grid'} · {label(c)}
              </span>
              <Actions c={c} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const [mode, setMode] = useState<'CAREER_PATH' | 'FOOTBALL_GRID'>('CAREER_PATH');
  const [kind, setKind] = useState<'daily' | 'practice'>('daily');
  const [date, setDate] = useState(today);
  const [playerQ, setPlayerQ] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [grid, setGrid] = useState(GRID_EXAMPLE);
  const [report, setReport] = useState<unknown>(null);
  const players = useQuery({
    queryKey: ['admin-players-pick', playerQ],
    queryFn: () =>
      adminApi<{ items: { id: string; canonicalName: string }[] }>(
        `/players?status=verified&q=${encodeURIComponent(playerQ)}`,
      ),
    enabled: playerQ.length >= 2,
  });
  const params = () => (mode === 'CAREER_PATH' ? { playerId } : (JSON.parse(grid) as object));
  const check = useMutation({
    mutationFn: () =>
      mode === 'CAREER_PATH'
        ? adminApi('/eligibility/career-path', {
            method: 'POST',
            json: { playerId, kind, ...(kind === 'daily' ? { scheduledFor: date } : {}) },
          })
        : adminApi('/eligibility/grid', { method: 'POST', json: { ...params(), kind } }),
    onSuccess: setReport,
  });
  const create = useMutation({
    mutationFn: () =>
      adminApi('/challenges', {
        method: 'POST',
        json: { mode, kind, ...(kind === 'daily' ? { scheduledFor: date } : {}), params: params() },
      }),
    onSuccess: (c) => {
      setReport(c);
      onCreated();
    },
  });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-condensed text-xl font-extrabold uppercase">Criar desafio</h2>
      <div className="flex flex-wrap gap-2 text-sm">
        <select
          className={input}
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
          aria-label="Jogo"
        >
          <option value="CAREER_PATH">Career Path</option>
          <option value="FOOTBALL_GRID">Grid</option>
        </select>
        <select
          className={input}
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          aria-label="Tipo"
        >
          <option value="daily">Diário</option>
          <option value="practice">Treino</option>
        </select>
        {kind === 'daily' && (
          <input
            type="date"
            className={input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Data"
          />
        )}
      </div>
      {mode === 'CAREER_PATH' ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input
            className={input}
            placeholder="Buscar jogador verificado"
            value={playerQ}
            onChange={(e) => setPlayerQ(e.target.value)}
            aria-label="Jogador"
          />
          <select
            className={input}
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            aria-label="Resposta"
          >
            <option value="">—</option>
            {players.data?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.canonicalName}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <textarea
          className={`${input} font-mono`}
          rows={8}
          value={grid}
          onChange={(e) => setGrid(e.target.value)}
          aria-label="Critérios do grid (JSON)"
        />
      )}
      <div className="flex gap-2">
        <button className={btn} onClick={() => check.mutate()}>
          Checar elegibilidade
        </button>
        <button className={btn} onClick={() => create.mutate()}>
          Criar rascunho
        </button>
      </div>
      <ErrorNote error={check.error ?? create.error} />
      {report !== null && (
        <pre className="max-h-80 overflow-auto rounded-md bg-ink/5 p-3 text-xs">
          {JSON.stringify(report, null, 1)}
        </pre>
      )}
    </section>
  );
}

export function ReportsPage() {
  const q = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () =>
      adminApi<{
        searchMisses: { text: string; count: number }[];
        gridWrongGuesses: {
          publicNumber: number | null;
          cellIndex: number;
          name: string;
          n: number;
        }[];
        importedSpellsOfVerified: { id: string; name: string; importedSpells: number }[];
      }>('/reports/rejections'),
  });
  const d = q.data;
  return (
    <div className="flex flex-col gap-6 text-sm">
      <h1 className="font-condensed text-3xl font-extrabold uppercase">Relatórios</h1>
      <ErrorNote error={q.error} />
      <section>
        <h2 className="font-bold">Buscas sem resultado (30 dias): candidatos a alias</h2>
        <ul>
          {d?.searchMisses.map((s) => (
            <li key={s.text}>
              {s.text} · {s.count}×
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-bold">Palpites errados mais comuns no Grid</h2>
        <ul>
          {d?.gridWrongGuesses.map((w, i) => (
            <li key={i}>
              Grid {w.publicNumber ? `#${w.publicNumber}` : '(treino)'} · célula {w.cellIndex} ·{' '}
              {w.name} · {w.n}×
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-bold">Jogadores verificados com passagens só importadas</h2>
        <ul>
          {d?.importedSpellsOfVerified.map((p) => (
            <li key={p.id}>
              {p.name} · {p.importedSpells}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
