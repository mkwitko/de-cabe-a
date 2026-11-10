# Career Path: difficulty and track order

Generated 2026-11-10T16:41Z by `scripts/research/career-path-difficulty.ts` against `localhost:5432` (dry run).

## Summary

- 400 published levels; notability T1: 9, T2: 123, T3: 268.
- Order today vs difficulty: Spearman 0.65 (1 = easiest first, 0 = random). After the reorder: 0.99.
- Pinned (someone played them or a Desafio do Dia drew them, keep their number): 25 (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 194, 392).
- **373 levels move**; 27 stay. difficultyTier changes on 188 levels.
- Stored difficultyTier today: tier 1: 3, tier 2: 107, tier 3: 290. Proposed: tier 1: 51, tier 2: 236, tier 3: 113.
- Proposed tiers by band: 1–20 t1: 16, t2: 3, t3: 1; 21–60 t1: 35, t2: 5; 61–150 t2: 90; 151+ t2: 138, t3: 112.
- Notability by band: 1–20 T1: 6, T2: 9, T3: 5; 21–60 T1: 2, T2: 10, T3: 28; 61+ T1: 1, T2: 104, T3: 235.
- Pinned levels in the first 20 that break the opening rule (stay where they are): 16 Cafu (T3, 38.5); 17 Victor (T3, 34.3); 18 Aaron Lennon (T3, 55.1); 19 Antony (T3, 30.2); 20 Matheus Cunha (T3, 31.9).

## Score (0 = easiest, 100 = hardest)

The level shows the first club and one more per wrong guess, 6 guesses in all, so a player sees at
most the first 6 clubs. Each part is 0..1 (1 = harder); the score is the weighted sum.

| part    | weight | what it measures                                                                                                                                                                                                                                                                              |
| ------- | -----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fame    |     40 | Player.notabilityTier: T1 0, T2 .35, T3 .7, T4 1. The strongest single signal: whether a fan has heard of the player at all.                                                                                                                                                                  |
| brazil  |     20 | 1 − anchor. Anchor: started for Brazil in a World Cup / Copa América lineup we hold 1; 30+ league games at one of the 12 grandes .9; any spell at a grande .6; any Brazilian club .3; +.2 if Brazilian. The audience is Brazilian (PRODUCT.md): a Série A path is recognised far more easily. |
| clubs   |     20 | .6 × (1 − fame of the visible clubs) + .4 × journeyman. Club fame = log of how many careers in the database pass through the club (data driven, ~516k spells), averaged over the first 6 clubs with weights 6..1 (the first club is seen by everyone). Journeyman: 0 at ≤ 4 clubs, 1 at 12+.  |
| era     |     12 | Years since the last club ended (active = 0), full at 30+ years. Covers retired vs active: today's players are on TV and in games.                                                                                                                                                            |
| opening |      8 | How many other players open their career with the same two clubs (log, full at 63+). A shared academy opening (Santos → …) is ambiguous until more clubs show.                                                                                                                                |

Ordering: levels nobody has seen fill the free numbers easiest first; each slot takes the easiest
level the track rules allow there: levels 1–20 only T1/T2 players, no T4 before level 60. Proposed
difficultyTier: 1 for levels 1–20, then by score (< 35 → 1, < 55 → 2, else 3), never falling along
the free levels. Seleção is a proxy: only players in the StatsBomb Brazil lineups are flagged.

## First 30 (proposed)

