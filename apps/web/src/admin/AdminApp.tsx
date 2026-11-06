/**
 * Minimal editorial panel (UX_SPEC.md §7). Token in sessionStorage, never linked from
 * the public navigation. Plain tables, no datagrid.
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Route, Routes, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { ChallengesPage, ReportsPage } from './ChallengesPage';
import { LevelReportsPage } from './LevelReportsPage';
import { MetricsPage } from './MetricsPage';

const TOKEN_KEY = 'dc_admin_token';

function readToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function adminApi<T>(path: string, init: RequestInit & { json?: unknown } = {}) {
  return api<T>(`/v1/admin${path}`, {
    ...init,
    headers: { 'x-admin-token': readToken(), 'x-editor': 'painel', ...init.headers },
  });
}

const cell = 'border-b border-ink/10 px-2 py-1.5 text-left align-top';
const btn =
  'rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-paper hover:bg-ink/85 disabled:opacity-40';
const btnGhost = 'rounded-md border border-ink/30 px-3 py-1.5 text-sm font-semibold hover:bg-ink/5';
const input = 'rounded-md border border-ink/30 bg-paper px-2 py-1 text-sm';

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const e = error as ApiError;
  return (
    <p role="alert" className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-900">
      <strong>{e.code}</strong> {e.message}
      {Array.isArray(e.details?.rules) ? ` (${(e.details.rules as string[]).join(', ')})` : null}
    </p>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="flex flex-wrap items-center gap-4 border-b border-ink/15 px-4 py-3">
        <strong className="font-condensed text-xl uppercase">De Cabeça · Editorial</strong>
        <nav className="flex gap-3 text-sm font-semibold">
          <Link to="/admin">Jogadores</Link>
          <Link to="/admin/challenges">Fases</Link>
          <Link to="/admin/reports">Relatórios</Link>
          <Link to="/admin/level-reports">Relatos de erro</Link>
          <Link to="/admin/metrics">Métricas</Link>
        </nav>
        <button
          className="ml-auto text-sm underline"
          onClick={() => {
            sessionStorage.removeItem(TOKEN_KEY);
            location.reload();
          }}
        >
          Sair
        </button>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}

function Login() {
  const [token, setToken] = useState('');
  return (
    <div className="grid min-h-dvh place-items-center bg-paper p-4 text-ink">
      <form
        className="flex w-full max-w-sm flex-col gap-3"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          sessionStorage.setItem(TOKEN_KEY, token);
          location.reload();
        }}
      >
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Token de administrador
          <input
            className={input}
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
        </label>
        <button className={btn}>Entrar</button>
      </form>
    </div>
  );
}

interface PlayerRow {
  id: string;
  canonicalName: string;
  nationalityCode: string;
  verificationStatus: string;
  notabilityTier: string;
  spells: { verified: number; imported: number; other: number };
}

function PlayersPage() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [ids, setIds] = useState('');
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['admin-players', status, q],
    queryFn: () =>
      adminApi<{ total: number; items: PlayerRow[] }>(
        `/players?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}) })}`,
      ),
  });
  const importer = useMutation({
    mutationFn: () =>
      adminApi<{ created: unknown[]; existing: unknown[]; skipped: unknown[] }>(
        '/import/wikidata',
        {
          method: 'POST',
          json: { wikidataIds: ids.split(/[\s,]+/).filter(Boolean) },
        },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-players'] }),
  });

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="font-condensed text-3xl font-extrabold uppercase">Jogadores</h1>
        <div className="flex flex-wrap gap-2">
          <select
            className={input}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Status"
          >
            <option value="">Todos</option>
            {['imported', 'verified', 'draft', 'rejected'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <input
            className={input}
            placeholder="Buscar nome"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar"
          />
          <span className="self-center text-sm">{list.data?.total ?? '…'} jogadores</span>
        </div>
      </section>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          importer.mutate();
        }}
      >
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Importar do Wikidata (QIDs)
          <input
            className={`${input} w-80`}
            value={ids}
            onChange={(e) => setIds(e.target.value)}
            placeholder="Q529207 Q531814"
          />
        </label>
        <button className={btn} disabled={importer.isPending}>
          Importar
        </button>
        {importer.data && (
          <span className="text-sm">
            {importer.data.created.length} novos · {importer.data.existing.length} existentes ·{' '}
            {importer.data.skipped.length} ignorados
          </span>
        )}
        <ErrorNote error={importer.error} />
      </form>

      <ErrorNote error={list.error} />
      <table className="w-full text-sm">
        <thead>
          <tr>
            {['Jogador', 'País', 'Status', 'Tier', 'Passagens (verif./import.)'].map((h) => (
              <th key={h} className={`${cell} font-bold`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.data?.items.map((p) => (
            <tr key={p.id}>
              <td className={cell}>
                <Link className="font-semibold underline" to={`/admin/players/${p.id}`}>
                  {p.canonicalName}
                </Link>
              </td>
              <td className={cell}>{p.nationalityCode}</td>
              <td className={cell}>{p.verificationStatus}</td>
              <td className={cell}>{p.notabilityTier}</td>
              <td className={cell}>
                {p.spells.verified} / {p.spells.imported}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface Spell {
  id: string;
  clubId: string;
  club: { shortName: string; country: { isoCode: string } };
  spellType: 'professional' | 'loan' | 'youth';
  startDate: string | null;
  endDate: string | null;
  sortIndex: number;
  loanFromClub: { shortName: string } | null;
  verificationStatus: string;
}
interface PlayerDetail {
  id: string;
  canonicalName: string;
  verificationStatus: string;
  notabilityTier: string;
  primaryPositionGroup: string | null;
  sourceRef: string | null;
  wikidataId: string | null;
  aliases: { id: string; alias: string; kind: string }[];
  spells: Spell[];
  dq: { rule: string; severity: string; message: string }[];
}

const year = (d: string | null) => (d ? d.slice(0, 4) : '');

function PlayerPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const key = ['admin-player', id];
  const player = useQuery({
    queryKey: key,
    queryFn: () => adminApi<PlayerDetail>(`/players/${id}`),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const mutate = useMutation({
    mutationFn: ({ path, method, json }: { path: string; method: string; json?: unknown }) =>
      adminApi(path, { method, json }),
    onSuccess: refresh,
  });
  const [alias, setAlias] = useState('');
  const p = player.data;
  if (!p) return <ErrorNote error={player.error} />;
  const patchPlayer = (json: object) =>
    mutate.mutate({ path: `/players/${id}`, method: 'PATCH', json });

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-center gap-3">
        <h1 className="font-condensed text-3xl font-extrabold uppercase">{p.canonicalName}</h1>
        <span className="rounded-full bg-ink/10 px-2 py-0.5 text-sm font-semibold">
          {p.verificationStatus}
        </span>
        {p.wikidataId && (
          <a
            className="text-sm underline"
            href={`https://www.wikidata.org/wiki/${p.wikidataId}`}
            target="_blank"
            rel="noreferrer"
          >
            {p.wikidataId}
          </a>
        )}
        <div className="ml-auto flex gap-2">
          {p.verificationStatus !== 'verified' && (
            <button className={btn} onClick={() => patchPlayer({ verificationStatus: 'verified' })}>
              Verificar
            </button>
          )}
          {p.verificationStatus !== 'rejected' && p.verificationStatus !== 'verified' && (
            <button
              className={btnGhost}
              onClick={() => patchPlayer({ verificationStatus: 'rejected' })}
            >
              Rejeitar
            </button>
          )}
          {(p.verificationStatus === 'verified' || p.verificationStatus === 'rejected') && (
            <button
              className={btnGhost}
              onClick={() => patchPlayer({ verificationStatus: 'imported' })}
            >
              Reabrir
            </button>
          )}
        </div>
      </section>
      <ErrorNote error={mutate.error} />

      {p.dq.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm" aria-label="Avisos de qualidade">
          {p.dq.map((v, i) => (
            <li key={i} className={v.severity === 'block' ? 'text-red-800' : 'text-amber-800'}>
              <strong>{v.rule}</strong> {v.message}
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          Posição
          <select
            className={input}
            value={p.primaryPositionGroup ?? ''}
            onChange={(e) => patchPlayer({ primaryPositionGroup: e.target.value || null })}
          >
            <option value="">—</option>
            {['GK', 'DF', 'MF', 'FW'].map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Tier
          <select
            className={input}
            value={p.notabilityTier}
            onChange={(e) => patchPlayer({ notabilityTier: e.target.value })}
          >
            {['T1', 'T2', 'T3', 'T4'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-condensed text-xl font-extrabold uppercase">Aliases</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {p.aliases.map((a) => (
            <li key={a.id} className="flex items-center gap-1 rounded-full bg-ink/10 px-2 py-0.5">
              {a.alias} <em className="text-ink/60">{a.kind}</em>
              <button
                aria-label={`Remover ${a.alias}`}
                onClick={() =>
                  mutate.mutate({ path: `/players/${id}/aliases/${a.id}`, method: 'DELETE' })
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            mutate.mutate({
              path: `/players/${id}/aliases`,
              method: 'POST',
              json: { alias, kind: 'nickname' },
            });
            setAlias('');
          }}
        >
          <input
            className={input}
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="Apelido"
            aria-label="Novo apelido"
          />
          <button className={btnGhost}>Adicionar</button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-condensed text-xl font-extrabold uppercase">Passagens</h2>
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Clube', 'Tipo', 'Início', 'Fim', 'Ordem', 'Status', ''].map((h) => (
                <th key={h} className={`${cell} font-bold`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.spells.map((s) => (
              <SpellRow
                key={s.id}
                spell={s}
                onSave={(json) =>
                  mutate.mutate({ path: `/players/${id}/spells/${s.id}`, method: 'PATCH', json })
                }
                onDelete={() =>
                  mutate.mutate({ path: `/players/${id}/spells/${s.id}`, method: 'DELETE' })
                }
              />
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function SpellRow({
  spell,
  onSave,
  onDelete,
}: {
  spell: Spell;
  onSave: (json: object) => void;
  onDelete: () => void;
}) {
  const [type, setType] = useState(spell.spellType);
  const [from, setFrom] = useState(year(spell.startDate));
  const [to, setTo] = useState(year(spell.endDate));
  const [order, setOrder] = useState(spell.sortIndex);
  const yearDate = (y: string) => (y ? `${y}-01-01` : null);
  return (
    <tr>
      <td className={cell}>
        {spell.club.shortName} <span className="text-ink/60">{spell.club.country.isoCode}</span>
        {spell.loanFromClub && (
          <div className="text-xs text-ink/60">emp. de {spell.loanFromClub.shortName}</div>
        )}
      </td>
      <td className={cell}>
        <select
          className={input}
          value={type}
          onChange={(e) => setType(e.target.value as Spell['spellType'])}
          aria-label="Tipo"
        >
          {['professional', 'loan', 'youth'].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </td>
      <td className={cell}>
        <input
          className={`${input} w-20`}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          inputMode="numeric"
          aria-label="Ano de início"
        />
      </td>
      <td className={cell}>
        <input
          className={`${input} w-20`}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          inputMode="numeric"
          aria-label="Ano de fim"
        />
      </td>
      <td className={cell}>
        <input
          className={`${input} w-14`}
          type="number"
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
          aria-label="Ordem"
        />
      </td>
      <td className={cell}>{spell.verificationStatus}</td>
      <td className={`${cell} whitespace-nowrap`}>
        <button
          className={btnGhost}
          onClick={() =>
            onSave({
              spellType: type,
              startDate: yearDate(from),
              startPrecision: from ? 'year' : 'unknown',
              endDate: yearDate(to),
              endPrecision: to ? 'year' : 'unknown',
              sortIndex: order,
            })
          }
        >
          Salvar
        </button>{' '}
        {spell.verificationStatus !== 'verified' ? (
          <button className={btn} onClick={() => onSave({ verificationStatus: 'verified' })}>
            Verificar
          </button>
        ) : (
          <button className={btnGhost} onClick={() => onSave({ verificationStatus: 'imported' })}>
            Reabrir
          </button>
        )}{' '}
        <button className="text-sm text-red-800 underline" onClick={onDelete}>
          Excluir
        </button>
      </td>
    </tr>
  );
}

export default function AdminApp() {
  if (!readToken()) return <Login />;
  return (
    <Shell>
      <Routes>
        <Route index element={<PlayersPage />} />
        <Route path="players/:id" element={<PlayerPage />} />
        <Route path="challenges" element={<ChallengesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="level-reports" element={<LevelReportsPage />} />
        <Route path="metrics" element={<MetricsPage />} />
      </Routes>
    </Shell>
  );
}
