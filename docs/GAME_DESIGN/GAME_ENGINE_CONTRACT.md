# Game Engine Contract

Pacote: `packages/engine`. Sem dependência de banco, HTTP ou relógio. Funções puras sobre objetos simples.

## 1. Avaliação da interface proposta

A interface de referência (`validateConfig / createInitialState / submit / isCompleted`) atende aos dois jogos com dois ajustes:

1. `submit` precisa retornar **novo estado + evento** (não só resultado), para que a camada de aplicação persista estado e registre ação. Mantém a engine imutável.
2. Precisa de `buildShareText(state, config)` e `score(state, config)` — ambos determinísticos, e precisam ficar na engine para que testes cubram pontuação sem HTTP.

Não adicionamos: hooks de ciclo de vida, plugins, registry genérico com reflexão. Dois jogos não justificam.

## 2. Contrato

```ts
// packages/engine/src/contract.ts
export type GameStatus = 'IN_PROGRESS' | 'WON' | 'LOST' | 'COMPLETED';

export interface SubmitOutcome<TState, TEvent> {
  state: TState;        // novo estado (imutável)
  event: TEvent;        // o que aconteceu (para AttemptAction e feedback)
}

export interface GameEngine<TConfig, TState, TInput, TEvent> {
  readonly id: string;            // 'career-path' | 'football-grid'
  readonly version: number;       // 1
  validateConfig(config: unknown): TConfig;           // zod parse; lança ZodError
  createInitialState(config: TConfig): TState;
  submit(state: TState, input: TInput, config: TConfig): SubmitOutcome<TState, TEvent>;
  isCompleted(state: TState): boolean;
  score(state: TState, config: TConfig): number;
  /** Visão segura para o cliente: nunca inclui resposta/pool. */
  toPublicView(state: TState, config: TConfig): unknown;
  /** Visão completa após término (resposta, trajetória, exemplos). */
  toRevealView(state: TState, config: TConfig): unknown;
  buildShareText(state: TState, config: TConfig, meta: { label: string; url: string }): string;
}
```

Erros de regra (tentativa duplicada, partida concluída) são lançados como `EngineRuleError { code }`; a API mapeia para 409.

## 3. Career Path

```ts
// config = snapshot do desafio (ver DATA_MODEL.md §Challenge.snapshot)
interface CareerPathConfig {
  engine: 'career-path'; engineVersion: 1;
  answerPlayerId: string;
  maxAttempts: 6;
  trajectory: Array<{ clubId: string; clubName: string; countryCode: string; fromYear: number | null; toYear: number | null; isLoan: boolean }>;
  extraHints: { position?: 'GK'|'DF'|'MF'|'FW'; nationalityCode?: string };
  difficultyTier: 1|2|3;
}
interface CareerPathState {
  status: 'IN_PROGRESS'|'WON'|'LOST';
  attempts: Array<{ kind: 'guess'; playerId: string; correct: boolean } | { kind: 'skip' }>;
  revealedClubs: number;        // 1..trajectory.length
  revealedExtraHints: number;   // 0..2
}
type CareerPathInput = { kind: 'guess'; playerId: string } | { kind: 'skip' };
type CareerPathEvent = { type: 'correct' } | { type: 'wrong'; revealed: 'club'|'extraHint'|'none' } | { type: 'lost' };
```

`toPublicView` retorna `trajectory.slice(0, revealedClubs)`, hints revelados, tentativas usadas, status. Nunca `answerPlayerId`.

Decisões de implementação (slice 3, 2026-11-05):
- A 6ª tentativa sem acerto emite `{ type: 'lost' }` (não `wrong`).
- Pistas extras seguem a ordem posição → nacionalidade e pulam as ausentes no snapshot; esgotadas, `revealed: 'none'`.
- `toPublicView.revealed` omite `clubId`; `history` lista as tentativas, com o acerto como `{ kind: 'correct' }` (sem `playerId`).
- Inelegibilidade retorna códigos: `PLAYER_NOT_VERIFIED`, `TRAJECTORY_TOO_SHORT`, `TRAJECTORY_TOO_LONG`, `UNVERIFIED_SPELL`, `TIER_PRACTICE_ONLY`.

## 4. Football Grid

```ts
interface FootballGridConfig {
  engine: 'football-grid'; engineVersion: 1;
  maxAttempts: 9;
  rows: [Criterion, Criterion, Criterion];
  cols: [Criterion, Criterion, Criterion];
  cells: Array<{ index: 0|1|2|3|4|5|6|7|8; eligiblePlayerIds: string[]; exampleAnswerPlayerId: string }>;
  difficultyTier: 1|2|3;
}
type Criterion =
  | { type: 'club'; clubId: string; label: string; badgeUrl?: string }
  | { type: 'nationality'; countryId: string; label: string; flagCode: string }
  | { type: 'position'; positionGroup: 'GK'|'DF'|'MF'|'FW'; label: string }
  | { type: 'played_in_country'; countryId: string; label: string; flagCode: string };
interface FootballGridState {
  status: 'IN_PROGRESS'|'COMPLETED';
  attemptsUsed: number;             // 0..9
  cells: Array<{ index: number; playerId: string | null }>;
  usedPlayerIds: string[];
  actions: Array<{ cellIndex: number; playerId: string; correct: boolean }>;
}
type FootballGridInput = { kind: 'guess'; cellIndex: number; playerId: string } | { kind: 'finish' };
type FootballGridEvent = { type: 'correct'; cellIndex: number } | { type: 'wrong'; cellIndex: number } | { type: 'completed' };
```

`toPublicView` retorna critérios, células preenchidas (com `playerId` e nome resolvido pela camada de aplicação), tentativas. Nunca `eligiblePlayerIds`.

## 5. Onde fica o quê

| Responsabilidade | Local |
|---|---|
| Engines (regras, estado, score, share) | `packages/engine/src/career-path/`, `packages/engine/src/football-grid/` |
| Schemas Zod de config/state/input | `packages/engine` (co-localizados, reexportados) |
| Geração de snapshot (consulta DB, monta config) | `apps/api/src/modules/challenges/snapshot/` |
| Validação de elegibilidade/publicação | `apps/api/src/modules/challenges/eligibility/` (usa `engine.validateConfig` + regras de dados) |
| Persistência de partida | `apps/api/src/modules/attempts/` |
| Streak/estatísticas | `apps/api/src/modules/progression/` |

## 6. Determinismo e testes

- Nenhum `Date.now()`, `Math.random()` ou I/O dentro de `packages/engine`.
- Testes unitários: tabelas de transição (estado × input → estado, evento), pontuação, share text, `toPublicView` sem vazamento (teste que serializa e verifica ausência de `answerPlayerId`/`eligiblePlayerIds`).
- `engineVersion` fixo no snapshot. Mudança de regra = nova versão, engine antiga mantida enquanto houver desafio publicado com ela.