| proposed # | current # | player             | notability | score | stored tier | proposed tier |        |
| ---------: | --------: | ------------------ | ---------- | ----: | ----------: | ------------: | ------ |
|          1 |         1 | Neymar             | T1         |   2.1 |           1 |             1 | pinned |
|          2 |         2 | Zinédine Zidane    | T1         |  33.1 |           1 |             1 | pinned |
|          3 |         3 | Ronaldo Nazário    | T1         |  12.0 |           2 |             1 | pinned |
|          4 |         4 | Cristiano Ronaldo  | T1         |  24.2 |           2 |             1 | pinned |
|          5 |         5 | Diego Maradona     | T1         |  39.4 |           2 |             2 | pinned |
|          6 |         6 | David Beckham      | T1         |  34.4 |           2 |             1 | pinned |
|          7 |         7 | Kaká               | T2         |  20.5 |           2 |             1 | pinned |
|          8 |         8 | Alisson Becker     | T2         |  16.1 |           2 |             1 | pinned |
|          9 |         9 | Marcelo            | T2         |  15.9 |           2 |             1 | pinned |
|         10 |        10 | Casemiro           | T2         |  17.9 |           2 |             1 | pinned |
|         11 |        11 | Pepe               | T2         |  38.3 |           2 |             2 | pinned |
|         12 |        12 | Zico               | T2         |  28.3 |           2 |             1 | pinned |
|         13 |        13 | Ronaldinho Gaúcho  | T2         |  19.8 |           3 |             1 | pinned |
|         14 |        14 | Robinho            | T2         |  24.6 |           3 |             1 | pinned |
|         15 |        15 | David Luiz         | T2         |  20.2 |           3 |             1 | pinned |
|         16 |        16 | Cafu               | T3         |  38.5 |           3 |             2 | pinned |
|         17 |        17 | Victor             | T3         |  34.3 |           3 |             1 | pinned |
|         18 |        18 | Aaron Lennon       | T3         |  55.1 |           3 |             3 | pinned |
|         19 |        19 | Antony             | T3         |  30.2 |           3 |             1 | pinned |
|         20 |        20 | Matheus Cunha      | T3         |  31.9 |           3 |             1 | pinned |
|         21 |        21 | Fernando Reges     | T3         |  38.5 |           3 |             2 | pinned |
|         22 |        22 | Raí                | T3         |  45.1 |           3 |             2 | pinned |
|         23 |        23 | Ederson Moraes     | T3         |  32.2 |           3 |             1 | pinned |
|         24 |       164 | Philippe Coutinho  | T2         |  20.6 |           3 |             1 |        |
|         25 |       100 | Carlos Tévez       | T2         |  22.7 |           2 |             1 |        |
|         26 |        61 | Kylian Mbappé      | T1         |  24.4 |           1 |             1 |        |
|         27 |       174 | Diego Forlán       | T2         |  26.3 |           3 |             1 |        |
|         28 |       109 | Javier Mascherano  | T2         |  28.4 |           2 |             1 |        |
|         29 |       159 | Zlatan Ibrahimović | T1         |  28.5 |           3 |             1 |        |
|         30 |       170 | Deco               | T2         |  28.7 |           3 |             1 |        |

## Samples across the track

| proposed # | current # | player               | notability | score | stored tier | proposed tier |     |
| ---------: | --------: | -------------------- | ---------- | ----: | ----------: | ------------: | --- |
|         40 |        28 | Oscar                | T3         |  32.6 |           3 |             1 |     |
|         50 |        33 | Alex                 | T3         |  34.1 |           3 |             1 |     |
|         60 |        75 | Paul Pogba           | T2         |  35.5 |           2 |             2 |     |
|         75 |       184 | Fabinho              | T3         |  36.7 |           3 |             2 |     |
|        100 |       107 | Erling Haaland       | T2         |  39.0 |           2 |             2 |     |
|        125 |       175 | Álvaro Morata        | T2         |  40.8 |           3 |             2 |     |
|        150 |       342 | Paulo Roberto Falcão | T3         |  42.3 |           3 |             2 |     |
|        175 |        68 | David Trezeguet      | T2         |  45.0 |           2 |             2 |     |
|        200 |       134 | Ruud Gullit          | T2         |  49.3 |           2 |             2 |     |
|        225 |       221 | Yoshinori Mutō       | T3         |  51.0 |           3 |             2 |     |
|        250 |       334 | David Alaba          | T3         |  52.4 |           3 |             2 |     |
|        275 |       235 | Piotr Trochowski     | T3         |  54.1 |           3 |             2 |     |
|        300 |       236 | Niclas Füllkrug      | T3         |  55.6 |           3 |             3 |     |
|        325 |       195 | Paulo Ferreira       | T3         |  57.2 |           3 |             3 |     |
|        350 |       361 | Wayne Bridge         | T3         |  59.6 |           3 |             3 |     |
|        375 |       181 | Raymond Kopa         | T3         |  62.1 |           3 |             3 |     |
|        400 |       260 | László Kubala        | T3         |  72.8 |           3 |             3 |     |

