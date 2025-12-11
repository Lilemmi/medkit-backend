-- AlterTable
ALTER TABLE "Medicine" ADD COLUMN IF NOT EXISTS "specialGroupsInfo" JSONB,
ADD COLUMN IF NOT EXISTS "analogs" JSONB;
