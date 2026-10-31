# Risk Assessment database preparation

20 October 2026. **Local inspection: PASS. Database/client operational readiness: BLOCKED.**

Scope: read-only preparation against `RISK-ASSESSMENT-PRISMA-REVIEW-PLAN.md`, `FINAL-RISK-ASSESSMENT-FIXES-REPORT.md`, existing source/schema/migrations and historical reconciliation evidence. This report is the only intended task change. No Neon connection, migration application, schema edit, client generation, seed, database write, new project or deployment was performed. Historical database evidence below is explicitly dated; it does not establish current remote state.

## Verification results

| Check | Result | Evidence / limitation |
|---|---|---|
| All thirteen Risk model declarations, relations and declared keys | PASS locally | `backend/prisma/schema.prisma:1458–1732`; installed Prisma 6.19.3 offline validation returned exit 0. Syntax/relation consistency is not business-policy approval. |
| Offline validation isolation | PASS | Prisma `validate --schema prisma/schema.prisma` used process-scoped dummy `DATABASE_URL=postgresql://validation:validation@127.0.0.1:1/validation?schema=public`, test mode and existing local preload. Although CLI reports loading `.env`, the explicit process variable overrides it. No database command or application startup ran. |
| Installed Prisma toolchain | PASS | Installed CLI, `@prisma/client` and generated client report 6.19.3; package ranges are `^6.11.1`. |
| Generated client readiness | BLOCKED | Source schema: 71 models; `backend/node_modules/.prisma/client/schema.prisma`: 49. All thirteen Risk models and nine CP Design Basis models are absent from the generated client. Optional delegate typings in `backend/src/lib/prisma.ts` do not generate delegates. |
| Local Risk table migration coverage | BLOCKED | None of the 27 local migration SQL files creates any of the thirteen Risk tables. Remote absence is not inferred. |
| Migration provenance / replay readiness | BLOCKED | Historical CP checksum exception persists; unrelated pending streams and local/Git coverage differ. Details below. |
| Approved-history database enforcement | BLOCKED | No Risk-specific immutability trigger, policy or privilege package exists in repository migrations. Restrictive FKs and HTTP write locks do not make records immutable. Current remote protections remain unverified. |
| Existing development target identity | BLOCKED | No currently approved Risk development project/branch/endpoint tuple established. Default endpoint has historical identity evidence but development designation is explicitly UNVERIFIED. |
| Live tables, data, grants and applied migration status | BLOCKED / UNVERIFIED | Intentionally not queried. No claim of live-data or current catalog verification. |

No frontend/backend typechecks or UI regressions were rerun for this documentation-only task. The previous fixes report retains its completed checks; the new executed check here is offline Prisma validation.

**Preservation PASS:** SHA-256 comparison of all 322 task-start files in the inspected source, Prisma/migration, frontend-script, package/lockfile, generated-client evidence and root-report scope found zero changes or deletions. This report is the only addition in that scope. Existing completed work remains intact.

## Complete Risk model and key inventory

All thirteen models declare `id String @id @default(uuid())`. These are string IDs without `@db.Uuid`; do not silently convert master or Risk IDs to native UUID columns. All declared Risk outgoing FKs use `onDelete: Restrict`. Cyclic current pointers use `onUpdate: NoAction`. Unique constraints also create uniqueness indexes; references below use field names, not invented SQL constraint names.

Notation: U = declared unique key, I = declared nonunique index. Every row also has its primary key.

