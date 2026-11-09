import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import type { GameMode } from '@decabeca/contracts';
import { fetchHistory } from '../lib/game';
import { btnPrimary, btnSecondary, Notice, Skeleton } from '../components/ui';
import { Stars } from '../components/Stars';

const NAME = {
  CAREER_PATH: 'Career Path',
  FOOTBALL_GRID: 'Grid',
  IMPOSTOR: 'Impostor',
  TIMELINE: 'Linha do tempo',
  HIGHER_LOWER: 'Mais ou Menos',
  MISSING_XI: 'Escalação',
  MYSTERY_PLAYER: 'Craque Misterioso',
  CONNECTIONS: 'Conexões',
  DRAFT: 'Draft',
} as const;
const date = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

function result(mode: GameMode, status: string, score: number) {
  if (mode === 'FOOTBALL_GRID') return `${score}/9`;
  if (mode === 'MISSING_XI') return `${score}%`;
  if (mode === 'CONNECTIONS') return `${Math.floor(score / 10)}/4`;
  if (mode === 'DRAFT') return `${score}/11`;
  if (mode === 'MYSTERY_PLAYER') return `${9 - score}/8`;
  if (mode === 'IMPOSTOR' || mode === 'TIMELINE' || mode === 'HIGHER_LOWER') return `${score}/5`;
  return status === 'WON' ? `${7 - score / 10}/6` : 'X/6';
}

export function HistoryPage() {
  const [mode, setMode] = useState<GameMode | ''>('');
  const q = useInfiniteQuery({
    queryKey: ['history', mode],
    queryFn: ({ pageParam }) => fetchHistory(mode, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-condensed text-4xl font-black uppercase">Histórico</h1>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por jogo">
        {(
          [
            ['', 'Todos'],
            ['CAREER_PATH', 'Career Path'],
            ['FOOTBALL_GRID', 'Grid'],
            ['IMPOSTOR', 'Impostor'],
            ['TIMELINE', 'Linha do tempo'],
            ['HIGHER_LOWER', 'Mais ou Menos'],
            ['MISSING_XI', 'Escalação'],
            ['MYSTERY_PLAYER', 'Craque Misterioso'],
            ['CONNECTIONS', 'Conexões'],
            ['DRAFT', 'Draft'],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-full border-2 px-3 py-1.5 font-semibold ${mode === m ? 'border-cover bg-cover text-ink' : 'border-chalk-soft/50'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {q.isPending ? (
        <Skeleton className="h-48" />
      ) : items.length === 0 ? (
        <Notice
          title="Nenhuma partida ainda"
          action={
            <Link to="/" className={btnPrimary}>
              Jogar o desafio de hoje
            </Link>
          }
        >
          Termine uma fase e a figurinha aparece aqui.
        </Notice>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((it) => (
            <li
              key={it.attemptId}
              className="flex items-center gap-3 rounded-lg bg-paper px-4 py-3 text-ink"
            >
              <span className="flex flex-col">
                <span className="font-bold">
                  {NAME[it.mode]} · Fase {it.level}
                </span>
                <span className="text-sm text-ink/65">{date.format(new Date(it.completedAt))}</span>
              </span>
              <span className="ml-auto">
                <Stars n={it.stars} size="size-4" />
              </span>
              <span className="font-condensed tabular text-2xl font-black">
                {result(it.mode, it.status, it.score)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {q.hasNextPage && (
        <button
          className={`${btnSecondary} self-start`}
          onClick={() => void q.fetchNextPage()}
          disabled={q.isFetchingNextPage}
        >
          Carregar mais
        </button>
      )}
    </div>
  );
}
