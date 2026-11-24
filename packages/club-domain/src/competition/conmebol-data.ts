/**
 * CONMEBOL Libertadores and Sudamericana, 2026 editions, as data: the foreign clubs that play
 * them, their stage of entry, the calendar and the prize money. The Brazilian places come from
 * the career's own season (conmebol.ts).
 *
 * Sources:
 *  - Clubs, berths, stages, dates, format: Wikipedia, "2026 Copa Libertadores" and "2026 Copa
 *    Sudamericana" (read 24 Nov 2026), which cite the CONMEBOL draws of 18 Dec 2025 and
 *    19 Mar 2026.
 *  - Prize money (USD): CONMEBOL announcement of April 2026, as reported by Super Rádio Tupi,
 *    Diario de Pernambuco, Portal Tela and Trivela (Mar-Apr 2026).
 *  - City coordinates and altitudes: the cities' Wikipedia pages, rounded (0.01°, tens of
 *    metres). They only feed travel distance and the altitude a visiting side plays at.
 *
 * Strength is not here. It comes from the pack (`foreignClubs`, the FM reputation on the
 * Brazilian clubs' scale), or from the stage of entry when a pack has none (conmebol.ts).
 */

export type Country = 'ARG' | 'BOL' | 'CHI' | 'COL' | 'ECU' | 'PAR' | 'PER' | 'URU' | 'VEN';

export interface ForeignClubData {
  id: string;
  name: string;
  shortName: string;
  country: Country;
  city: string;
  lat: number;
  lon: number;
  altitudeM: number;
  /** The club's name in the owner's FM export, when it differs from `name`. */
  fm?: string;
}

const club = (
  id: string,
  name: string,
  shortName: string,
  country: Country,
  city: string,
  lat: number,
  lon: number,
  altitudeM: number,
  fm?: string,
): ForeignClubData => ({
  id,
  name,
  shortName,
  country,
  city,
  lat,
  lon,
  altitudeM,
  ...(fm && { fm }),
});

// Cities shared by several clubs.
const BA = ['Buenos Aires', -34.61, -58.38, 25] as const;
const LPZ = ['La Paz', -16.5, -68.15, 3640] as const;
const SCL = ['Santiago', -33.45, -70.67, 570] as const;
const BOG = ['Bogotá', 4.71, -74.07, 2640] as const;
const MDE = ['Medellín', 6.25, -75.56, 1495] as const;
const UIO = ['Quito', -0.18, -78.47, 2850] as const;
const ASU = ['Asunción', -25.28, -57.63, 100] as const;
const LIM = ['Lima', -12.06, -77.04, 150] as const;
const CUZ = ['Cusco', -13.53, -71.97, 3399] as const;
const MVD = ['Montevideo', -34.9, -56.16, 40] as const;
const CCS = ['Caracas', 10.49, -66.88, 900] as const;

