# Risk Assessment approval evidence review

Date: 20 October 2026. Result: architectural requirements are documented/frozen; operational methodology, permission and complete source contracts are not established by the inspected evidence. Operational readiness remains BLOCKED; local read-only coverage remains PARTIAL.

## References and interpretation

Reviewed `../All-doc/new/risk assesement.docx` directly, including tables and the closing freeze statements; `FINAL-RISK-ASSESSMENT-READINESS.md`; `RISK-ASSESSMENT-NEXT-DECISIONS.md`; existing IMG-05–10 reports and the ten-tab audit; and current Risk/auth/access/source/schema files cited below. DOCX section numbers are used because page numbers depend on Word rendering.

“Frozen requirement” below means the supplied DOCX explicitly states the architecture or safeguard and later confirms it should be frozen. It does not establish a signed engineering method, deployed approved record, functioning integration or permission grant. No separate operational approval record was found among the inspected references. Database approval records remain UNVERIFIED because no database was accessed. Queries filtering `approvalStatus: "Approved"`, schema approval fields and synthetic test fixtures are not approval evidence.

## Requirements already settled in the supplied document

| Requirement to preserve | Evidence | Local implementation evidence / limit |
|---|---|---|
| Risk owns official Risk_ID, results, ALARP and review; engineering sources retain their records. | DOCX opening governing rule, §46 and closing frozen ownership table. | Risk repositories and source resolvers preserve the boundary; integration completeness is separate. |
| One Risk represents a scenario; new supporting evidence must not automatically create another Risk_ID. Defect_ID is optional. | DOCX §§5, 28, 48–49. | Foundation has correlation/source-link fields; operational allocation, normalization and concurrency workflow remain missing. |
| Keep Inherent, Current and Residual results distinct; retain exact versions and immutable approved history/snapshots. | DOCX §§13–15, 40–43. | Separate saved results and read validation exist. No enabled writer or verified database immutability enforcement. |
| Action completion requires evidence and controlled reassessment before official reduction. | DOCX §§22–24 and closing lifecycle. | Central Action reference boundary exists; verified outcome is unavailable. |
| Central Actions owns implementation tasks; Reports & Analytics owns Report_Run_ID; Document Management owns files; Integration Hub owns technical setup. | DOCX §§22, 26, 39, 46 and closing ownership table. | No replacement Risk task/report/source store is authorized. Operational service contracts remain incomplete. |
| Summaries use current approved official Risk records; overdue means next review date before today, excluding superseded/closed assessments. | DOCX §4; register §16. | Current-approved aggregation and calendar-date handling exist. Active population, calendar, missing-review and grouping policy still require approved values. |
| Missing critical consequence input blocks finalization; source outages must remain explicit and isolated. AI cannot approve/overwrite official risk. | DOCX §§36, 43, 50. | Unavailable states and disabled workflows exist; full source failure and permission parity remain unverified. |

These requirements do not authorize changing the existing ten-tab structure, routes, UI or schema.

## Operational decisions still missing

Each missing approval is **MISSING FIELD — APPROVAL NEEDED**. Existing D01–D07 decisions are partially specified by the frozen requirements above; their unresolved operational details remain pending.

| Decision / blocker | Evidence already present | Missing approval or contract |
|---|---|---|
| D01 / METH-01 | DOCX §§9, 12–15, 38, 40, 45 require traceable PoF/CoF and versioned matrices. | **MISSING FIELD — APPROVAL NEEDED**: actual approved method/matrix IDs and versions, complete 25-cell classifications, applicable scoring formula, quantitative units/bands, consequence dimensions, dictionaries and palette. Conditional 5×5 labels/examples are not an approved operational method. |
| D02 / METH-02 | DOCX §§5, 48–49 define scenario identity and mandatory duplicate search. | **MISSING FIELD — APPROVAL NEEDED**: Risk_ID allocator/format, normalization, KP units/tolerance, exception authority, collision/idempotency/concurrency rules. |
| D03 / API-02 | DOCX §§46–47 name assessment/control/indicator identities; current revision JSON embeds several subrecords. | **MISSING FIELD — APPROVAL NEEDED**: approved JSON contracts, stable subrecord IDs and indicator projection/design decision. No additional table is inferred. |
| D04 / METH-02, SRC-01 | DOCX §§40–43 freeze source/method/matrix versions and prevent silent updates. | **MISSING FIELD — APPROVAL NEEDED**: canonical snapshot/hash verification, version/retirement identity, confidence/sufficiency/freshness rules and exact historical readers. |
| D05 / PERM-01 | DOCX closing ownership table assigns users/permissions to Settings. Existing auth and owner/Admin scope are implemented. | **MISSING FIELD — APPROVAL NEEDED**: Risk role/action/object/field matrix, tenant/asset/delegated scopes, confidential note/evidence access, catalog visibility and source ACL parity. Ownership assignment is not a permission policy. |
| D06 / PERM-01, API-01 | DOCX §§8, 17, 23, 41 describe review/reassessment and recommend statuses. | **MISSING FIELD — APPROVAL NEEDED**: authoritative transition/status dictionary, reviewer/approver/acceptance roles, self-approval prevention, delegation and separation of duties. Admin is not automatically an engineering approver. |
| D07 / SRC-01/02 | DOCX §§10–12, 26–35 and closing table specify source owners and intended inputs. | **MISSING FIELD — APPROVAL NEEDED**: complete native read/version/access/freshness/error/navigation contracts and Central Action/report/document service integration. |
| Later METH-03/04/05 | DOCX defines ALARP evidence, current official KPIs and history/driver ownership. | **MISSING FIELD — APPROVAL NEEDED**: ALARP/cost/effectiveness criteria, KPI population/calendar/rounding, attribution/overlap/ranking, historical comparability and report population/basis rules. |

