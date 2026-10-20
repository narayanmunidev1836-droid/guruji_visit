-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "PlaceType" AS ENUM ('HOME', 'OFFICE', 'TEMPLE', 'OTHER');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('UNKNOWN', 'AVAILABLE', 'MISSING');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Haribhagat" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "fatherName" TEXT,
    "surname" TEXT NOT NULL,
    "gam" TEXT,
    "taluko" TEXT,
    "jillo" TEXT,
    "pincode" TEXT,
    "mobileNo" TEXT,
    "dupKey" TEXT NOT NULL,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Haribhagat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardDisk" (
    "id" SERIAL NOT NULL,
    "labelName" TEXT NOT NULL,
    "labelKey" TEXT NOT NULL,
    "description" TEXT,
    "stableIdentifier" TEXT,
    "serialNumber" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "lastScanAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HardDisk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "visitDate" DATE NOT NULL,
    "placeType" "PlaceType",
    "notes" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitHaribhagat" (
    "visitId" INTEGER NOT NULL,
    "haribhagatId" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VisitHaribhagat_pkey" PRIMARY KEY ("visitId","haribhagatId")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" SERIAL NOT NULL,
    "visitId" INTEGER,
    "hardDiskId" INTEGER NOT NULL,
    "relativePath" TEXT NOT NULL,
    "folderPath" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "format" TEXT,
    "fileSizeBytes" INTEGER,
    "fileHash" TEXT,
    "fileMtime" TIMESTAMP(3),
    "exifDateTime" TIMESTAMP(3),
    "thumbnailKey" TEXT,
    "availability" "Availability" NOT NULL DEFAULT 'UNKNOWN',
    "lastSeenAt" TIMESTAMP(3),
    "lastScanId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexerToken" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "createdById" INTEGER NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndexerToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanJob" (
    "id" SERIAL NOT NULL,
    "hardDiskId" INTEGER NOT NULL,
    "indexerTokenId" INTEGER,
    "startedById" INTEGER,
    "isDryRun" BOOLEAN NOT NULL DEFAULT false,
    "scanPath" TEXT NOT NULL DEFAULT '',
    "status" "ScanStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "filesScanned" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsUnchanged" INTEGER NOT NULL DEFAULT 0,
    "missingCount" INTEGER NOT NULL DEFAULT 0,
    "errorsCount" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,

    CONSTRAINT "ScanJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Haribhagat_name_idx" ON "Haribhagat"("name");

-- CreateIndex
CREATE INDEX "Haribhagat_surname_idx" ON "Haribhagat"("surname");

-- CreateIndex
CREATE INDEX "Haribhagat_gam_idx" ON "Haribhagat"("gam");

-- CreateIndex
CREATE INDEX "Haribhagat_jillo_idx" ON "Haribhagat"("jillo");

-- CreateIndex
CREATE INDEX "Haribhagat_mobileNo_idx" ON "Haribhagat"("mobileNo");

-- CreateIndex
CREATE INDEX "Haribhagat_dupKey_idx" ON "Haribhagat"("dupKey");

-- CreateIndex
CREATE UNIQUE INDEX "Event_nameKey_key" ON "Event"("nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "HardDisk_labelKey_key" ON "HardDisk"("labelKey");

-- CreateIndex
CREATE UNIQUE INDEX "HardDisk_stableIdentifier_key" ON "HardDisk"("stableIdentifier");

-- CreateIndex
CREATE INDEX "Visit_visitDate_idx" ON "Visit"("visitDate");

-- CreateIndex
CREATE INDEX "Visit_eventId_idx" ON "Visit"("eventId");

-- CreateIndex
CREATE INDEX "VisitHaribhagat_haribhagatId_idx" ON "VisitHaribhagat"("haribhagatId");

-- CreateIndex
CREATE INDEX "Photo_visitId_idx" ON "Photo"("visitId");

-- CreateIndex
CREATE INDEX "Photo_fileHash_idx" ON "Photo"("fileHash");

-- CreateIndex
CREATE INDEX "Photo_exifDateTime_idx" ON "Photo"("exifDateTime");

-- CreateIndex
CREATE INDEX "Photo_hardDiskId_folderPath_idx" ON "Photo"("hardDiskId", "folderPath");

-- CreateIndex
CREATE INDEX "Photo_availability_idx" ON "Photo"("availability");

-- CreateIndex
CREATE UNIQUE INDEX "Photo_hardDiskId_relativePath_key" ON "Photo"("hardDiskId", "relativePath");

-- CreateIndex
CREATE UNIQUE INDEX "IndexerToken_tokenHash_key" ON "IndexerToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ScanJob_hardDiskId_startedAt_idx" ON "ScanJob"("hardDiskId", "startedAt");

-- CreateIndex
CREATE INDEX "ScanJob_status_idx" ON "ScanJob"("status");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "Haribhagat" ADD CONSTRAINT "Haribhagat_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitHaribhagat" ADD CONSTRAINT "VisitHaribhagat_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitHaribhagat" ADD CONSTRAINT "VisitHaribhagat_haribhagatId_fkey" FOREIGN KEY ("haribhagatId") REFERENCES "Haribhagat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_hardDiskId_fkey" FOREIGN KEY ("hardDiskId") REFERENCES "HardDisk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_lastScanId_fkey" FOREIGN KEY ("lastScanId") REFERENCES "ScanJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexerToken" ADD CONSTRAINT "IndexerToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanJob" ADD CONSTRAINT "ScanJob_hardDiskId_fkey" FOREIGN KEY ("hardDiskId") REFERENCES "HardDisk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanJob" ADD CONSTRAINT "ScanJob_indexerTokenId_fkey" FOREIGN KEY ("indexerTokenId") REFERENCES "IndexerToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanJob" ADD CONSTRAINT "ScanJob_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
