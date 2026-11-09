-- CreateTable
CREATE TABLE "CommunityLevel" (
    "challengeId" TEXT NOT NULL,
    "authorPk" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'review',
    "sponsor" TEXT,
    "reports" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityLevel_pkey" PRIMARY KEY ("challengeId")
);

-- CreateTable
CREATE TABLE "CommunityVote" (
    "challengeId" TEXT NOT NULL,
    "pk" TEXT NOT NULL,
    "up" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityVote_pkey" PRIMARY KEY ("challengeId","pk")
);

-- CreateTable
CREATE TABLE "GameEvent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sponsor" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "challengeIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityLevel_state_createdAt_idx" ON "CommunityLevel"("state", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityLevel_authorPk_idx" ON "CommunityLevel"("authorPk");

-- CreateIndex
CREATE UNIQUE INDEX "GameEvent_slug_key" ON "GameEvent"("slug");

-- AddForeignKey
ALTER TABLE "CommunityLevel" ADD CONSTRAINT "CommunityLevel_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityVote" ADD CONSTRAINT "CommunityVote_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "CommunityLevel"("challengeId") ON DELETE CASCADE ON UPDATE CASCADE;

