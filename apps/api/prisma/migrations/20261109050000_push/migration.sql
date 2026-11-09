-- CreateTable
CREATE TABLE "PushSubscription" (
    "endpoint" TEXT NOT NULL,
    "pk" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "daily" BOOLEAN NOT NULL DEFAULT true,
    "league" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("endpoint")
);

-- CreateTable
CREATE TABLE "PushSend" (
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSend_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "PushSubscription_pk_idx" ON "PushSubscription"("pk");

