-- CreateEnum
CREATE TYPE "StickerRarity" AS ENUM ('bronze', 'prata', 'ouro', 'ouro_brilhante', 'destaque_rodada', 'selecao_temporada', 'idolo', 'lenda');

-- CreateTable
CREATE TABLE "Sticker" (
    "pk" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "rarity" "StickerRarity" NOT NULL,
    "mode" "GameModeCode" NOT NULL,
    "challengeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upgradedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sticker_pkey" PRIMARY KEY ("pk","playerId")
);

-- CreateIndex
CREATE INDEX "Sticker_pk_rarity_idx" ON "Sticker"("pk", "rarity");

-- AddForeignKey
ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
