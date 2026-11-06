
-- CreateTable
CREATE TABLE "CareerPlayer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" "PositionGroup" NOT NULL,
    "attributes" JSONB NOT NULL,
    "bank" JSONB NOT NULL,
    "matchCredit" INTEGER NOT NULL DEFAULT 0,
    "originClubId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerTraining" (
    "id" TEXT NOT NULL,
    "careerId" TEXT NOT NULL,
    "attemptId" TEXT,
    "mode" TEXT NOT NULL,
    "attribute" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerTraining_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerSeason" (
    "id" TEXT NOT NULL,
    "careerId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "clubId" TEXT,
    "clubName" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "competition" TEXT NOT NULL,
    "teamStrength" INTEGER NOT NULL,
    "opponents" JSONB NOT NULL,
    "offers" JSONB,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerMatch" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "opponentName" TEXT NOT NULL,
    "home" BOOLEAN NOT NULL,
    "teamGoals" INTEGER NOT NULL,
    "opponentGoals" INTEGER NOT NULL,
    "playerGoals" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "headline" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CareerPlayer_sessionId_status_idx" ON "CareerPlayer"("sessionId", "status");

-- CreateIndex
CREATE INDEX "CareerTraining_careerId_day_idx" ON "CareerTraining"("careerId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "CareerTraining_careerId_attemptId_key" ON "CareerTraining"("careerId", "attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "CareerSeason_careerId_number_key" ON "CareerSeason"("careerId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "CareerMatch_seasonId_round_key" ON "CareerMatch"("seasonId", "round");

-- AddForeignKey
ALTER TABLE "CareerPlayer" ADD CONSTRAINT "CareerPlayer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GuestSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerTraining" ADD CONSTRAINT "CareerTraining_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "CareerPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerSeason" ADD CONSTRAINT "CareerSeason_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "CareerPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerMatch" ADD CONSTRAINT "CareerMatch_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "CareerSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

