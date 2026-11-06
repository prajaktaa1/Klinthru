ALTER TABLE "CompanySubscription" ALTER COLUMN "actionedById" DROP NOT NULL;

ALTER TABLE "CompanySubscription" ADD COLUMN "actionedByEmail" TEXT;
