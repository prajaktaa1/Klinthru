# KLINTHRU Asset Type Native Enum Migration Plan

Status: APPROVAL REQUIRED — planning only

No Prisma migration was created or applied, no Neon connection was used, and no existing records were changed.

## Current authoritative contract

The current Prisma enum is:

```prisma
enum AssetType {
  TEST_POST
  RECTIFIER
  OTHER
}
```

The current backend validator and Asset Master API accept only those three values. Existing `OTHER` records must remain `OTHER`; this plan does not infer their type from `facilityType`, `equipmentType`, names, or any other field.

## Proposed native mapping

| UI label | Proposed Prisma enum value | Existing records | Notes |
|---|---|---|---|
| Station | `STATION` | unchanged | New records only after migration |
| Valve | `VALVE` | unchanged | New records only after migration |
| Rectifier | `RECTIFIER` | unchanged | Existing CP rectifier links remain valid |
| Test Post | `TEST_POST` | unchanged | Existing CP test-point links remain valid |
| Compressor | `COMPRESSOR` | unchanged | New records only after migration |
| Sensor | `SENSOR` | unchanged | New records only after migration |
| Pump | `PUMP` | unchanged | New records only after migration |
| Meter | `METER` | unchanged | New records only after migration |
| Pig Launcher | `PIG_LAUNCHER` | unchanged | New records only after migration |
| Pig Receiver | `PIG_RECEIVER` | unchanged | New records only after migration |
| Pipeline Fitting | `PIPELINE_FITTING` | unchanged | New records only after migration |
| Flange | `FLANGE` | unchanged | New records only after migration |
| Insulating Joint | `INSULATING_JOINT` | unchanged | New records only after migration |
| Pipeline Crossing | `PIPELINE_CROSSING` | unchanged | New records only after migration |
| Other | `OTHER` | unchanged | No guessing or backfill |

## Dependency inspection

### Pipeline / Asset Master

- `Asset.assetType` is a required Prisma enum field.
- Asset API validation, query filtering, duplicate-safe save, and the `(pipelineId, assetType)` index use the enum.
- The Asset Master UI currently shows all 15 labels but safely sends only the existing enum values until native migration approval.
- Existing `facilityType` and `equipmentType` remain independent fields and must not be overwritten during migration.

### CP Monitoring and CP criteria

- `CpTestPoint.assetMasterId` links to an Asset and currently requires `assetType = TEST_POST`.
- `CpRectifier.assetMasterId` links to an Asset and currently requires `assetType = RECTIFIER`.
- These two values must not be renamed or removed.
- `CpCriteriaSet.applicableAssetType` is nullable and uses the same enum. Existing criteria rows must remain unchanged; new enum values may be used in new criteria only after the CP rules are reviewed.

### SCADA and Sensors

- `ScadaTag` and sensor-related records link to assets by asset identity/foreign-key relationships and do not currently enforce a specific `AssetType` enum value.
- No SCADA or Sensor schema backfill is required for this enum expansion.
- UI filters that currently derive labels from facility/equipment fields should be updated to prefer native `assetType` values after the migration, while retaining fallback display for legacy `OTHER` records.

### Other modules

- Risk assessment snapshots contain an independent textual `assetType` scope value; it is not the Prisma `AssetType` enum and must not be mass-updated.
- Documents, map markers, segment links, parent assets, and inspection/report links use Asset IDs/foreign keys and do not require data conversion.

## Backward-compatible migration procedure

After separate approval, create one Prisma migration that only adds enum values:

```sql
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'STATION';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'VALVE';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'COMPRESSOR';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'SENSOR';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'PUMP';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'METER';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'PIG_LAUNCHER';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'PIG_RECEIVER';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'PIPELINE_FITTING';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'FLANGE';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'INSULATING_JOINT';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'PIPELINE_CROSSING';
```

The migration must not:

- update any `Asset.assetType` value;
- classify or backfill existing `OTHER` records;
- modify `facilityType` or `equipmentType`;
- alter CP, SCADA, Sensor, document, report, or risk records;
- drop/recreate the enum;
- reset the database or deploy unrelated migrations.

Because PostgreSQL enum additions are not safely reversible by a simple `DROP VALUE`, rollback is operational: stop using the new values, restore application code, and retain the unused enum values. A destructive enum rewrite is not approved by this plan.

## Application changes required after migration approval

1. Update Prisma schema, backend domain types, Zod validation, API query allow-list, and generated client to accept all 15 native values.
2. Change Add/Edit/import/export to send and return native enum values.
3. Preserve legacy `OTHER` records as `OTHER` and display them as `Other` unless an explicitly stored field provides a non-authoritative legacy label.
4. Keep CP link validation restricted to `TEST_POST` and `RECTIFIER`.
5. Add backend and frontend tests for all 15 values, duplicate handling, reload, filters, export/import, CP link restrictions, and preservation of unrelated facility/equipment data.
6. Regenerate Prisma Client only after the migration is approved and applied to the verified development branch.

## Approval requirements

Approval is required for:

- adding the 12 new enum values listed above;
- updating backend/frontend contracts to use native values;
- running the migration on the verified development/staging branch.

No approval is requested for production, and no production or Neon write was performed during this review.