| Model / schema line | Relationships verified locally | All additional declared keys / indexes |
|---|---|---|
| Risk / 1458 | Pipeline; optional Segment, Asset, User owner. Composite `(id,currentApprovedRevisionId)` references revision `(riskRecordId,id)`, keeping the pointer within the same Risk. | U `riskId`; U nullable `currentApprovedRevisionId`; U `(pipelineId,correlationKey)`; U `(id,currentApprovedRevisionId)`; I `(pipelineId,status)`. |
| RiskSourceLink / 1491 | `riskRecordId` → Risk. Native source identity remains polymorphic, without an invented source table FK. | U `(riskRecordId,sourceModule,sourceRecordType,sourceRecordId,contributionType)`; I `(sourceModule,sourceRecordType,sourceRecordId)`. |
| RiskAssessment / 1510 | `riskRecordId` → Risk. | U `(id,riskRecordId)`. |
| RiskAssessmentRevision / 1520 | Risk; composite assessment `(assessmentId,riskRecordId)`; composite method `(methodologyVersionId,matrixVersionId)`; matrix. Reverse current-pointer relation. | U `(riskRecordId,id)`; U `(assessmentId,revisionNumber)`; I `(methodologyVersionId,approvalStatus)`. |
| RiskMethodologyVersion / 1562 | `matrixVersionId` → RiskMatrixVersion. | U `(methodologyId,version)`; U `(id,matrixVersionId)`. |
| RiskMatrixVersion / 1580 | No outgoing FK; referenced by methodologies and revisions. | U `(matrixId,version)`. |
| RiskReview / 1596 | Risk; composite revision `(riskRecordId,revisionId)` → revision `(riskRecordId,id)`. | I `(riskRecordId,dueDate)`. |
| RiskApproval / 1611 | Revision; optional Review, linked independently. | I `(revisionId,decidedAt)`. |
| RiskEvent / 1625 | Risk; optional composite same-Risk assessment revision, treatment revision and ALARP links. | I `(riskRecordId,occurredAt)`. |
| RiskTreatment / 1645 | Risk; composite `(id,currentApprovedRevisionId)` → treatment revision `(treatmentId,id)`. | U `treatmentId`; U nullable `currentApprovedRevisionId`; U `(id,riskRecordId)`; U `(id,currentApprovedRevisionId)`. |
| RiskTreatmentRevision / 1659 | Composite treatment `(treatmentId,riskRecordId)` → treatment `(id,riskRecordId)`; composite baseline `(riskRecordId,baselineRevisionId)` → assessment revision `(riskRecordId,id)`. | U `(treatmentId,revisionNumber)`; U `(treatmentId,id)`; U `(riskRecordId,id)`. |
| RiskAlarpAssessment / 1697 | Composite `(riskRecordId,treatmentRevisionId)` → treatment revision `(riskRecordId,id)`. | U `(alarpId,version)`; U `(riskRecordId,id)`. |
| RiskTreatmentActionLink / 1721 | Composite same-Risk treatment revision. `actionId` remains a central Actions reference, not a substitute local task. | U `(treatmentRevisionId,actionId)`; I `(actionId)`. |

Prisma validation verifies declared relation targets and supporting uniqueness. It does not prove deployed FK/index presence, concurrency safety, authorized transitions or performance. PostgreSQL does not automatically index every referencing FK. Candidate workload review includes assessment/treatment `riskRecordId`, method `matrixVersionId`, approval `reviewId` and treatment baseline references; some composite indexes cover only their leading fields. Do not add indexes or remove apparently redundant composite unique keys without the approved workload/relationship review. No EXPLAIN or load test against a database occurred.

Existing master creation dependencies in local SQL:

- User: `backend/prisma/migrations/202607010000_baseline_core_tables/migration.sql`.
- Pipeline: `backend/prisma/migrations/202607291500_add_pipeline_master_data/migration.sql`.
- Segment and Asset: `backend/prisma/migrations/202610071200_add_asset_master_foundation_phase_a/migration.sql`.

These are local creation references, not evidence that a selected database has applied them. Preserve existing tables, types, records, deletion behavior and module ownership.

## Integrity and immutability gaps

Each unresolved policy below is **MISSING FIELD — APPROVAL NEEDED**. Existing declarations provide structural intent, not approval to enforce invented rules.

