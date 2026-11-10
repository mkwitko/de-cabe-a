-- AlterTable
ALTER TABLE "League" ADD COLUMN     "color" TEXT,
ADD COLUMN     "nameStyle" TEXT;

-- CreateTable
CREATE TABLE "CosmeticChoice" (
    "userId" TEXT NOT NULL,
    "finish" TEXT,
    "passport" TEXT,
    "crowd" TEXT,
    "stickers" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CosmeticChoice_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "CosmeticChoice" ADD CONSTRAINT "CosmeticChoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
