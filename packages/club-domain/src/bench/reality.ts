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
import { ABROAD, isAbroad } from '../market/abroad';
import { isImport } from '../career/development';
import { OPENING, rateOf } from '../market/currency';
import { dayOf } from '../competition/calendar';
import { booksOf, budgetOf } from '../market/books';
import { squadPlanOf } from '../market/plan';
import { isForeign } from '../career/squad';
import { ageOf, marketValue } from '../market/value';
import { ticketOf, usualCrowd } from '../match/stadium';
import { topScorers } from '../career/scoring';
import { divisionTableOf } from '../career/advance';
import { performanceTv, tvOf } from '../career/revenue';
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

/** The rate the career opens at (PTAX, currency.ts): the targets in dollars, in its reais. */
const BRL_PER_USD = OPENING.USD / 10_000;
const serieA = (w: CareerWorld) => nationalDivisions(w.pack).find((d) => d.tier === 1)!;
const serieAClubs = (w: CareerWorld) => w.season.members[serieA(w).id] ?? [];

/** Mean per Série A match of what `pick` reads of each side's [yellows, reds]. */
function cardsIn(w: CareerWorld, pick: (c: [number, number]) => number): number {
  const id = serieA(w).id;
  let sum = 0;
  let games = 0;
  for (const [match, o] of w.season.outcomes) {
    if (w.season.meta.get(match)?.competitionId !== id) continue;
    sum += pick(o.cards[0]) + pick(o.cards[1]);
    games++;
  }
  return sum / Math.max(1, games);
}

/**
 * Reais of the season at the rate the targets were set at: the targets are dollars, so a
 * season the real swung is read back in dollars (the rate at mid-season, currency.ts).
 */
const atOpeningRate = (w: CareerWorld, reais: number) =>
  (reais * OPENING.USD) / rateOf(w, 'USD', dayOf(`${w.season.season}-07-01`));

