-- Additive only. This migration intentionally does not backfill CompanyId,
-- create a Super Admin, assign legacy users, or assign existing pipelines.

CREATE TYPE "CompanyStatus" AS ENUM ('SignupPending', 'Approved', 'TrialActive', 'TrialExpired', 'PaidActive', 'PaidExpired', 'Suspended');
CREATE TYPE "CompanyMemberRole" AS ENUM ('CompanyAdmin', 'Engineer', 'Viewer');
CREATE TYPE "MembershipStatus" AS ENUM ('Invited', 'Active', 'Inactive');
CREATE TYPE "PlatformRoleStatus" AS ENUM ('Active', 'Revoked');
CREATE TYPE "ReferralCodeStatus" AS ENUM ('Available', 'Redeemed', 'Expired', 'Revoked');
CREATE TYPE "SubscriptionStatus" AS ENUM ('Trial', 'Active', 'Expired', 'Cancelled');
CREATE TYPE "SubscriptionPlan" AS ENUM ('Annual');

-- Company is created by the earlier sensor-lifecycle migration. Keep this
-- extension additive: legacy sensor companies have no signup contact data.
ALTER TABLE "Company" ADD COLUMN "mobileNumber" TEXT;
ALTER TABLE "Company" ADD COLUMN "signupEmail" TEXT;
ALTER TABLE "Company" ADD COLUMN "status" "CompanyStatus" NOT NULL DEFAULT 'SignupPending';
ALTER TABLE "Company" ADD COLUMN "trialUsed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "Company" ADD COLUMN "activatedAt" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN "activatedById" TEXT;

CREATE TABLE "CompanyMembership" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "CompanyMemberRole" NOT NULL,
  "status" "MembershipStatus" NOT NULL DEFAULT 'Active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanyMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SuperAdmin" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "PlatformRoleStatus" NOT NULL DEFAULT 'Active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReferralCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "companyId" TEXT,
  "purpose" TEXT,
  "status" "ReferralCodeStatus" NOT NULL DEFAULT 'Available',
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "redeemedAt" TIMESTAMP(3),
  "redeemedByUserId" TEXT,
  CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompanySubscription" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "plan" "SubscriptionPlan" NOT NULL DEFAULT 'Annual',
  "status" "SubscriptionStatus" NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "pipelineKmLimit" DECIMAL(14,3) NOT NULL,
  "namedUserLimit" INTEGER NOT NULL,
  "actionedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanySubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "companyId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "before" JSONB,
  "after" JSONB,
  "ipAddress" TEXT,
  "requestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Pipeline" ADD COLUMN "companyId" TEXT;
CREATE UNIQUE INDEX "Company_signupEmail_key" ON "Company"("signupEmail");
CREATE UNIQUE INDEX "CompanyMembership_companyId_userId_key" ON "CompanyMembership"("companyId", "userId");
CREATE UNIQUE INDEX "SuperAdmin_userId_key" ON "SuperAdmin"("userId");
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");
CREATE INDEX "Company_status_createdAt_idx" ON "Company"("status", "createdAt");
CREATE INDEX "CompanyMembership_userId_status_idx" ON "CompanyMembership"("userId", "status");
CREATE INDEX "CompanyMembership_companyId_role_status_idx" ON "CompanyMembership"("companyId", "role", "status");
CREATE INDEX "ReferralCode_status_expiresAt_idx" ON "ReferralCode"("status", "expiresAt");
CREATE INDEX "CompanySubscription_companyId_status_expiresAt_idx" ON "CompanySubscription"("companyId", "status", "expiresAt");
CREATE INDEX "AuditLog_companyId_createdAt_idx" ON "AuditLog"("companyId", "createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX "Pipeline_companyId_idx" ON "Pipeline"("companyId");

ALTER TABLE "Company" ADD CONSTRAINT "Company_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Company" ADD CONSTRAINT "Company_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SuperAdmin" ADD CONSTRAINT "SuperAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_redeemedByUserId_fkey" FOREIGN KEY ("redeemedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_actionedById_fkey" FOREIGN KEY ("actionedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
