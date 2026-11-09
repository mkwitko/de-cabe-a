-- AlterTable
ALTER TABLE "GuestSession" ADD COLUMN "publicProfile" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "publicProfile" BOOLEAN NOT NULL DEFAULT false;
