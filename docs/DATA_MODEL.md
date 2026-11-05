# Data Model

ORM: Prisma. Banco: PostgreSQL 16. IDs: `uuid` (`@default(uuid(7))` se disponível na versão do Prisma; senão `uuid()`). Timestamps `createdAt/updatedAt` em todas as tabelas (omitidos abaixo).

## 1. Decisões sobre as entidades sugeridas

| Entidade sugerida | Decisão | Motivo |
|---|---|---|
| Player, PlayerAlias, Club, Country, CareerSpell | **Manter** | Núcleo dos dois jogos |
| Position / PlayerPosition | **Simplificar** para enum `PositionGroup` (GK/DF/MF/FW) + `Player.primaryPositionGroup` + campo texto `positionDetail` | Grid só precisa do grupo; posição detalhada não é critério na v1 |
| Competition | **Adiar** | Nenhum critério da v1 usa competição |
| PlayerFact, FactSource | **Substituir** por `Source` + colunas de procedência nas tabelas de fato (`sourceId`, `sourceRef`, `verificationStatus`, `verifiedAt`, `verifiedBy`) | Tabela genérica de fatos é abstração sem consumidor; procedência inline cobre os requisitos de rastreabilidade |
| GameMode | **Enum** `GameModeCode` | Dois valores, sem atributos próprios |
| Challenge | **Manter** com `snapshot` jsonb imutável | ADR-002 |
| ChallengeVersion | **Substituir** por `Challenge.supersedesId` + `version` | Publicado é imutável; correção = novo registro |
| ChallengePlayer, ChallengeCell, ChallengeAnswer | **Absorver no snapshot** + tabela `ChallengePlayerUsage` (só para a regra de 180 dias) | Consulta em partida é por snapshot, não por join |
| User | **Manter** (nullable em GuestSession) | Cadastro opcional, slice tardio |
| GuestSession, GameAttempt (→ `Attempt`), AttemptAction | **Manter** | |
| UserStreak | **Derivar** de Attempts; materializar em `SessionStats` só se medição mostrar custo | Evita escrita dupla |
| Achievement, UserAchievement | **Fora do MVP** | Decisão aprovada |

## 2. Esquema

### 2.1 Knowledge base

```prisma
enum VerificationStatus { draft imported verified rejected }
enum PositionGroup { GK DF MF FW }
enum SpellType { professional loan youth }
enum DatePrecision { day month year unknown }
enum NotabilityTier { T1 T2 T3 T4 }   // T1 = ícone global; T4 = só practice

model Country {
  id        String @id @default(uuid())
  isoCode   String @unique   // "BR"
  name      String           // "Brasil"
  wikidataId String? @unique // "Q155"
}

model Club {
  id          String  @id @default(uuid())
  name        String            // "Sociedade Esportiva Palmeiras"
  shortName   String            // "Palmeiras"
  countryId   String
  country     Country @relation(fields: [countryId], references: [id])
  city        String?
  foundedYear Int?
  wikidataId  String? @unique
  badgeUrl    String?           // só se licença permitir; senão null
  verificationStatus VerificationStatus @default(imported)
  sourceId    String?
  source      Source? @relation(fields: [sourceId], references: [id])
  sourceRef   String?           // URL/QID da origem
  spells      CareerSpell[]
  @@index([countryId])
}

model Player {
  id                   String @id @default(uuid())
  canonicalName        String            // "Ronaldo"
  fullName             String?           // "Ronaldo Luís Nazário de Lima"
  birthDate            DateTime?
  birthDatePrecision   DatePrecision @default(unknown)
  nationalityCountryId String
  nationality          Country @relation("primaryNationality", fields: [nationalityCountryId], references: [id])
  secondaryNationalityCountryId String?
  primaryPositionGroup PositionGroup
  positionDetail       String?           // "centroavante"
  notabilityTier       NotabilityTier @default(T3)
  wikidataId           String? @unique
  verificationStatus   VerificationStatus @default(imported)
  verifiedAt           DateTime?
  verifiedBy           String?           // identificador do editor
  sourceId             String?
  source               Source? @relation(fields: [sourceId], references: [id])
  sourceRef            String?
  notes                String?           // observações editoriais
  aliases              PlayerAlias[]
  spells               CareerSpell[]
  @@index([nationalityCountryId])
  @@index([verificationStatus, notabilityTier])
}

model PlayerAlias {
  id         String @id @default(uuid())
  playerId   String
  player     Player @relation(fields: [playerId], references: [id])
  alias      String            // como exibido: "Zé Roberto"
  normalized String            // "ze roberto" (ver DATA_QUALITY.md §normalização)
  kind       AliasKind         // canonical | full | nickname | variant
  language   String @default("pt-BR")
  isPrimary  Boolean @default(false)
  @@index([normalized])
  @@unique([playerId, normalized])
}
enum AliasKind { canonical full nickname variant }

model CareerSpell {
  id                 String @id @default(uuid())
  playerId           String
  player             Player @relation(fields: [playerId], references: [id])
  clubId             String
  club               Club @relation(fields: [clubId], references: [id])
  spellType          SpellType
  startDate          DateTime?
  startPrecision     DatePrecision @default(unknown)
  endDate            DateTime?       // null = em atividade
  endPrecision       DatePrecision @default(unknown)
  sortIndex          Int @default(0) // desempate manual
  loanFromClubId     String?         // quando spellType = loan
  verificationStatus VerificationStatus @default(imported)
  verifiedAt         DateTime?
  verifiedBy         String?
  sourceId           String?
  source             Source? @relation(fields: [sourceId], references: [id])
  sourceRef          String?
  @@index([playerId, startDate, sortIndex])
  @@index([clubId])
}

model Source {
  id              String @id @default(uuid())
  code            String @unique      // "wikidata", "wikipedia-pt", "manual"
  name            String
  license         String              // "CC0-1.0", "CC-BY-SA-4.0", "proprietary"
  commercialUseAllowed Boolean
  attributionText String?
  url             String?
}
```