`backend/src/validation/riskAssessmentValidation.ts:4` currently accepts ordinal product scoring; its policy schema requires primary-source counting, counts-only display, earliest open current-revision review and unavailable missing-review behavior. These are implemented validation constraints awaiting operational acceptance, not newly approved engineering rules. `frontend/src/lib/riskScoring.ts` contains a separate legacy 70/40 helper; it supplies no approved official Risk matrix and must not be adopted as one.

## Existing source contracts: supported portions and gaps

Source: `backend/src/utils/riskRelatedSources.ts:25`, `backend/src/utils/riskSourceResolver.ts:5`, treatment/report repositories and readiness audit. “Partial” means inspected implementation, not owner approval or a successful live read.

| Source | Existing local read support | Remaining approval/evidence |
|---|---|---|
| Pipeline/Asset | Owner/Admin scope and same-pipeline/segment validation. | **MISSING FIELD — APPROVAL NEEDED**: accepted scope/permission policy, historical location/KP units and consequence context. |
| ILI | Native user-scoped IliAnomaly and IliAssessmentResult readers. | **MISSING FIELD — APPROVAL NEEDED**: exact historical source version, freshness, navigation and complete derived-input contract. |
| CP | CpTestPoint, CpMonitoringSurvey and CpReadingHistory projections. | **MISSING FIELD — APPROVAL NEEDED**: native record ACL parity, version/freshness and exact-ID completeness; the reader receives pipelineId without a user argument and is windowed. |
| SCADA | User-scoped ScadaIndicator/ScadaEvent projections. | **MISSING FIELD — APPROVAL NEEDED**: exact version/freshness/navigation; capped/windowed absence cannot prove deletion. Raw historian remains in SCADA. |
| Documents | getReadableDocument access and supplied-version lookup. | **MISSING FIELD — APPROVAL NEEDED**: required historical version identity and authorized navigation/binary integration; unversioned links do not prove historical evidence. |
| Defect/ECDA/Corrosion/GIS | Ownership/reference expectations documented; complete Risk adapters absent. | **MISSING FIELD — APPROVAL NEEDED**: canonical native readers, versions, permissions, derived fields/units and failure contracts. |
| Central Actions | Optional gateway validates exact deduplicated Action_ID responses. | **MISSING FIELD — APPROVAL NEEDED**: actual provider/read/access contract. No default provider is wired. |
| Reports & Analytics | Existing /report navigation and null official-report DTO fields. | **MISSING FIELD — APPROVAL NEEDED**: template/run/schedule/population/basis contracts and Report_Run_ID → Document_ID integration. Legacy corrosion reports cannot substitute. |
| Integration Hub | Scoped native connector metadata is projected. | **MISSING FIELD — APPROVAL NEEDED**: logical source mappings, synchronization and health evidence. A connection test is not Last Sync or proof of operational integration. |

## Safe local verification and preservation

Authentication and the router-wide non-GET/HEAD/OPTIONS HTTP 423 lock remain in `backend/src/routes/riskAssessments.ts:19`. `backend/src/lib/access.ts:3` implements owner/Admin scope. No governed workflow was enabled or approval status altered.

Backend and frontend TypeScript checks both PASS (exit code 0), using `node node_modules/typescript/bin/tsc --noEmit --incremental false`, DATABASE_URL cleared and NODE_ENV=test. Initial sandbox attempts could not resolve the local path (EPERM); checks were retried through the approved execution mechanism. Typechecks do not establish operational approval or live integration readiness. No synthetic records were created or inserted, and no runtime/source/database reads were executed.

Preservation PASS: before/after SHA-256 manifests match for backend/frontend source, frontend verification scripts, Prisma schema/migrations, both package manifests/lockfiles, the readiness audit and the existing decision checklist. This evidence report is the only intended new artifact; application files and earlier reports were not edited.

The source Prisma schema remains review-only. No Risk models occur in the inspected generated client and no Risk CREATE TABLE statements were found in repository migrations. Exact remote tables, constraints and approval records remain UNVERIFIED. No Neon access, migration, seed, generation or production operation was attempted.

## Next steps

1. Retain the frozen architectural requirements; attach approved operational values/authority references to the missing decisions above. Unanswered fields retain **MISSING FIELD — APPROVAL NEEDED**.
2. Continue local read-only contract inspection and offline verification; preserve unavailable states and locked workflows. No approved structure change is required for this evidence review.
3. After prerequisite decisions exist, prepare a concrete implementation proposal for approval, including integrity constraints, native access/version contracts and acceptance checks. Database/client deployment and exact-target verification remain separately authorized later steps.

This report adds evidence to the existing readiness audit and decision checklist; it does not replace their completed work or claim operational acceptance.
