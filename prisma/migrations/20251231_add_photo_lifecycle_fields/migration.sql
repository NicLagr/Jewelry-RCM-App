-- Add photo lifecycle management fields

-- Add archivedAt to Job table for tracking when jobs were archived
ALTER TABLE "Job" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Add fields to JobMedia for tracking compression and deletion state
ALTER TABLE "JobMedia" ADD COLUMN "sizeBytes" INTEGER;
ALTER TABLE "JobMedia" ADD COLUMN "compressedAt" TIMESTAMP(3);
ALTER TABLE "JobMedia" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Backfill archivedAt for existing archived jobs using updatedAt
UPDATE "Job" SET "archivedAt" = "updatedAt" WHERE "status" = 'ARCHIVED' AND "archivedAt" IS NULL;

-- Create index for efficient queries on archived jobs with photos
CREATE INDEX "Job_status_archivedAt_idx" ON "Job"("status", "archivedAt");

-- Create index for finding uncompressed/non-deleted photos
CREATE INDEX "JobMedia_compressedAt_deletedAt_idx" ON "JobMedia"("compressedAt", "deletedAt");

