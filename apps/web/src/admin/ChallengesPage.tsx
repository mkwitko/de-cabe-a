import { GAME_NAME } from '../lib/game';
/**
 * Editorial view of the level tracks (ADR-007): levels per game in order, drafts, create,
 * validate, publish (appends the next level), retire, preview.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, ErrorNote } from './AdminApp';

interface Row {
  id: string;
  gameMode: 'CAREER_PATH' | 'FOOTBALL_GRID' | 'IMPOSTOR' | 'TIMELINE' | 'HIGHER_LOWER';
  status: string;
  level: number | null;
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
  const [mode, setMode] = useState<Row['gameMode']>('CAREER_PATH');
  const list = useQuery({
    queryKey: ['admin-challenges', mode],
    queryFn: () => adminApi<{ items: Row[] }>(`/challenges?mode=${mode}`),
  });
  const act = useMutation({
    mutationFn: ({ path, json }: { path: string; json?: unknown }) =>
      adminApi(path, { method: 'POST', json: json ?? {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-challenges'] }),
  });
  const items = list.data?.items ?? [];
  const published = items.filter((c) => c.status === 'published').length;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-condensed text-3xl font-extrabold uppercase">Fases</h1>
          <select
            className={input}
            value={mode}
            onChange={(e) => setMode(e.target.value as Row['gameMode'])}
            aria-label="Jogo"
          >
            <option value="CAREER_PATH">Career Path</option>
            <option value="FOOTBALL_GRID">Grid</option>
            <option value="IMPOSTOR">Impostor</option>
            <option value="TIMELINE">Linha do tempo</option>
            <option value="HIGHER_LOWER">Mais ou Menos</option>
          </select>
          <span className="text-sm">{published} fases publicadas</span>
        </div>
        <ErrorNote error={act.error ?? list.error} />
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Fase', 'Status', 'Resposta', 'Dificuldade', 'Partidas', ''].map((h) => (
                <th key={h} className={`${cell} font-bold`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className={c.status === 'retired' ? 'opacity-50' : ''}>
                <td className={cell}>{c.level ?? '—'}</td>
                <td className={cell}>
                  {c.status}
                  {c.retiredReason ? ` (${c.retiredReason})` : ''}
                </td>
                <td className={cell}>
                  {c.answer ?? (c.gameMode === 'FOOTBALL_GRID' ? 'Grid' : '—')}
                </td>
                <td className={cell}>T{c.difficultyTier}</td>
                <td className={cell}>{c.attempts}</td>
                <td className={cell}>
                  <span className="flex flex-wrap gap-1">
                    {c.status === 'draft' && (
                      <button
                        className={btnGhost}
                        onClick={() => act.mutate({ path: `/challenges/${c.id}/validate` })}
                      >
                        Validar
                      </button>
                    )}
                    {c.status === 'validated' && (
                      <button
                        className={btnGhost}
                        onClick={() => act.mutate({ path: `/challenges/${c.id}/publish` })}
                      >
                        Publicar como fase {published + 1}
                      </button>
                    )}
                    {c.status === 'published' && (
                      <button
                        className={btnGhost}
                        onClick={() => {
                          const reason = prompt('Motivo da retirada?');
                          if (reason)
                            act.mutate({ path: `/challenges/${c.id}/retire`, json: { reason } });
                        }}
                      >
                        Retirar
                      </button>
                    )}
                    <button
                      className={btnGhost}
                      onClick={() =>
                        void adminApi(`/challenges/${c.id}/preview`).then((x) =>
                          alert(JSON.stringify((x as { snapshot: unknown }).snapshot, null, 1)),
                        )
                      }
                    >
                      Snapshot
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <CreateForm
        mode={mode}
        onCreated={() => qc.invalidateQueries({ queryKey: ['admin-challenges'] })}
      />
    </div>
  );
}

function CreateForm({ mode, onCreated }: { mode: Row['gameMode']; onCreated: () => void }) {
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
        ? adminApi('/eligibility/career-path', { method: 'POST', json: { playerId } })
        : mode === 'IMPOSTOR' || mode === 'TIMELINE' || mode === 'HIGHER_LOWER'
          ? // Impostor is checked when the draft is created (422 with the reasons).
            Promise.resolve({ note: 'Crie a fase: a validação lista os motivos se algo falhar.' })
          : adminApi('/eligibility/grid', { method: 'POST', json: params() }),
    onSuccess: setReport,
  });
  const create = useMutation({
    mutationFn: () => adminApi('/challenges', { method: 'POST', json: { mode, params: params() } }),
    onSuccess: (c) => {
      setReport(c);
      onCreated();
    },
  });
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-condensed text-xl font-extrabold uppercase">
        Nova fase ({GAME_NAME[mode]})
      </h2>
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
