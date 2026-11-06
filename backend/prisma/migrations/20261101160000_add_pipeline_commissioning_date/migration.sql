-- Commissioning is independent of installation date/year. No data backfill.
ALTER TABLE "Pipeline" ADD COLUMN "commissioningDate" TIMESTAMP(3);
