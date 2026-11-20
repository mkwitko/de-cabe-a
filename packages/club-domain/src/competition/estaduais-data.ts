/**
 * State championships (estaduais), 2026 regulations as data. One row per state; the builder in
 * `estaduais.ts` turns a row and the season's participants into a `Competition`. Sources are
 * press reports of the federations' regulations (the PDFs were not all public); where the press
 * disagrees the choice is in `note`. Also listed in scripts/club-pack/data/FONTES.md.
 *
 * Shape of a row: `groups` clubs groups (1 = one table) playing `legs` legs inside the group
 * (`own`) or only against the other group (`other`, two equal groups); `advance` picks the
 * knockout field from the group phase (its size is `ko`: 8, 4 or 2); `koLegs` are the legs of the
 * quarter-finals, semi-finals and final. `cotas` are the fixed shares of the broadcast/federation
 * money by reputation rank inside the competition (the last one repeats); `prizes` are paid by
 * final position (champion, then the rest of the semi-finalists). Money at base prices, reais.
 */
import type { Selector } from './schema';

export interface StateFormat {
  uf: string;
  name: string;
  /** Clubs in the first level in 2026 (generic rows: an estimate, see `note`). */
  size: number;
  groups: number;
  opponents: 'own' | 'other';
  legs: 1 | 2;
  advance: Selector[];
  ko: 2 | 4 | 8;
  koLegs: { quarter: 1 | 2; semi: 1 | 2; final: 1 | 2 };
  cotas: number[];
  /** Prize for the champion, the runner-up and the other semi-finalists. */
  prizes: { champion: number; runnerUp: number; semi: number };
  /** True: the figures below are an estimate scaled by division (`estimateScale`). */
  estimated: boolean;
  videoReferee: boolean;
  /** `documented`: format read from the sources; `generic`: this project's own format. */
  kind: 'documented' | 'generic';
  note: string;
  sources: string[];
}

const M = 1_000_000;
const K = 1_000;

/** Reference sources for the money of the large states (March 2026 reports). */
const MONEY = [
  'https://www.lance.com.br/lance-negocios/levantamento-aponta-disparidade-milionaria-de-cotas-e-premiacoes-entre-os-estaduais.html',
  'https://www.band.com.br/esportes/futebol/qual-estadual-paga-mais-no-brasil-veja-ranking-das-premiacoes',
];

