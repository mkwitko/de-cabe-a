# ADR-020 — Modo Clube: T1 dentro da área conta excesso, não marcadores

Status: aceito pelo dono em 2026-11-17 (opção "medir excesso").

## Contexto

T1 (enxame) conta jogadores de um time a menos de 5 m da bola, mantidos por 1 s (ADR-018 item 1). Dentro das áreas a faixa é no máximo 4 (`BANDS.T1maxInBox`), sem referência publicada.

O desenho da defesa perto do gol (`02` §5.12) marca colado, 1 m entre cada atacante e o gol. Com atacantes perto da bola, isso põe 5 ou 6 defensores a menos de 5 m dela, cada um junto de um atacante. Na primeira tentativa a prova reprovou S2 e S3 por esse motivo (T1 na área 5 e 6). Isso é defesa de área, não enxame. A mudança de medição vem depois de ver o resultado, por isso este registro (TEST_STRATEGY §2.1).

## Decisão

Dentro das áreas, T1 conta só o **excesso**: jogadores a menos de 5 m da bola sem nenhum adversário a menos de `MARKED` (2 m, PARÂMETRO) deles. Quem está colado num adversário está marcando. Cada adversário vale para um jogador só: três defensores em volta do mesmo atacante contam dois de excesso. Fora das áreas T1 não muda. A faixa (4) não muda.

Testes (`coordination.test.ts`):

- Cinco defensores, cada um colado num atacante perto da bola na área, dão T1 na área 0. Os mesmos cinco sem atacantes dão 5.
- Três defensores em volta de um só atacante dão 2.

O pareamento é guloso, na ordem dos índices. Num caso raro de sobreposição, ele pode contar um excesso a mais. O erro vai para o lado rígido, então nunca esconde um enxame.

## Consequências

- A prova continua verde com o comportamento atual (94 testes).
- A marcação colada na zona de perigo ainda não entrou: com ela, T1 na área passa, mas reprovam T1 fora da área (4, faixa 3) em S2 e o vão da última linha (22,4 a 24,8 m, faixa 22) em S2 e S3. O ganho medido foi pequeno (gols 3,86 para 3,50 em 300 partidas). Estado e próximos passos em `02` §5.12.
- Risco: um time que se aglomera colado em adversários perto da bola na área não aparece em T1. O que mede esse caso é o resultado (gols e chances sofridos), não a forma.
