# Modo Clube — auditoria do repositório e arquitetura

Data: 2026-11-13, revisão 4. Decisões de base: ADR-013 a ADR-017.

## 1. Auditoria (FATOS)

- Monorepo pnpm: `apps/api` (Fastify 5, zod 4, Prisma 7, Postgres), `apps/web` (React 19, Vite 8, Tailwind 4, TanStack Query 5, Playwright), `packages/engine` (engines puras, vitest), `packages/contracts` (tipos e esquemas zod compartilhados). TypeScript 5.9.
- `packages/engine/src/contract.ts`: contrato `GameEngine` para fases de quiz (palpite, pontuação, visão pública, texto de compartilhar). Puro, sem relógio nem acaso.
- `packages/engine/src/career/career.ts`: Modo Carreira de jogador. Exporta `rng(seed)`, `simulateMatch`, 5 atributos, 10 partidas por temporada. Rotas em `apps/api/src/modules/career` (`/v1/career`). Tabelas `CareerPlayer`, `CareerTraining`, `CareerSeason`, `CareerMatch`. **Não é alterado.**
- Identidade: `GuestSession` (cookie com hash) ligada opcionalmente a `User` (ADR-004, ADR-008). Toda carreira existente pertence a uma sessão.
- API: módulos por pasta em `apps/api/src/modules`, plugin `FastifyPluginAsyncZod`, corpo validado por zod, erro por `AppError`.
- Web: um jogo por pasta em `apps/web/src/games`, sem biblioteca de estado global além do TanStack Query. Sem PixiJS, sem canvas hoje.
- Dados: `Player` (posição em 4 grupos, `positionDetail` vazio, sem atributos), `Club`, `CareerSpell`, 46 mil partidas reais em `Match` (Série A 2018–2026, Série B 2018–2025 e ligas europeias).
- Qualidade: `docs/QUALITY_GATES.md` (formatação, lint, tipos, testes, E2E em 360 px, teste de IDOR com dois usuários, limite de taxa, revisão de interface por tela). ADRs em `docs/ADR/`, numerados.
- Regras do dono: leitura de banco em lote, páginas de jogo em tela cheia e imersivas, dado de jogo revisado antes de publicar.
- Não há `AGENTS.md` nem `CLAUDE.md` na raiz.

Conflito encontrado: o cabeçalho de `contract.ts` proíbe acaso na engine; `career.ts` já usa `rng(seed)`. A regra real é "sem acaso não semeado". O Modo Clube segue a regra real.

## 2. Pacotes e pastas

Só o que tem uso imediato é criado. Em ordem de criação:

| Local | Responsabilidade | Depende de |
| --- | --- | --- |
| `packages/match-engine` | campo, agentes, bola, decisão, tática, comandos, estatística, engine por posses; **contrato de entrada e saída** em `src/contract.ts` | zod |
| `packages/club-domain` (Fase 1) | pacote de dados, competições e calendário, jogador, comissão e departamentos, governança, finanças, mercado, base, IA de clube | zod; de `match-engine`, só o contrato público |
| `apps/api/src/modules/manager` | rotas `/v1/manager/*`, transações, carga em lote, posse da carreira | os dois pacotes, Prisma |
| `apps/web/src/games/manager` | telas, `match-view` (campo 2D) e `i18n/` (ADR-017) | contratos |
| `packages/contracts/src/manager.ts` | esquemas de pedido e resposta | zod |
| `scripts/club-pack` | linha de comando do importador e do gerador de pacote fictício | `club-domain` |

DECISÃO: dois pacotes de domínio, não nove. Competições, gerador de jogadores, IA de clube, economia, comissão e base são pastas dentro de `club-domain`; viram pacote se e quando um segundo consumidor aparecer.

DECISÃO sobre tipos compartilhados: `match-engine/src/contract.ts` define, só com tipos e esquemas zod, o que a engine recebe (`MatchInput`: jogadores com atributos e estado, plano tático, condições, regras da partida) e devolve (`MatchResult`, eventos, quadros, chaves de explicação). `club-domain` importa apenas `@decabeca/match-engine` (a raiz, que reexporta o contrato e as funções `simulate*`); importar `@decabeca/match-engine/src/**` é erro de lint. A engine não conhece clube, contrato, comissão nem carreira: `club-domain` traduz o mundo para `MatchInput` (por exemplo, nível do departamento médico vira parâmetro de risco de lesão da partida).

DECISÃO: o gerador pseudoaleatório mora em `match-engine/src/random.ts` e faz parte do contrato público; `club-domain` o reutiliza com fluxos próprios (`fork('clima')`, `fork('mercado')`). O `rng` de `career.ts` fica onde está.

