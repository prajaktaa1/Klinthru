-- Approval-only draft. Do not run until approved for the target database.
ALTER TABLE "Pipeline" ADD COLUMN "coatingType" TEXT;
ALTER TABLE "Pipeline" ADD COLUMN "designPressureUnit" TEXT;

ALTER TABLE "Pipeline"
  ADD CONSTRAINT "Pipeline_coatingType_check"
  CHECK ("coatingType" IS NULL OR "coatingType" IN ('3LPE', 'FBE', '3LPP', 'Other'));

ALTER TABLE "Pipeline"
  ADD CONSTRAINT "Pipeline_designPressureUnit_check"
  CHECK ("designPressureUnit" IS NULL OR "designPressureUnit" IN ('bar', 'psi', 'MPa'));