Regras:
- Não unificar jogadores por nome. Chave de dedup é `wikidataId`; sem ele, criação manual exige revisão.
- `verified` só por ação de editor (API admin), nunca por import.
- `badgeUrl`: só preencher com asset cuja licença permita (ver `DATA_SOURCES.md`); caso contrário, UI usa iniciais.

### 2.2 Platform

```prisma
enum GameModeCode { CAREER_PATH FOOTBALL_GRID }
enum ChallengeKind { daily practice }
enum ChallengeStatus { draft validated scheduled published retired }

model Challenge {
  id            String @id @default(uuid())
  gameMode      GameModeCode
  kind          ChallengeKind
  engineVersion Int
  publicNumber  Int?                 // "#123" no share; atribuído na publicação, sequencial por gameMode
  scheduledFor  DateTime? @db.Date   // só daily; data em America/Sao_Paulo
  status        ChallengeStatus @default(draft)
  difficultyTier Int
  snapshot      Json                 // config completa da engine (ver GAME_ENGINE_CONTRACT.md); imutável após published
  snapshotHash  String               // sha256 do snapshot canônico; usado em testes de imutabilidade
  version       Int @default(1)
  supersedesId  String?              // desafio retirado que este substitui
  retiredReason String?
  createdBy     String
  publishedAt   DateTime?
  usages        ChallengePlayerUsage[]
  attempts      Attempt[]
  @@unique([gameMode, kind, scheduledFor])   // um daily por jogo por dia
  @@unique([gameMode, publicNumber])
  @@index([gameMode, kind, status])
}

model ImportDiff {            // divergência entre reimport e registro existente (DATA_QUALITY.md §1)
  id          String @id @default(uuid())
  entityType  String   // "Player" | "Club" | "CareerSpell"
  entityId    String
  field       String
  currentValue String?
  importedValue String?
  status      String @default("open")   // open | applied | dismissed
  resolvedBy  String?
  resolvedAt  DateTime?
  @@index([status])
}

model Event {                 // analytics (ANALYTICS.md); sem dados pessoais
  id          String @id @default(uuid())
  sessionHash String   // sha256 curto do sessionId
  name        String
  ts          DateTime
  props       Json
  @@index([name, ts])
}

model ChallengePlayerUsage {   // para regra "não repetir jogador em 180 dias" e analytics editorial
  challengeId String
  challenge   Challenge @relation(fields: [challengeId], references: [id])
  playerId    String
  role        String   // "answer" (career path) | "example" (grid)
  @@id([challengeId, playerId, role])
  @@index([playerId])
}
```

