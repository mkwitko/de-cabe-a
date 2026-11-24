# ADR-024 — Modo Clube: faixas de roubadas altas (Opta, Premier League)

Status: aceito pelo dono (2026-11-24). Motivo: o PR #249 criou duas faixas de aceite da liga em `packages/match-engine/src/calibration/calibrate.ts` (`BANDS_11`) sem registro. Faixa de aceite nova ou alterada exige aceite do dono e ADR.

## Decisão

1. **Roubadas altas por time: 5,75 a 8,35 por partida** (`highTurnoversPerTeam`). Opta Analyst, Premier League: 11,5 (2025/26) a 16,7 (2023/24) por partida, somando os dois times.
2. **Parte das roubadas altas que termina em finalização: 13% a 21%** (`highTurnoverShotShare`). Opta Analyst, Premier League: 14,9% a 17% de 2023/24 a 2025/26, com folga de amostra.
3. **A Premier League vale como referência secundária.** Não existe número publicado da Série A para essas duas métricas. Se aparecer um, ele substitui esta faixa com novo ADR.
4. **A medida segue a definição da Opta** (`transitions` em `calibration/summary.ts`):
   - roubada alta é posse ganha em jogo corrido a menos de 40 m (raio) do gol adversário; troca de posse em reinício não conta;
   - a sequência termina numa finalização, numa interrupção ou em qualquer ação defensiva, mesmo que a bola continue com o ataque.

## Consequências

- As duas faixas entram no ajuste da partida assistida (nível 1) com o mesmo peso das outras faixas da liga.
- A diferença de estilo entre Premier League e Série A não é medida. Por isso as faixas são referência secundária.
