-- CreateTable
CREATE TABLE "ClubWorld" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "packVersion" TEXT NOT NULL,
    "engineVersion" INTEGER NOT NULL,
    "seed" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "day" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "data" BYTEA NOT NULL,
    "seasonStart" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubWorld_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubCareer" (
    "id" TEXT NOT NULL,
    "pk" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "startMode" TEXT NOT NULL,
    "scenarioId" TEXT,
    "clubId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubCareer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMatch" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "competitionId" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "homeClubId" TEXT NOT NULL,
    "awayClubId" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "input" JSONB NOT NULL,
    "commands" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "score" JSONB,
    "stats" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubLedgerEntry" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "dueDay" INTEGER,
    "settledDay" INTEGER,
    "ref" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubEvent" (
    "id" TEXT NOT NULL,
    "careerId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "cardId" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "choice" TEXT,
    "effects" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubHistory" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "careerId" TEXT,
    "clubId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "subjectId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClubCareer_pk_key" ON "ClubCareer"("pk") WHERE (status <> 'ended');

-- CreateIndex
CREATE UNIQUE INDEX "ClubCareer_worldId_clubId_key" ON "ClubCareer"("worldId", "clubId");

-- CreateIndex
CREATE INDEX "ClubMatch_worldId_season_day_idx" ON "ClubMatch"("worldId", "season", "day");

-- CreateIndex
CREATE INDEX "ClubLedgerEntry_worldId_clubId_season_idx" ON "ClubLedgerEntry"("worldId", "clubId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "ClubLedgerEntry_worldId_idempotencyKey_key" ON "ClubLedgerEntry"("worldId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ClubEvent_careerId_season_day_idx" ON "ClubEvent"("careerId", "season", "day");

-- CreateIndex
CREATE INDEX "ClubHistory_worldId_clubId_season_idx" ON "ClubHistory"("worldId", "clubId", "season");

-- CreateIndex
CREATE INDEX "ClubHistory_careerId_idx" ON "ClubHistory"("careerId");

-- AddForeignKey
ALTER TABLE "ClubCareer" ADD CONSTRAINT "ClubCareer_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "ClubWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMatch" ADD CONSTRAINT "ClubMatch_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "ClubWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubLedgerEntry" ADD CONSTRAINT "ClubLedgerEntry_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "ClubWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEvent" ADD CONSTRAINT "ClubEvent_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "ClubCareer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubHistory" ADD CONSTRAINT "ClubHistory_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "ClubWorld"("id") ON DELETE CASCADE ON UPDATE CASCADE;

