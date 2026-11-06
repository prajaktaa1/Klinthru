-- Prospective events only. Never synthesize historic approvals or changes.
CREATE TABLE "MasterChangeEvent" (
  "id" TEXT PRIMARY KEY,
  "pipelineId" TEXT NOT NULL REFERENCES "Pipeline"("id") ON DELETE RESTRICT,
  "objectType" TEXT NOT NULL CHECK ("objectType" IN ('Pipeline','Segment','Asset')),
  "objectId" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "beforeValues" JSONB,
  "afterValues" JSONB NOT NULL
);
CREATE INDEX "MasterChangeEvent_pipelineId_occurredAt_idx" ON "MasterChangeEvent"("pipelineId","occurredAt" DESC);
CREATE FUNCTION "protectMasterChangeEvent"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Master change events are append-only'; END $$;
CREATE TRIGGER "MasterChangeEvent_append_only" BEFORE UPDATE OR DELETE ON "MasterChangeEvent" FOR EACH ROW EXECUTE FUNCTION "protectMasterChangeEvent"();