export const DOCUMENTED: StateFormat[] = [
  {
    uf: 'SP',
    name: 'Campeonato Paulista',
    size: 16,
    groups: 2,
    opponents: 'own',
    legs: 1,
    advance: [{ positions: [1, 4] }],
    ko: 8,
    koLegs: { quarter: 1, semi: 1, final: 2 },
    // Corinthians, Palmeiras, Sao Paulo, Santos R$ 35 mi each; Mirassol and Bragantino R$ 10 mi;
    // the others R$ 7-8 mi (ranks by reputation stand in for the names).
    cotas: [35 * M, 35 * M, 35 * M, 35 * M, 10 * M, 10 * M, 7_500 * K],
    prizes: { champion: 5 * M, runnerUp: 1_500 * K, semi: 0 },
    estimated: false,
    videoReferee: true,
    kind: 'documented',
    note: 'Real: 16 clubs, one round of 8 draw-picked matches, top 8, single-game quarters and semis; the final is two legs (Goal, Wikipedia; Palmeiras club site says one game). Modelled as two groups of 8, one round. Relegation (2) not modelled: the field is rebuilt each year.',
    sources: [
      'https://www.band.com.br/esportes/paulistao-entenda-novo-regulamento-e-veja-jogos-sorteados',
      'https://www.gazetaesportiva.com/campeonatos/paulista/paulistao-2026-novo-formato-como-sera-disputa/',
      'https://en.wikipedia.org/wiki/2026_Campeonato_Paulista',
      'https://abcdoabc.com.br/paulistao-2026-grandes-ganham-milhoes-cada/',
      'https://www.band.com.br/esportes/quanto-o-palmeiras-ganha-com-o-titulo-do-paulistao-veja-premiacoes-202603082239',
    ],
  },
  {
    uf: 'RJ',
    name: 'Campeonato Carioca',
    size: 12,
    groups: 2,
    opponents: 'other',
    legs: 1,
    advance: [{ positions: [1, 4] }],
    ko: 8,
    koLegs: { quarter: 1, semi: 1, final: 1 },
    // Flamengo R$ 10 mi, Botafogo / Fluminense / Vasco R$ 6.6 mi; the others: ESTIMATE.
    cotas: [10 * M, 6_600 * K, 6_600 * K, 6_600 * K, 1 * M],
    prizes: { champion: 10 * M, runnerUp: 5_500 * K, semi: 5_500 * K },
    estimated: false,
    videoReferee: true,
    kind: 'documented',
    note: 'Real: 12 clubs in two groups of 6 who do not meet inside the group (10 rounds with the Taca Rio side), top 4 of each, single-game quarters, single final at the Maracana (FERJ via Band, Lance). Taca Guanabara/Taca Rio not modelled. Prize for the runner-up: the press gives champion R$ 10 mi and semi-finalists R$ 5.5 mi only (assumed equal).',
    sources: [
      'https://www.band.com.br/esportes/campeonato-carioca-2026-quando-comeca-regulamento-e-todos-os-jogos-202512311732',
      'https://jovempan.com.br/esportes/futebol/campeonato-carioca-tem-reducao-de-dias-e-passara-a-ter-final-unica.html',
      'https://www.mktesportivo.com/2025/11/campeonato-carioca-de-2026-volta-a-pagar-premiacao-aos-clubes-e-define-alteracoes-no-regulamento/',
      'https://www.netvasco.com.br/n/375667/vasco-recebera-r-66-milhoes-fixos-mais-premiacao-por-metas-no-carioca-2026',
      ...MONEY,
    ],
  },
  {
    uf: 'MG',
    name: 'Campeonato Mineiro',
    size: 12,
    groups: 3,
    opponents: 'own',
    legs: 2,
    advance: [{ positions: [1, 1] }, { positions: [2, 2], best: 1 }],
    ko: 4,
    koLegs: { quarter: 1, semi: 2, final: 1 },
    // Atletico-MG and Cruzeiro R$ 9 mi; the others: ESTIMATE. No prize money for the champion.
    cotas: [9 * M, 9 * M, 1_500 * K],
    prizes: { champion: 0, runnerUp: 0, semi: 0 },
    estimated: false,
    videoReferee: true,
    kind: 'documented',
    note: 'Real 2026: 12 clubs, three groups of 4, each plays the other groups (8 matches); group leaders and the best runner-up reach two-leg semis; single final at the Mineirao on 7 March (FMF via Itatiaia, Goal). Modelled as three groups playing home and away inside the group.',
    sources: [
      'https://www.itatiaia.com.br/esportes/futebol/futebol-nacional/campeonato-mineiro/fmf-confirma-retorno-da-final-unica-para-o-campeonato-mineiro-de-2026/',
      'https://www.goal.com/br/listas/como-funciona-regulamento-campeonato-mineiro-2026/blt0c685dc1bbf74c1a',
      'https://www.band.com.br/esportes/campeonato-mineiro-regulamento-onde-assistir-e-curiosidades-202601100129',
      ...MONEY,
    ],
  },
  {
    uf: 'RS',
    name: 'Campeonato Gaúcho',
    size: 12,
    groups: 2,
    opponents: 'other',
    legs: 1,
    advance: [{ positions: [1, 4] }],
    ko: 8,
    koLegs: { quarter: 1, semi: 2, final: 2 },
    // Gremio and Internacional about R$ 10 mi; the others: ESTIMATE. No prize for the champion.
    cotas: [10 * M, 10 * M, 1_200 * K],
    prizes: { champion: 0, runnerUp: 0, semi: 0 },
    estimated: false,
    videoReferee: true,
    kind: 'documented',
    note: 'Real 2026: 12 clubs in two groups of 6 who meet only the other group, top 4 of each, single-game quarters, two-leg semis and final (FGF regulation PDF, press). Relegation format differs between sources; not modelled.',
    sources: [
      'https://www.fgf.com.br/public/uploads/noticias/693caa950a28d-Gauch%C3%A3o%20SUPERBET%202026%20-%20REC_251212_205059.pdf',
      'https://www.goal.com/br/listas/como-funciona-regulamento-campeonato-gaucho-2026/bltbab8e2c2e3c8fca8',
      'https://www.band.com.br/esportes/campeonato-gaucho-confira-o-regulamento-times-e-os-primeiros-jogos-202601091648',
      ...MONEY,
    ],
  },
  {
    uf: 'PR',
    name: 'Campeonato Paranaense',
    size: 12,
    groups: 2,
    opponents: 'other',
    legs: 1,
    advance: [{ positions: [1, 4] }],
    ko: 8,
    koLegs: { quarter: 2, semi: 2, final: 2 },
    // No public table found: ESTIMATE.
    cotas: [2_500 * K, 2_500 * K, 1 * M],
    prizes: { champion: 500 * K, runnerUp: 250 * K, semi: 0 },
    estimated: true,
    videoReferee: true,
    kind: 'documented',
    note: 'Real 2026: 12 clubs in two groups of 6 meeting the other group, 8 advance, knockouts home and away (Londrina leak, Band/BandAB; the FPF first denied it, the arbitral council then confirmed). Prize money not found: estimate.',
    sources: [
      'https://www.bandab.com.br/esporte/futebol/paranaense-2026-regulamento-definido-inicio-janeiro-veja-detalhes/amp/',
      'https://www.bandab.com.br/esporte/futebol/londrina-fura-fpf-regulamento-formato-do-paranaense-2026/amp/',
      'https://en.wikipedia.org/wiki/2026_Campeonato_Paranaense',
    ],
  },
  {
    uf: 'SC',
    name: 'Campeonato Catarinense',
    size: 12,
    groups: 2,
    opponents: 'other',
    legs: 1,
    advance: [{ positions: [1, 4] }],
    ko: 8,
    koLegs: { quarter: 1, semi: 2, final: 2 },
    cotas: [2 * M, 2 * M, 1 * M],
    prizes: { champion: 400 * K, runnerUp: 200 * K, semi: 0 },
    estimated: true,
    videoReferee: true,
    kind: 'documented',
    note: 'Real 2026: 12 clubs in two groups of 6 (NSC Total, Wikipedia), 10 clubs from 2027. The press found does not give the knockout size or the group opponents: ASSUMED other-group fixtures, top 4 of each, two-leg semis and final. Money: estimate.',
    sources: [
      'https://www.nsctotal.com.br/?p=7687334',
      'https://www.nsctotal.com.br/?p=7770379',
      'https://en.wikipedia.org/wiki/2026_Campeonato_Catarinense',
    ],
  },
  {
    uf: 'BA',
    name: 'Campeonato Baiano',
    size: 10,
    groups: 1,
    opponents: 'own',
    legs: 1,
    advance: [{ positions: [1, 4] }],
    ko: 4,
    koLegs: { quarter: 1, semi: 1, final: 1 },
    // Bahia and Vitoria R$ 1.2 mi; the others: ESTIMATE. Champion R$ 315 mil (2025 figure).
    cotas: [1_200 * K, 1_200 * K, 400 * K],
    prizes: { champion: 315 * K, runnerUp: 150 * K, semi: 0 },
    estimated: false,
    videoReferee: true,
    kind: 'documented',
    note: 'Real 2026: 10 clubs, one round, top 4, single-game semis and final, better campaign at home (FBF via BNews, A Tarde). Two relegated, not modelled. Champion prize is the 2025 figure.',
    sources: [
      'https://www.bnews.com.br/noticias/esporte/novo-formato-saiba-o-que-muda-no-regulamento-do-baianao-2026.html',
      'https://atarde.com.br/esportes/campeonato-baiano-2026-tera-duas-datas-a-menos-e-final-em-jogo-unico-1366907',
      'https://en.wikipedia.org/wiki/2026_Campeonato_Baiano',
      ...MONEY,
    ],
  },
  {
    uf: 'PE',
    name: 'Campeonato Pernambucano',
    size: 8,
    groups: 1,
    opponents: 'own',
    legs: 1,
    advance: [{ positions: [1, 2] }],
    ko: 2,
    koLegs: { quarter: 1, semi: 1, final: 2 },
    // The FPF fixed the 2026 pool at R$ 3 mi; the split below (3 larger shares) is ASSUMED.
    cotas: [600 * K, 600 * K, 600 * K, 240 * K],
    prizes: { champion: 0, runnerUp: 0, semi: 0 },
    estimated: false,
    videoReferee: false,
    kind: 'documented',
    note: 'Real 2026: only 8 clubs, single round, final in two legs between the top two (Diario de Pernambuco). The 2026/27 season merges the divisions (24 clubs, new model): not modelled.',
    sources: [
      'https://www.diariodepernambuco.com.br/esportes-dp/nacional/2025/11/11701734-fpf-fixa-cotas-do-pernambucano-2026-em-rs-3-milhoes-confira-divisao.html',
      'https://www.diariodepernambuco.com.br/amp/esportes-dp/nacional/2025/11/11701720-pernambucano-de-2026-e-confirmado-com-final-em-ida-e-volta-confira-formato-da-disputa.html',
      'https://portaldeprefeitura.com.br/esportes/campeonato-pernambucano-de-futebol-de-2026-com-apenas-oito-clubes/606220/',
    ],
  },
  {
    uf: 'CE',
    name: 'Campeonato Cearense',
    size: 10,
    groups: 2,
    opponents: 'other',
    legs: 1,
    advance: [{ positions: [1, 2] }],
    ko: 4,
    koLegs: { quarter: 1, semi: 2, final: 2 },
    cotas: [2 * M, 2 * M, 500 * K],
    prizes: { champion: 300 * K, runnerUp: 150 * K, semi: 0 },
    estimated: true,
    videoReferee: false,
    kind: 'documented',
    note: 'Real 2026: 10 clubs in two groups of 5, then each club plays 3 matches against the qualified clubs of the other group (Diario do Nordeste). Modelled as other-group fixtures, top 2 of each group to two-leg semis and final. Money: estimate.',
    sources: [
      'https://diariodonordeste.verdesmares.com.br/jogada/regulamento-do-campeonato-cearense-2026-tera-mudancas-veja-nova-formula-e-tabela-1.3707688',
      'https://en.wikipedia.org/wiki/2026_Campeonato_Cearense',
    ],
  },
  {
    uf: 'GO',
    name: 'Campeonato Goiano',
    size: 12,
    groups: 3,
    opponents: 'own',
    legs: 2,
    advance: [{ positions: [1, 2] }, { positions: [3, 3], best: 2 }],
    ko: 8,
    koLegs: { quarter: 1, semi: 2, final: 2 },
    cotas: [3 * M, 3 * M, 800 * K],
    prizes: { champion: 400 * K, runnerUp: 200 * K, semi: 0 },
    estimated: true,
    videoReferee: false,
    kind: 'documented',
    note: 'Real 2026: 12 clubs in three groups of 4 (O Hoje, O Popular); the knockout rules were not in the reports found: ASSUMED top 2 of each group plus the two best thirds, single-game quarters, two-leg semis and final. The last place is relegated (not modelled). Money: estimate.',
    sources: [
      'https://ohoje.com/2025/11/26/goiano-de-2026-tera-calendario-ampliado/',
      'https://www.jornalopcao.com.br/futebol/goianao-2026-tv-brasil-central-garante-mais-de-40-transmissoes-exclusivas-e-estreia-novo-formato-778719/',
      'https://en.wikipedia.org/wiki/2026_Campeonato_Goiano',
    ],
  },
];

