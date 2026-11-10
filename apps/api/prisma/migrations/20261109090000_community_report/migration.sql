-- CreateTable
CREATE TABLE "CommunityReport" (
    "challengeId" TEXT NOT NULL,
    "pk" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityReport_pkey" PRIMARY KEY ("challengeId","pk")
);

-- AddForeignKey
ALTER TABLE "CommunityReport" ADD CONSTRAINT "CommunityReport_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "CommunityLevel"("challengeId") ON DELETE CASCADE ON UPDATE CASCADE;