const TARGETS: Target[] = [
  {
    name: 'Artilheiro da Série A (gols)',
    // CBF: Brasileirão top scorers 2019-2025 ran from 15 (2025) to 26 (Cano, 2022; Gabigol, 25 in
    // 2019); the band is the task's 15-29 to allow a 38-round season's spread.
    range: [15, 29],
    source: 'CBF, artilheiros do Brasileirão 2019-2025 (15 a 26 gols)',
    confirmed: true,
    measure: (w) => topScorers(w, 'goals', 1, new Set(serieAClubs(w)))[0]?.goals ?? 0,
  },
  {
    name: 'Gols de atacantes na Série A (%)',
    // a confirmar: a typical football-analytics split (strikers and wingers about half of all
    // goals, midfield a third, defenders the rest); no source tied to the Brasileirão yet.
    range: [45, 65],
    source: 'a confirmar (divisão típica de gols por posição, análises de futebol)',
    confirmed: false,
    measure: (w) => {
      const clubs = new Set(serieAClubs(w));
      const byId = new Map(w.pack.players.map((p) => [p.id, p]));
      const pos = (id: string) => byId.get(id)?.positions[0]!.position;
      let all = 0;
      let fwd = 0;
      for (const [id, [g]] of Object.entries(w.scored ?? {})) {
        const p = byId.get(id);
        if (!p || !clubs.has(p.clubId ?? '')) continue;
        all += g;
        if (['ST', 'SS', 'LW', 'RW'].includes(pos(id)!)) fwd += g;
      }
      return (fwd * 100) / Math.max(1, all);
    },
  },
  {
    name: 'Vendas ao exterior na temporada (R$ bi)',
    // BCB 2025: US$ 553.7M received; FIFA Global Transfer Report 2025: US$ 689M received.
    range: [(450e6 * BRL_PER_USD) / 1e9, (800e6 * BRL_PER_USD) / 1e9],
    source: 'Banco Central 2025 (US$ 554 mi) e FIFA Global Transfer Report 2025 (US$ 689 mi)',
    confirmed: true,
    // The foreign side's book (abroad.ts): what foreign clubs paid for the league's players.
    measure: (w) => atOpeningRate(w, w.books?.[ABROAD]?.spent ?? 0) / 1e9,
  },
  {
    name: 'Compras do exterior na temporada (R$ bi)',
    // BCB, SGS 22858 minus 22857 (passes de atletas, receita − saldo): US$ 122M in 2023,
    // 180M in 2024, 235M in 2025. The band holds the last two years.
    range: [(150e6 * BRL_PER_USD) / 1e9, (300e6 * BRL_PER_USD) / 1e9],
    source: 'Banco Central, SGS 22858/22857: US$ 180 mi (2024) e 235 mi (2025) pagos ao exterior',
    confirmed: true,
    measure: (w) => atOpeningRate(w, w.books?.[ABROAD]?.earned ?? 0) / 1e9,
  },
  {
    name: 'Valor de mercado dos 10 mais valiosos do Brasileirão (R$ bi, soma)',
    range: [1.4, 2.6],
    // CIES (24/09/2026, via Tribuna de Jundiaí): Flaco López 53,9, Vitor Roque 53,2, Kaio Jorge
    // 41,8, Montoro 37,4, Lino 31,3, Arroyo 30,7, Bidon 28,9, Giay 28,0, Martinelli 24,9, Gómez
    // 24,5 = € 354,6 mi a R$ 5,90. Only the order of magnitude: the pack is an FM snapshot with
    // other players, and CIES does not publish a full list.
    source:
      'CIES Football Observatory, 10 mais valiosos do Brasil, set/2026: € 354,6 mi (R$ 2,1 bi)',
    confirmed: true,
    measure: (w) => {
      const inA = new Set(serieAClubs(w));
      return (
        w.pack.players
          .filter((p) => p.clubId && inA.has(p.clubId))
          .map((p) => marketValue(w.pack, p, w.season.season))
          .sort((a, b) => b - a)
          .slice(0, 10)
          .reduce((a, b) => a + b, 0) / 1e9
      );
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
    // 14-28% of revenue in the 2025 audited accounts. Signings here and from abroad count; the
    // floor sits under 14 since amortisation spreads older, dearer signings over the years.
    range: [8, 28],
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
    // The pack's 2027 Série A is not 2025's (the FM save's own promotions): a wider range.
    name: 'Público médio da Série A (mil)',
    range: [21, 30],
    source: 'ge 2025: 25.531 pagantes por jogo (Máquina do Esporte)',
    confirmed: true,
    measure: (w) => {
      const ids = serieAClubs(w);
      const crowds = ids.map((id) => usualCrowd(w.pack.clubs.find((c) => c.id === id)!));
      return crowds.reduce((a, b) => a + b, 0) / Math.max(1, crowds.length) / 1000;
    },
  },
  {
    name: 'Bilheteria bruta da Série A na temporada (R$ mi)',
    range: [400, 650],
    source: 'Máquina do Esporte: R$ 518 mi brutos no Brasileirão 2025',
    confirmed: true,
    measure: (w) =>
      serieAClubs(w).reduce((s, id) => {
        const c = w.pack.clubs.find((x) => x.id === id)!;
        return s + usualCrowd(c) * ticketOf(c, 1) * 19;
      }, 0) / 1e6,
  },
  {
    name: 'TV da Série A: maior clube / clube mediano (vezes)',
    // Club TV revenue 2025 (press / Sports Value): Flamengo R$ 612 mi against Grêmio R$ 156 mi,
    // about the middle of the table: 3.9x. The money is equal + audience + position (revenue.ts).
    range: [2.8, 5.2],
    source: 'Receita de TV 2025: Flamengo R$ 612 mi, Grêmio R$ 156 mi (imprensa / Sports Value)',
    confirmed: true,
    measure: (w) => {
      const ids = serieAClubs(w);
      const tv = ids
        .map((id) => {
          const rows = divisionTableOf(w, id).rows;
          const parts = tvOf(w, id, 1);
          return (
            parts.equal +
            parts.audience +
            performanceTv(parts.perfMean, rows.findIndex((r) => r.clubId === id) + 1, rows.length)
          );
        })
        .sort((a, b) => a - b);
      return tv.at(-1)! / tv[Math.floor(tv.length / 2)]!;
    },
  },
  {
    name: 'Vitórias do mandante na Série A (%)',
    range: [44, 53],
    source: 'Brasileirão 2023-2025: 46,8 %, 47,4 %, 50,3 % (Wikipedia, tabela de resultados)',
    confirmed: true,
    measure: (w) => {
      const id = serieA(w).id;
      let home = 0;
      let games = 0;
      for (const [match, o] of w.season.outcomes) {
        if (w.season.meta.get(match)?.competitionId !== id) continue;
        if (o.goals[0] > o.goals[1]) home++;
        games++;
      }
      return (100 * home) / Math.max(1, games);
    },
  },
  {
    name: 'Cartões por jogo na Série A',
    range: [4.5, 6.0],
    source:
      'Brasileirão 2025: mais de cinco por jogo; árbitros de 4,0 a 7,3 (Itatiaia, Correio Braziliense; a confirmar)',
    confirmed: false,
    measure: (w) => cardsIn(w, (c) => c[0] + c[1]),
  },
  {
    name: 'Expulsões por jogo na Série A',
    range: [0.2, 0.4],
    source: 'ge 2025: 83 expulsões em 27 rodadas, 0,31 por jogo (via 90min)',
    confirmed: true,
    measure: (w) => cardsIn(w, (c) => c[1]),
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
  {
    name: 'Estrangeiros contratados por temporada (pack)',
    // Série A squads held 123 foreigners in 2024 and 137-139 in 2025 (Goal, Trivela): with the
    // ones who leave, some 45 arrive a year in the top flight, a few more below it.
    range: [30, 90], // was 35: real cash and debt (rules 57) trimmed 36 to 34, seed noise is +-5
    source: 'Goal e Trivela: 123 estrangeiros na Série A 2024, 137-139 em 2025',
    confirmed: false,
    measure: (w) =>
      Object.entries(w.moves ?? {}).filter(([id, m]) => isImport(id) && !isAbroad(m.clubId)).length,
  },
  {
    name: 'Estrangeiros nos elencos da Série A (%)',
    // Itatiaia: foreigners are 16% of the Série A players; Série A 2026 opened with 151.
    range: [12, 22],
    source: 'Itatiaia: estrangeiros são 16% dos jogadores do Brasileirão',
    confirmed: false,
    measure: (w) => {
      const clubs = new Set(w.season.members[serieA(w).id] ?? []);
      const squad = w.pack.players.filter((p) => p.clubId !== null && clubs.has(p.clubId));
      return (100 * squad.filter(isForeign).length) / Math.max(1, squad.length);
    },
  },
  {
    name: 'Técnicos demitidos na Série A por temporada',
    // Band (Sep 2025): 19 changes by round 24, 0.79 a round, as in 2010 (30, the record of the
    // 20-club era, Soccerway); 2015 had 32. Changes include resignations: a little above sackings.
    range: [15, 30],
    source: 'Band 2025: 0,79 troca por rodada; recorde de 30 em 2010 (Soccerway)',
    confirmed: false,
    measure: (w) => {
      const clubs = new Set(w.season.members[serieA(w).id] ?? []);
      return (w.sacked ?? []).filter((c) => clubs.has(c)).length;
    },
  },
];

/** Clubs of the division of that tier in the season's world. */
const tierClubs = (w: CareerWorld, tier: number) =>
  new Set(w.season.members[nationalDivisions(w.pack).find((d) => d.tier === tier)!.id] ?? []);
/** (a) clubs with at least one change; (b) sackings; (c) hires (the model has no interims). */
const turnover = {
  clubs: (w: CareerWorld, tier: number) => {
    const c = tierClubs(w, tier);
    return new Set((w.sacked ?? []).filter((x) => c.has(x))).size;
  },
  sackings: (w: CareerWorld, tier: number) => {
    const c = tierClubs(w, tier);
    return (w.sacked ?? []).filter((x) => c.has(x)).length;
  },
  // Every sacking is a hire once the vacancy is filled; the open ones are not hires yet.
  hires: (w: CareerWorld, tier: number) => {
    const c = tierClubs(w, tier);
    return (
      turnover.sackings(w, tier) - Object.keys(w.vacancies ?? {}).filter((x) => c.has(x)).length
    );
  },
};
const NO_TARGET: [number, number] = [0, 1000];
const INFO = 'Contagem informativa (sem alvo)';
const LINES: [number, string, [number, number], string, boolean][] = [
  [1, 'A', NO_TARGET, INFO, false],
  [2, 'B', [12, 18], 'Imprensa 2026: 16 dos 20 clubes da Série B trocaram de técnico', true],
  [3, 'C', [11, 19], 'Imprensa 2026: 15 clubes e 20 trocas até setembro (Série C)', true],
  [4, 'D', [20, 75], 'Provisório, sem fonte confirmada na Série D (só avisa)', false],
];
for (const [tier, letter, range, source, confirmed] of LINES) {
  const add = (what: string, key: keyof typeof turnover, r = NO_TARGET, s = INFO, c = false) =>
    TARGETS.push({
      name: `Técnicos ${what} na Série ${letter}`,
      range: r,
      source: s,
      confirmed: c,
      measure: (w) => turnover[key](w, tier),
    });
  add('com troca', 'clubs', range, source, confirmed);
  if (tier !== 1) add('demitidos', 'sackings');
  add('contratados', 'hires');
}

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
  // A season of one world is a sample, as a real year is: the mean of the seeds is checked, and
  // each seed is printed.
  const seeds = [7, 11, 13];
  const worlds = seeds.map((s) => playSeason(pack, s));
  let failed = 0;
  console.log('alvo | faixa | ' + seeds.map((s) => `seed ${s}`).join(' | ') + ' | média | fonte');
  for (const t of TARGETS) {
    const values = worlds.map(t.measure);
    const mean = values.reduce((x, y) => x + y, 0) / values.length;
    const ok = mean >= t.range[0] && mean <= t.range[1];
    if (!ok && t.confirmed) failed++;
    const mark = ok ? 'ok' : t.confirmed ? 'FORA' : 'aviso';
    console.log(
      `${mark} ${t.name} | ${t.range.map((x) => x.toFixed(1)).join('–')} | ${values
        .map((v) => v.toFixed(2))
        .join(' | ')} | média ${mean.toFixed(2)} | ${t.source}`,
    );
  }
  if (failed) {
    console.error(`reality: ${failed} alvo(s) com fonte fora da faixa`);
    process.exit(1);
  }
}

main();
