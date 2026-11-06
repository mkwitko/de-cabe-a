/** Players' error reports, grouped by level, with the level's data next to them. */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, ErrorNote } from './AdminApp';

interface Spell {
  club: string;
  type: string;
  from: number | null;
  to: number | null;
  appearances: number | null;
  goals: number | null;
  status: string;
}
interface ReportedLevel {
  challengeId: string;
  mode: 'CAREER_PATH' | 'FOOTBALL_GRID' | 'IMPOSTOR' | 'TIMELINE';
  level: number | null;
  challengeStatus: string;
  shown: { extraHints?: Record<string, unknown> };
  answer: {
    name: string;
    position: string | null;
    secondaryPositions: string[];
    source: string | null;
    wikidata: string | null;
    spells: Spell[];
  } | null;
  reports: { id: string; reason: string; note: string | null; cellIndex: number | null }[];
}

const REASON: Record<string, string> = {
  position: 'Posição',
  club_missing: 'Clubes',
  wrong_stats: 'Jogos/gols/anos',
  answer_refused: 'Resposta recusada',
  other: 'Outro',
};

export function LevelReportsPage() {
  const [status, setStatus] = useState<'open' | 'fixed' | 'dismissed'>('open');
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin', 'level-reports', status],
    queryFn: () => adminApi<{ levels: ReportedLevel[] }>(`/level-reports?status=${status}`),
  });
  const resolve = useMutation({
    mutationFn: (v: { id: string; status: string; resolution: string }) =>
      adminApi(`/level-reports/${v.id}`, { method: 'PATCH', json: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'level-reports'] }),
  });
  const [text, setText] = useState<Record<string, string>>({});

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">Relatos de erro</h1>
        {(['open', 'fixed', 'dismissed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-md border px-3 py-1 text-sm font-semibold ${status === s ? 'border-ink bg-ink text-paper' : 'border-ink/30'}`}
          >
            {{ open: 'Abertos', fixed: 'Corrigidos', dismissed: 'Descartados' }[s]}
          </button>
        ))}
        <p className="text-sm text-ink/70">
          A IA também lê esta fila: <code>scripts/research/reports.ts</code>.
        </p>
      </div>
      <ErrorNote error={q.error ?? resolve.error} />
      {q.data?.levels.length === 0 && <p className="text-ink/70">Nada aqui.</p>}
      {q.data?.levels.map((l) => (
        <article key={l.challengeId} className="rounded-lg border border-ink/15 p-4">
          <header className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-lg font-bold">
              {
                {
                  CAREER_PATH: 'Career Path',
                  FOOTBALL_GRID: 'Grid',
                  IMPOSTOR: 'Impostor',
                  TIMELINE: 'Linha do tempo',
                }[l.mode]
              }{' '}
              · Fase {l.level}
            </h2>
            <span className="text-sm text-ink/70">
              {l.reports.length} relato(s) · fase {l.challengeStatus}
            </span>
          </header>
          {l.answer && (
            <div className="mt-2 text-sm">
              <p>
                <strong>{l.answer.name}</strong> · base: {l.answer.position}
                {l.answer.secondaryPositions.length
                  ? ` / ${l.answer.secondaryPositions.join(', ')}`
                  : ''}{' '}
                · fase mostra: {String(l.shown.extraHints?.position ?? '—')}
                {(l.shown.extraHints?.secondaryPositions as string[] | undefined)?.length
                  ? ` / ${(l.shown.extraHints!.secondaryPositions as string[]).join(', ')}`
                  : ''}
              </p>
              <p className="text-ink/70">
                {l.answer.source} {l.answer.wikidata && `· ${l.answer.wikidata}`}
              </p>
              <table className="mt-2 w-full text-left">
                <tbody>
                  {l.answer.spells.map((s, i) => (
                    <tr key={i} className="border-b border-ink/10">
                      <td className="py-1 pr-2">{s.club}</td>
                      <td className="pr-2">
                        {s.from ?? '?'}–{s.to ?? ''}
                      </td>
                      <td className="pr-2">{s.type}</td>
                      <td className="pr-2">
                        {s.appearances ?? '—'} j · {s.goals ?? '—'} g
                      </td>
                      <td className="text-ink/60">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <ul className="mt-3 flex flex-col gap-3">
            {l.reports.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 rounded-md bg-ink/5 p-3 text-sm">
                <p>
                  <strong>{REASON[r.reason] ?? r.reason}</strong>
                  {r.cellIndex !== null && ` · célula ${r.cellIndex}`}
                  {r.note && ` · “${r.note}”`}
                </p>
                {status === 'open' && (
                  <div className="flex flex-wrap gap-2">
                    <input
                      className="min-w-60 flex-1 rounded-md border border-ink/30 bg-paper px-2 py-1"
                      placeholder="O que foi feito"
                      value={text[r.id] ?? ''}
                      onChange={(e) => setText({ ...text, [r.id]: e.target.value })}
                    />
                    {(['fixed', 'dismissed'] as const).map((s) => (
                      <button
                        key={s}
                        className="rounded-md bg-ink px-3 py-1 font-semibold text-paper disabled:opacity-40"
                        disabled={resolve.isPending}
                        onClick={() =>
                          resolve.mutate({ id: r.id, status: s, resolution: text[r.id] ?? '' })
                        }
                      >
                        {s === 'fixed' ? 'Corrigido' : 'Descartar'}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