## Outliers: easy levels buried late today

| proposed # | current # | player           | notability | score | stored tier | proposed tier |     |
| ---------: | --------: | ---------------- | ---------- | ----: | ----------: | ------------: | --- |
|         41 |       381 | Vitor Roque      | T3         |  32.7 |           3 |             1 |     |
|         57 |       365 | Dimitri Payet    | T3         |  34.7 |           3 |             1 |     |
|         94 |       391 | Emerson Royal    | T3         |  38.2 |           3 |             2 |     |
|         68 |       332 | Diego            | T3         |  35.9 |           3 |             2 |     |
|         42 |       301 | Emerson Palmieri | T3         |  32.8 |           3 |             1 |     |
|         48 |       304 | Gabriel Paulista | T3         |  33.9 |           3 |             1 |     |
|        127 |       379 | Yerry Mina       | T3         |  41.0 |           3 |             2 |     |
|         31 |       278 | Gabriel Jesus    | T3         |  29.9 |           3 |             1 |     |
|        135 |       370 | Dida             | T3         |  41.4 |           3 |             2 |     |
|         85 |       300 | Denílson         | T3         |  37.6 |           3 |             2 |     |
|        191 |       398 | Bernardo         | T3         |  48.6 |           3 |             2 |     |
|         38 |       242 | Alex Sandro      | T3         |  32.0 |           3 |             1 |     |
|        151 |       352 | Nelsinho         | T3         |  42.4 |           3 |             2 |     |
|        199 |       396 | Lucas Hernández  | T3         |  49.1 |           3 |             2 |     |
|         91 |       284 | Kléberson        | T3         |  38.1 |           3 |             2 |     |

## Outliers: hard levels too early today

| proposed # | current # | player              | notability | score | stored tier | proposed tier |     |
| ---------: | --------: | ------------------- | ---------- | ----: | ----------: | ------------: | --- |
|        354 |        40 | Aaron Mokoena       | T3         |  59.7 |           3 |             3 |     |
|        271 |        29 | Rodrigo             | T3         |  53.9 |           3 |             2 |     |
|        272 |        43 | Alex Santos         | T3         |  53.9 |           3 |             2 |     |
|        288 |        60 | Aaron Ramsdale      | T3         |  54.9 |           3 |             2 |     |
|        396 |       197 | Aurelio Vidmar      | T3         |  68.0 |           3 |             3 |     |
|        375 |       181 | Raymond Kopa        | T3         |  62.1 |           3 |             3 |     |
|        384 |       191 | Quini               | T3         |  64.3 |           3 |             3 |     |
|        366 |       179 | Claude Makélélé     | T3         |  61.4 |           3 |             3 |     |
|        377 |       193 | Antoni Ramallets    | T3         |  63.0 |           3 |             3 |     |
|        214 |        47 | Marcus Túlio Tanaka | T3         |  50.5 |           3 |             2 |     |
|        355 |       188 | Nolito              | T3         |  60.0 |           3 |             3 |     |
|        345 |       180 | Zvonimir Boban      | T3         |  58.8 |           3 |             3 |     |
|        393 |       229 | Johnny Rep          | T3         |  66.0 |           3 |             3 |     |
|        320 |       160 | Eusébio             | T2         |  56.8 |           3 |             3 |     |
|        391 |       239 | Ivan Radeljić       | T3         |  65.7 |           3 |             3 |     |

## Dry-run diff

