-- CreateTable
CREATE TABLE "DailyPick" (
    "day" DATE NOT NULL,
    "gameMode" "GameModeCode" NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "DailyPick_pkey" PRIMARY KEY ("day","gameMode")
);

-- CreateIndex
CREATE INDEX "DailyPick_gameMode_level_idx" ON "DailyPick"("gameMode", "level");