Imutabilidade: trigger Postgres (migration SQL manual) que rejeita `UPDATE` de `snapshot`/`engineVersion` quando `status IN ('published','retired')`. Mais teste de integração.

### 2.3 Sessões e partidas

```prisma
model GuestSession {
  id          String @id @default(uuid())
  tokenHash   String @unique       // sha256 do token do cookie
  userId      String?              // vínculo após cadastro (slice tardio)
  user        User? @relation(fields: [userId], references: [id])
  lastSeenAt  DateTime
  attempts    Attempt[]
}

model User {                         // só usado no slice de cadastro; tabela criada cedo para evitar migração de FK
  id        String @id @default(uuid())
  email     String @unique
  // credenciais definidas quando RF-10 for decidido
  sessions  GuestSession[]
}

enum AttemptStatus { IN_PROGRESS WON LOST COMPLETED }

model Attempt {
  id            String @id @default(uuid())
  sessionId     String
  session       GuestSession @relation(fields: [sessionId], references: [id])
  challengeId   String
  challenge     Challenge @relation(fields: [challengeId], references: [id])
  gameMode      GameModeCode          // desnormalizado para consultas de histórico
  kind          ChallengeKind
  engineVersion Int
  state         Json                  // estado atual da engine
  status        AttemptStatus
  score         Int @default(0)
  startedAt     DateTime
  completedAt   DateTime?
  actions       AttemptAction[]
  @@unique([sessionId, challengeId])  // 1 partida por sessão por desafio (ver nota sobre practice)
  @@index([sessionId, completedAt])
}

model AttemptAction {
  id             String @id @default(uuid())
  attemptId      String
  attempt        Attempt @relation(fields: [attemptId], references: [id])
  seq            Int                  // 1..n
  idempotencyKey String
  input          Json
  event          Json
  @@unique([attemptId, idempotencyKey])
  @@unique([attemptId, seq])
}
```

Nota sobre practice: `@@unique([sessionId, challengeId])` impede rejogar o mesmo practice challenge. Aceito: o seletor de practice exclui os 20 últimos e o pool tem dezenas; se a sessão esgotar o pool, API retorna `PRACTICE_POOL_EXHAUSTED`. Simples e evita estado duplicado.

## 3. Streak e estatísticas (derivadas)

```sql
-- dias consecutivos (America/Sao_Paulo) terminando hoje ou ontem com Attempt daily concluído, por gameMode
```

Calculado no módulo `progression` a partir de `Attempt` (`kind=daily`, `status != IN_PROGRESS`), com cache em memória por sessão (TTL 60s). Materializar só se P95 > 100 ms.

## 4. Snapshot — exemplo real (Career Path)

```json
{
  "engine": "career-path",
  "engineVersion": 1,
  "answerPlayerId": "7f1c...",
  "maxAttempts": 6,
  "trajectory": [
    { "clubId": "c1", "clubName": "Cruzeiro", "countryCode": "BR", "fromYear": 1993, "toYear": 1994, "isLoan": false },
    { "clubId": "c2", "clubName": "PSV", "countryCode": "NL", "fromYear": 1994, "toYear": 1996, "isLoan": false },
    { "clubId": "c3", "clubName": "Barcelona", "countryCode": "ES", "fromYear": 1996, "toYear": 1997, "isLoan": false },
    { "clubId": "c4", "clubName": "Inter", "countryCode": "IT", "fromYear": 1997, "toYear": 2002, "isLoan": false },
    { "clubId": "c5", "clubName": "Real Madrid", "countryCode": "ES", "fromYear": 2002, "toYear": 2007, "isLoan": false },
    { "clubId": "c6", "clubName": "Milan", "countryCode": "IT", "fromYear": 2007, "toYear": 2008, "isLoan": false },
    { "clubId": "c7", "clubName": "Corinthians", "countryCode": "BR", "fromYear": 2009, "toYear": 2011, "isLoan": false }
  ],
  "extraHints": { "position": "FW", "nationalityCode": "BR" },
  "difficultyTier": 1
}
```

(Trajetória ilustrativa; deve ser verificada contra fonte antes de uso real.)

## 5. Questões em aberto

- Nacionalidade dupla: campo único `secondaryNationalityCountryId` cobre o caso comum; mais de duas = ignorar na v1.
- Clubes que mudaram de nome (ex.: fusões): um `Club` por entidade histórica; `Club.name` é o nome atual; alias de clube **fora da v1**.