/**
 * The other 17 states: no regulation was researched, so a generic format by size (see
 * `genericFormat`): one table (or two groups from 11 clubs) and a knockout of the best four.
 * `size` is an approximate count of the first level, an ESTIMATE; money by `SMALL`/`MEDIUM`.
 */
export const GENERIC: Record<string, { name: string; size: number; tier: 'medium' | 'small' }> = {
  AC: { name: 'Campeonato Acreano', size: 8, tier: 'small' },
  AL: { name: 'Campeonato Alagoano', size: 8, tier: 'small' },
  AM: { name: 'Campeonato Amazonense', size: 8, tier: 'medium' },
  AP: { name: 'Campeonato Amapaense', size: 8, tier: 'small' },
  DF: { name: 'Campeonato Brasiliense', size: 10, tier: 'medium' },
  ES: { name: 'Campeonato Capixaba', size: 10, tier: 'medium' },
  MA: { name: 'Campeonato Maranhense', size: 8, tier: 'medium' },
  MS: { name: 'Campeonato Sul-Mato-Grossense', size: 8, tier: 'small' },
  MT: { name: 'Campeonato Mato-Grossense', size: 12, tier: 'medium' },
  PA: { name: 'Campeonato Paraense', size: 12, tier: 'medium' },
  PB: { name: 'Campeonato Paraibano', size: 10, tier: 'medium' },
  PI: { name: 'Campeonato Piauiense', size: 8, tier: 'small' },
  RN: { name: 'Campeonato Potiguar', size: 8, tier: 'medium' },
  RO: { name: 'Campeonato Rondoniense', size: 8, tier: 'small' },
  RR: { name: 'Campeonato Roraimense', size: 6, tier: 'small' },
  SE: { name: 'Campeonato Sergipano', size: 10, tier: 'small' },
  TO: { name: 'Campeonato Tocantinense', size: 8, tier: 'small' },
};

/**
 * ESTIMATE of fixed shares for states without a public table, by reputation rank (two largest,
 * then the rest) and prize for the champion; the press only says these small estaduais pay far
 * below the large ones (Lance, "disparidade milionaria"). Scaled by division in `estaduais.ts`.
 */
export const ESTIMATE = {
  medium: { cotas: [1_500 * K, 1_500 * K, 600 * K], champion: 300 * K, runnerUp: 100 * K },
  small: { cotas: [600 * K, 600 * K, 250 * K], champion: 150 * K, runnerUp: 50 * K },
};
