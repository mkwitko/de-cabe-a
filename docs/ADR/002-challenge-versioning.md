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