| Gap | Existing provision | Required approved design |
|---|---|---|
| Approved history | Draft state strings, optional timestamps/hashes; application draft-edit checks and authenticated HTTP 423 mutation locks. | Immutable approved method/matrix/results/snapshots, treatment/ALARP versions; append-only approvals/events; allowed correction and metadata transitions; DB role/guard enforcement with authorized service transactions. No approved trigger implementation exists locally. |
| Current/baseline pointers | Same-subject composite FKs. | Ensure referenced revision is actually approved; atomic pointer/decision/event update, locking, idempotency and concurrent revision allocation. `concurrencyVersion` default 1 alone enforces none of this. |
| Same pipeline / subject | Independent Pipeline/Segment/Asset FKs. | Prevent valid but unrelated master IDs being combined; review validation/enforcement without changing master schemas automatically. |
| Source lifecycle | Unique contribution key; optional sourceVersion/retiredAt. | Version and retirement semantics: current unique key excludes both, so relinking later versions may collide. Preserve frozen evidence. |
| Approval subject | Separate revision and optional review FKs. | Guarantee review belongs to selected revision/Risk; authority, delegation and self-approval policy. |
| Actor provenance | Owner has User FK; most assessor/creator/reviewer/approver/linker/event actor IDs are plain strings. | Approve authoritative actor identity and retention/deletion behavior before proposing FKs or other enforcement. A string ID does not establish authorization. |
| JSON / engineering validity | Separate inherent/current/residual JSON results, method rules, matrix dictionaries/cells and source snapshots. | Approved stable IDs/shapes, units, time bases, complete classifications, version/provenance validation and canonical hash algorithm/version. No DB checks currently enforce complete cells, result semantics or content hashes. |
| Event coherence | Optional event references each enforce same Risk. | Decide required cross-link coherence and accepted event types; same Risk does not prove a specific ALARP belongs to the selected treatment revision. |
| Treatment / ALARP | Baseline FK; version keys; `Decimal(20,4)` cost and date-only estimate/implementation fields. | Approved baseline eligibility, cost currency/basis, tolerability criteria/version, evidence and forecast-versus-verified reassessment. Action completion cannot establish risk reduction. |

`RiskReview.dueDate` and treatment estimate/implementation dates use `@db.Date`; revision `assessmentDate` uses DateTime. Preserve these types and separately approve calendar/timezone semantics. Free-form status/decision strings and nullable approval provenance do not constitute approved lifecycle rules.

## Local migration history and historical evidence

There are **27 local migration SQL files**, provider `postgresql`. Only two SQL paths are tracked in the inspected Git checkout:

- `202607171420_add_external_pipe_data/migration.sql`
- `202607181300_add_device_records/migration.sql`

The remaining 25 local SQL files are untracked; preserve them. Local checkout is Git branch `main`, HEAD `d901f3d9f8c35b7ffa72d27f0366a317703e2919`, origin `https://github.com/prajaktaa1/Klinthru.git`. Git branch identity does not identify a Neon branch. This task did not stage, commit, reset or alter history.

Historical package: `artifacts/baseline-reconciliation-review-20261019/`, particularly `catalog-manifest.json`, `cp-checksum-exception.md`, `prisma-drift-register.md`, `runner-and-lineages.md` and `isolated-neon-runbook.md`. Its capture is **2026-10-19T06:25:27.655Z**, not a current database check.

- Historical catalog contained 40 application tables and 25 migration ledger rows, with no Risk tables. Its pending list contained `20261013120000_add_document_repository_phase_1a` and `20261015130000_add_sensor_identity_lineage_phase_1`. Neither current table absence nor current pending status is established here.
- Rechecking local files against that historical ledger finds one checksum mismatch: `20260829130605_2026_08_29_add_cp_monitoring_survey_and_pipeline_integrity`.
- Historical recorded checksum: `e25de97cd9e640acfe9e8ca123d23683225ca01394b5a7a1aeb6a2b3c2d1ef22`.
- Current local 317-byte file SHA-256: `580462fdeeb050f95bc177e648ab3061175167b38ac19c2a8b64f2137675a838`.
- That local file contains four default alterations, not creation of the eight CP tables identified in the exception report. Original SQL provenance remains unresolved. All other 24 historical ledger checksums match the corresponding current local files.
- Historical drift records four absent database defaults that the local CP file would introduce, plus a separate ScadaTag timestamp-default difference. Do not silently reconcile these as part of Risk work.
- Historical reconstruction is a 40-table review baseline, not a complete current 71-model installation package. It must not be applied to an existing database or used as a replacement migration directory.

**BLOCKED:** approve migration lineage/installation-evidence handling before any Prisma deployment. A new Risk forward migration would not repair the historical checksum exception. No checksum replacement, ledger update/delete/copy, `migrate resolve`, reset, guessed original SQL, replay or automatic adoption is authorized. DMS, Sensor Identity, CP Design Basis and Defect streams require separate scope review; a full-schema diff could sweep unrelated changes into a purported Risk migration.

