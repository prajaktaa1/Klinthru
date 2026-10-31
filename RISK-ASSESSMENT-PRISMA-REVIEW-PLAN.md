# Risk Assessment: approvals and Prisma deployment review plan

Prepared: 20 October 2026. **DRAFT FOR SEPARATE REVIEW — NOT AUTHORIZED FOR EXECUTION.**

References: `FINAL-RISK-ASSESSMENT-100-PERCENT-AUDIT.md`, `RISK-ASSESSMENT-APPROVAL-EVIDENCE.md`, `RISK-ASSESSMENT-NEXT-DECISIONS.md`, `../All-doc/new/risk assesement.docx`, and current `backend/prisma/schema.prisma`.

No schema, migration SQL, generated client, database record or deployment was created or changed. This package identifies the required migration scope and gates. Executable migrations cannot be finalized safely while identity, source-link lifecycle, JSON contracts, permissions and immutability policy remain unresolved. No Prisma command or database access is authorized by this plan.

## 1. Decisions required first

All unresolved entries below are **MISSING FIELD — APPROVAL NEEDED**. Existing code and screenshot examples do not approve them.

| Priority / decision | Required approval / evidence | Affected implementation |
|---|---|---|
| P0: E1 / D01 | Authoritative methodology document/version, approving owner/date/reference, qualitative/quantitative scope and applicability. | Methodology definitions/read validation; future governed calculation workflow. |
| P0: E2 / R1–R2 | Likelihood/PoF criteria and time basis; consequence dimensions/units/combination; accepted formula; complete matrix classifications, thresholds and boundary precedence; exact method/matrix/rule versions. | Methodology/matrix JSON contracts, result validators and criteria DTOs. |
| P0: E3 / D02 | Risk_ID allocation, normalized scenario/asset/threat/failure-mode correlation, KP units/tolerance, duplicate-search and separate-scenario exception authority. | Risk uniqueness and creation transactions. |
| P0: E4 / D04 | Required evidence, confidence/sufficiency/freshness; exact source versions; snapshot canonicalization/hash; link version/retirement lifecycle. | RiskSourceLink constraints and immutable revision snapshots. |
| P0: D03 | Stable likelihood/consequence/control IDs, approved JSON shapes and RiskIndicator projection. Decide whether embedded JSON is sufficient before proposing additional models. | Revision JSON validation and any separately justified schema changes. |
| P0: D05–D06 | Role/action/object/field matrix, native source ACL parity, catalog/note/evidence visibility, review/approval/accept/close transitions, delegation and self-approval rules. | Read scopes, writers, DB privileges and approval enforcement. |
| P0: D07 | Per-source exact ID/type/version/fields/units/access/freshness/errors/history/navigation; source-change/event contract. | Native adapters, frozen evidence and reassessment events. |
| P1: treatment/ALARP | Treatment/ALARP identity, tolerability/evidence/alternatives/authority, cost basis/currency/overlap and forecast/verified reassessment rules. | Treatment and ALARP models/validation; Central Action provider. |
| P1: KPI/review/analytics | Active groups, missing-review/completeness policy, calendar/intervals/urgency, attribution/denominators/ranking and comparable historical populations/buckets. | Approved policy JSON and aggregate readers. |
| P1: action/report/notification contracts | Central Action_ID provider; official report templates/runs, Report_Run_ID→Document_ID, result basis/population, schedules/recipients/timezones/download access and notifications. | Existing owner services; no substitute Risk task/report/binary stores. |

Frozen DOCX requirements remain valid: Risk owns official results, sources keep engineering ownership, defects are optional, scenarios deduplicate, three bases remain distinct, approved history retains exact versions/snapshots, actions do not automatically reduce risk, and central services own tasks/reports/documents/technical setup.

## 2. Current local database/client evidence

- Thirteen Risk models are review-only declarations in `backend/prisma/schema.prisma`.
- The inspected local generated Prisma schema has none of these Risk models.
- No repository migration creates these Risk tables.
- Actual Neon tables, applied migrations, approvals and constraints are UNVERIFIED. Repository absence cannot establish remote absence.
- Optional read delegate TypeScript declarations in `backend/src/lib/prisma.ts` do not generate a client or create tables. Runtime readers remain unavailable until a separately approved deployment/client process is verified.

## 3. Migration scope to review after prerequisites

These are review slices, not executable migration names or finalized SQL. Exact generation/application must follow approval and later authorized target verification. Existing source tables/modules must not be recreated.

