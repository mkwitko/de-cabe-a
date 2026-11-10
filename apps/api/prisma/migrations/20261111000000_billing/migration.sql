-- CreateTable
CREATE TABLE "BillingCustomer" (
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "BillingSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "leagueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "checkoutSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "paymentIntentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("checkoutSessionId")
);

-- CreateTable
CREATE TABLE "GiftCode" (
    "code" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "redeemedBy" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCode_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingCustomer_stripeCustomerId_key" ON "BillingCustomer"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "BillingSubscription_userId_idx" ON "BillingSubscription"("userId");

-- CreateIndex
CREATE INDEX "BillingSubscription_leagueId_idx" ON "BillingSubscription"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_paymentIntentId_key" ON "Purchase"("paymentIntentId");

-- CreateIndex
CREATE INDEX "Purchase_userId_idx" ON "Purchase"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCode_purchaseId_key" ON "GiftCode"("purchaseId");

-- CreateIndex
CREATE INDEX "GiftCode_redeemedBy_idx" ON "GiftCode"("redeemedBy");

-- AddForeignKey
ALTER TABLE "GiftCode" ADD CONSTRAINT "GiftCode_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("checkoutSessionId") ON DELETE CASCADE ON UPDATE CASCADE;

