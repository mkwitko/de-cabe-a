# Calibragem a partir dos dados de partidas do próprio site (MC-009)

Data: 2026-11-13. Fonte: tabela `Match` do banco local, registros de origem `openfootball` (dados de domínio público). Consulta única agregada, sem alteração de dados. Todos os números abaixo são FATO medido nessa base; a base só tem placar, data e clubes, então nada aqui fala de finalizações, posse, cartões ou faltas.

## 1. Amostra

| Competição | Partidas | Temporadas |
| --- | --- | --- |
| Brasileirão Série A | 3.317 | 2018 a 2026 (2026 parcial, 277 jogos) |
| Brasileirão Série B | 2.717 | 2018 a 2025 (2025 parcial, 57 jogos) |
| Copa Libertadores | 2.213 | 2012 a 2026 |
| Copa Sul-Americana | 1.572 | 2012 a 2025 |
| Copa do Brasil | 92 | 2025 (amostra pequena; não usar) |

Séries C e D: **não há partidas na base**. A lacuna foi coberta por `11-simulacao-e-coordenacao.md` item 8, com contagem sobre páginas públicas de cada temporada (2021 a 2025): Série C com 2,19 gols por jogo e 47,4% de vitórias do mandante em 1.060 jogos; Série D com 2,34 e 45,2% em 2.226 jogos de fase de grupos. A mesma contagem dá 2,14 e 47,5% para a Série B e 2,43 e 47,0% para a Série A, compatível com os números desta base.

## 2. Resultado e gols

| Competição | Gols por jogo | Mandante | Empate | Visitante | Gols mandante | Gols visitante |
| --- | --- | --- | --- | --- | --- | --- |
| Série A | 2,40 | 47,6% | 27,5% | 24,9% | 1,411 | 0,991 |
| Série B | 2,13 | 45,9% | 29,8% | 24,2% | 1,253 | 0,880 |
| Libertadores | 2,50 | 52,2% | 23,8% | 24,0% | | |
| Sul-Americana | 2,36 | 46,9% | 26,0% | 27,1% | | |

Comparação na mesma base: Premier League 2,81 gols e 44,9% de mandante; Bundesliga 3,03; La Liga 2,66. O futebol brasileiro tem menos gols, mais empates e mais vantagem de mando que as cinco grandes ligas europeias.

## 3. Forma da distribuição

| Indicador | Série A | Série B |
| --- | --- | --- |
| Variância dos gols do mandante (média) | 1,327 (1,411) | 1,123 (1,253) |
| Variância dos gols do visitante (média) | 0,987 (0,991) | 0,865 (0,880) |
| 0 a 0 | 8,4% | 11,8% |
| Três gols ou mais no jogo | 43,9% | 36,8% |
| Os dois marcam | 49,1% | 44,5% |
| Diferença de três gols ou mais | 11,0% | 7,8% |

A variância fica um pouco abaixo da média nos dois lados: os gols por time são levemente menos dispersos que um Poisson puro. A engine não deve ser ajustada para "parecer Poisson"; a distribuição é resultado, e o alvo é a tabela acima.

Placares mais frequentes:

| Placar | Série A | Série B |
| --- | --- | --- |
| 1 a 0 | 13,7% | 15,6% |
| 1 a 1 | 13,5% | 13,7% |
| 2 a 1 | 10,7% | 10,2% |
| 0 a 0 | 8,4% | 11,8% |
| 2 a 0 | 8,4% | 8,6% |
| 0 a 1 | 8,1% | 9,7% |
| 1 a 2 | 6,7% | 5,8% |
| 2 a 2 | 4,7% | 3,7% |
| 3 a 0 | 4,2% | 3,5% |
| 0 a 2 | 3,9% | 3,8% |
| 3 a 1 | 3,7% | 3,3% |

## 4. Variação entre temporadas

| Temporada | Série A gols | Série A mandante | Série A empate | Série B gols | Série B mandante | Série B empate |
| --- | --- | --- | --- | --- | --- | --- |
| 2018 | 2,18 | 53,2% | 28,9% | 2,23 | 41,8% | 31,3% |
| 2019 | 2,31 | 48,4% | 25,8% | 2,08 | 40,5% | 33,4% |
| 2020 | 2,48 | 45,0% | 28,4% | 2,17 | 46,1% | 28,2% |
| 2021 | 2,22 | 45,8% | 29,7% | 2,17 | 43,4% | 30,3% |
| 2022 | 2,38 | 44,2% | 28,4% | 2,02 | 49,7% | 31,8% |
| 2023 | 2,49 | 46,8% | 25,8% | 2,09 | 46,1% | 29,2% |
| 2024 | 2,44 | 47,4% | 26,6% | 2,19 | 52,4% | 25,3% |
| 2025 | 2,52 | 50,3% | 26,1% | parcial | | |

Uma temporada de 380 jogos oscila sozinha: Série A foi de 2,18 a 2,52 gols por jogo e de 44,2% a 53,2% de vitórias do mandante. A vantagem de mando caiu em 2020 e 2021, anos de estádio vazio na pandemia, e voltou depois.

## 5. O que isso fixa nas specs

- Alvos de calibragem por divisão são a tabela do §2 e do §3, e não um número único. A faixa aceita para uma temporada simulada é a amplitude observada no §4.
- A Série B precisa sair com menos gols e mais empates que a Série A **pelo dado do pacote** (qualidade de finalização e de criação menores), sem multiplicador de divisão na engine.
- A queda do mando em estádio vazio é um teste causal disponível: partida com portões fechados reduz a vantagem do mandante.
- Para as Séries C e D o alvo vem da pesquisa 11 (fonte secundária, contagem por script). Observação: a Série D tem **mais** gols que a B e a C, o que contraria a extrapolação "quanto mais baixa a divisão, menos gols"; nenhum multiplicador por divisão deve ser assumido.
