-- DropIndex
DROP INDEX "Challenge_gameMode_publicNumber_key";
-- CreateIndex
CREATE UNIQUE INDEX "Challenge_gameMode_publicNumber_key" ON "Challenge"("gameMode", "publicNumber") WHERE (status = 'published');
