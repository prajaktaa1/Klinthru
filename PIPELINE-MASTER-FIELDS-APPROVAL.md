# Pipeline Master Fields — Approval Required

Status: **APPROVED — implementation prepared; migration still unapplied**

No migration, production database write, or Neon write has been executed.

The approval-only SQL draft is at `backend/prisma/drafts/202610221800_add_pipeline_master_fields/migration.sql`.

## Findings

- `Pipeline` currently has `designPressure` but no `designPressureUnit`.
- `Pipeline` currently has no `coatingType`.
- Existing `coatingType` fields are assessment-owned (`ExternalCorrosionInput`) and must remain separate from Pipeline Master data.
- The existing pipeline POST/PUT routes already use the shared pipeline validation and store mapping, so no new route is required after the fields are added.

## Exact schema change

Add nullable fields to `backend/prisma/schema.prisma` under `model Pipeline`:

```prisma
coatingType         String?
designPressureUnit  String?
```

The fields remain nullable to preserve all existing records. Do not rename or reuse `operatingPressureUnit`.

Equivalent approval-only SQL migration draft:

```sql
ALTER TABLE "Pipeline" ADD COLUMN "coatingType" TEXT;
ALTER TABLE "Pipeline" ADD COLUMN "designPressureUnit" TEXT;

ALTER TABLE "Pipeline"
  ADD CONSTRAINT "Pipeline_coatingType_check"
  CHECK ("coatingType" IS NULL OR "coatingType" IN ('3LPE', 'FBE', '3LPP', 'Other'));

ALTER TABLE "Pipeline"
  ADD CONSTRAINT "Pipeline_designPressureUnit_check"
  CHECK ("designPressureUnit" IS NULL OR "designPressureUnit" IN ('bar', 'psi', 'MPa'));
```

## Exact API and mapping change

1. Extend `PipelineRecord` and `PipelineInput` with:

```ts
coatingType?: "3LPE" | "FBE" | "3LPP" | "Other";
designPressureUnit?: "bar" | "psi" | "MPa";
```

2. Extend `pipelineInputSchema` with optional enums using the same values.

3. Add both fields to `toPipelineRecord` and `toPipelineData` in `backend/src/data/store.ts`.

4. Preserve the existing POST `/api/pipelines` and PUT `/api/pipelines/:id` routes. They will accept the fields through the updated shared validation and store mapping.

5. Add both fields to the Add/Edit form, pipeline Overview display, import/export mappings, and duplicate-safe save path. `coatingType` remains Pipeline Master identity data; assessment coating condition/age remain assessment data.

## Validation rules

- `coatingType`: optional existing-record field; if supplied, only `3LPE`, `FBE`, `3LPP`, or `Other` is accepted.
- `designPressureUnit`: optional existing-record field; if supplied, only `bar`, `psi`, or `MPa` is accepted.
- `designPressure` remains a non-negative number.
- No automatic conversion should be applied to `designPressure`; the selected unit is metadata for that value.
- Existing pipeline duplicate protection remains based on owner plus normalized Pipeline ID.

## Approval decision needed

Approve the two nullable `Pipeline` columns and the corresponding API contract changes above. After approval, implement the migration and then enable the currently blocked UI controls.
