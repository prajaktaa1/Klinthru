ALTER TABLE "Pipeline"
ADD COLUMN "wallThicknessInputValue" DOUBLE PRECISION,
ADD COLUMN "wallThicknessUnit" TEXT;

UPDATE "Pipeline"
SET "wallThicknessInputValue" = "nominalWallThickness",
    "wallThicknessUnit" = 'mm'
WHERE "nominalWallThickness" IS NOT NULL
  AND "wallThicknessInputValue" IS NULL
  AND "wallThicknessUnit" IS NULL;
