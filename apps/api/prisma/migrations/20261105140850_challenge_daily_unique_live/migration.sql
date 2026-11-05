-- A retired daily frees its date for the replacement (retire + supersedesId).
-- DropIndex
DROP INDEX "Challenge_gameMode_kind_scheduledFor_key";

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_live_daily_key" ON "Challenge"("gameMode", "kind", "scheduledFor") WHERE (status <> 'retired');
