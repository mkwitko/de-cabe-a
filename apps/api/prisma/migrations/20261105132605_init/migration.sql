-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('draft', 'imported', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "PositionGroup" AS ENUM ('GK', 'DF', 'MF', 'FW');

-- CreateEnum
CREATE TYPE "SpellType" AS ENUM ('professional', 'loan', 'youth');

-- CreateEnum
CREATE TYPE "DatePrecision" AS ENUM ('day', 'month', 'year', 'unknown');

-- CreateEnum
CREATE TYPE "NotabilityTier" AS ENUM ('T1', 'T2', 'T3', 'T4');

-- CreateEnum
CREATE TYPE "AliasKind" AS ENUM ('canonical', 'full', 'nickname', 'variant');

-- CreateEnum
CREATE TYPE "GameModeCode" AS ENUM ('CAREER_PATH', 'FOOTBALL_GRID');

-- CreateEnum
CREATE TYPE "ChallengeKind" AS ENUM ('daily', 'practice');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('draft', 'validated', 'scheduled', 'published', 'retired');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'WON', 'LOST', 'COMPLETED');

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "isoCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wikidataId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "city" TEXT,
    "foundedYear" INTEGER,
    "wikidataId" TEXT,
    "badgeUrl" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'imported',
    "sourceId" TEXT,
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "fullName" TEXT,
    "birthDate" TIMESTAMP(3),
    "birthDatePrecision" "DatePrecision" NOT NULL DEFAULT 'unknown',
    "nationalityCountryId" TEXT NOT NULL,
    "secondaryNationalityCountryId" TEXT,
    "primaryPositionGroup" "PositionGroup" NOT NULL,
    "positionDetail" TEXT,
    "notabilityTier" "NotabilityTier" NOT NULL DEFAULT 'T3',
    "wikidataId" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'imported',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "sourceId" TEXT,
    "sourceRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAlias" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "kind" "AliasKind" NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerSpell" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "spellType" "SpellType" NOT NULL,
    "startDate" TIMESTAMP(3),
    "startPrecision" "DatePrecision" NOT NULL DEFAULT 'unknown',
    "endDate" TIMESTAMP(3),
    "endPrecision" "DatePrecision" NOT NULL DEFAULT 'unknown',
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "loanFromClubId" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'imported',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "sourceId" TEXT,
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerSpell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "commercialUseAllowed" BOOLEAN NOT NULL,
    "attributionText" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "gameMode" "GameModeCode" NOT NULL,
    "kind" "ChallengeKind" NOT NULL,
    "engineVersion" INTEGER NOT NULL,
    "publicNumber" INTEGER,
    "scheduledFor" DATE,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'draft',
    "difficultyTier" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "supersedesId" TEXT,
    "retiredReason" TEXT,
    "createdBy" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportDiff" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "currentValue" TEXT,
    "importedValue" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportDiff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "sessionHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "props" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengePlayerUsage" (
    "challengeId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengePlayerUsage_pkey" PRIMARY KEY ("challengeId","playerId","role")
);

-- CreateTable
CREATE TABLE "GuestSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "gameMode" "GameModeCode" NOT NULL,
    "kind" "ChallengeKind" NOT NULL,
    "engineVersion" INTEGER NOT NULL,
    "state" JSONB NOT NULL,
    "status" "AttemptStatus" NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptAction" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "event" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttemptAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_isoCode_key" ON "Country"("isoCode");

-- CreateIndex
CREATE UNIQUE INDEX "Country_wikidataId_key" ON "Country"("wikidataId");

-- CreateIndex
CREATE UNIQUE INDEX "Club_wikidataId_key" ON "Club"("wikidataId");

-- CreateIndex
CREATE INDEX "Club_countryId_idx" ON "Club"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_wikidataId_key" ON "Player"("wikidataId");

-- CreateIndex
CREATE INDEX "Player_nationalityCountryId_idx" ON "Player"("nationalityCountryId");

-- CreateIndex
CREATE INDEX "Player_verificationStatus_notabilityTier_idx" ON "Player"("verificationStatus", "notabilityTier");

-- CreateIndex
CREATE INDEX "PlayerAlias_normalized_idx" ON "PlayerAlias"("normalized");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAlias_playerId_normalized_key" ON "PlayerAlias"("playerId", "normalized");

-- CreateIndex
CREATE INDEX "CareerSpell_playerId_startDate_sortIndex_idx" ON "CareerSpell"("playerId", "startDate", "sortIndex");

-- CreateIndex
CREATE INDEX "CareerSpell_clubId_idx" ON "CareerSpell"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "Source_code_key" ON "Source"("code");

-- CreateIndex
CREATE INDEX "Challenge_gameMode_kind_status_idx" ON "Challenge"("gameMode", "kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_gameMode_kind_scheduledFor_key" ON "Challenge"("gameMode", "kind", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_gameMode_publicNumber_key" ON "Challenge"("gameMode", "publicNumber");

-- CreateIndex
CREATE INDEX "ImportDiff_status_idx" ON "ImportDiff"("status");

-- CreateIndex
CREATE INDEX "Event_name_ts_idx" ON "Event"("name", "ts");

-- CreateIndex
CREATE INDEX "ChallengePlayerUsage_playerId_idx" ON "ChallengePlayerUsage"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestSession_tokenHash_key" ON "GuestSession"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Attempt_sessionId_completedAt_idx" ON "Attempt"("sessionId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_daily_session_challenge_key" ON "Attempt"("sessionId", "challengeId") WHERE (kind = 'daily');

-- CreateIndex
CREATE UNIQUE INDEX "AttemptAction_attemptId_idempotencyKey_key" ON "AttemptAction"("attemptId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptAction_attemptId_seq_key" ON "AttemptAction"("attemptId", "seq");

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_nationalityCountryId_fkey" FOREIGN KEY ("nationalityCountryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_secondaryNationalityCountryId_fkey" FOREIGN KEY ("secondaryNationalityCountryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAlias" ADD CONSTRAINT "PlayerAlias_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerSpell" ADD CONSTRAINT "CareerSpell_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerSpell" ADD CONSTRAINT "CareerSpell_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerSpell" ADD CONSTRAINT "CareerSpell_loanFromClubId_fkey" FOREIGN KEY ("loanFromClubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerSpell" ADD CONSTRAINT "CareerSpell_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengePlayerUsage" ADD CONSTRAINT "ChallengePlayerUsage_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestSession" ADD CONSTRAINT "GuestSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GuestSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAction" ADD CONSTRAINT "AttemptAction_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