## 3. Fronteiras (regras verificáveis)

1. `match-engine` e `club-domain` não importam React, DOM, Fastify, Prisma, `Date.now` nem `Math.random` (regra de lint por pasta).
2. `match-view` não importa código de engine; recebe quadros e eventos pela API. Nenhuma regra de futebol no desenho.
3. A API é a única que grava. Engines recebem objetos e devolvem objetos.
4. Coordenadas de jogador nunca entram em estado do React; o desenho lê de um buffer e interpola.
5. Engines não produzem texto para a pessoa: devolvem chave de mensagem e parâmetros (ADR-017).
6. Nenhum código assume número de clubes, de divisões ou de rodadas (ADR-016); teste roda a mesma suíte em dois pacotes fictícios de tamanhos diferentes.

## 4. Fluxo de um dia de calendário (ADR-016)

1. `GET /v1/manager/career`: estado resumido e o Centro de Decisões (o que falta decidir antes do próximo evento).
2. Partida do usuário, quando o dia tem uma: `POST /v1/manager/match/:id/advance` uma ou mais vezes (ADR-015).
3. `POST /v1/manager/calendar/advance { até: 'próxima decisão' | data }` (uma transação, idempotente): para cada dia do intervalo, resolve as partidas dos outros clubes na engine por posses, atualiza tabelas e chaves de todas as competições, aplica treino, fadiga, lesão, moral, mercado, comissão, lançamentos financeiros, decisões dos rivais e cartas geradas; grava o documento do mundo. Para no primeiro dia com decisão obrigatória do usuário (partida, proposta com prazo, carta, fim de janela).

O número de partidas por dia e por temporada vem do pacote. Referência de volume com os formatos reais: ver `05-COMPETICOES-E-CALENDARIO.md` §8.

## 5. Modelo de dados inicial (Prisma, nomes propostos)

```text
ClubCareer        id, sessionId, packId, packVersion, engineVersion, seed,
                  startMode(free_choice|job_offers), scenarioId?, clubId?,
                  season, day, status(active|unemployed|ended), createdAt, updatedAt
ClubCareerWorld   careerId (pk), data Bytes (JSON gzip), revision Int
ClubMatch         id, careerId, season, day, competitionId, phaseId, homeClubId, awayClubId, seed,
                  input Json, commands Json, status, score Json, stats Json
ClubLedgerEntry   id, careerId, clubId, season, day, kind, amount, dueDay?, settledDay?, ref,
                  idempotencyKey (unique por carreira)
ClubEvent         id, careerId, season, day, cardId, context Json, choice, effects Json
ClubHistory       id, careerId, clubId, season, kind, subjectId?, payload Json
```

**Dinheiro tem uma origem só.** O caixa de um clube é a soma dos lançamentos liquidados em `ClubLedgerEntry`; não existe coluna `cash` na carreira, nem `cashAfter` no lançamento, nem saldo no documento do mundo. Recebíveis e dívidas são lançamentos com vencimento ainda não liquidados. Para leitura rápida, a API mantém em memória ou em cache um saldo derivado, sempre recalculável; um teste compara o cache com a soma. Os rivais não têm livro-caixa em linhas: o financeiro deles é um resumo por temporada dentro do documento do mundo (receitas, despesas, caixa, dívida), atualizado pela mesma função pura que gera os lançamentos do usuário, e é a única cópia desses números.

**O que vai em linha e o que vai no documento.** Linhas: o que precisa de auditoria, de consulta entre carreiras ou de idempotência (carreira, partidas do usuário, livro-caixa do clube do usuário, eventos, história). Documento do mundo: todo o resto, como diferenças sobre o pacote (jogadores, comissão e vínculos, departamentos, governança, tabelas e chaves de todas as competições, calendário, mercado, observação, rivalidades, resumo financeiro dos rivais, fluxos do gerador aleatório). Conteúdo detalhado em `03-JOGADORES-E-BASE.md` §9 e `06-COMISSAO-E-GOVERNANCA.md` §8.

**Instantâneos.** O documento é gravado inteiro a cada avanço, com `revision` crescente (trava otimista). Guarda-se a revisão atual e a do início da temporada (para repetir uma temporada em teste e para investigar defeito). Não há histórico por dia.

Índices: `ClubCareer(sessionId)`, `ClubMatch(careerId, season, day)`, `ClubLedgerEntry(careerId, clubId, season)`. Carreiras simultâneas por conta: parâmetro (uma, na versão grátis inicial; ADR-017).

### 5.1 Cadência de simulação do mundo

O mundo não é recalculado inteiro a cada dia. Cada coisa tem a sua cadência:

