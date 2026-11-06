
-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "deadlineAt" TIMESTAMP(3),
ADD COLUMN     "timed" BOOLEAN NOT NULL DEFAULT false;

