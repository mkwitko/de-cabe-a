
-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "competition" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "stage" TEXT,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "homeClubId" TEXT,
    "awayClubId" TEXT,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchLineup" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "nickname" TEXT,
    "country" TEXT,
    "playerId" TEXT,
    "position" TEXT,
    "jersey" INTEGER,
    "starter" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MatchLineup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Match_sourceRef_key" ON "Match"("sourceRef");

-- CreateIndex
CREATE INDEX "Match_competition_season_idx" ON "Match"("competition", "season");

-- CreateIndex
CREATE INDEX "MatchLineup_matchId_idx" ON "MatchLineup"("matchId");

-- CreateIndex
CREATE INDEX "MatchLineup_playerId_idx" ON "MatchLineup"("playerId");

-- AddForeignKey
ALTER TABLE "MatchLineup" ADD CONSTRAINT "MatchLineup_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

