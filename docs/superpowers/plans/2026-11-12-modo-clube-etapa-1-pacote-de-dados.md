# Modo Clube, etapa 1: pacote de dados — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produzir o pacote `br-2026-1`: 80 clubes brasileiros em quatro divisões, elencos reais revisados nas Séries A e B, elencos gerados nas C e D, todos com posição detalhada, atributos próprios, idade e teto.

**Architecture:** Regras puras e com semente em `packages/engine/src/club/` (posições, atributos, nota, gerador, validação do pacote). Scripts em `scripts/research/club-pack/` leem o banco local, montam o pacote e gravam um arquivo JSON versionado. Correções entram por um arquivo de ajustes separado, que o script reaplica a cada geração.

**Tech Stack:** TypeScript, zod, vitest, Prisma (só leitura, exceto `Player.positionDetail`), tsx. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-11-12-modo-clube-design.md`

## Global Constraints

- Fontes permitidas: banco próprio, Wikidata, Wikipédia. Nenhum dado de banco de outro jogo ou de site que o exiba.
- Atributos de 1 a 99. 13 posições. 12 atributos de linha e 3 de goleiro.
- Tudo determinístico: mesma semente, mesmo resultado. Usar `rng(seed)` de `packages/engine/src/career/career.ts`.
- Leituras de banco em lote; proibido consultar por jogador dentro de laço.
- Wikidata: no máximo 1 requisição por segundo, usando `apps/api/src/modules/data-import/wikidata-client.ts`.
- Só banco local. Nada é escrito em produção nesta etapa.
- Pacote publicado é imutável: correção gera `br-2026-2`.
- Código e comentários em inglês; texto para a pessoa em português.
- Branch `feat/modo-clube-pacote`. Um commit por tarefa.

## Review Focus

1. Jogador com duas passagens abertas em clubes diferentes (ou emprestado): deve aparecer em um clube só, o da passagem mais recente. Teste na tarefa 6.
2. Aposentado com passagem sem data de fim: não entra no elenco. Teste na tarefa 6.
3. Jogador sem data de nascimento: não entra como real; vai para a lista de revisão. Teste na tarefa 6.
4. Clube com menos de 18 reais ou sem goleiro: completado com gerados até o mínimo, e marcado no relatório. Testes nas tarefas 3 e 6.
5. Rótulo de posição desconhecido ou sem lado (lateral, ponta): cai na posição do grupo, com marca para revisão, nunca quebra. Teste na tarefa 1.

---

### Task 1: Posições, atributos e nota geral

**Files:**
- Create: `packages/engine/src/club/positions.ts`, `packages/engine/src/club/attributes.ts`
- Test: `packages/engine/src/club/positions.test.ts`, `packages/engine/src/club/attributes.test.ts`
- Modify: `packages/engine/src/index.ts` (exportar `club/*`)

**Interfaces:**
- Produces:
  - `POSITIONS = ['GK','CB','RB','LB','DM','CM','RM','LM','AM','RW','LW','SS','ST'] as const`, `type Position`
  - `positionFromLabel(label: string, group: 'GK'|'DF'|'MF'|'FW'|null): { position: Position; guessed: boolean }`
  - `ATTRIBUTES` (15 nomes abaixo), `type Attributes = Record<Attribute, number>`
  - `WEIGHTS: Record<Position, Partial<Attributes>>`
  - `overall(a: Attributes, p: Position): number` (média ponderada, arredondada)

Atributos: `finishing, passing, dribbling, crossing, heading, tackling, marking, positioning, vision, pace, strength, stamina, reflexes, rushing, distribution`.

Pesos (atributo ausente pesa 0):

| Posição | Pesos |
|---|---|
| GK | reflexes 5, rushing 3, positioning 3, distribution 1 |
| CB | tackling 5, marking 5, heading 4, positioning 4, strength 4, pace 2, passing 2 |
| RB, LB | pace 4, stamina 4, tackling 4, crossing 4, marking 3, positioning 3, passing 3, dribbling 2 |
| DM | tackling 5, marking 4, positioning 4, passing 4, stamina 3, strength 3, vision 2 |
| CM | passing 5, vision 4, stamina 4, positioning 3, tackling 3, dribbling 2, finishing 1 |
| RM, LM | crossing 4, passing 4, stamina 4, pace 3, dribbling 3, vision 3, tackling 2 |
| AM | vision 5, passing 5, dribbling 4, finishing 3, positioning 2, pace 2 |
| RW, LW | pace 5, dribbling 5, crossing 4, finishing 3, passing 2, vision 2 |
| SS | finishing 4, dribbling 4, vision 4, passing 3, pace 3, positioning 3 |
| ST | finishing 5, positioning 4, heading 4, strength 3, pace 3, dribbling 2 |

Rótulos do Wikidata (inglês, sem diferenciar maiúsculas): goalkeeper → GK; centre-back, central defender, defender, sweeper → CB; right-back → RB; left-back → LB; full-back, wing-back → RB com `guessed`; defensive midfielder → DM; central midfielder, midfielder → CM; right midfielder → RM; left midfielder → LM; attacking midfielder, playmaker → AM; right winger → RW; left winger → LW; winger → RW com `guessed`; second striker, forward → SS; striker, centre-forward → ST. Sem correspondência: GK→GK, DF→CB, MF→CM, FW→ST, grupo nulo→CM, sempre com `guessed`.

- [ ] **Step 1: Testes que falham**

```ts
expect(positionFromLabel('Defensive midfielder', 'MF')).toEqual({ position: 'DM', guessed: false });
expect(positionFromLabel('winger', 'FW')).toEqual({ position: 'RW', guessed: true });
expect(positionFromLabel('', 'DF')).toEqual({ position: 'CB', guessed: true });
expect(positionFromLabel('quarterback', null)).toEqual({ position: 'CM', guessed: true });
const flat = Object.fromEntries(ATTRIBUTES.map((k) => [k, 70])) as Attributes;
for (const p of POSITIONS) expect(overall(flat, p)).toBe(70);
expect(overall({ ...flat, finishing: 90 }, 'ST')).toBeGreaterThan(overall({ ...flat, finishing: 90 }, 'CB'));
```

- [ ] **Step 2:** `pnpm --filter @decabeca/engine test -- club` falha (módulo não existe).
- [ ] **Step 3:** Implementar os dois arquivos e exportar no índice.
- [ ] **Step 4:** Mesmo comando passa.
- [ ] **Step 5:** Commit `feat(club): positions, attributes and overall`.

### Task 2: Nota alvo e distribuição de atributos

**Files:**
- Create: `packages/engine/src/club/rate.ts`
- Test: `packages/engine/src/club/rate.test.ts`

**Interfaces:**
- Consumes: tarefa 1.
- Produces:
  - `interface RatingFacts { clubLevel: number; tier: 'T1'|'T2'|'T3'|'T4'; nationalGames: number; age: number }`
  - `targetOverall(f: RatingFacts): number`
  - `potentialFor(overall: number, age: number, tier: RatingFacts['tier'], seed: number): number`
  - `rateAttributes(position: Position, target: number, seed: number): Attributes`

Regras:
- `targetOverall = clubLevel + tierBonus + min(nationalGames / 4, 3) + ageAdjust`, arredondado, limitado a 40–92.
- `tierBonus`: T1 +10, T2 +6, T3 0, T4 −3.
- `ageAdjust`: até 20 anos −6; 21–23 −2; 24–30 0; 31–33 −1; 34–36 −3; 37 ou mais −6.
- `potentialFor`: 24 anos ou mais devolve `overall`. Mais novo: `overall + sorteio inteiro entre 2 e (24 − age) × 2`, mais 3 se T1 ou T2, limitado a 99.
- `rateAttributes`: atributos com peso ficam em `target ± 6`; atributos sem peso ficam entre `target − 25` e `target − 12`; atributos de goleiro em jogador de linha (e de linha em goleiro, exceto `positioning`) ficam entre 5 e 20. Depois desloca por igual os atributos com peso até `overall` dar o alvo. Tudo limitado a 1–99.

- [ ] **Step 1: Testes que falham**

```ts
expect(targetOverall({ clubLevel: 72, tier: 'T3', nationalGames: 0, age: 27 })).toBe(72);
expect(targetOverall({ clubLevel: 72, tier: 'T1', nationalGames: 40, age: 38 })).toBe(79);
expect(targetOverall({ clubLevel: 95, tier: 'T1', nationalGames: 40, age: 27 })).toBe(92);
expect(potentialFor(70, 28, 'T3', 1)).toBe(70);
expect(potentialFor(60, 18, 'T3', 1)).toBeGreaterThanOrEqual(62);
expect(potentialFor(60, 18, 'T3', 1)).toBeLessThanOrEqual(72);
for (const p of POSITIONS) {
  const a = rateAttributes(p, 68, 42);
  expect(Math.abs(overall(a, p) - 68)).toBeLessThanOrEqual(1);
  expect(Object.values(a).every((v) => v >= 1 && v <= 99)).toBe(true);
  expect(rateAttributes(p, 68, 42)).toEqual(a);
}
expect(rateAttributes('ST', 68, 42).reflexes).toBeLessThanOrEqual(20);
```

- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3:** Implementar `rate.ts`.
- [ ] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `feat(club): target overall and attribute spread`.

### Task 3: Gerador de jogadores e de elenco

É a mesma engine que as etapas 4 e 5 vão usar para safra, clubes formadores e escolinhas. Aqui ela só precisa preencher elencos adultos.

**Files:**
- Create: `packages/engine/src/club/generate.ts`, `packages/engine/src/club/names.ts`
- Test: `packages/engine/src/club/generate.test.ts`

**Interfaces:**
- Consumes: tarefas 1 e 2.
- Produces:
  - `interface PackPlayer { id: string; name: string; clubId: string; real: boolean; sourcePlayerId?: string; birthYear: number; position: Position; secondary: Position[]; attributes: Attributes; potential: number; flags: string[] }`
  - `generatePlayer(o: { seed: number; clubId: string; clubLevel: number; position: Position; year: number; minAge?: number; maxAge?: number }): PackPlayer`
  - `SQUAD_SHAPE: Record<Position, number>` com GK 3, CB 4, RB 2, LB 2, DM 2, CM 3, RM 1, LM 1, AM 2, RW 2, LW 2, SS 1, ST 3 (28 no total)
  - `fillSquad(real: PackPlayer[], o: { seed: number; clubId: string; clubLevel: number; year: number }): PackPlayer[]`

Regras:
- `names.ts`: pelo menos 120 prenomes e 120 sobrenomes brasileiros comuns, escritos à mão. Nome gerado = prenome + sobrenome.
- Idade padrão entre 17 e 35, com mais peso em 21–29. `birthYear = year − idade`.
- Gerado tem `real: false`, `id` no formato `gen-<clubId>-<seed>`, nota alvo `clubLevel` com tier T3 e `nationalGames` 0, variação de ±5 pela semente.
- `fillSquad` devolve os reais mais os gerados necessários para cada posição alcançar `SQUAD_SHAPE`. Nunca remove real. Elenco vazio de reais gera 28.

- [ ] **Step 1: Testes que falham**

```ts
const o = { seed: 7, clubId: 'c1', clubLevel: 55, year: 2026 };
const squad = fillSquad([], o);
expect(squad).toHaveLength(28);
expect(squad.filter((p) => p.position === 'GK')).toHaveLength(3);
expect(squad.every((p) => !p.real && p.birthYear >= 1991 && p.birthYear <= 2009)).toBe(true);
expect(new Set(squad.map((p) => p.id)).size).toBe(28);
expect(fillSquad([], o)).toEqual(squad);
const three = squad.filter((p) => p.position === 'ST').map((p) => ({ ...p, real: true }));
const topped = fillSquad(three, o);
expect(topped.filter((p) => p.position === 'ST')).toHaveLength(3);
expect(topped).toHaveLength(28);
const noKeeper = squad.filter((p) => p.position !== 'GK');
expect(fillSquad(noKeeper, o).filter((p) => p.position === 'GK')).toHaveLength(3);
```

- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `feat(club): player and squad generator`.

### Task 4: Formato e validação do pacote

**Files:**
- Create: `packages/engine/src/club/pack.ts`
- Test: `packages/engine/src/club/pack.test.ts`

**Interfaces:**
- Consumes: `PackPlayer`, `Position`, `overall`.
- Produces:
  - `interface PackClub { id: string; name: string; shortName: string; city: string | null; division: 'A'|'B'|'C'|'D'; level: number }`
  - `interface Pack { id: string; name: string; year: number; clubs: PackClub[]; players: PackPlayer[] }`
  - `PackSchema` (zod) e `validatePack(pack: unknown): string[]` (lista de problemas; vazia quando válido)

Problemas que `validatePack` aponta, um texto por ocorrência: formato inválido; divisão sem exatamente 20 clubes; id de clube ou jogador repetido; `sourcePlayerId` repetido; jogador em clube inexistente; clube com menos de 18 ou mais de 40 jogadores; clube com menos de 2 goleiros; atributo fora de 1–99; `potential` menor que a nota geral; idade (`year − birthYear`) fora de 15–45.

- [ ] **Step 1: Testes que falham.** Montar um pacote válido com `fillSquad` para 80 clubes e afirmar `validatePack(pack)` igual a `[]`. Depois, um teste por problema da lista acima, cada um alterando uma coisa e afirmando que a lista devolvida tem um item que cita o id afetado.
- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `feat(club): pack schema and validation`.

### Task 5: Lista das quatro divisões

**Files:**
- Create: `scripts/research/club-pack/divisions.json`, `scripts/research/club-pack/check-divisions.ts`

**Interfaces:**
- Produces: `divisions.json` como lista de `{ wikidataId: string; shortName: string; division: 'A'|'B'|'C'|'D' }`, 20 por divisão.

- [ ] **Step 1:** Montar a lista com os participantes de 2026. Série A: clubes com partidas na temporada 2026 da tabela `Match`. Séries B e C: páginas da Wikipédia em português das edições de 2026. Série D: 20 clubes da edição de 2026, escolhidos por maior número de passagens no banco.
- [ ] **Step 2:** `check-divisions.ts` lê a lista, busca todos os clubes em uma consulta por `wikidataId` e imprime os ausentes do banco. Rodar: `pnpm tsx scripts/research/club-pack/check-divisions.ts`. Esperado: `80 clubs, 0 missing`.
- [ ] **Step 3:** Clube ausente: importar pelo fluxo de `data-import` que já existe, ou trocar por outro da mesma divisão. Repetir o passo 2.
- [ ] **Step 4:** Commit `feat(club-pack): division list for 2026`.

### Task 6: Montagem do pacote

**Files:**
- Create: `scripts/research/club-pack/squads.ts` (regras puras), `scripts/research/club-pack/squads.test.ts`, `scripts/research/club-pack/positions.ts`, `scripts/research/club-pack/build.ts`, `scripts/research/club-pack/overrides.json` (começa como `[]`)
- Output: `apps/api/club-packs/br-2026-1.json`, `scripts/research/club-pack/out/report.md`

**Interfaces:**
- Consumes: tarefas 1 a 5.
- Produces:
  - `pickSquads(rows: SpellRow[], year: number): { byClub: Map<string, SpellRow[]>; rejected: { playerId: string; reason: string }[] }`
  - `interface SpellRow { playerId: string; clubId: string; birthDate: Date | null; startDate: Date | null; endDate: Date | null; spellType: 'professional'|'loan'|'youth'; tier: 'T1'|'T2'|'T3'|'T4'; verified: boolean }`
  - `clubLevels(matches: { homeClubId: string; awayClubId: string; homeScore: number; awayScore: number }[], division: 'A'|'B'): Map<string, number>`
  - `interface Override { playerId: string; field: 'position'|'secondary'|'overall'|'potential'|'clubId'|'remove'; value: unknown; reason: string }`

Regras de `pickSquads`:
- Só passagens `professional` ou `loan` com `endDate` nulo.
- Rejeita sem data de nascimento (`no birth date`), com mais de 41 anos (`too old`) e com `startDate` anterior a `year − 8` (`stale spell`).
- Jogador com mais de uma passagem aberta fica só na de `startDate` mais recente; empate, fica a `loan`.
- Mais de 35 por clube: mantém os 35 primeiros ordenando por verificado, tier, `startDate` mais recente; o resto sai com `over squad limit`.

Regras de `clubLevels`: pontos por jogo da última temporada disponível, convertidos em linha reta para 64–78 na Série A e 56–66 na B (pior clube da divisão recebe o mínimo, melhor recebe o máximo). Clube sem partidas recebe o mínimo da divisão. Séries C e D têm nível fixo: C 52, D 46, com variação de ±3 pela semente do clube.

`positions.ts`: para os jogadores escolhidos sem `positionDetail`, busca o rótulo P413 no Wikidata em lotes de 50 e grava `Player.positionDetail` no banco local com um `updateMany` por rótulo.

`build.ts`: lê divisões, passagens e partidas em três consultas; aplica `pickSquads`, `positionFromLabel`, `targetOverall`, `rateAttributes`, `potentialFor`, `fillSquad`; aplica `overrides.json` (um ajuste de `overall` refaz os atributos com `rateAttributes`); roda `validatePack`; grava o pacote e o relatório. Sai com erro se `validatePack` devolver problema ou se um ajuste citar jogador inexistente. Semente de cada jogador: hash estável do `playerId`.

`report.md`: por clube, quantos reais e quantos gerados; lista de rejeitados com motivo; lista de jogadores com posição adivinhada.

- [ ] **Step 1: Testes que falham** em `squads.test.ts`:

```ts
const base = { birthDate: new Date('1998-01-01'), startDate: new Date('2024-01-01'), endDate: null,
  spellType: 'professional', tier: 'T3', verified: true } as const;
const r = pickSquads([
  { ...base, playerId: 'two', clubId: 'a', startDate: new Date('2022-01-01') },
  { ...base, playerId: 'two', clubId: 'b', startDate: new Date('2025-01-01') },
  { ...base, playerId: 'old', clubId: 'a', birthDate: new Date('1975-01-01') },
  { ...base, playerId: 'nobirth', clubId: 'a', birthDate: null },
  { ...base, playerId: 'stale', clubId: 'a', startDate: new Date('2009-01-01') },
  { ...base, playerId: 'ended', clubId: 'a', endDate: new Date('2025-06-01') },
  { ...base, playerId: 'kid', clubId: 'a', spellType: 'youth' },
], 2026);
expect(r.byClub.get('b')?.map((x) => x.playerId)).toEqual(['two']);
expect(r.byClub.get('a')).toBeUndefined();
expect(r.rejected.map((x) => x.reason).sort()).toEqual(['no birth date', 'stale spell', 'too old']);
```

Mais um teste com 40 jogadores no mesmo clube: ficam 35 e cinco saem com `over squad limit`. Mais um para `clubLevels`: três clubes com 3, 1,5 e 0 pontos por jogo na Série A dão 78, 71 e 64.

- [ ] **Step 2:** `pnpm vitest run scripts/research/club-pack` falha.
- [ ] **Step 3:** Implementar `squads.ts`.
- [ ] **Step 4:** Testes passam.
- [ ] **Step 5:** Implementar `positions.ts` e rodar: `pnpm tsx scripts/research/club-pack/positions.ts`. Esperado: linha final `positionDetail filled: <n>, not found: <m>`.
- [ ] **Step 6:** Implementar `build.ts` e rodar: `pnpm tsx scripts/research/club-pack/build.ts`. Esperado: `pack br-2026-1: 80 clubs, <n> players, 0 problems`.
- [ ] **Step 7:** Rodar de novo e conferir que o arquivo não muda: `git diff --stat apps/api/club-packs` vazio após o segundo build.
- [ ] **Step 8:** Commit `feat(club-pack): build br-2026-1 from own data`.

### Task 7: Revisão dos dados

Regra do projeto: qualidade de dado vem antes do lançamento.

**Files:**
- Create: `scripts/research/club-pack/audit.ts`
- Modify: `scripts/research/club-pack/overrides.json`
- Output: `scripts/research/club-pack/out/audit.md`

**Interfaces:**
- Consumes: pacote da tarefa 6, `Override`.

`audit.ts` lê o pacote e lista, por clube das Séries A e B: elenco em ordem de nota com posição, idade, nota e teto; e alertas automáticos: posição adivinhada; mais de 6 ou menos de 2 jogadores na mesma posição; jogador com nota 8 pontos acima ou abaixo da média do clube; jogador de 34 anos ou mais entre os três melhores; clube com menos de 18 reais.

- [ ] **Step 1:** Implementar e rodar: `pnpm tsx scripts/research/club-pack/audit.ts`. Esperado: `audit.md` com 40 clubes.
- [ ] **Step 2: Revisão por IA.** Em lotes de 10 clubes, um agente lê o trecho do `audit.md` e propõe ajustes no formato `Override`, usando só conhecimento geral de futebol: jogador que não está mais no clube, posição errada, nota fora da realidade, titular importante ausente. Cada ajuste leva `reason` em uma frase. Ausente não é inventado: vai para uma lista "faltando no banco" no fim do `audit.md`.
- [ ] **Step 3:** Juntar as propostas em `overrides.json`, rodar `build.ts` e `audit.ts` de novo. Esperado: `0 problems`.
- [ ] **Step 4: Revisão do dono.** Entregar `audit.md` e o resumo dos ajustes. O dono edita `overrides.json` ou pede mudanças. Repetir o passo 3 até ele aprovar.
- [ ] **Step 5:** Commit `feat(club-pack): reviewed br-2026-1` com o pacote final, os ajustes e a lista de faltantes.

## Fora desta etapa

Engine de partida, temporada, telas, carga do pacote pela API, clubes formadores, escolinhas e competições de base. Cada um tem plano próprio.