| O quê | Quando |
| --- | --- |
| Partida do usuário | engine espacial, sob demanda |
| Partidas dos outros clubes | engine por posses, no dia do jogo |
| Competições de base de clubes que não são o do usuário | agregado por fase (classificação e destaques por semente) |
| Jogadores: carga, frescor, lesão, moral | diário, só para quem jogou ou treinou; fórmula fechada para dias sem evento |
| Evolução de atributos, familiaridade, comissão | semanal |
| Finanças | por evento (lançamento) e fechamento mensal |
| Mercado, contratos, agentes | por evento e por rodada de oferta |
| Torcida, reputação, identidade | semanal ou mensal |
| Garotos latentes | nunca, até serem materializados; safra e progressão por temporada |
| Regras financeiras, licenciamento, governança | por temporada, com prazos no calendário |

Regra de implementação: toda atualização periódica é uma função pura `(estado, intervalo) → estado` que aceita vários dias de uma vez, para que avançar 30 dias custe pouco mais que avançar 1.

### 5.2 Onde guardar o estado: decisão condicionada a medição

A revisão do dono questionou o documento único comprimido (ADR-014). Os riscos são reais: gravar tudo para mudar um funcionário, consulta específica difícil, conflito entre transações, recuperação parcial. As alternativas:

| Opção | A favor | Contra |
| --- | --- | --- |
| A. Documento único + linhas de auditoria (ADR-014 atual) | uma leitura e uma gravação por avanço; poucas linhas por carreira; fácil de versionar e de repetir | regrava tudo; sem consulta dentro do mundo; um escritor por vez |
| B. Híbrido relacional: jogadores, comissão, contratos, competições em linhas por carreira; JSONB para planos e perfis; instantâneo comprimido só para recuperação | consulta e atualização pontuais; auditoria natural | milhares de linhas por carreira (um mundo de 156 clubes tem por volta de 5.000 pessoas); avanço de um dia toca centenas de linhas; migrações mais caras |
| C. Documento partido por domínio (jogadores, comissão, competições, mercado, base) com revisão por parte | grava só a parte que mudou; mantém poucas linhas | mais código de consistência entre partes |

DECISÃO: não fechar agora. A tarefa MC-201 mede as três com o pacote fictício grande: tamanho, tempo de avanço de um dia e de uma temporada, tempo de abrir a carreira, custo por mil carreiras ativas. O que já está decidido e não muda: dinheiro, partidas do usuário, eventos e história ficam em linhas (auditoria e idempotência). A hipótese de partida é a opção C.

## 6. Segurança

Segue `docs/SECURITY.md` e `docs/QUALITY_GATES.md`. Específico do modo:

- Toda rota resolve a carreira pela sessão do pedido; identificador de carreira no caminho nunca é confiado (teste com dois usuários por rota).
- Corpo com campo fora do esquema é rejeitado (`z.strictObject`): `cash`, `score`, `attributes`, `seed` nunca vêm do cliente.
- Máquina de estados explícita para carreira (`phase`) e partida (`status`); transição inválida devolve 409.
- Idempotência: `Idempotency-Key` em `calendar/advance`, compra, venda, obra e escolha de evento; chave repetida devolve a mesma resposta.
- Duas requisições simultâneas de `calendar/advance` produzem um efeito (trava por `revision` do mundo).
- A semente da partida não vai ao cliente antes do fim do jogo (quem tem a semente e a engine prevê o resultado).
- Limite de taxa por rota; corpo limitado a 16 KB; no máximo 40 comandos por partida.
- Pacote: `checksum` conferido na carga; pacote com erro de validação não sobe.

## 7. Desempenho (metas iniciais, PARÂMETROS a medir)

| Item | Meta |
|---|---|
| Partida espacial de 90 min, um núcleo | < 1 s |
| Partida por posses (nível 2) | < 2 ms |
| Avançar um dia cheio (todas as partidas do dia por posses + mundo) | < 500 ms |
| Simular temporada inteira sem usuário, com o volume real de partidas do pacote (teste) | < 60 s |
| Campo 2D em celular intermediário | 60 quadros por segundo, 30 como piso |
| Resposta de um trecho de partida | < 300 KB comprimido |
| Abrir a carreira (carregar o estado) | < 300 ms |
| Memória por partida espacial | medir (MC-200) |
| Consultas por pedido | número fixo, sem consulta por item |

## 8. Testes

Estratégia completa em `TEST_STRATEGY.md`. Resumo: unidade, determinismo, invariantes, estatístico, causal, zebra, equilíbrio de longo prazo, integração de API, ponta a ponta em celular e desktop, tradução.
