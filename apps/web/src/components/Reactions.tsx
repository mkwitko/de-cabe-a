/**
 * Reações (GROWTH_PLAN.md 2.5): one predefined reaction per player on a finished level. Tapping
 * another one swaps it; tapping yours again undoes it.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GameMode, ReactionKind, ReactionsResponse } from '@decabeca/contracts';
import { api } from '../lib/api';

const LABEL: Record<ReactionKind, string> = {
  craque: 'Craque!',
  'na-trave': 'Na trave!',
  'que-memoria': 'Que memória!',
  pegadinha: 'Pegadinha!',
};

export function Reactions({ mode, level }: { mode: GameMode; level: number }) {
  const url = `/v1/levels/${mode}/${level}/reactions`;
  const key = ['reactions', mode, level];
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: key, queryFn: () => api<ReactionsResponse>(url) });
  const react = useMutation({
    mutationFn: (kind: ReactionKind | null) =>
      api<ReactionsResponse>(url, kind ? { method: 'PUT', json: { kind } } : { method: 'DELETE' }),
    onSuccess: (next) => qc.setQueryData(key, next),
  });
  if (!data) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-condensed text-xl font-extrabold uppercase">Reaja à fase</h3>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Reações">
        {(Object.keys(LABEL) as ReactionKind[]).map((k) => {
          const mine = data.mine === k;
          return (
            <button
              key={k}
              type="button"
              aria-pressed={mine}
              disabled={react.isPending}
              onClick={() => react.mutate(mine ? null : k)}
              className={`min-h-11 rounded-full border-2 px-4 font-semibold ${mine ? 'border-cover bg-cover text-ink' : 'border-chalk-soft/50 hover:border-chalk'}`}
            >
              {LABEL[k]}
              <span className="tabular ml-2 opacity-70">{data.counts[k]}</span>
            </button>
          );
        })}
      </div>
      {data.mine && <p className="text-sm text-chalk-soft">Toque de novo para desfazer.</p>}
    </div>
  );
}
