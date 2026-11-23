/**
 * Regional cups and the Supercopa do Brasil, 2026 regulations as data (the builder is
 * `regionais.ts`). Sources (CBF "Regulamento Específico da Competição", table and press of
 * Jan-Jun 2026; also listed in scripts/club-pack/data/FONTES.md):
 *
 * Copa do Nordeste 2026 (CBF documentos técnicos; Wikipedia 2026 Copa do Nordeste; Itatiaia
 * "datas, novo formato e participantes"; Band "Copa do Nordeste começa hoje"; Itatiaia "valores
 * recebidos pelos times das copas regionais"):
 *  - 20 clubes em 4 grupos de 5; o grupo A enfrenta o B e o C o D, turno único (5 jogos cada);
 *    os 2 melhores de cada grupo vão às quartas (jogo único, melhor campanha em casa), semifinais e
 *    final em ida e volta; empate no agregado: pênaltis, sem prorrogação nem gol fora.
 *  - Vagas: campeão e vice do estadual do ano anterior de AL, MA, PB, PE, PI, RN e SE (2 cada),
 *    BA e CE com 3 (a terceira vaga: o melhor do ranking da CBF entre os restantes); 24 mar a 6 jun.
 *  - Dinheiro (R$): cota fixa da 1a fase em 4 níveis por ranking da CBF (5 clubes cada) 2,5 mi,
 *    1,35 mi, 850 mil, 500 mil; quartas 500 mil (8 clubes), semifinal 600 mil (4), vice 700 mil,
 *    campeão 1 mi. A soma (26,0 mi de cotas + 8,1 mi) é a R$ 34,1 mi total que a CBF anunciou, o
 *    que confirma que os prêmios se somam por fase atingida.
 *  - O campeão joga a 3a fase da Copa do Brasil do ano seguinte.
 *
 * Copa Verde 2026 (CBF documentos técnicos 11 fev 2026; Itatiaia; Wikipedia 2026 Copa Norte e Copa
 * Verde; Jornal Grande Bahia; Itatiaia valores): 24 clubes do Norte, Centro-Oeste e Espírito Santo
 * em duas copas regionais de 12 (Copa Norte e Copa Centro-Oeste), cada uma com 2 grupos de 6
 * (turno único dentro do grupo, 5 jogos), os 2 melhores de cada grupo em semifinais de jogo único
 * (6 mai), final regional em ida e volta (20 e 28 mai); os dois campeões regionais fazem a final da
 * Copa Verde em ida e volta (4 e 7 jun); 70 jogos no total (60 + 4 + 4 + 2). Vagas Copa Norte
 * (Wikipedia): AC 2, AM 2, AP 1, PA 3, RO 2, RR 2. Copa Centro-Oeste (lista de clubes do sorteio,
 * Jornal Grande Bahia/Itatiaia): DF 2, ES 2, GO 3, MS 1, MT 2, TO 2. Dinheiro (R$): cota da 1a fase
 * 200 mil, 125 mil, 100 mil e 75 mil (6 clubes cada nível, ranking da CBF); semifinais regionais
 * 100 mil (8 clubes), final regional 200 mil (4), vice 250 mil, campeão 400 mil. O campeão de cada
 * copa regional garante a 3a fase da Copa do Brasil de 2027 (CBF).
 *
 * Supercopa do Brasil 2026 (CBF, Band, Lance!, Goal): jogo único entre o campeão brasileiro e o
 * campeão da Copa do Brasil do ano anterior, domingo 1 fev 2026 no Mané Garrincha (2 fev 2025);
 * sem prorrogação, pênaltis; se o mesmo clube for campeão de ambos, joga o vice-campeão brasileiro
 * (regulamento, citado pelo Lance e DCI). CBF paga R$ 6,35 mi a cada finalista; o campeão leva
 * ainda US$ 1 mi da Conmebol (R$ 5,23 mi segundo o Lance).
 *
 * PARÂMETRO (sem fonte; listados no PR): ver `NOTES`.
 */
