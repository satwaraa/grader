-- AlterTable
ALTER TABLE "assignments" ADD COLUMN "requireUniqueId" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN "studentUniqueId" TEXT;