/** Every foreign club of the 2026 editions. Ids are `foreign-<country>-<slug>`. */
export const FOREIGN_CLUBS: readonly ForeignClubData[] = [
  // Argentina
  club('foreign-arg-lanus', 'Club Atlético Lanús', 'Lanús', 'ARG', 'Lanús', -34.7, -58.39, 25),
  club(
    'foreign-arg-platense',
    'Club Atlético Platense',
    'Platense',
    'ARG',
    'Vicente López',
    -34.53,
    -58.48,
    25,
  ),
  club(
    'foreign-arg-estudiantes',
    'Estudiantes de La Plata',
    'Estudiantes',
    'ARG',
    'La Plata',
    -34.92,
    -57.95,
    25,
  ),
  club(
    'foreign-arg-independiente-rivadavia',
    'Independiente Rivadavia',
    'Ind. Rivadavia',
    'ARG',
    'Mendoza',
    -32.89,
    -68.84,
    750,
  ),
  club(
    'foreign-arg-rosario-central',
    'Club Atlético Rosario Central',
    'Rosario Central',
    'ARG',
    'Rosario',
    -32.95,
    -60.65,
    25,
  ),
  club('foreign-arg-boca', 'Club Atlético Boca Juniors', 'Boca Juniors', 'ARG', ...BA),
  club(
    'foreign-arg-argentinos',
    'Asociación Atlética Argentinos Juniors',
    'Argentinos Jrs.',
    'ARG',
    ...BA,
  ),
  club('foreign-arg-river', 'Club Atlético River Plate', 'River Plate', 'ARG', ...BA),
  club('foreign-arg-racing', 'Racing Club', 'Racing', 'ARG', 'Avellaneda', -34.67, -58.37, 25),
  club('foreign-arg-riestra', 'Club Deportivo Riestra', 'Dep. Riestra', 'ARG', ...BA),
  club(
    'foreign-arg-san-lorenzo',
    'Club Atlético San Lorenzo de Almagro',
    'San Lorenzo',
    'ARG',
    ...BA,
  ),
  club('foreign-arg-tigre', 'Club Atlético Tigre', 'Tigre', 'ARG', 'Victoria', -34.45, -58.55, 10),
  club('foreign-arg-barracas', 'Club Atlético Barracas Central', 'Barracas Central', 'ARG', ...BA),
  // Bolivia
  club(
    'foreign-bol-always-ready',
    'Club Always Ready',
    'Always Ready',
    'BOL',
    'El Alto',
    -16.5,
    -68.19,
    4090,
  ),
  club('foreign-bol-bolivar', 'Club Bolívar', 'Bolívar', 'BOL', ...LPZ),
  club(
    'foreign-bol-nacional-potosi',
    'Club Atlético Nacional Potosí',
    'Nacional Potosí',
    'BOL',
    'Potosí',
    -19.58,
    -65.75,
    3900,
  ),
  club('foreign-bol-the-strongest', 'Club The Strongest', 'The Strongest', 'BOL', ...LPZ),
  club(
    'foreign-bol-bulo-bulo',
    'Club San Antonio Bulo Bulo',
    'Bulo Bulo',
    'BOL',
    'Bulo Bulo',
    -17.26,
    -64.36,
    300,
  ),
  club(
    'foreign-bol-blooming',
    'Club Blooming',
    'Blooming',
    'BOL',
    'Santa Cruz de la Sierra',
    -17.78,
    -63.18,
    420,
  ),
  club(
    'foreign-bol-independiente-petrolero',
    'Club Independiente Petrolero',
    'Ind. Petrolero',
    'BOL',
    'Sucre',
    -19.05,
    -65.26,
    2800,
  ),
  club('foreign-bol-guabira', 'Club Guabirá', 'Guabirá', 'BOL', 'Montero', -17.34, -63.25, 300),
  // Chile
  club('foreign-chi-coquimbo', 'Coquimbo Unido', 'Coquimbo', 'CHI', 'Coquimbo', -29.95, -71.34, 30),
  club(
    'foreign-chi-u-catolica',
    'Club Deportivo Universidad Católica',
    'U. Católica',
    'CHI',
    ...SCL,
  ),
  club(
    'foreign-chi-ohiggins',
    "Club Deportivo O'Higgins",
    "O'Higgins",
    'CHI',
    'Rancagua',
    -34.17,
    -70.74,
    500,
  ),
  club(
    'foreign-chi-huachipato',
    'Club Deportivo Huachipato',
    'Huachipato',
    'CHI',
    'Talcahuano',
    -36.72,
    -73.12,
    10,
  ),
  club('foreign-chi-u-chile', 'Club Universidad de Chile', 'U. de Chile', 'CHI', ...SCL),
  club('foreign-chi-audax', 'Audax Italiano', 'Audax Italiano', 'CHI', ...SCL),
  club('foreign-chi-palestino', 'Club Deportivo Palestino', 'Palestino', 'CHI', ...SCL),
  club(
    'foreign-chi-cobresal',
    'Club de Deportes Cobresal',
    'Cobresal',
    'CHI',
    'El Salvador',
    -26.25,
    -69.62,
    2300,
  ),
  // Colombia
  club('foreign-col-santa-fe', 'Independiente Santa Fe', 'Santa Fe', 'COL', ...BOG),
  club(
    'foreign-col-junior',
    'Junior de Barranquilla',
    'Junior',
    'COL',
    'Barranquilla',
    10.96,
    -74.8,
    20,
  ),
  club('foreign-col-tolima', 'Deportes Tolima', 'Tolima', 'COL', 'Ibagué', 4.44, -75.23, 1285),
  club('foreign-col-medellin', 'Independiente Medellín', 'Ind. Medellín', 'COL', ...MDE),
  club('foreign-col-nacional', 'Atlético Nacional', 'Atl. Nacional', 'COL', ...MDE),
  club(
    'foreign-col-america',
    'América de Cali',
    'América de Cali',
    'COL',
    'Cali',
    3.45,
    -76.53,
    1000,
  ),
  club(
    'foreign-col-bucaramanga',
    'Atlético Bucaramanga',
    'Bucaramanga',
    'COL',
    'Bucaramanga',
    7.12,
    -73.12,
    960,
  ),
  club('foreign-col-millonarios', 'Millonarios', 'Millonarios', 'COL', ...BOG),
  // Ecuador
  club(
    'foreign-ecu-idv',
    'Independiente del Valle',
    'Ind. del Valle',
    'ECU',
    'Sangolquí',
    -0.31,
    -78.45,
    2500,
  ),
  club('foreign-ecu-ldu', 'Liga Deportiva Universitaria de Quito', 'LDU Quito', 'ECU', ...UIO),
  club(
    'foreign-ecu-barcelona',
    'Barcelona Sporting Club',
    'Barcelona SC',
    'ECU',
    'Guayaquil',
    -2.19,
    -79.89,
    10,
  ),
  club(
    'foreign-ecu-u-catolica',
    'Club Deportivo Universidad Católica',
    'U. Católica (EQU)',
    'ECU',
    ...UIO,
  ),
  club('foreign-ecu-orense', 'Orense Sporting Club', 'Orense', 'ECU', 'Machala', -3.26, -79.96, 10),
  club(
    'foreign-ecu-libertad',
    'Libertad Fútbol Club',
    'Libertad (EQU)',
    'ECU',
    'Loja',
    -4.0,
    -79.2,
    2060,
  ),
  club(
    'foreign-ecu-macara',
    'Club Social y Deportivo Macará',
    'Macará',
    'ECU',
    'Ambato',
    -1.24,
    -78.62,
    2580,
  ),
  club(
    'foreign-ecu-cuenca',
    'Club Deportivo Cuenca',
    'Dep. Cuenca',
    'ECU',
    'Cuenca',
    -2.9,
    -79.0,
    2560,
  ),
  // Paraguay
  club('foreign-par-cerro', 'Club Cerro Porteño', 'Cerro Porteño', 'PAR', ...ASU),
  club('foreign-par-libertad', 'Club Libertad', 'Libertad', 'PAR', ...ASU),
  club('foreign-par-guarani', 'Club Guaraní', 'Guaraní', 'PAR', ...ASU),
  club(
    'foreign-par-2-de-mayo',
    'Club Sportivo 2 de Mayo',
    '2 de Mayo',
    'PAR',
    'Pedro Juan Caballero',
    -22.55,
    -55.73,
    200,
  ),
  club('foreign-par-trinidense', 'Club Sportivo Trinidense', 'Trinidense', 'PAR', ...ASU),
  club('foreign-par-nacional', 'Club Nacional', 'Nacional (PAR)', 'PAR', ...ASU),
  club('foreign-par-recoleta', 'Recoleta Fútbol Club', 'Recoleta', 'PAR', ...ASU),
  club('foreign-par-olimpia', 'Club Olimpia', 'Olimpia', 'PAR', ...ASU),
  // Peru
  club(
    'foreign-per-universitario',
    'Club Universitario de Deportes',
    'Universitario',
    'PER',
    ...LIM,
  ),
  club('foreign-per-cusco', 'Cusco Fútbol Club', 'Cusco FC', 'PER', ...CUZ),
  club('foreign-per-cristal', 'Club Sporting Cristal', 'Sporting Cristal', 'PER', ...LIM),
  club('foreign-per-alianza-lima', 'Club Alianza Lima', 'Alianza Lima', 'PER', ...LIM),
  club(
    'foreign-per-alianza-atletico',
    'Club Alianza Atlético',
    'Alianza Atlético',
    'PER',
    'Sullana',
    -4.9,
    -80.69,
    60,
  ),
  club('foreign-per-melgar', 'FBC Melgar', 'Melgar', 'PER', 'Arequipa', -16.41, -71.54, 2335),
  club('foreign-per-garcilaso', 'Club Deportivo Garcilaso', 'Garcilaso', 'PER', ...CUZ),
  club('foreign-per-cienciano', 'Club Cienciano', 'Cienciano', 'PER', ...CUZ),
  // Uruguay
  club('foreign-uru-nacional', 'Club Nacional de Football', 'Nacional', 'URU', ...MVD),
  club('foreign-uru-penarol', 'Club Atlético Peñarol', 'Peñarol', 'URU', ...MVD),
  club('foreign-uru-liverpool', 'Liverpool Fútbol Club', 'Liverpool (URU)', 'URU', ...MVD),
  club(
    'foreign-uru-juventud',
    'Club Atlético Juventud',
    'Juventud',
    'URU',
    'Las Piedras',
    -34.73,
    -56.22,
    40,
  ),
  club('foreign-uru-defensor', 'Defensor Sporting Club', 'Defensor', 'URU', ...MVD),
  club('foreign-uru-boston-river', 'Club Atlético Boston River', 'Boston River', 'URU', ...MVD),
  club('foreign-uru-racing', 'Racing Club de Montevideo', 'Racing (URU)', 'URU', ...MVD),
  club('foreign-uru-torque', 'Montevideo City Torque', 'City Torque', 'URU', ...MVD),
  // Venezuela
  club('foreign-ven-ucv', 'Universidad Central de Venezuela FC', 'U. Central', 'VEN', ...CCS),
  club('foreign-ven-la-guaira', 'Deportivo La Guaira', 'La Guaira', 'VEN', ...CCS),
  club(
    'foreign-ven-carabobo',
    'Carabobo Fútbol Club',
    'Carabobo',
    'VEN',
    'Valencia',
    10.16,
    -68.0,
    480,
  ),
  club(
    'foreign-ven-tachira',
    'Deportivo Táchira',
    'Táchira',
    'VEN',
    'San Cristóbal',
    7.77,
    -72.22,
    825,
  ),
  club(
    'foreign-ven-puerto-cabello',
    'Academia Puerto Cabello',
    'Puerto Cabello',
    'VEN',
    'Puerto Cabello',
    10.47,
    -68.01,
    10,
  ),
  club('foreign-ven-monagas', 'Monagas Sport Club', 'Monagas', 'VEN', 'Maturín', 9.75, -63.18, 70),
  club('foreign-ven-caracas', 'Caracas Fútbol Club', 'Caracas FC', 'VEN', ...CCS),
  club('foreign-ven-metropolitanos', 'Metropolitanos Fútbol Club', 'Metropolitanos', 'VEN', ...CCS),
];

