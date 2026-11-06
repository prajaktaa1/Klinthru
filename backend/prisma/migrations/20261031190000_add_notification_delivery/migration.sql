-- Additive only. Do not apply until the Super Admin migration gate is approved.
CREATE TYPE "NotificationType" AS ENUM ('CompanyWelcome', 'TrialActivated', 'TrialExpired', 'SubscriptionActivated', 'RenewalReminder30', 'RenewalReminder10', 'RenewalReminder7', 'SubscriptionExpired', 'SubscriptionRenewed');
CREATE TYPE "NotificationStatus" AS ENUM ('Pending', 'Sending', 'Sent', 'Failed', 'Cancelled');

CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "type" "NotificationType" NOT NULL,
  "recipient" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'Pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "claimExpiresAt" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3),
  "providerMessageId" TEXT,
  "lastError" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationDelivery_dedupeKey_key" ON "NotificationDelivery"("dedupeKey");
CREATE INDEX "NotificationDelivery_status_scheduledFor_idx" ON "NotificationDelivery"("status", "scheduledFor");
CREATE INDEX "NotificationDelivery_companyId_createdAt_idx" ON "NotificationDelivery"("companyId", "createdAt");
CREATE INDEX "NotificationDelivery_subscriptionId_type_idx" ON "NotificationDelivery"("subscriptionId", "type");
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
