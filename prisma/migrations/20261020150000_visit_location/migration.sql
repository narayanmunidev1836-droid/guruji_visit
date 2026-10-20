-- Visits now record where their photos are kept (hard disk + folder). Event and date become optional.
ALTER TABLE "Visit" ALTER COLUMN "eventId" DROP NOT NULL;
ALTER TABLE "Visit" ALTER COLUMN "visitDate" DROP NOT NULL;
ALTER TABLE "Visit" ADD COLUMN "hardDiskId" INTEGER;
ALTER TABLE "Visit" ADD COLUMN "folderPath" TEXT NOT NULL DEFAULT '';
CREATE INDEX "Visit_hardDiskId_idx" ON "Visit"("hardDiskId");
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_hardDiskId_fkey" FOREIGN KEY ("hardDiskId") REFERENCES "HardDisk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
