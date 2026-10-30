DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    CREATE TYPE "Role" AS ENUM ('Admin', 'Engineer', 'Viewer');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "Assessment" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "pipelineName" TEXT NOT NULL,
  "riskLevel" TEXT NOT NULL,
  "riskScore" INTEGER NOT NULL,
  "input" JSONB NOT NULL,
  "result" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authorId" TEXT,
  CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Report" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "reportSubmissionKey" TEXT,
  "assessmentType" TEXT NOT NULL,
  "pipelineName" TEXT NOT NULL,
  "riskLevel" TEXT NOT NULL,
  "input" JSONB NOT NULL,
  "result" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authorId" TEXT,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Report_reportSubmissionKey_key" ON "Report"("reportSubmissionKey");
CREATE INDEX IF NOT EXISTS "Assessment_authorId_idx" ON "Assessment"("authorId");
CREATE INDEX IF NOT EXISTS "Assessment_createdAt_idx" ON "Assessment"("createdAt");
CREATE INDEX IF NOT EXISTS "Report_authorId_idx" ON "Report"("authorId");
CREATE INDEX IF NOT EXISTS "Report_assessmentId_idx" ON "Report"("assessmentId");
CREATE INDEX IF NOT EXISTS "Report_createdAt_idx" ON "Report"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Assessment_authorId_fkey'
  ) THEN
    ALTER TABLE "Assessment"
    ADD CONSTRAINT "Assessment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Report_authorId_fkey'
  ) THEN
    ALTER TABLE "Report"
    ADD CONSTRAINT "Report_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
