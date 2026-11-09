-- CreateTable
CREATE TABLE "LevelReaction" (
    "challengeId" TEXT NOT NULL,
    "pk" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LevelReaction_pkey" PRIMARY KEY ("challengeId","pk")
);

-- AddForeignKey
ALTER TABLE "LevelReaction" ADD CONSTRAINT "LevelReaction_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

