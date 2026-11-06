-- ADR-007: levels replace daily/practice; stars; nicknames; optional accounts.
-- DropIndex
DROP INDEX "Attempt_daily_session_challenge_key";

-- DropIndex
DROP INDEX "Challenge_gameMode_kind_status_idx";

-- DropIndex
DROP INDEX "Challenge_live_daily_key";

-- AlterTable
ALTER TABLE "Attempt" DROP COLUMN "kind",
ADD COLUMN     "stars" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Challenge" DROP COLUMN "kind",
DROP COLUMN "scheduledFor";

-- AlterTable
ALTER TABLE "GuestSession" ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "nicknameKey" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "nickname" TEXT NOT NULL,
ADD COLUMN     "nicknameKey" TEXT NOT NULL,
ADD COLUMN     "passwordHash" TEXT NOT NULL;

-- DropEnum
DROP TYPE "ChallengeKind";

-- CreateIndex
CREATE INDEX "Attempt_completedAt_idx" ON "Attempt"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_sessionId_challengeId_key" ON "Attempt"("sessionId", "challengeId");

-- CreateIndex
CREATE INDEX "Challenge_gameMode_status_idx" ON "Challenge"("gameMode", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GuestSession_nicknameKey_key" ON "GuestSession"("nicknameKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_nicknameKey_key" ON "User"("nicknameKey");

