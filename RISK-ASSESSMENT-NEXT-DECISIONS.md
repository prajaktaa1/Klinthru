# Risk Assessment continuation: decisions before implementation

Prepared: 20 October 2026. Status: DRAFT FOR OWNER REVIEW; no decisions approved by this document.

## Verified restart point

Resume after `FINAL-RISK-ASSESSMENT-READINESS.md`, at steps 1–3 of its dependency-ordered plan. Ten-tab local read coverage is PARTIAL; operational deployment and governed workflows remain BLOCKED. Previous offline test results are historical evidence, not newly executed checks.

Reviewed the readiness audit, IMG-05/06 reports, IMG-07–10 reports, `tmp/risk-remaining-review/TEN-TAB-AUDIT.md` and its final preservation result. Targeted current-file inspection confirms thirteen Risk model declarations in the source Prisma schema, none in the local generated-client schema, and no matching Risk CREATE TABLE migration in the repository. This does not establish remote database state. The router retains authentication and its HTTP 423 mutation lock.

This continuation prepares decisions only. It changes no application structure, route, UI, schema, database or completed report, and creates no operational records. No tests, server, database query, Prisma generation, migration, seed or deployment were run.

## Decision checklist

Every row is PENDING. Owners must provide approved values/contracts and a dated authority reference; screenshot examples and existing implementation assumptions cannot supply approval.

| ID / readiness blockers | Decision required | Required owner evidence |
|---|---|---|
| D01 / METH-01 | Supported qualitative/quantitative methods; exact methodology/matrix/rule identities; all 25 classifications; scoring applicability, PoF/CoF units/bands and consequence dimensions. | Engineering-approved versioned method contract, including boundary/applicability rules and explicitly unresolved fields. |
| D02 / METH-02 | Risk_ID allocation; scenario normalization/correlation, KP units/tolerance, duplicate search and separate-scenario exceptions. | Governance-approved identity rules, collision/idempotency requirements and same-scenario examples supplied by the owner. |
| D03 / METH-02, API-02 | Revision JSON contracts, stable likelihood/consequence/control identities and Risk Indicator ownership/projection. | Explicit design decision on embedded records versus separate models; no table change inferred from DOCX terminology. |
| D04 / METH-02, SRC-01 | Frozen evidence identity/version/capture time, canonicalization/hash verification, missing/stale input policy and source-link version/retirement lifecycle. | Approved snapshot contract preserving historical evidence and allowing later source versions without overwriting old links. |
| D05 / PERM-01 | Read/action/object/field scopes; catalog visibility; confidential notes/evidence; tenant/asset/delegated access and native source permission parity. | Security-approved role/action/object matrix. Existing pipeline ownership/Admin behavior must be explicitly accepted or replaced through approved scope. |
| D06 / PERM-01, API-01 | Allowed lifecycle transitions, reviewer/approver/acceptance roles, self-approval, delegation and separation of duties. | Business/security-approved transition and authority matrix, including rejection/reassessment and immutable approval requirements. |
| D07 / SRC-01 | Each source's native type/ID, exact-version reader, access checks, freshness, missing/deleted/outage behavior, units and navigation contract. | Source-owner contract for Pipeline/Asset, Defect, ILI, ECDA, Corrosion, CP, SCADA, Documents and GIS/consequence context. Unavailable sources stay explicitly unresolved. |

## Owner response format

For each decision provide: decision ID; approved contract or file reference; version/effective date; approving owner and authority reference; unresolved questions; affected implementation scope. Acknowledging this checklist alone supplies no methodology, permission policy or deployment authorization.

Source contracts should name the authoritative module and reader, supported native record types, stable ID/version semantics, authorization behavior, response fields/units, historical access, freshness evidence and expected failure behavior. Do not copy engineering records into a replacement Risk source store.

## Review sequence after decisions arrive

1. Map supplied approvals to D01–D07 and the readiness blocker IDs. Keep unanswered items pending.
2. Prepare a concrete change proposal with affected files/contracts and acceptance checks. Obtain approval before changes to structure, routes, UI or database, as required by the user.
3. Only after the prerequisite decisions and separately authorized scope, prepare the step-4 database/client integrity package. Exact-target verification and deployment remain separate later steps.
4. Preserve three independent result bases, approved historical revisions and original module ownership. Central Action owns execution; Reports & Analytics owns Report_Run_ID; Document Management owns Document_ID/binaries; Integration Hub owns technical configuration.

## Deferred findings retained

API cache consistency, stale unknown-GET text, population pagination, register fields/activity ordering, report request labels, driver/history calculations and disabled workflows remain recorded in the readiness audit. No fix or workflow activation is implied by this continuation. ALARP, review/KPI, driver/history and reporting policy decisions remain necessary at their later dependency gates.

Next required input: approved decisions/contracts for D01–D07, or the locations of existing authoritative approval records. Until supplied and reviewed, the implementation gate remains blocked.
