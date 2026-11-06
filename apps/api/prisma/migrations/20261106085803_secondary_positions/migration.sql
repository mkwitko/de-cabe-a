-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "secondaryPositionGroups" "PositionGroup"[] DEFAULT ARRAY[]::"PositionGroup"[];