/**
 * Home shirt and its trim, for the club's badge (the clubs' traditional colours; not the
 * season's kits). Every foreign club has one.
 */
export const FOREIGN_COLOURS: Record<string, readonly [string, string]> = {
  'foreign-arg-lanus': ['#7a1f2b', '#ffffff'],
  'foreign-arg-platense': ['#5a3a22', '#ffffff'],
  'foreign-arg-estudiantes': ['#d71920', '#ffffff'],
  'foreign-arg-independiente-rivadavia': ['#1d3f8f', '#ffffff'],
  'foreign-arg-rosario-central': ['#0a3d91', '#f6c600'],
  'foreign-arg-boca': ['#0a2a6b', '#f5c518'],
  'foreign-arg-argentinos': ['#d71920', '#ffffff'],
  'foreign-arg-river': ['#ffffff', '#d71920'],
  'foreign-arg-racing': ['#6cace4', '#ffffff'],
  'foreign-arg-riestra': ['#111111', '#ffffff'],
  'foreign-arg-san-lorenzo': ['#0a2a6b', '#d71920'],
  'foreign-arg-tigre': ['#0a2a6b', '#d71920'],
  'foreign-arg-barracas': ['#d71920', '#ffffff'],
  'foreign-bol-always-ready': ['#d71920', '#ffffff'],
  'foreign-bol-bolivar': ['#6cace4', '#ffffff'],
  'foreign-bol-nacional-potosi': ['#ffffff', '#d71920'],
  'foreign-bol-the-strongest': ['#f5c518', '#111111'],
  'foreign-bol-bulo-bulo': ['#0b7a3b', '#ffffff'],
  'foreign-bol-blooming': ['#6cace4', '#ffffff'],
  'foreign-bol-independiente-petrolero': ['#0b7a3b', '#d71920'],
  'foreign-bol-guabira': ['#d71920', '#ffffff'],
  'foreign-chi-coquimbo': ['#f5c518', '#111111'],
  'foreign-chi-u-catolica': ['#ffffff', '#0a3d91'],
  'foreign-chi-ohiggins': ['#6cace4', '#ffffff'],
  'foreign-chi-huachipato': ['#0a2a6b', '#111111'],
  'foreign-chi-u-chile': ['#0a2a6b', '#d71920'],
  'foreign-chi-audax': ['#0b7a3b', '#ffffff'],
  'foreign-chi-palestino': ['#0b7a3b', '#d71920'],
  'foreign-chi-cobresal': ['#f28c28', '#ffffff'],
  'foreign-col-santa-fe': ['#d71920', '#ffffff'],
  'foreign-col-junior': ['#d71920', '#ffffff'],
  'foreign-col-tolima': ['#7a1f2b', '#f5c518'],
  'foreign-col-medellin': ['#d71920', '#0a2a6b'],
  'foreign-col-nacional': ['#0b7a3b', '#ffffff'],
  'foreign-col-america': ['#d71920', '#ffffff'],
  'foreign-col-bucaramanga': ['#f5c518', '#0b7a3b'],
  'foreign-col-millonarios': ['#0a3d91', '#ffffff'],
  'foreign-ecu-idv': ['#111111', '#0a2a6b'],
  'foreign-ecu-ldu': ['#ffffff', '#d71920'],
  'foreign-ecu-barcelona': ['#f5c518', '#111111'],
  'foreign-ecu-u-catolica': ['#6cace4', '#ffffff'],
  'foreign-ecu-orense': ['#0b7a3b', '#ffffff'],
  'foreign-ecu-libertad': ['#f5c518', '#111111'],
  'foreign-ecu-macara': ['#6cace4', '#ffffff'],
  'foreign-ecu-cuenca': ['#d71920', '#f5c518'],
  'foreign-par-cerro': ['#0a2a6b', '#d71920'],
  'foreign-par-libertad': ['#111111', '#ffffff'],
  'foreign-par-guarani': ['#f5c518', '#111111'],
  'foreign-par-2-de-mayo': ['#0b7a3b', '#ffffff'],
  'foreign-par-trinidense': ['#d71920', '#ffffff'],
  'foreign-par-nacional': ['#0a2a6b', '#ffffff'],
  'foreign-par-recoleta': ['#d71920', '#ffffff'],
  'foreign-par-olimpia': ['#ffffff', '#111111'],
  'foreign-per-universitario': ['#f2e8c9', '#7a1f2b'],
  'foreign-per-cusco': ['#f5c518', '#111111'],
  'foreign-per-cristal': ['#6cace4', '#ffffff'],
  'foreign-per-alianza-lima': ['#0a2a6b', '#ffffff'],
  'foreign-per-alianza-atletico': ['#ffffff', '#0a2a6b'],
  'foreign-per-melgar': ['#d71920', '#111111'],
  'foreign-per-garcilaso': ['#6cace4', '#ffffff'],
  'foreign-per-cienciano': ['#d71920', '#ffffff'],
  'foreign-uru-nacional': ['#ffffff', '#0a2a6b'],
  'foreign-uru-penarol': ['#f5c518', '#111111'],
  'foreign-uru-liverpool': ['#0a2a6b', '#111111'],
  'foreign-uru-juventud': ['#0a2a6b', '#ffffff'],
  'foreign-uru-defensor': ['#5b2a86', '#ffffff'],
  'foreign-uru-boston-river': ['#0b7a3b', '#ffffff'],
  'foreign-uru-racing': ['#0b7a3b', '#ffffff'],
  'foreign-uru-torque': ['#6cace4', '#ffffff'],
  'foreign-ven-ucv': ['#f2e8c9', '#0a2a6b'],
  'foreign-ven-la-guaira': ['#f28c28', '#0a2a6b'],
  'foreign-ven-carabobo': ['#7a1f2b', '#ffffff'],
  'foreign-ven-tachira': ['#f5c518', '#111111'],
  'foreign-ven-puerto-cabello': ['#0a2a6b', '#ffffff'],
  'foreign-ven-monagas': ['#0a2a6b', '#ffffff'],
  'foreign-ven-caracas': ['#d71920', '#ffffff'],
  'foreign-ven-metropolitanos': ['#5b2a86', '#ffffff'],
};

