-- CreateTable
CREATE TABLE "CopaRun" (
    "id" TEXT NOT NULL,
    "pk" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'playing',
    "finish" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CopaRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CopaRun_pk_status_idx" ON "CopaRun"("pk", "status");