| Review slice | Declared model scope | Required design review |
|---|---|---|
| A — Versioned definitions | RiskMatrixVersion, RiskMethodologyVersion | Business ID/version uniqueness, exact method→matrix binding, rule versions, approval provenance and immutable approved definitions. No embedded screenshot defaults. |
| B — Risk identity and evidence references | Risk, RiskSourceLink, RiskAssessment | Existing Pipeline/Segment/Asset/User relations; same-pipeline/segment validation; business ID/correlation uniqueness; source access/version/retirement and provenance. |
| C — Assessment/review/history | RiskAssessmentRevision, RiskReview, RiskApproval, RiskEvent | Same-Risk/assessment/version subject constraints, revision uniqueness, JSON shape checks, date semantics, append-only decisions/events and current-approved pointer cycles. |
| D — Treatment and ALARP references | RiskTreatment, RiskTreatmentRevision, RiskAlarpAssessment, RiskTreatmentActionLink | Same-Risk approved baseline, revision/pointer integrity, ALARP version/evidence, decimal cost precision, Action_ID link uniqueness and source ownership. |
| E — Integrity/privileges | Constraints/guards covering A–D | Approved immutability, allowed transactional transitions, locking/idempotency/concurrency, least privilege and audit enforcement. Application HTTP locks alone are insufficient. |

Suggested dependency ordering for review: existing master identities → matrix/method definitions → Risk root without current-pointer FK → assessment/source links → revisions/reviews/approvals → treatment root/revisions/ALARP/action links → events → current-pointer and remaining cyclic FKs → policy-approved guards/privileges. Final SQL order may differ after schema validation and approved design; no DDL was generated.

### Specific integrity gaps that must be resolved

1. `RiskSourceLink` uniqueness currently excludes sourceVersion and retirement state. Approve how a later version links without changing an old snapshot or colliding with the old contribution.
2. `Risk` points independently to Pipeline/Segment/Asset. Review same-subject constraints so a valid FK cannot connect an unrelated segment/asset. Preserve the existing master schema unless separately approved.
3. Current assessment and treatment pointers form cycles with their revision tables. Review FK creation order and transaction/locking behavior; do not infer that all constraints must be deferrable.
4. `RiskApproval` links revisionId and optional reviewId separately. Review enforcement that a chosen review belongs to that same revision/Risk and the actor is authorized.
5. Method/matrix approval provenance, actor references, scenario/correlation uniqueness and revision numbering need approved enforcement, not just free-form strings.
6. `onDelete: Restrict` does not make approved JSON/results/status immutable. Define which records/fields become immutable, permitted metadata transitions, append-only audit and authorized correction/reassessment behavior.
7. Snapshot hashes currently have structural checks; canonicalization, algorithm/version and verification behavior need approved contracts before database or writer enforcement is specified.
8. Approve JSON contracts and stable subrecord identities before adding CHECK constraints or additional tables. Do not install a universal product formula, role list or status enum from examples.
9. Retain `RiskTreatmentRevision.costAmount` precision and currency/basis provenance. Do not store inferred reduction percentages or verified outcomes from action completion.
10. Action_ID and polymorphic source references belong to native owners; do not invent local task/source tables to make foreign keys possible.

## 4. Separate execution and acceptance gates

| Gate | Required reviewable evidence |
|---|---|
| Approve design | Decisions above mapped to exact versioned documents/owner approvals, affected schema/contracts and acceptance checks. |
| Authorize target inspection later | Exact nonproduction project/branch/endpoint and read-only catalog/permission scope. No production inference. |
| Review migration/client package | Actual target comparison, minimal SQL/Prisma diff, existing-model preservation, cyclic FK/integrity validation, generated-client plan, least privilege and rollback/data-preservation procedure. |
| Authorize nonproduction execution separately | Explicit deployment scope and approved rollback/acceptance gates. No screenshot or fake seed records. Any governed record entry/import requires its own authorization/provenance. |
| Validate before enabling workflows | Genuine permissioned records; duplicate/race/idempotency tests; three independent bases; exact versions/hash checks; immutable approval/history; native cross-user denial/outage behavior; Action/report ownership; unchanged existing modules. |
| Production approval | Separate later release decision after nonproduction acceptance. Nothing in this document authorizes it. |

Current status: local display/read hardening can proceed within approved scope; engineering workflows and database deployment remain **BLOCKED**. This plan is ready for review, not for execution.