/** Where a foreign club enters (2026): the stage, in each cup. */
export type LibertadoresEntry = 'groups' | 'second' | 'first';

/** Libertadores 2026: the foreign clubs and their stage of entry (Wikipedia, 2026 edition). */
export const LIBERTADORES_FOREIGN: Record<LibertadoresEntry, readonly string[]> = {
  groups: [
    'foreign-arg-lanus',
    'foreign-arg-platense',
    'foreign-arg-estudiantes',
    'foreign-arg-independiente-rivadavia',
    'foreign-arg-rosario-central',
    'foreign-arg-boca',
    'foreign-bol-always-ready',
    'foreign-bol-bolivar',
    'foreign-chi-coquimbo',
    'foreign-chi-u-catolica',
    'foreign-col-santa-fe',
    'foreign-col-junior',
    'foreign-ecu-idv',
    'foreign-ecu-ldu',
    'foreign-par-cerro',
    'foreign-par-libertad',
    'foreign-per-universitario',
    'foreign-per-cusco',
    'foreign-uru-nacional',
    'foreign-uru-penarol',
    'foreign-ven-ucv',
    'foreign-ven-la-guaira',
  ],
  second: [
    'foreign-arg-argentinos',
    'foreign-bol-nacional-potosi',
    'foreign-chi-ohiggins',
    'foreign-chi-huachipato',
    'foreign-col-tolima',
    'foreign-col-medellin',
    'foreign-ecu-barcelona',
    'foreign-par-guarani',
    'foreign-per-cristal',
    'foreign-uru-liverpool',
    'foreign-ven-carabobo',
  ],
  first: [
    'foreign-bol-the-strongest',
    'foreign-ecu-u-catolica',
    'foreign-par-2-de-mayo',
    'foreign-per-alianza-lima',
    'foreign-uru-juventud',
    'foreign-ven-tachira',
  ],
};

