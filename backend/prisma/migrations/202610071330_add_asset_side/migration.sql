DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AssetSide') THEN
    CREATE TYPE "AssetSide" AS ENUM ('LHS', 'RHS');
  END IF;
END $$;

ALTER TABLE "Asset"
ADD COLUMN IF NOT EXISTS "side" "AssetSide";
