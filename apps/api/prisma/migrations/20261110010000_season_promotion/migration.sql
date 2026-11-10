-- CreateTable
CREATE TABLE "SeasonPromotion" (
    "pk" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonPromotion_pkey" PRIMARY KEY ("pk","season")
);
