# ADR-002 — Snapshot imutável por desafio

Status: aceito.

## Contexto
A base de jogadores muda (correções, novos spells). Um desafio publicado precisa produzir o mesmo resultado para sempre, e partidas antigas precisam ser reavaliáveis.

## Decisão
`Challenge.snapshot` (jsonb) contém **tudo** que a engine precisa: trajetória, resposta, pools por célula, pistas, regras de pontuação implícitas em `engineVersion`. Após `published`, `snapshot` e `engineVersion` são imutáveis (trigger Postgres + teste). Correção = `retire` + novo `Challenge` com `supersedesId`. `Attempt` guarda `engineVersion` e seu próprio `state`; nunca recalcula a partir da base.

## Alternativas
- Tabela `ChallengeVersion` com histórico: mais joins, mesmo efeito; rejeitada.
- Referenciar `CareerSpell` por FK e congelar spells: congela a base inteira, impede correções; rejeitada.

## Consequências
Engines antigas permanecem no código enquanto houver desafio publicado com aquela versão. Snapshot duplica dados (aceitável: KB por desafio).

## Revisão 2026-11-06: substituição no lugar
Com a trilha de fases (ADR-007), o substituto publicado herda o `publicNumber` da fase retirada, e a numeração da trilha não muda. O número é único só entre desafios `published` (índice parcial). Quem já começou a versão antiga continua nela; o progresso da trilha conta por número de fase, então terminar a versão antiga libera a fase seguinte. Primeiro uso: 18 fases de Career Path com posição desatualizada (Kaká aparecia como atacante).
