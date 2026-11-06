/** Pilot metrics (ANALYTICS.md §2): plain tables, read by the editor and by the AI curator. */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, ErrorNote } from './AdminApp';

interface Metrics {
  daily: { day: string; players: number; started: number; completed: number; timed: number }[];
  totals: {
    started: number;
    completed: number;
    completionRate: number | null;
    shared: number;
    shareRate: number | null;
  };
  retention: { cohort: number; d1: number | null; d7: number | null };
  actionRejected: { code: string; n: number }[];
  levels: {
    mode: string;
    level: number;
    started: number;
    completed: number;
    abandonRate: number | null;
    winRate: number | null;
    avgStars: number | null;
    avgSec: number | null;
    openReports: number;
    flag: 'too_hard' | 'too_easy' | null;
  }[];
  server: {
    startedAt: string;
    routes: {
      route: string;
      requests: number;
      p50ms: number | null;
      p95ms: number | null;
      errors4xx: number;
      errors5xx: number;
      rateLimited: number;
    }[];
  };
}

const th = 'border-b border-ink/20 px-2 py-1 text-left font-semibold';
const td = 'border-b border-ink/10 px-2 py-1 tabular-nums';
const p = (x: number | null) => (x === null ? '—' : `${x}%`);

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-ink/15 px-4 py-3">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-sm text-ink/70">{label}</p>
    </div>
  );
}

export function MetricsPage() {
  const [days, setDays] = useState(14);
  const [onlyFlagged, setOnlyFlagged] = useState(true);
  const q = useQuery({
    queryKey: ['admin', 'metrics', days],
    queryFn: () => adminApi<Metrics>(`/metrics?days=${days}`),
  });
  const m = q.data;
  const levels = m?.levels.filter((l) => !onlyFlagged || l.flag || l.openReports) ?? [];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">Métricas do piloto</h1>
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`rounded-md border px-3 py-1 text-sm font-semibold ${days === d ? 'border-ink bg-ink text-paper' : 'border-ink/30'}`}
          >
            {d} dias
          </button>
        ))}
        <p className="text-sm text-ink/70">
          Mesmo conteúdo para a IA: <code>scripts/research/metrics.ts</code>.
        </p>
      </div>
      <ErrorNote error={q.error} />
      {m && (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="partidas iniciadas" value={m.totals.started} />
            <Stat label="conclusão" value={p(m.totals.completionRate)} />
            <Stat label="compartilhamento" value={p(m.totals.shareRate)} />
            <Stat label="retorno D1" value={p(m.retention.d1)} />
            <Stat label="retorno D7" value={p(m.retention.d7)} />
          </section>

          <section>
            <h2 className="mb-2 font-bold">Por dia</h2>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Dia', 'Jogadores', 'Iniciadas', 'Concluídas', 'Contra o relógio'].map((h) => (
                    <th key={h} className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.daily.map((d) => (
                  <tr key={d.day}>
                    <td className={td}>{d.day}</td>
                    <td className={td}>{d.players}</td>
                    <td className={td}>{d.started}</td>
                    <td className={td}>{d.completed}</td>
                    <td className={td}>{d.timed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-3">
              <h2 className="font-bold">Fases</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={onlyFlagged}
                  onChange={(e) => setOnlyFlagged(e.target.checked)}
                />
                só difíceis/fáceis demais ou com relatos
              </label>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {[
                    'Jogo',
                    'Fase',
                    'Iniciadas',
                    'Abandono',
                    'Vitórias',
                    'Estrelas',
                    'Tempo médio',
                    'Relatos',
                    'Alerta',
                  ].map((h) => (
                    <th key={h} className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {levels.map((l) => (
                  <tr key={`${l.mode}-${l.level}`}>
                    <td className={td}>
                      {
                        (
                          {
                            CAREER_PATH: 'Career Path',
                            FOOTBALL_GRID: 'Grid',
                            IMPOSTOR: 'Impostor',
                          } as Record<string, string>
                        )[l.mode]
                      }
                    </td>
                    <td className={td}>{l.level}</td>
                    <td className={td}>{l.started}</td>
                    <td className={td}>{p(l.abandonRate)}</td>
                    <td className={td}>{p(l.winRate)}</td>
                    <td className={td}>{l.avgStars ?? '—'}</td>
                    <td className={td}>{l.avgSec === null ? '—' : `${l.avgSec}s`}</td>
                    <td className={td}>{l.openReports || ''}</td>
                    <td className={td}>
                      {l.flag === 'too_hard'
                        ? 'difícil demais'
                        : l.flag === 'too_easy'
                          ? 'fácil demais'
                          : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {levels.length === 0 && <p className="text-sm text-ink/70">Nada a destacar.</p>}
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="mb-2 font-bold">
                API desde {new Date(m.server.startedAt).toLocaleString('pt-BR')}
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Rota', 'Req.', 'P50', 'P95', '4xx', '5xx', '429'].map((h) => (
                      <th key={h} className={th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {m.server.routes.slice(0, 15).map((r) => (
                    <tr key={r.route}>
                      <td className={`${td} font-mono text-xs`}>{r.route}</td>
                      <td className={td}>{r.requests}</td>
                      <td className={td}>{r.p50ms}ms</td>
                      <td className={td}>{r.p95ms}ms</td>
                      <td className={td}>{r.errors4xx}</td>
                      <td className={td}>{r.errors5xx}</td>
                      <td className={td}>{r.rateLimited}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h2 className="mb-2 font-bold">Ações recusadas</h2>
              <table className="w-full text-sm">
                <tbody>
                  {m.actionRejected.map((a) => (
                    <tr key={a.code}>
                      <td className={td}>{a.code}</td>
                      <td className={td}>{a.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
