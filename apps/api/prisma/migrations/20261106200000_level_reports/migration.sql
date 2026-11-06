
-- CreateTable
CREATE TABLE "LevelReport" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "cellIndex" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LevelReport_status_idx" ON "LevelReport"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LevelReport_challengeId_sessionId_key" ON "LevelReport"("challengeId", "sessionId");

-- AddForeignKey
ALTER TABLE "LevelReport" ADD CONSTRAINT "LevelReport_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