## Exact existing development branch verification required

Only non-secret endpoint identifiers were inspected locally. No password, username or connection URL is reproduced.

| Evidence | Known identity | Why it is insufficient |
|---|---|---|
| `backend/.env` endpoint and historical baseline manifest | Endpoint `ep-sparkling-violet-azzpqqaw`; historical project `weathered-smoke-69232580`, branch `br-round-fire-azvepzmc`, database `neondb`, schema `public`. Local URL uses pooled endpoint. | Manifest branch name is null and development designation is UNVERIFIED. Local config does not prove current associations or Risk development authorization. Treat target as protected. |
| `backend/.env.staging.local` | Endpoint `ep-square-salad-azjgqpg9`, database `neondb`, direct endpoint. | Different endpoint; project, branch and authorization not established. A filename is not environment proof. |
| `artifacts/external-corrosion-final/FINAL-EXTERNAL-CORROSION-AUDIT.md` | Historical isolated EC development project `delicate-grass-15875373` (`klinthru-external-corrosion-dev`), branch `br-jolly-field-b49evx7b`, endpoint `ep-raspy-mode-b4r5p7ep`. | Prior module-specific authorization is not current Risk target approval. Do not reuse automatically. |

`backend/src/config/env.ts` loads dotenv and reads process `DATABASE_URL`. `NODE_ENV=development` does not prove a development database. `schema.prisma` uses `DATABASE_URL`, with no separate direct/shadow URL. No explicit local project/branch metadata establishes the intended Risk target.

Required sequence, **not executed**:

1. Owner identifies and approves an **existing** nonproduction Klinthru target: project ID/name, branch ID/name, endpoint ID/hostname, database/schema, environment designation, owner and inspection role. No new project or branch is authorized.
2. Obtain separate approval for read-only Neon identity/catalog inspection. Verify endpoint → branch → project association using trusted current metadata; obtain the approved direct endpoint rather than deriving one from a pooled hostname. Keep connection secrets out of reports and application configuration changes.
3. In a dedicated approved read-only session, verify actual database/user, TLS, read-only transaction, timeouts and server-reported Neon IDs where available. Missing server identity settings require equivalent trusted metadata confirmation, never silent fallback to a hostname alone.
4. Capture current table/column/FK/index/default/guard inventory, grants/roles and migration ledger/checksums. Compare to approved source and historical evidence. Historical manifests exclude role/ACL coverage and cannot certify privileges.
5. Stop on target mismatch, unexpected objects, failed migrations or unresolved drift. Review an exact forward package before seeking separate DDL approval. Existing fresh-baseline scripts contain different target assumptions; do not run them as Risk preflight without review.

Current exact development target: **MISSING FIELD — APPROVAL NEEDED**.

## Minimal forward migration plan — review only

No SQL or Prisma schema change was generated. Final SQL depends on current target catalog, approved contracts and lineage handling.

| Order | Minimal scope / dependency | Acceptance gate |
|---|---|---|
| 1 | Approve target, lineage strategy, identity/source/JSON/approval/immutability contracts; verify existing User/Pipeline/Segment/Asset structures. | Named approvals and current read-only preflight. Do not adopt unrelated pending migrations automatically. |
| 2 | Prepare reviewed **Risk-only** forward DDL for missing approved objects, preserving any existing Risk objects/data. Create matrix then methodology versions; Risk root without cyclic pointer FK; assessment/source links; revisions/reviews/approvals; treatment root/revisions/ALARP/action links; events. | Exact source-to-DDL mapping, correct types/defaults/keys and no unrelated master/module changes. If existing objects differ, stop for review instead of drop/recreate. |
| 3 | Add cyclic current-pointer FKs after referenced tables exist; approved immutability/transition/append-only protections and least-privilege grants; only justified indexes/checks. | Review transaction boundaries, lock ordering/timeouts and supported DDL. Do not assume Prisma wraps the whole migration in a transaction or that FKs must be deferrable. |
| 4 | After separate local-artifact approval, generate client from the approved schema using pinned installed versions, no database URL or install hooks; inspect generated diff. | All 71 currently declared model delegates would be generated, including nine unrelated CP Design Basis delegates. Review that wider client change; generation does not authorize those tables or writers. Backend typecheck and isolated delegate/read-unavailable regressions must pass. |
| 5 | Seek explicit application approval for the verified existing nonproduction target and exact reviewed artifact hashes. | Approved recovery point, migration/installation recording strategy and acceptance/rollback ticket. No seeds or invented operational records. |
| 6 | Future authorized validation before enabling workflows. | Current catalog/ledger postflight; three separate bases; exact method/matrix/source versions; same-subject and duplicate/race rejection; immutable history; cross-user/native ACL denial; central Action/report ownership; unchanged other modules. |

