-- CreateTable
CREATE TABLE "ModeVote" (
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModeVote_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "ModeVote_mode_idx" ON "ModeVote"("mode");

-- AddForeignKey
ALTER TABLE "ModeVote" ADD CONSTRAINT "ModeVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

