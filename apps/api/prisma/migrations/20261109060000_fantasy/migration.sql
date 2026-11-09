-- CreateTable
CREATE TABLE "FantasySquad" (
    "pk" TEXT NOT NULL,
    "week" DATE NOT NULL,
    "playerIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FantasySquad_pkey" PRIMARY KEY ("pk","week")
);

-- CreateIndex
CREATE INDEX "FantasySquad_week_idx" ON "FantasySquad"("week");