/** Sudamericana 2026: the foreign clubs and their stage of entry (Wikipedia, 2026 edition). */
export const SUDAMERICANA_FOREIGN: Record<'groups' | 'first', readonly string[]> = {
  // Argentina's six go straight to the groups, like Brazil's.
  groups: [
    'foreign-arg-river',
    'foreign-arg-racing',
    'foreign-arg-riestra',
    'foreign-arg-san-lorenzo',
    'foreign-arg-tigre',
    'foreign-arg-barracas',
  ],
  // The other eight associations, four each: sixteen single-match ties between clubs of the
  // same association.
  first: [
    'foreign-bol-bulo-bulo',
    'foreign-bol-blooming',
    'foreign-bol-independiente-petrolero',
    'foreign-bol-guabira',
    'foreign-chi-u-chile',
    'foreign-chi-audax',
    'foreign-chi-palestino',
    'foreign-chi-cobresal',
    'foreign-col-nacional',
    'foreign-col-america',
    'foreign-col-bucaramanga',
    'foreign-col-millonarios',
    'foreign-ecu-orense',
    'foreign-ecu-libertad',
    'foreign-ecu-macara',
    'foreign-ecu-cuenca',
    'foreign-par-trinidense',
    'foreign-par-nacional',
    'foreign-par-recoleta',
    'foreign-par-olimpia',
    'foreign-per-alianza-atletico',
    'foreign-per-melgar',
    'foreign-per-garcilaso',
    'foreign-per-cienciano',
    'foreign-uru-defensor',
    'foreign-uru-boston-river',
    'foreign-uru-racing',
    'foreign-uru-torque',
    'foreign-ven-puerto-cabello',
    'foreign-ven-monagas',
    'foreign-ven-caracas',
    'foreign-ven-metropolitanos',
  ],
};

