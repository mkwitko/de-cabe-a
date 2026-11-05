-- CreateTable
CREATE TABLE "SearchMiss" (
    "normalized" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchMiss_pkey" PRIMARY KEY ("normalized")
);

-- CreateIndex
CREATE INDEX "SearchMiss_lastAt_idx" ON "SearchMiss"("lastAt");

