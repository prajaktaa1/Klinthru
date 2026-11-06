-- Prepared for approval. Do not apply until the public email workflow migration is approved.
CREATE TYPE "PublicSubmissionType" AS ENUM ('Enquiry', 'Support');
ALTER TYPE "NotificationType" ADD VALUE 'EnquiryAcknowledgement';
ALTER TYPE "NotificationType" ADD VALUE 'TrialExpiryReminder2';
ALTER TYPE "NotificationType" ADD VALUE 'EnquiryNotification';
ALTER TYPE "NotificationType" ADD VALUE 'SupportAcknowledgement';
ALTER TYPE "NotificationType" ADD VALUE 'SupportNotification';

CREATE TABLE "PublicSubmission" (
  "id" TEXT NOT NULL,
  "type" "PublicSubmissionType" NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "topic" TEXT,
  "platform" TEXT,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicSubmission_type_createdAt_idx" ON "PublicSubmission"("type", "createdAt");
CREATE INDEX "PublicSubmission_email_createdAt_idx" ON "PublicSubmission"("email", "createdAt");

ALTER TABLE "NotificationDelivery" ALTER COLUMN "companyId" DROP NOT NULL;
ALTER TABLE "NotificationDelivery" ADD COLUMN "publicSubmissionId" TEXT;
CREATE INDEX "NotificationDelivery_publicSubmissionId_type_idx" ON "NotificationDelivery"("publicSubmissionId", "type");
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_owner_check" CHECK (("companyId" IS NOT NULL AND "publicSubmissionId" IS NULL) OR ("companyId" IS NULL AND "publicSubmissionId" IS NOT NULL));
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_publicSubmissionId_fkey" FOREIGN KEY ("publicSubmissionId") REFERENCES "PublicSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