/**
 * Brazil's places (2026, from the 2025 season). Libertadores: the holder, the Copa do Brasil
 * champion and Série A 2nd to 5th in the groups, Série A 6th and 7th in the second stage.
 * Sudamericana: the next six of the Série A in the groups.
 */
export const BRAZIL_PLACES = { libertadoresGroups: 6, libertadoresSecond: 2, sudamericana: 6 };

/** Dates of 2026 (Wikipedia, CONMEBOL calendar): first legs on Tuesday to Thursday. */
export const DATES = {
  libertadores: {
    first: ['2026-02-03', '2026-02-12'],
    second: ['2026-02-17', '2026-02-26'],
    third: ['2026-03-03', '2026-03-12'],
    groups: ['2026-04-07', '2026-05-28'],
    r16: ['2026-08-11', '2026-08-20'],
    quarters: ['2026-09-08', '2026-09-17'],
    semis: ['2026-10-14', '2026-10-22'],
    final: ['2026-11-28', '2026-11-28'],
  },
  sudamericana: {
    first: ['2026-03-03', '2026-03-09'],
    groups: ['2026-04-07', '2026-05-28'],
    playoffs: ['2026-07-21', '2026-07-30'],
    r16: ['2026-08-11', '2026-08-20'],
    quarters: ['2026-09-08', '2026-09-17'],
    semis: ['2026-10-13', '2026-10-21'],
    final: ['2026-11-21', '2026-11-21'],
  },
} as const;

