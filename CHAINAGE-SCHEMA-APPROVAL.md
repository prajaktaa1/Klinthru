# Chainage Agent ? additive schema proposal (not applied)

The existing Pipeline, Segment and Asset tables remain authoritative. The user approved additive schema preparation. Prisma additions and backend/prisma/drafts/chainage-agent.sql are prepared. No migration has been applied, no generated client has been changed, and live columns remain unchanged.

## Proposed additions

Pipeline: nullable chainageOriginMeters, chainageOriginName, chainageOriginDescription, chainageOriginReference, chainageOriginLatitude, chainageOriginLongitude; nullable chainageDirection enum (INCREASING_DOWNSTREAM / INCREASING_UPSTREAM); nullable parentPipelineId and parentTieInChainageMeters; precision, allowNegativeChainage, chainageMatchToleranceMeters, boundaryPolicy; verified route calibration data with origin/end stationing and coordinate system.

Asset: nullable numeric chainageMeters, startChainageMeters, endChainageMeters. Existing kp remains intact as the legacy kilometre value. Display chainage and kilometres derive from metres; no duplicate chainage uniqueness constraint.

Segment: nullable numeric startChainageMeters and endChainageMeters, preserving startKp/endKp. Pipeline plus numeric chainage indexes; asset type plus pipeline plus chainage index. Parent pipeline foreign key restricted on delete; no cascade deletion.

Configuration changes must be authorized for Admin/Engineer roles, audited, and validated for length, branch cycles, tie-in boundaries, precision and coordinate pairs. Unknown direction/datum remains null, never invented.

## Data preservation and deployment

1. Read-only preflight and backup before migration.
2. Add nullable columns and indexes only; preserve every existing value.
3. Backfill only unambiguously parseable legacy KP values (bare numeric KP is kilometres); report invalid values without modifying them.
4. Do not invent GPS, datum names, flow direction, branch relationships or route calibration.
5. Verify row counts, relationship counts and originals against preflight; deploy application changes and verify all saved pipelines.

## Separate source-data limitation

The audit found seven pipelines (the request expected six). Five have no route geometry; four of five assets lack GPS; both saved routes contain only two coordinates and require verified calibration because their lengths disagree with configured pipeline lengths. PL-001 has overlapping segment ranges. A schema migration cannot supply missing survey/GIS data or determine correct segment boundaries.

Preparation and isolated rehearsal approved. The guarded successor, backend/prisma/drafts/chainage-agent.guarded.sql (SHA-256 edb663fcb4e41e6c026fe8d963678419885aa2b6a980c0b31133cf4dee518954), passed isolated migration, rollback and recovery tests. The three numeric persistence failures and pipeline settings API blocker were fixed; final application verification passed 73 checks with zero failures. See artifacts/chainage/migration-rehearsal/FIX-VERIFICATION-REPORT.md for evidence and remaining GIS limitations.

Development execution remains unapproved. No migration was applied to klinthru-development, its schema and original records are unchanged, and temporary rehearsal resources were removed. Do not run prisma migrate, prisma db push, or development SQL before separate final execution approval. Any subsequent approval must name the reviewed guarded SQL and target klinthru-development; it does not authorize unrelated pending migrations or GIS data changes.