373 moves (current → proposed): 24→62, 25→49, 26→39, 27→53, 28→40, 29→271, 30→36, 31→132, 32→114, 33→50, 34→115, 36→67, 37→33, 38→121, 39→44, 40→354, 41→56, 42→119, 43→272, 44→34, 45→63, 46→147, 47→214, 48→195, 49→45, 50→32, 51→43, 52→37, 53→51, 54→185, 55→104, 56→83, 57→159, 58→163, 59→152, 60→288, 61→26, 62→123, 63→124, 64→174, 65→207, 66→141, 67→116, 68→175, 69→160, 70→138, 71→122, 72→66, 73→120, 74→69, 75→60, 76→155, 77→144, 78→179, 79→97, 80→103, 81→133, 82→88, 83→95, 84→64, 85→177, 87→113, 88→76, 89→129, 90→71, 91→61, 92→142, 93→231, 94→98, 95→96, 96→99, 97→92, 98→58, 99→65, 100→25, 101→84, 102→87, 103→219, 104→110, 105→108, 106→156, 107→100, 108→78, 109→28, 110→77, 111→213, 112→89, 113→262, 114→134, 115→130, 116→105, 117→158, 118→111, 119→128, 120→139, 121→145, 122→242, 123→136, 124→112, 125→46, 126→154, 127→74, 128→143, 129→70, 130→131, 131→239, 132→148, 133→181, 134→200, 135→146, 136→182, 137→167, 138→196, 139→187, 140→59, 141→173, 142→101, 143→140, 144→72, 145→197, 146→244, 147→73, 148→93, 149→109, 150→90, 151→79, 152→235, 153→189, 154→153, 155→232, 156→157, 157→102, 158→82, 159→29, 160→320, 161→164, 162→169, 163→176, 164→24, 165→137, 166→149, 167→311, 168→165, 169→186, 170→30, 171→166, 172→178, 173→254, 174→27, 175→125, 176→47, 177→117, 178→281, 179→366, 180→345, 181→375, 182→326, 183→285, 184→75, 185→289, 186→198, 187→279, 188→355, 189→180, 190→259, 191→384, 192→52, 193→377, 195→325, 196→204, 197→396, 198→263, 199→192, 200→243, 201→330, 202→218, 203→316, 204→297, 205→348, 206→357, 207→264, 208→238, 209→54, 210→292, 211→298, 212→363, 213→253, 214→268, 215→183, 216→215, 217→241, 218→208, 219→318, 220→126, 221→225, 222→269, 223→351, 224→337, 225→81, 226→190, 227→55, 228→274, 229→393, 230→321, 231→80, 232→333, 233→299, 234→184, 235→275, 236→300, 237→209, 238→252, 239→391, 240→312, 241→161, 242→38, 243→222, 244→334, 245→317, 246→170, 247→106, 248→249, 249→216, 250→223, 251→284, 252→303, 253→282, 254→362, 255→211, 256→172, 257→227, 258→255, 259→390, 260→400, 261→395, 262→367, 263→233, 264→381, 265→394, 266→293, 267→276, 268→310, 269→118, 270→304, 271→360, 272→294, 273→247, 274→221, 275→162, 276→260, 277→224, 278→31, 279→305, 280→188, 281→267, 282→236, 283→397, 284→91, 285→290, 286→295, 287→386, 288→313, 289→319, 290→382, 291→322, 292→270, 293→332, 294→107, 295→358, 296→171, 297→277, 298→286, 299→347, 300→85, 301→42, 302→373, 303→368, 304→48, 305→245, 306→380, 307→287, 308→369, 309→202, 310→359, 311→256, 312→341, 313→240, 314→229, 315→349, 316→234, 317→399, 318→378, 319→335, 320→352, 321→364, 322→344, 323→220, 324→307, 325→327, 326→302, 327→387, 328→265, 329→168, 330→193, 331→291, 332→68, 333→257, 334→250, 335→230, 336→278, 337→296, 338→226, 339→388, 340→314, 341→338, 342→150, 343→336, 344→228, 345→342, 346→376, 347→205, 348→340, 349→301, 350→280, 351→266, 352→151, 353→365, 354→217, 355→261, 356→201, 357→258, 358→251, 359→248, 360→329, 361→350, 362→383, 363→398, 364→339, 365→57, 366→237, 367→353, 368→371, 369→361, 370→135, 371→374, 372→309, 373→212, 374→308, 375→370, 376→331, 377→273, 378→379, 379→127, 380→206, 381→41, 382→385, 383→315, 384→389, 385→346, 386→372, 387→343, 388→328, 389→246, 390→203, 391→94, 393→283, 394→356, 395→306, 396→199, 397→324, 398→191, 399→210, 400→323.
