/**
 * Calibration against reality (mapa de conhecimento §2.14, entrega 2): plays seasons of the real
 * pack and checks what comes out against figures with a source, each with a tolerance. Prints a
 * table and exits 1 when a figure is out of its range, so a change that pulls the world away from
 * real football is caught. Not used by the game.
 *
 * Run: `pnpm --filter @decabeca/club-domain reality [path/to/pack.json.gz]` (default: the FM26
 * pack in apps/api/club-packs, which is not in git).
 *
 * Every target says where it comes from. A target without a confirmed source says so
 * ("a confirmar") and only warns.
 */
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { nextDecision, openCareer, playDecision, type CareerWorld } from '../career/advance';
import { jobOffers, nationalDivisions } from '../career/start';
import { isAbroad } from '../market/abroad';
import { booksOf, budgetOf } from '../market/books';
import { squadPlanOf } from '../market/plan';
import { ageOf } from '../market/value';
import { PackSchema, type Pack } from '../pack/schema';

interface Target {
  name: string;
  /** Inclusive range the measure must fall in. */
  range: [number, number];
  source: string;
  /** Confirmed source: out of range fails the run; otherwise it only warns. */
  confirmed: boolean;
  measure: (w: CareerWorld) => number;
}

const BRL_PER_USD = 5.5;
const serieA = (w: CareerWorld) => nationalDivisions(w.pack).find((d) => d.tier === 1)!;
const serieAClubs = (w: CareerWorld) => w.season.members[serieA(w).id] ?? [];

const TARGETS: Target[] = [
  {
    name: 'Vendas ao exterior na temporada (R$ bi)',
    // BCB 2025: US$ 553.7M received; FIFA Global Transfer Report 2025: US$ 689M received.
    range: [(450e6 * BRL_PER_USD) / 1e9, (800e6 * BRL_PER_USD) / 1e9],
    source: 'Banco Central 2025 (US$ 554 mi) e FIFA Global Transfer Report 2025 (US$ 689 mi)',
    confirmed: true,
    measure: (w) => {
      let fees = 0;
      for (const d of w.deals ?? []) if (isAbroad(d.to)) fees += d.fee;
      // `w.deals` keeps the last 80 only: read the sales from the clubs' books instead.
      const earned = Object.values(w.books ?? {}).reduce((s, b) => s + b.earned, 0);
      return Math.max(fees, earned) / 1e9;
    },
  },
  {
    // CIES counts the players who play in the league, not whole registered squads: the
    // eleven each club fields is the closer measure. Age at mid-season (birth year + half).
    name: 'Idade média de quem joga na Série A',
    range: [27.5, 29.5],
    source: 'CIES Football Observatory: 28,5 anos (jogadores utilizados)',
    confirmed: true,
    measure: (w) => {
      const byId = new Map(w.pack.players.map((p) => [p.id, p]));
      const ages = serieAClubs(w).flatMap((clubId) =>
        squadPlanOf({ pack: w.pack, clubId }).xi.map(
          (id) => ageOf(byId.get(id)!, w.season.season) - 0.5,
        ),
      );
      return ages.reduce((a, b) => a + b, 0) / Math.max(1, ages.length);
    },
  },
  {
    name: 'Gasto em contratações da Série A (% da receita, média)',
    // Rights amortisation, a proxy for yearly signings including those from abroad, ran at
    // 14-28% of revenue in the 2025 audited accounts; signings between clubs here are a share.
    range: [1, 28],
    source: 'Balanços auditados 2025 (Palmeiras, Grêmio, Santos, Inter, Vasco): amortização 14-28%',
    confirmed: true,
    measure: (w) => {
      const ids = serieAClubs(w);
      const shares = ids.map(
        (id) => (100 * booksOf(w, id).spent) / Math.max(1, budgetOf(w, id).income),
      );
      return shares.reduce((a, b) => a + b, 0) / Math.max(1, shares.length);
    },
  },
  {
    name: 'Gols por jogo na Série A',
    range: [2.0, 2.8],
    source: 'Brasileirão recente, cerca de 2,3 a 2,5 (a confirmar)',
    confirmed: false,
    measure: (w) => {
      const id = serieA(w).id;
      let goals = 0;
      let games = 0;
      for (const [match, o] of w.season.outcomes) {
        if (w.season.meta.get(match)?.competitionId !== id) continue;
        goals += o.goals[0] + o.goals[1];
        games++;
      }
      return goals / Math.max(1, games);
    },
  },
  {
    name: 'Jogadores vendidos ao exterior por temporada (pack)',
    // FIFA counts ~1,000 departures a year at every level; the pack holds Brazil's leagues
    // only, so the in-game figure is a share: kept where the exodus was calibrated (2026-11-18).
    range: [100, 180],
    source: 'Calibração interna do êxodo (FIFA: cerca de 1.000 saídas por ano, todos os níveis)',
    confirmed: false,
    measure: (w) => Object.values(w.moves ?? {}).filter((m) => isAbroad(m.clubId)).length,
  },
];

function playSeason(pack: Pack, seed: number): CareerWorld {
  const w = openCareer(pack, seed, jobOffers(pack, seed)[0]!.clubId);
  for (let d = nextDecision(w); d.kind === 'match'; d = nextDecision(w)) playDecision(w, d);
  return w;
}

function main() {
  const path =
    process.argv[2] ??
    new URL('../../../../apps/api/club-packs/br-fm26-1.json.gz', import.meta.url).pathname;
  if (!existsSync(path)) {
    console.error(`reality: no pack at ${path}`);
    process.exit(2);
  }
  const pack = PackSchema.parse(JSON.parse(gunzipSync(readFileSync(path)).toString()));
  const seeds = [7, 11];
  const worlds = seeds.map((s) => playSeason(pack, s));
  let failed = 0;
  console.log('alvo | faixa | ' + seeds.map((s) => `seed ${s}`).join(' | ') + ' | fonte');
  for (const t of TARGETS) {
    const values = worlds.map(t.measure);
    const ok = values.every((v) => v >= t.range[0] && v <= t.range[1]);
    if (!ok && t.confirmed) failed++;
    const mark = ok ? 'ok' : t.confirmed ? 'FORA' : 'aviso';
    console.log(
      `${mark} ${t.name} | ${t.range.map((x) => x.toFixed(1)).join('–')} | ${values
        .map((v) => v.toFixed(2))
        .join(' | ')} | ${t.source}`,
    );
  }
  if (failed) {
    console.error(`reality: ${failed} alvo(s) com fonte fora da faixa`);
    process.exit(1);
  }
}

main();