Rollback and preservation requirements for that later ticket:

- Record preflight schema/constraint/index/default/privilege and migration-ledger manifests, existing row-count/content verification strategy, application/client versions and artifact hashes. Approve backup/recovery point and restoration procedure on the existing target; no new target creation is implied.
- Where reviewed DDL is transactional, failure before commit rolls back that transaction. Define recovery explicitly for any nontransactional step. Stop on failure; do not automatically reset, resolve or continue migration history.
- After commit, application/client rollback should retain newly created Risk tables, approved history and data. Removing new objects is a separate destructive decision: only verified empty, exclusively new objects could be considered after explicit approval; never `CASCADE` or drop shared masters. Preserve populated Risk data and original ledger history.
- Verify postflight existing tables, data, master IDs, defaults, constraints, grants and other-module behavior against preflight. A checksum of source files does not prove database preservation. Any mismatch blocks workflow enablement.

## Safe preparation versus separately approved operations

| Scope | Status |
|---|---|
| Read local schema/client/migrations/config metadata; compare historical artifacts/checksums; offline validation; write this report | PASS — completed. |
| Generate client or executable migration artifacts / edit schema | Not performed. Separate approved artifact/design scope required; not authorized by this task. |
| Neon control-plane access or read-only database inspection, including Prisma migration status/db pull | BLOCKED pending explicit target and access approval. |
| Apply migrations/DDL/guards/grants, change ledger, seed/import/write records, backup/restore operations, enable writers or deploy | BLOCKED pending separate exact-operation approval. |
| Create Neon project or branch | Outside this request; not performed or proposed as a prerequisite. |

`backend/package.json` has `prisma:migrate` → `prisma migrate dev` and `postinstall` → `prisma generate`. Neither was run. Do not use install, app startup or migrate commands as a shortcut around the gates above.

## Remaining non-database dependencies and prioritized decisions

All entries remain **MISSING FIELD — APPROVAL NEEDED** unless backed by separately verified approval evidence:

1. **P0 target and lineage:** exact existing Risk development target, permitted read-only inspection, CP checksum/provenance exception handling and release/installation recording strategy.
2. **P0 engineering E1–E4 / scoring R1–R2:** approved methodology/applicability/version; PoF likelihood criteria/time basis; CoF dimensions/units/combination; accepted calculation; complete matrix classifications/thresholds/boundary rules; Risk_ID/scenario correlation and KP units/tolerance; evidence freshness/confidence/sufficiency and snapshot/version/hash policy. Screenshot values remain examples.
3. **P0 permissions and integrity:** role/action/object/field and native-source ACL matrix; lifecycle/reviewer/approver authority, delegation/self-approval; stable JSON IDs; source-link retirement/version semantics; immutable fields and authorized correction transactions.
4. **P1 integrations:** authoritative source ID/type/version/units/access/history/error/navigation contracts. Existing limited ILI/CP/SCADA/Documents adapters do not certify full native ACL/version parity; Defect/ECDA/Corrosion/GIS coverage remains incomplete. Preserve optional Defect linkage and source ownership.
5. **P1 governed outputs:** central Action_ID owner/gateway; treatment/ALARP/cost/evidence criteria; KPI/review/calendar/attribution/history population policies; Reports & Analytics templates/runs/schedules/access and Report_Run_ID → Document_ID. No substitute Risk tasks, report storage or inferred risk reduction.

**Verdict: BLOCKED / NOT READY for database execution or operational Risk workflows.** Local structural verification and preparation are complete. Stop here before database access, artifact generation, database operations or production changes.