export const NORDESTE_ID = 'copa-nordeste';
export const NORTE_ID = 'copa-norte';
export const CENTRO_OESTE_ID = 'copa-centro-oeste';
export const VERDE_ID = 'copa-verde';
export const SUPERCOPA_ID = 'supercopa';
export const REGIONAL_IDS = [NORDESTE_ID, NORTE_ID, CENTRO_OESTE_ID, VERDE_ID] as const;

const K = 1_000;
const M = 1_000_000;

/** Berths of each state (2026). */
export const NORDESTE_BERTHS: Record<string, number> = {
  AL: 2,
  BA: 3,
  CE: 3,
  MA: 2,
  PB: 2,
  PE: 2,
  PI: 2,
  RN: 2,
  SE: 2,
};
export const NORTE_BERTHS: Record<string, number> = { AC: 2, AM: 2, AP: 1, PA: 3, RO: 2, RR: 2 };
export const CENTRO_OESTE_BERTHS: Record<string, number> = {
  DF: 2,
  ES: 2,
  GO: 3,
  MS: 1,
  MT: 2,
  TO: 2,
};

/** Fixed share of the first phase by reputation block (four equal blocks, best first). */
export const COTAS = {
  nordeste: [2_500 * K, 1_350 * K, 850 * K, 500 * K],
  verde: [200 * K, 125 * K, 100 * K, 75 * K],
};

/** Prizes by phase reached, paid on top of each other (Copa do Nordeste: 8 + 4 + 2 + 1 clubs). */
export const PRIZES = {
  nordeste: { quartas: 500 * K, semi: 600 * K, runnerUp: 700 * K, champion: 1 * M },
  /** Block semi-finals (CBF's "quartas": 8 clubs), block finals ("semifinal": 4), then the final. */
  verde: { semi: 100 * K, final: 200 * K, runnerUp: 250 * K, champion: 400 * K },
  supercopa: { finalists: 6_350 * K, championExtra: 5_230 * K },
};

/** Where each rule stands, for the report and the next reader. */
export const NOTES = [
  'Entry reads last season (the real 2026 cups used the 2025 state leagues): champion and runner-up of the state championship, the extra berth by reputation (CBF ranking stands in); the first season, which has no last season, takes the best by reputation. PARÂMETRO.',
  'Clubs in Libertadores/Sul-Americana play no Copa do Nordeste in the real rule (Bahia 2026); not modelled. PARÂMETRO.',
  'Dates move by weekday (first Wednesday on or after 24 March) so every season fits; the two final legs are Wed/Sun (real: Tue 2 Jun and Sat 6 Jun) and the Copa Norte final second leg Wed 27 May (real 28 May). PARÂMETRO.',
  'Draw: clubs in pots by reputation (the real draw is at the CBF); quarter-finals seeded 1 v 8, 4 v 5, 2 v 7, 3 v 6; Copa Verde single-game semi-finals host by the better seed. PARÂMETRO.',
  'First-phase share by reputation blocks, not the CBF ranking; priority below the national series (like the state championships); VAR on; results weigh half on boards. PARÂMETRO.',
  'Supercopa: first Sunday of February (2025 and 2026 editions), neutral venue not modelled (host drawn); the Conmebol US$ 1 mi counted at the reported R$ 5,23 mi; first career season has no last season: the two best Série A clubs by reputation. PARÂMETRO.',
  'Copa do Brasil 3rd phase: the 2026 regulation has four group-2 places (Série C, Série D, Copa Verde, Copa do Nordeste), so one Copa Verde place (the final winner), although the CBF text of the 2027 edition gives one to each regional champion; a champion already in the Copa through Série A passes the place to the runner-up (as Confiança took Bahia place in 2026, Lance!). PARÂMETRO.',
] as const;