/** Prize money, USD, by stage reached and per group win (CONMEBOL, April 2026). */
export const PRIZES_USD = {
  libertadores: {
    first: 400_000,
    second: 500_000,
    third: 600_000,
    groupStage: 1_000_000,
    groupWin: 340_000,
    r16: 1_250_000,
    quarters: 1_700_000,
    semis: 2_300_000,
    runnerUp: 7_000_000,
    champion: 25_000_000,
  },
  sudamericana: {
    groupStage: 300_000,
    groupWin: 125_000,
    playoffs: 500_000,
    r16: 600_000,
    quarters: 700_000,
    semis: 800_000,
    runnerUp: 2_500_000,
    champion: 10_000_000,
  },
  /** Recopa 2026 (Band, 18 Feb 2026; Tupi; El Economista, 27 Feb 2026). */
  recopa: { runnerUp: 900_000, champion: 1_800_000 },
};

/** Where each rule stands. */
export const NOTES = [
  'The foreign clubs of every season are the 2026 entrants: the career does not play the other leagues. PARÂMETRO.',
  'Sudamericana first stage prize money is not in the sources read: none is paid. PARÂMETRO.',
  "Recopa: last season's Libertadores champion against the Sudamericana champion, two legs, the first at the Sudamericana champion (2026: Lanús 1-0 Flamengo on Thu 19 Feb, Flamengo 2-3 a.e.t. on Thu 26 Feb at the Maracanã; Band, beIN). The real tie goes to extra time then penalties; two legs here go straight to penalties (the engine plays extra time only in a single game). The first career season has no last season and no Recopa; nor one between two foreign clubs, which the person never plays. PARÂMETRO.",
  'The Libertadores and Sudamericana finals are single matches at a CONMEBOL venue (Montevideo, Barranquilla in 2026): neutral ground, extra time then penalties.',
  'Brazilian places for the next season: the champion of each cup, the Copa do Brasil champion and the Série A order (BRAZIL_PLACES), as in 2026; the 2027 rule is not published. PARÂMETRO.',
] as const;
