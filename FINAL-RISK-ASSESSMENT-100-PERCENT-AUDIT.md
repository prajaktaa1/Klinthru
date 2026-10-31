# Final Risk Assessment comprehensive audit

Audit date: 20 October 2026 (Asia/Calcutta). **Verdict: NOT READY.**

All ten tabs are mounted and their existing isolated checks pass. Operational readiness is BLOCKED: no approved operational methodology/population was verified; the local generated Risk client is missing; governed writers, complete native source contracts, Central Actions and official reporting are incomplete. A newly reproduced populated-Overview mobile overflow also remains unresolved. This is a comprehensive local audit, **not a certification that 100% of runtime behavior or screenshot values has been verified**.

Only this report is added to the workspace. No application code, routes, UI, schema, migrations, dependencies, seeds or earlier reports were edited. No Neon access, database writes, Prisma generation/validation/migration, application deployment or production operation occurred. Existing synthetic fixtures were used only in isolated tests/static rendering, never inserted into storage or adopted as operational data.

## 1. Evidence, status definitions and limits

| Status | Meaning in this report |
|---|---|
| PASS | Inspected implementation or specifically executed offline check supports the item. Does not certify live data, deployment or engineering approval. |
| PARTIAL | A UI/read contract exists but its complete requirement, integration or verification is missing. |
| BLOCKED | A known dependency prevents operation. Intentional disabled controls are recorded here, not described as working workflows. |
| UNVERIFIED | Evidence cannot establish the claim within the authorized local audit. |
| MISSING FIELD — APPROVAL NEEDED | Required engineering, security, source or service contract/value has no verified approval evidence. |

The field inventories below identify each visible field or explicitly enumerated group sharing one binding/status. Every screenshot record ID/name/date, numerical KPI, plotted value, percentage, probability band, cost, color and classification is **UNVERIFIED as operational data**. Unlabelled chart points cannot be recovered reliably as exact numbers from raster images; exact point-by-point numerical equivalence is UNVERIFIED. No screenshot number is an approved default.

### References inspected

- `../All-doc/new/risk assesement.docx`: requirements and tables, including §§3–28, 29–51 and the closing ownership/freeze statements. These establish architecture and safeguards; examples, proposed statuses and conditional dictionaries do not establish operational approval.
- All ten images in `../All-doc/new/risk assesment/`, visually inspected for this audit. Filename mapping below. `Pipeline Risk Assessment Dashboard.png` is not substituted for IMG-01–10.
- `FINAL-RISK-ASSESSMENT-READINESS.md`, `RISK-ASSESSMENT-APPROVAL-EVIDENCE.md`, `RISK-ASSESSMENT-NEXT-DECISIONS.md`.
- `artifacts/risk-assessment-foundation-review.md`, `artifacts/risk-img01-completion-review.md`, `artifacts/risk-img02-review.md`, `artifacts/risk-img03-review.md`, `artifacts/risk-img04-review.md`; associated prior preservation evidence.
- `tmp/risk-img05-review/REPORT.md`, `tmp/risk-img06-review/REPORT.md`, `tmp/risk-remaining-review/REPORT-IMG07.md` through `REPORT-IMG10.md`, extractions for IMG-08–10 and `TEN-TAB-AUDIT.md`.
- Current frontend components/types/API client, backend router/repositories/validators/source resolvers, Prisma schema, generated-client schema and repository migrations.

Earlier implementation reports describe their own stage and may say later tabs are pending. Current mounting/source and fresh checks take precedence. Prior browser PASS claims do not override the new mobile overflow observed with current theme CSS.

| Reference | Exact image filename | Tab |
|---|---|---|
| IMG-01 | ChatGPT Image Oct 7, 2026, 02_55_49 AM-1.png | Overview |
| IMG-02 | ChatGPT Image Oct 7, 2026, 02_55_52 AM-2.png | Mitigation & ALARP |
| IMG-03 | ChatGPT Image Oct 7, 2026, 02_55_55 AM-3.png | Related Data |
| IMG-04 | ChatGPT Image Oct 7, 2026, 02_55_58 AM-4.png | Risk Assessment |
| IMG-05 | ChatGPT Image Oct 7, 2026, 02_56_00 AM-5.png | Risk Matrix |
| IMG-06 | ChatGPT Image Oct 7, 2026, 02_56_03 AM-6.png | Configuration |
| IMG-07 | ChatGPT Image Oct 7, 2026, 02_56_06 AM-7.png | Risk Drivers |
| IMG-08 | ChatGPT Image Oct 7, 2026, 02_56_09 AM-8.png | Risk Register |
| IMG-09 | ChatGPT Image Oct 7, 2026, 02_56_12 AM-9.png | Trends & Historical |
| IMG-10 | ChatGPT Image Oct 7, 2026, 02_56_14 AM-10.png | Reports |

## 2. Ten-tab coverage matrix

The preserved order is Overview → Risk Register → Risk Assessment → Risk Matrix → Risk Drivers → Mitigation & ALARP → Trends & Historical → Reports → Related Data → Configuration. Mounting/order: PASS.

All paths below are authenticated GETs under `/api/risk-assessments`. “Binding PASS” means local route/reader wiring and isolated checks, not a successful real database read.

| Tab | Reference | Coverage / local binding | Operational result and principal gap |
|---|---|---|---|
| Overview | 01 | PARTIAL presentation; PASS counts/read binding | BLOCKED data/client/method. GIS, segment grouping, targets and deltas missing; populated narrow layout has overflow. |
| Risk Register | 08 | PARTIAL; PASS official population/filter/read binding | BLOCKED data/client. Defect integration, saved views/columns/bulk/edit and some DOCX register fields missing. |
| Risk Assessment | 04 | PARTIAL; PASS exact revision/three-result read binding | BLOCKED authoring/calculation/approval. Engineering/notes/source contracts incomplete. |
| Risk Matrix | 05 | PARTIAL; PASS all-three-basis population reconciliation | BLOCKED approved operational method/client. Criteria/palette/history/provenance/export missing. |
| Risk Drivers | 07 | PARTIAL structure and official context | BLOCKED analytics: `drivers:null`; no attribution/ranking/trend engine. |
| Mitigation & ALARP | 02 | PARTIAL; PASS saved treatment/baseline binding | BLOCKED native Action gateway, aggregate cost/reduction/ALARP and verified outcomes. |
| Trends & Historical | 09 | PARTIAL; PASS exact retained revision inspection | BLOCKED historical aggregates/comparisons/review series; no invented history. |
| Reports | 10 | PARTIAL structure/context | BLOCKED official template/run/document/schedule/export integration. |
| Related Data | 03 | PARTIAL; PASS link/snapshot/version binding checks | BLOCKED complete native resolution/access/version/freshness/navigation. |
| Configuration | 06 | PARTIAL; PASS saved metadata projection | BLOCKED policy administration and complete method/rules. Overall verification remains incomplete. |

All live official Risk record values, live source authorization and real database constraints are UNVERIFIED. With the currently inspected local generated client, Risk readers cannot provide operational Risk data.

## 3. Frontend → API → repository → storage/source chains

Common frontend entry: `frontend/src/app/risk-assessment/page.tsx` → `risk-assessment-workspace.tsx` → `risk-assessment-official-workspace.tsx`. The active path does not import the Risk demo fixture/preview. Existing corrosion history is exposed separately through `RiskAssessmentRealView` and retains its own meaning.

Common API transport: `frontend/src/lib/apiClient.ts` `request()` attaches a stored bearer token, uses `cache: "no-store"`, handles HTTP failures/401 and has a timeout. `backend/src/app.ts:57` mounts `riskAssessmentsRouter`; `backend/src/routes/riskAssessments.ts:19` applies `requireAuth` before handlers. Auth verifies the token and reloads the user. All non-GET/HEAD/OPTIONS requests return HTTP 423 after authentication. Local authentication/query/mutation checks: PASS. Real sessions/permissions: UNVERIFIED.

| Chain | Frontend component / API helper | GET path | Backend reader | Prisma/source ownership |
|---|---|---|---|---|
| O | `risk-assessment-overview.tsx`; official workspace `fetchOfficialRiskOverview` | `/overview` | `riskAssessmentRepository.ts` → `riskAssessmentRules.ts` | Risk, current RiskAssessmentRevision, RiskMethodologyVersion, RiskMatrixVersion, RiskReview; Pipeline/Asset context |
| R | `risk-register-workspace.tsx`; `fetchRemainingRiskRead`, `fetchAssessmentDetail` | `/register`, `/assessment-details` | `riskRegisterRepository.ts` → matrix reader; detail reader | O population plus Risk.owner→User, Segment, scope snapshot and exact-revision reviews |
| D | `risk-assessment-detail-workspace.tsx`; `fetchAssessmentDetailOptions/Detail` | `/assessment-details/options`, `/assessment-details` | `riskAssessmentDetailRepository.ts` | Risk, RiskAssessment, RiskAssessmentRevision, method/matrix, RiskSourceLink, RiskReview, RiskApproval, RiskEvent; optional treatment/native source readers |
| M | `risk-matrix-workspace.tsx`; `fetchRiskMatrix` | `/matrix` | `riskMatrixRepository.ts` → official overview builder | Same authorized official rows and exact method/matrix; no independent matrix population |
| G | `risk-drivers-workspace.tsx`; `fetchRemainingRiskRead` | `/drivers` | `riskRemainingRepository.ts` → M context | Official context only; no driver calculation/model bound |
| T | `risk-treatment-workspace.tsx`; treatment list/summary/detail/reference helpers | `/treatments`, `/treatments/summary`, `/treatments/:treatmentId`, `/treatments/:treatmentId/action-references` | `riskTreatmentRepository.ts`, `riskTreatmentRules.ts`, `riskTreatmentActionReferences.ts` | RiskTreatment, RiskTreatmentRevision, RiskAlarpAssessment, RiskTreatmentActionLink, baseline RiskAssessmentRevision, RiskEvent/User; native CentralActionGateway absent |
| H | `risk-history-workspace.tsx`; `fetchRemainingRiskRead` | `/history` | `riskHistoryRepository.ts` → D and M readers | Retained exact revisions/reviews/approvals/events; no historical series store/engine |
| P | `risk-reports-workspace.tsx`; `fetchRemainingRiskRead` | `/reporting` | `riskReportingRepository.ts` → M context | No official template/run/document integration; `/report` is navigation only |
| L | `risk-related-workspace.tsx`; `fetchRiskRelatedOptions/Data` | `/related-data/options`, `/related-data` | `riskRelatedRepository.ts`, `riskRelatedSources.ts` | RiskSourceLink + revision.sourceSnapshot; native ILI/CP/SCADA/ManagedDocument readers; other adapters absent |
| C | `risk-configuration-workspace.tsx`; `fetchRiskConfiguration` | `/configuration` | `riskConfigurationRepository.ts` | RiskMethodologyVersion, RiskMatrixVersion; scoped RiskReview and IntegrationConnector metadata |
| Shared catalog | official workspace `fetchOfficialRiskMethodologies` | `/methodologies` | `riskAssessmentRepository.methodologies()` | Filters method/matrix Approved; global authenticated catalog visibility awaits approval |

Storage names below refer to declared Prisma fields, not verified deployed columns. The thirteen Risk models are review-only (`backend/prisma/schema.prisma:1455` onward); none exists in the inspected local generated schema and no repository Risk CREATE TABLE migration was found. These are known broken runtime prerequisites, not evidence that remote tables are absent.

## 4. Shared screenshot/header and data provenance inventory

| Visible item | Current behavior/binding | Status / required correction |
|---|---|---|
| Risk Assessment title; ten labels/order/selection | Official workspace/riskTabs, local state and `riskTab` URL | PASS local mounting; browser history/hydration UNVERIFIED. |
| Screenshot shield, subtitle, breadcrumb and header decorations | Shared application theme/header differs; earlier header cleanup retained | PARTIAL screenshot parity; preserve approved cleanup, do not restore screenshot text automatically. |
| Screenshot global search, notification count, avatar/name/job title/sidebar/version | Shared shell, outside Risk engineering DTO | UNVERIFIED functional/parity audit of entire shell; screenshot identities/counts are examples. Shared source preserved. |
| Export; + New Risk Assessment | Visible disabled buttons | BLOCKED intentionally: official export/create contracts and integrity gates. |
| Pipeline selector; methodology version; requested-version notice | Existing pipeline master selector and authenticated method catalog | PASS local binding; actual choices/permissions UNVERIFIED. No default method inserted. |
| Total Risks | Count distinct active official Risk.riskId with valid currentApprovedRevision | PASS offline O/M; live value UNVERIFIED. Screenshot 324 is not data. |
| High/Medium/Low Risk | Current result.level grouped by method.rules highLevels/mediumLevels/lowLevels | PASS offline; approved groups/records MISSING FIELD — APPROVAL NEEDED. Screenshot 38/96/190 not adopted. |
| Overdue Reviews | Earliest open current-revision RiskReview.dueDate before policy-calendar today | PASS offline boundaries; approved policy/actual dates UNVERIFIED. Screenshot 28 and >30-day threshold not defaults. |
| Percentages, arrows, prior-period deltas, urgency | Unavailable disclosures | BLOCKED approved denominator/rounding/baseline/calendar/escalation. |
| Loading, API error, schema unavailable, no method, verified empty | Explicit states; no corrosion/demo/zero fallback | PASS covered isolated cases; full React effect/race behavior UNVERIFIED. |
| Times, scope/status and read-as-of | Saved dates or request time, separately labelled | PARTIAL: read-as-of is not source freshness or last update; historic risk may include live pipeline/root status context. |

## 5. Field-by-field tab inventories

For every row: live values remain UNVERIFIED unless explicitly stated otherwise. PASS in these tables means the named local projection/interaction, not operational completion. A missing binding is never assumed to mean zero records.

### 5.1 Overview — IMG-01, chain O

| Reference fields/panels/controls | Actual binding and verification | Status / gap |
|---|---|---|
| Risk Location Map panel | GIS unavailable frame plus optional coordinate list | PARTIAL; no satellite imagery, route, terminals, marker placement, route legend or georeferenced km scale. |
| All Pipelines / All Risk Levels map filters | O.latest pipeline identities and saved matrix levels filter O.locationRecords | PASS callback/source inspection. Coordinate list is not a GIS map. |
| Latitude / Longitude / Risk_ID / Asset | Risk.asset.name/latitude/longitude for eligible official rows | PARTIAL; live master context, geometry/version/coordinate validity contract unverified. |
| Expand / + / − map controls | Disabled | BLOCKED GIS contract. |
| Risk Matrix (Current); likelihood/consequence axes; 25 cells | Approved matrix.cells coordinates/labels plus counts from currentResult | PASS 25-cell count test; descriptive labels and approved colors not bound here. |
| Category donut / labels / counts / center Total Risks | revision.category distribution; reconciles sum against summary.total | PASS isolated; percentages unavailable; category vs threat dictionary remains a policy distinction. |
| Risk by Pipeline / Segment; bar labels/ticks/counts | Pipeline ID-grouped distribution, master name/code | PARTIAL: actual Segment grouping absent despite panel title. |
| Risk by Source; horizontal bars/axis/labels | revision.primarySourceCategory distribution | PASS local counts; primary-source policy acceptance missing. |
| Risk Status donut / legend / counts | Risk.status distribution | PASS local counts; approved active statuses/percentage policy missing. |
| Latest table ID / Title / Pipeline / Category / Risk Level / Status | Risk.riskId, revision.scopeScenarioSnapshot.title, Pipeline name/code, revision.category, currentResult.level, Risk.status | PASS projection; ordered by saved assessment date. |
| Latest table Segment/KP / Target Date / Actions | Explicit missing fields; disabled row actions | BLOCKED target meaning, segment projection and workflow. |
| Separate three results in latest row disclosure | inherentResult/currentResult/residualResult | PASS isolated; no basis substitution. |
| Latest View All / Back | Full scoped list via `riskOverviewView=risks` in existing route | PASS callback/URL; not a new route. |
| Quick New / Add to Register / Run Risk Matrix / Import | Disabled | BLOCKED governed creation/calculation/import. |
| Quick View Reports | Selects Reports tab | PASS local handler; does not generate a report. |
| Upcoming ID / Title / Due Date / Days Left | Official current review selection; excludes negative days; stored DATE formatted UTC | PASS offline actual-date/boundary handling. Urgency badges unavailable. |
| Upcoming View All / Back | Full list via `riskOverviewView=reviews` | PASS local handler; live navigation UNVERIFIED. |
| Panel menus | Disabled | BLOCKED unsupported actions. |

New defect: populated Latest / Key Risks panel escapes the narrow viewport; see §10.

### 5.2 Risk Register — IMG-08, chain R

| Reference fields/panels/controls | Actual binding and verification | Status / gap |
|---|---|---|
| Register title / explanatory text | Static presentation matching intent | PASS presence; shared theme differs from screenshot. |
| Saved View / All Risks (Default) / Save View / Column Settings | Static label; disabled controls | BLOCKED persistence/permission contract; no saved success. |
| Search ID/title/pipeline/source | Local `filterRegisterRows` over authorized M rows | PASS search/filter test; not a server search across uncaptured records. |
| Pipeline / Segment / Category / Status dropdowns | Distinct values from returned rows; multi-status chips and Clear All | PASS supported local filtering; Segment includes frozen location or verified native Segment label. |
| More Filters / Bulk Actions / checkboxes / row menu / Edit | Disabled | BLOCKED operational permissions/workflows. |
| Added Risk basis selector | Independent inherent/current/residual saved object | PASS; useful DOCX correction, not screenshot default. |
| Risk ID / Pipeline / Segment-KP / Source / Category | Risk.riskId; Pipeline; snapshot.location or Segment.name/segmentId; primarySourceCategory; revision.category | PASS available projections; KP units/location meaning unresolved. |
| Likelihood / Consequence / Risk Score / Risk Level | Selected basis likelihood/consequence/score/level | PASS saved display and product/matrix validation. No calculation engine. |
| Status / Owner / Next Review | Risk.status; related User.name; earliest open exact-revision RiskReview.dueDate | PASS scoped metadata checks; owner is live context. Dates displayed ISO here rather than screenshot formatting. |
| Linked Defect ID | Always null/unavailable in register DTO and UI | BLOCKED Defect native identity/access/version integration. |
| Rows per page 10/25/50; Previous/Next; Go to; showing range | Client pagination over filtered rows | PASS page-boundary/selection tests. Screenshot numbered pagination replaced by page indicator. |
| Risk Status Summary donut / counts | Same filtered rows as table | PASS reconciliation; percentages unavailable; View All clears filters rather than opening a full page. |
| Risk Details ID/title/score/level/status/owner/review/revision | Selected row; no cross-row fallback | PASS local selection. Right-side inline panel, not verified drawer workflow. |
| Recent Activity actor/date/event / View All / Show Less | D.history for exact Risk/revision/method/matrix; ascending saved events | PARTIAL: initial slice shows oldest four, not necessarily most recent. Expands inline. |
| DOCX §16 scenario, assessment date, mitigation state, approval state, three results together | Some exist in DTO/detail but not all visible simultaneously | PARTIAL register completeness; requires approved UI scope. |

### 5.3 Risk Assessment — IMG-04, chain D

| Reference fields/panels/controls | Actual binding and verification | Status / gap |
|---|---|---|
| Added Official Risk_ID / exact revision / saved review selectors | Scoped Risk/revision options and explicitly selected review | PASS exact selection tests; selectors capped at 200 Risks with warning. |
| Details title/subtitle; saved status; Save Draft / Submit | Saved revision.approvalStatus; status/read fields locked | PASS display; BLOCKED writers/approval workflow. No draft chosen automatically. |
| 1: Risk Title / Description / Risk ID / Assessment Date | scopeScenarioSnapshot.title/scenario, Risk.riskId, revision.assessmentDate | PASS projection; missing JSON fields remain unavailable. |
| 1: Review Due / Risk Owner / current root owner | Selected RiskReview.dueDate; frozen ownerId; live related User.name separately | PARTIAL; review purpose policy/owner directory unresolved; saved ID is not inferred name. |
| 2: Asset Type / Asset / Segment-Location / Linked Defect | Frozen assetType/location; live Pipeline name/code; optional snapshot-linked source | PARTIAL: Asset label identifies pipeline scope, not full native Asset selection. Defect reader absent. |
| 3: Threat Category / Specific Threat / Initiating Event | revision.category; frozen threatType/initiatingEvent | PARTIAL: category/threat distinction and dictionaries need approval. |
| 4: Likelihood level / Justification | Selected saved basis coordinate; likelihoodAssessment.justification | PASS separated saved projections. Level buttons disabled. |
| 5: Consequence level / Justification | Selected basis coordinate; consequenceAssessment.justification | PASS. Corrects screenshot's erroneous repeated Likelihood Justification label. |
| Method / Confidence / narrative basis / PoF-CoF value-unit disclosures | Minimal saved narrative JSON projection | PARTIAL: no quantitative algorithm, approved units/bands or dimension contract; missing unit explicitly shown. |
| 6: Control-Barrier / Type / Effectiveness | revision.controls name/type/effectiveness | PASS valid projections; optional control ID/owner/evidence in tooltip. Evidence meaning/identity approval incomplete. |
| + Add Control | Disabled | BLOCKED governed edit/reference workflow. |
| 7: Residual Likelihood / Consequence / Rating | residualResult, independently validated | PASS saved result. Does not prove treatment effectiveness. |
| 8: Key Assumptions / Limitations | revision.assumptions/limitations strings or arrays | PASS projection; no generated narrative. |
| 9: ID / Action-Recommendation / Type / Owner / Target Date / Status | Exact approved treatment baseline Action_IDs → CentralActionGateway | PARTIAL/BLOCKED provider; Type unavailable because gateway DTO lacks it. |
| + Add Action | Disabled | BLOCKED Central Action creation/link permissions. |
| 10: Internal Notes / Reviewer Notes | Deliberately null; decision justifications remain history | BLOCKED approved note fields/visibility/versioning. |
| Risk Summary rating/coordinates / Inherent / Current / Residual | Independent saved results; added basis selector | PASS local separation; screenshot omitted Current, implementation retains it. |
| Mini-matrix 25 cells / axis labels / marker basis | Saved matrix cells/dictionaries and independently selected saved result | PASS marker/coordinates; hardcoded familiar-level display colors are not approved versioned palette evidence. |
| Edit | Disabled | BLOCKED. |
| Approval Status / Current Reviewer / Due Date / Selected Purpose | Saved revision and explicitly selected review | PARTIAL; signatures/authority unverified. Screenshot's two different review dates not silently merged. |
| Approval Trail Created/Submitted/Under Review/Approved/Closed | Recorded events/decisions; missing stages unavailable | PARTIAL; no inferred checkmarks or policy approval. |
| View All approval history / Back | Full read-only history table: Kind, Event-Decision, Actor, UTC Date, Justification, Review ID | PASS local handlers and subject checks. |
| Source/version/hash disclosure | Frozen sourceSnapshot references bound to RiskSourceLink; live metadata separate | PASS structural checks; cryptographic integrity/native historical content not established. |

### 5.4 Risk Matrix — IMG-05, chain M

| Reference fields/panels/controls | Actual binding and verification | Status / gap |
|---|---|---|
| Pipeline | Shared selected scope displayed read-only | PASS binding; change scope above tab. |
| Matrix Type / comparison toggles | Inherent, Current, Residual independently selectable | PASS; no screenshot Current-as-Residual alias. |
| Date Range / Threat Category | Disabled; current approved revisions only | BLOCKED historical population and threat dictionary. |
| Added Risk Category / Apply / Reset | Approved dictionary category; applied read scope | PASS supported callbacks/reconciliation; resets basis/cell/page. |
| Two 5×5 matrices; axes; cell totals | Same authorized rows; distributions[basis], exact saved classifications | PASS 50 displayed cells and per-basis population sums. Cells are counts, not scores. |
| Matrix name/type/basis/scales | Matrix metadata/dictionaries; explicit 5×5 supported contract | PASS labels/projection; actual approved method unverified. |
| Added method/matrix IDs/versions and likelihood/consequence rule versions | Exact metadata DTO | PASS local binding; no approved record verified. |
| Last Updated / Updated By | Null/unavailable | BLOCKED update provenance contract. |
| Configure Matrix / menus | Disabled | BLOCKED governed configuration. |
| Risk Matrix Legend | Saved unique classifications, neutral swatches | PARTIAL; screenshot frequency thresholds not adopted as severity. |
| Scoring Criteria Level/Description, two tables | Saved axis label/level; description unavailable | PARTIAL; approved descriptions, PoF/CoF criteria/units missing. |
| Selected Cell Likelihood/Consequence/Total/Level | Exact selected basis/cell | PASS same-population consistency. |
| Selected Description | Unavailable | MISSING FIELD — APPROVAL NEEDED. |
| Category breakdown bars/counts | Same selected rows; bar widths are count proportions | PASS local reconciliation; no standalone driver attribution implied. |
| Selected table ID/title/pipeline/category/level/status | Same selected cell rows | PASS local projection; Segment and Last Updated unavailable. |
| View All / View All Risks / paging | Expands same selected rows inline, ten-row paging | PASS callbacks; PARTIAL DOCX full-page navigation semantics. |
| Create Mitigation Plan / Export List | Disabled | BLOCKED governed treatment/export contract. |

### 5.5 Risk Drivers — IMG-07, chain G

| Reference fields/panels/controls | Actual binding and verification | Status / gap |
|---|---|---|
| Risk Drivers by Category donut/labels/counts/percentages | Unavailable chart frame; `drivers:null` | BLOCKED canonical attribution/population. Header KPIs are official Risk context only. |
| Contributing Factors bars / category labels / Number of Risks | Unavailable frame | BLOCKED evidence→factor classification and deduplication. |
| Barrier Effectiveness groups/stack values/% axis | Static legend including Unknown; unavailable frame | BLOCKED group/population/effectiveness rules. |
| Operating Condition Influence bars | Unavailable frame | BLOCKED native indicator/window/influence contract. |
| Corrosion Contribution / Third Party Activity / Geohazard Exposure | Three unavailable frames | BLOCKED source IDs, categories and distinct Risk attribution. |
| Top Driver Trends dates/series/counts | Unavailable frame and static request legends | BLOCKED comparable versioned historical attribution/buckets. |
| Ranked # / Driver / Category / Factors / # Risks / % Total / Avg Level / Trend | Empty eight-column table with unavailable explanation | BLOCKED ranking, ties, averages, overlap, denominator and trend policy. |
| Selected Driver dropdown / name / primary-driver narrative / High Impact | Disabled/unavailable | BLOCKED approved driver identity/impact/evidence. |
| Overview / Contributing Factors / Affected Assets / Mitigations subtabs | Local insight selection, each unavailable disclosure | PASS callback; content remains BLOCKED. |
| Associated Risks / Average Level / vs Last Assessment / Key Mitigations cards | Unavailable | BLOCKED attribution and Central Action ownership/status contracts. |
| Panel menus | Disabled | BLOCKED. |

Source finding counts are not relabelled Driver counts. No screenshot chart series/ranks/narrative is operational.

### 5.6 Mitigation & ALARP — IMG-02, chain T

| Reference fields/panels/controls | Actual binding and verification | Status / gap |
|---|---|---|
| Added residual comparison basis: proposed/approved/verified | Treatment revision basis selection; verified deliberately blocked | PASS distinction; verified outcome remains null. |
| Total Actions / Open / In Progress / Under Review / Overdue | Native gateway Action_IDs, deduplicated; complete population required | PARTIAL/BLOCKED default gateway missing; no copied screenshot 54/28/18/6/2. |
| Current→Residual aggregate / reduction % | summary.reduction null | BLOCKED comparable population, metric, unit, denominator/rounding. No arithmetic on ordinal labels. |
| Total Mitigation Cost / Risk Reduction / ALARP Outcome | summary.cost/reduction/alarp unavailable | BLOCKED approved cost/ALARP policies. Screenshot $2.4M/65%/green success not adopted. |
| Status / Risk Level / Pipeline / Search filters | Native action status/query and treatment baseline current risk/pipeline | PASS supported callbacks with fixtures; no operational actions without provider. |
| Additional filter icon / row menus | Disabled | BLOCKED contract. |
| ID / Mitigation Action / Status / Owner / Target Date | CentralActionGateway actionId/title/status/ownerName/dueDate | PASS mock projection and exact-ID response validation; native ownership unverified. |
| Risk Source / Control-Barrier / Risk Reduction | Linked treatment baseline title, treatmentType, expectedBenefit.label | PARTIAL; source label is scenario title; multiple treatment links can make single barrier/benefit unavailable. |
| Cost (USD) | Native action decimal string, displayed only for USD | PASS exact-money fixture; non-USD unavailable, no conversion invented. |
| Paging / page size / row mouse+keyboard selection | Returned action page; local callbacks | PASS covered checks; large complete aggregates >100 remain unavailable. |
| Selected Action ID/status/title / Close | Native action selection; closes local selection | PASS callbacks. |
| Added treatment/revision selector | Available treatment rows, exact treatment/revision detail | PASS local binding; not a treatment writer. |
| Selected Risk Source / Barrier / Estimated Cost / benefit / residual-after / Description | RiskTreatmentRevision and baseline DTO | PASS projection; estimated treatment cost is separate from action cost. |
| ALARP justification / outcome / criteria/version / evidence | RiskAlarpAssessment fields; evidence-presence indicator | PARTIAL: referenced evidence is not verified access/approval/tolerability. |
| Proposed / Approved Forecast / Verified / Inherent / Current provenance | Separate treatment/baseline fields; verified null | PASS distinct projections; no completion-based reduction. |
| Cost vs Risk Reduction chart; USD and % axes/legend | Production summary chart array empty | BLOCKED; renderer tested only with synthetic DTO. |
| Residual Risk Profile Before/After bars/counts | Production residualProfile empty | BLOCKED comparable outcome population. |
| Workflow Prepared/Reviewed/Approved/Implementation/Effectiveness | Creator and named saved events; unsupported stages unavailable | PARTIAL; no job-title/signature authority inferred. |
| View Workflow / Hide Workflow | Expands recorded metadata locally | PASS callback. Does not open/activate a governed approval workflow. |
| View Risk / task mutations | View Risk disabled; router mutations locked | BLOCKED approved navigation/workflows. |

### 5.7 Trends & Historical — IMG-09, chain H

| Reference fields/panels/controls | Actual binding and verification | Status / gap |
|---|---|---|
| Date Range / Compare With / Group By / Asset Scope / Risk Level / Apply | Disabled historical filters; pipeline scope above remains available | BLOCKED historical population/bucket/comparison policy. |
| Reset | Clears local saved Risk/revision/history selection | PASS callback; does not run aggregation. |
| Added Official Risk_ID / Exact Saved Revision / approval/date/method/matrix | D options/detail with exact pair and version checks | PASS isolated selection and stale-revision suppression; no latest draft substitution. |
| Inherent / Current / Residual saved results | Selected revision's three result JSONs | PASS distinct saved score/coordinates/level. |
| Total Risk Trend / High-Medium-Low / Previous Period line | Unavailable frame | BLOCKED as-of populations and comparable baselines. |
| Trend by Pipeline / Top 5 / Category / Source dropdowns and lines | Unavailable frames; filters disabled | BLOCKED grouping/ranking/history. |
| Review Cadence / Completed-Overdue / quarters | Unavailable frame | BLOCKED retained review state and calendar. |
| Monthly Risk Heat Map High/Medium/Low/Total and periods | Rows present; period/values unavailable | BLOCKED time buckets/counts; no interpolated monthly history. |
| Notable Changes & Events date/label/actor/description | Exact selected revision's saved events/decisions | PASS local retained history; not aggregate movement. |
| View All / Show Less | Expands timeline inline | PASS callback; PARTIAL DOCX full corresponding view. |
| Overdue Trend / date / Overdue Events | Unavailable frame | BLOCKED approved historical review series. |
| Historical Milestones Date/Event/Description | Same retained event fields | PASS projection; Impact and Risks Affected explicitly unavailable. |
| Panel menus | Disabled | BLOCKED. |

Current header KPIs are explicitly distinguished from historical metrics. No method update reclassifies old results.

### 5.8 Reports — IMG-10, chain P

| Reference fields/panels/controls | Actual binding and verification | Status / gap |
|---|---|---|
| Templates list: Summary, Detailed Register, Matrix, Mitigation-ALARP, Trend Analysis, Compliance, Custom | Seven static requested-type labels/descriptions, explicitly not saved templates | PASS presentation; BLOCKED template IDs/versions. DOCX §26 Risk Drivers request missing. |
| Search templates / All Categories / selected request | Local text/category/request callbacks | PASS tests; searches request labels only. |
| Generate per item / menus / + Generate Report | Disabled | BLOCKED official generation contract. |
| Eight category labels and selection | Static navigation request labels | PASS selection; real category records/counts unavailable. |
| Preview title / KLINTHRU / selected request | Presentation of requested type | PARTIAL; no generated document. |
| Report_Run_ID / Document_ID / Generated / Classification | All unavailable | BLOCKED official run/document service. Screenshot Confidential/date not inferred. |
| Preview KPIs and category bar values | No generated report dataset; unavailable chart frame | BLOCKED exact report population/result basis/snapshot; live header context is separate. |
| Export PDF / Export Excel / Schedule Delivery | Disabled | BLOCKED authorization and central service contract. |
| Scheduled ID/Name/Schedule/Recipients/Format/Status/Next Run/Actions | Empty eight-column table, DTO schedules:null | BLOCKED owner-managed schedules/timezones/recipients/status/toggle state. |
| + New Schedule | Disabled | BLOCKED. |
| Recent ID/Name/Generated By/Date/Format/Actions | Empty six-column table, DTO recent:null | BLOCKED official run history/downloads. |
| Recent View All / download / menus | No working run actions | BLOCKED; no binary or fake success. |
| Open Reports & Analytics | Existing `/report` link | PASS route existence/source inspection; no automatic Risk filter/run handoff established. |

Legacy Assessment-based Report records retain corrosion meaning and are not Report_Run_ID records.

### 5.9 Related Data — IMG-03, chain L

| Reference fields/panels/controls | Actual binding and verification | Status / gap |
|---|---|---|
| Added Official Risk_ID selector | Authorized current-approved Risk options | PASS local binding; cap 200 with warning. UI does not expose historical revision selector, though API supports explicit approved revision. |
| Summary/map/linked-record groups: Defects, ILI, ECDA, Corrosion, CP, SCADA, Documents, Actions | RiskSourceLink and selected revision.sourceSnapshot; native resolved groups | PARTIAL counts: unavailable when complete authorized resolution not established. |
| Center Risk ID / Pipeline / dashed relationships | Saved Risk identity plus master scope; category relationship lines | PASS structural map; lines do not prove individual source verification. |
| Module / Status / Search | Backend validated filters over snapshot-bound/native metadata | PASS isolated tests; incomplete sources cannot establish verified zero. |
| All Risk Levels relevance filter | Disabled | BLOCKED relevance/confidence/official-risk distinction. |
| Table ID / Title / Module / Linked To / Asset-Location | Native displayId/title/location; group/module; selected Risk_ID | PARTIAL source adapters; canonical fallback ID is a reference, not verified live source. |
| Table Risk Relevance | Unavailable | MISSING FIELD — APPROVAL NEEDED. |
| Table Status / Date | Native source status and explicitly named source date | PARTIAL; dates may mean inspection/calculation/reading/version date, not generic detection. UTC formatting explicit. |
| Table Actions / source View in... | Disabled; navigation:null | BLOCKED record-specific source navigation/access contract. |
| Source-version pagination and verified source-record total | Separate reference count vs deduplicated resolved-record count | PASS isolated distinction; record totals can remain null while reference page exists. |
| Traceability Asset / Location / Threat / Category / Current Level / Status | Saved scenario metadata/results and live root/pipeline context, labelled | PASS projection; actual asset/consequence/version context incomplete. |
| Selected source metadata: module/title/location/date/result/status/risk/relationship/update/source | Native resolver output plus link metadata | PARTIAL; actual native reads not executed here. |
| Canonical ID / Type / Linked Version / Version Binding / Freshness | Frozen identity, link version, native match; freshness always Unverified | PASS disclosure; no inference of freshness or historical equivalence. |
| Link ID / Linked By-At / Confidence / Captured / Hash / Retired-Reason | RiskSourceLink fields plus sourceSnapshot capture/hash | PASS structural projection; hash verification and version lifecycle missing. |
| Three bases / Revision / Methodology / Matrix provenance | Exact approved revision fields | PASS offline separation. |
| Selection / close / group clicks / row keyboard / paging | Local callbacks and supported queries | PASS covered isolated cases; full authenticated browser navigation UNVERIFIED. |

### 5.10 Configuration — IMG-06, chain C

| Reference fields/panels/controls | Actual binding and verification | Status / gap |
|---|---|---|
| Added methodology/matrix IDs/names/versions/approved timestamps/rule versions | RiskMethodologyVersion + exact RiskMatrixVersion | PASS validated metadata projection; no operational approved record verified. |
| Risk Matrices Setup 25 cells / Likelihood-Consequence axes | Saved matrix.cells classifications/dictionaries | PASS structural grid; numeric scores and approved palette unavailable. Not population counts. |
| Edit Matrix / Edit Rules | Disabled | BLOCKED governed configuration. |
| Scoring Rules Risk Level / Score Range / Label / Colour / Actions | Saved classification labels only; other fields unavailable | PARTIAL; no screenshot numeric bands/severity identifiers adopted. |
| Likelihood Level / Description / Annual Probability | Saved five-level label dictionary; probabilities unavailable | PARTIAL; probability units/boundaries/time basis missing. Manage disabled. |
| Consequence Level / Description / Guidance | Saved five-level dictionary; guidance unavailable | PARTIAL; dimensions/units/criteria missing. Manage disabled. |
| Threshold Type / Value / Action; High/Medium/Low/Overdue(days) | Type labels only; values/actions unavailable | BLOCKED approved predicates/precedence/actions; Edit disabled. |
| Approval Workflow Level / Approval Required / Approver Role | Saved level labels; authority fields unavailable | BLOCKED roles/transitions/separation; Configure disabled. |
| Notification Event / Recipients / Timing / Channels / Status / Actions | Unavailable row; no enabled/off state inferred | BLOCKED notification records/policy. Add/toggle/edit/delete disabled. |
| Review Intervals Category / Interval / Next Review | Unavailable policy row | BLOCKED interval/anchor/override policy; Edit disabled. |
| Added saved review disclosure: Risk ID / Review ID-Revision / Purpose / Due | Actual exact-current-revision open RiskReview projection | PASS bounded read; not an interval definition or official total. |
| Integration System / Purpose / Status / Last Sync | Scoped IntegrationConnector.name/native status; purpose/sync unavailable | PARTIAL. Native Ready is not invented Connected. Configure disabled. |
| Added connector ID/enabled/test timestamps; Open Integration Hub | Narrow owner/Admin metadata and `/integration-hub` link | PASS projection/link; test success is not sync or logical mapping. |
| Configuration Status / ten checklist items | Verification incomplete; matrix/dictionaries structurally checked only | PASS truthful status; BLOCKED complete operational validation. Screenshot green Valid Configuration not reproduced. |
| Recent Changes event/actor/date / View All | Unavailable; View All disabled | BLOCKED versioned config audit. Approval dates are not update events. |
| Added categories / ALARP / threat/barrier/residual/template disclosures | Validated category keys or explicit unavailable | PARTIAL; missing DOCX business definitions kept visible. |

## 6. Real operational data verification

| Claim | Result | Evidence / limit |
|---|---|---|
| A real approved methodology/matrix/PoF/CoF contract exists | UNVERIFIED; local evidence missing | DOCX examples/conditional labels and schema fields are not approval records. Test fixtures marked Approved are synthetic. |
| Real scoped Risk_IDs, counts, owners, reviews and source references | UNVERIFIED | No Neon or authenticated operational session permitted. No test number is reported as a real record. |
| Generated client can execute Risk delegates | BLOCKED locally | `backend/node_modules/.prisma/client/schema.prisma` has no Risk models; optional TypeScript declarations cannot create delegates/tables. |
| Thirteen Risk tables/constraints deployed | UNVERIFIED remotely; repository deployment package BLOCKED | Source definitions exist; no repository CREATE TABLE migrations for them. Remote state was not queried. |
| Risk_ID uniqueness / scenario correlation | PARTIAL | Proposed unique Risk.riskId and [pipelineId,correlationKey]; offline duplicate rejection. Allocation, normalization, KP tolerance, exception/race handling and deployed enforcement absent/unverified. |
| Source traceability | PARTIAL | Exact link/snapshot/type/ID/version structural checks; native resolution incomplete. No cryptographic hash recomputation established. |
| Approved method/matrix versions retained | PASS local read validation; deployment UNVERIFIED | Exact identities and classification matching; no historical recalculation. Approval provenance/signatures not verified. |
| Engineering calculations operational | BLOCKED | Product validator checks saved ordinal scores only; no approved quantitative PoF/CoF/consequence engine or enabled Run workflow. |
| Inherent / Current / Residual independently stored/read | PASS local | Three revision JSON fields, separate DTOs/selectors/count distributions. Treatment forecasts/verified outcome separately represented. |
| Approved history immutable | PARTIAL | Router lock and draft guard; no established DB trigger/privilege/append-only policy enforcement. Restrict foreign keys do not prevent JSON/status edits. |
| Action completion reduces official risk | PASS prohibition locally | No automatic reduction; verified treatment outcome null until governed evidence/reassessment. |
| Complete action/report ownership integration | BLOCKED | Gateway absent; report DTO stores no runs/documents/schedules. No replacement store created. |

Review-only Risk models: Risk, RiskSourceLink, RiskAssessment, RiskAssessmentRevision, RiskMethodologyVersion, RiskMatrixVersion, RiskReview, RiskApproval, RiskEvent, RiskTreatment, RiskTreatmentRevision, RiskAlarpAssessment, RiskTreatmentActionLink. JSON subrecord IDs and RiskIndicator projection still require explicit design approval; no new table is inferred from DOCX vocabulary.

## 7. Native-source permission, field and unit verification

Native readers were inspected, **not invoked against real data**.

| Owner / native model | Bound fields / reader | Authorization/version/unit result |
|---|---|---|
| Pipeline/Segment/Asset/User | Pipeline IDs/name/code/creator; Asset coordinates/name; Segment name/ID; User name | PARTIAL owner/Admin scope; exact historical master location and business-assigned scope unverified. |
| ILI: IliAnomaly / IliAssessmentResult | `ili/data.ts` user-scoped readers; featureId/type, kpKm/location, depthMm/depthPercent, dates; result method/status | PARTIAL native access path; explicit km/mm/% WT preserved. Version/navigation null; no Risk PoF derived from depth. |
| CP: CpTestPoint / CpMonitoringSurvey / CpReadingHistory | `cpMonitoring/data.ts:getCpMonitoringData(pipelineId)`; code/name/location/KP, survey status/date, reading type/date | PARTIAL. No user argument to this reader; parent Risk scope is not proof of native ACL parity. KP unit unresolved in display; zero-KP fallback defect below. |
| SCADA: ScadaIndicator / ScadaEvent | `getScadaOverview(pipelineId,user)`; IDs/name/description/status/measuredAt/occurredAt | PARTIAL user-scoped native path; capped/windowed, versions/navigation null; missing row is not deletion evidence. Raw historian untouched. |
| ManagedDocument / DocumentVersion | `getReadableDocument(documentId,user)` and requested version match | PARTIAL native access/version path; unversioned evidence not verified historic input. No enabled Risk binary/navigation integration. |
| Defect / ECDA / internal-external corrosion | Reference groups exist; complete native Risk resolvers absent | BLOCKED native ID/type/version/access/derived indicator contract. Existing CP/corrosion criteria cannot substitute official Risk methodology. |
| GIS / HSE / business-consequence datasets | No complete verified Risk adapter | BLOCKED geometry/receptor/HCA/population/cost/units/version/access. Critical missing consequence input cannot become zero. |
| Central Actions | Optional gateway exact-ID/schema validation; no local task copy | BLOCKED provider, access and freshness. Action_ID not a RiskTreatment ID. |
| Reports & Analytics / Documents | No official run/template/schedule/preview service bound | BLOCKED Report_Run_ID → Document_ID and recipient/download permissions. |
| Integration Hub | IntegrationConnector.id/name/status/enabled/test timestamps, scoped owner/Admin | PARTIAL narrow metadata; no secrets returned. Logical mapping, Last Sync and health unverified. |

Additional units: ordinal likelihood/consequence 1–5 and saved score 1–25 are the implemented validation contract, not approved universal engineering units. Narrative PoF/CoF values have optional saved unit strings; no conversion inferred. Treatment monetary strings retain decimal precision; USD columns suppress other currencies rather than converting them. Date-only reviews preserve calendar semantics; event timestamps display UTC. Risk-specific calendar/timezone/urgency approval remains missing.

Permission findings: existing JWT/auth reload and owner/Admin read restrictions PASS covered offline checks. Enterprise tenant/asset/delegation scopes, confidential notes/evidence, global methodology catalog visibility, approver authority, self-approval prevention and source ACL parity are MISSING FIELD — APPROVAL NEEDED. Real cross-user/native-source authorization is UNVERIFIED.

## 8. Screenshot and DOCX differences requiring explicit disposition

| Difference | Status / disposition |
|---|---|
| Reference shared counts/identities/dates differ across images | UNVERIFIED examples. All example records/values are excluded from operational defaults; no fabricated reconciliation. |
| IMG-01 pipeline bars sum 264 vs 324; IMG-07 category counts sum 326 vs 324; IMG-10 preview bars sum 284 vs 324 | BLOCKED as calculation authority. Use only reconciled real scoped populations. |
| IMG-02 ordinal/current-residual count reduction and cost/65%/ALARP claims | MISSING FIELD — APPROVAL NEEDED. Visible costs/populations do not establish a metric or governed ALARP outcome; pending approval conflicts with success presentation. |
| IMG-03 286 related-record footer and counts; mixed source units | UNVERIFIED populations. Implementation explicitly distinguishes source-version references, resolved records and unavailable totals; no CP/corrosion conversion invented. |
| IMG-04 consequence section repeats Likelihood Justification; summary omits Current; differing review due dates | PASS semantic correction locally: independent consequence narrative, all three bases and explicit review-purpose selection. |
| IMG-05 Current (Residual) label and frequency-based severity legend | PASS basis correction; PARTIAL neutral legend. Counts never classify severity. |
| IMG-05 selected cell/category/table totals differ | UNVERIFIED screenshot population. Local matrix fixtures reconcile the same cell/rows/category population. |
| IMG-06 score bands overlap; High band 11–16 conflicts with threshold ≥16; overdue >30 differs from DOCX due date < today | BLOCKED defaults. Approve engineering bands and separate escalation policy; retain DOCX overdue meaning. |
| IMG-06 green validity, Connected/Last Sync, named approver roles | BLOCKED unsupported assertions. Implementation shows incomplete verification/native states and unavailable policy. |
| IMG-07 rank percentages sum 110% | MISSING FIELD — APPROVAL NEEDED overlap/denominator/attribution rules; no normalization guessed. |
| IMG-09 heat-map totals/series not consistently reconcilable; methodology update suggests reclassification | BLOCKED as history algorithm. Retain exact original approved revisions, explicitly define comparisons. |
| IMG-10 seven request labels omit DOCX §26 Risk Drivers report | PARTIAL requirements coverage; add through approved owner catalogue/UI scope. |
| DOCX §3 View All/full views and source navigation vs inline expansions/disabled links | PARTIAL. Overview/assessment history have explicit full read views; matrix/register/history often expand inline. Do not add routes automatically. |
| DOCX §16 register fields vs single selected result basis/subset of states | PARTIAL; scenario, assessment/approval/mitigation states and three result columns not all visible together. |
| Known-level risk colors in assessment/related/treatment vs neutral matrix/config | PARTIAL approval/presentation consistency. Display cues are hardcoded, not a versioned approved palette. |

Exact visual identity is PARTIAL: shared approved theme, compact fonts, scope/version controls and mandatory unavailable/provenance disclosures differ intentionally from reference presentation. Full application shell pixel parity and all viewport sizes are UNVERIFIED. No UI restoration/change is authorized by this audit.

## 9. Executed offline checks and interaction coverage

All Node test processes used DATABASE_URL empty and NODE_ENV=test. Source readers/user lookup were injected or mocked by existing checks. Local HTTP tests use loopback ephemeral servers and test tokens, not an operational login. Test artifact-generation flags were disabled, including child runner flags; existing evidence fixtures were read rather than replaced. No database seed or source initialization was run.

| Fresh check | Result | Actual scope |
|---|---|---|
| Backend `node node_modules/typescript/bin/tsc --noEmit --incremental false` | PASS, exit 0 | Compile only; does not generate Risk delegates. |
| Frontend same command | PASS, exit 0 | No build/server or emitted files. |
| riskAssessmentChecks.ts | PASS | Official-only counts, duplicate/version/snapshot/product guards, three results, date boundaries, auth/strict query/423 locks. |
| riskTreatmentChecks.ts | PASS | Same-risk baseline, Action_ID deduplication, forecasts, exact money, absent gateway, native response rejection, HTTP auth/locks. |
| riskRelatedChecks.ts | PASS | Exact approved scope/link/snapshot/version, native failure isolation, filter/search/page/dedup/auth/locks. Existing compatible CommonJS loader used. |
| riskAssessmentDetailChecks.ts | PASS | Exact authorized revisions/history, independent results, JSON projection, optional sources/actions, no completion-driven reduction, auth/locks. |
| riskMatrixChecks.ts | PASS | Three 25-cell population sums, category consistency, exact metadata, privacy/owner scope/auth/locks. |
| riskConfigurationChecks.ts | PASS | Exact config identity/date/rules, saved review/Hub scope, private input exclusion, partial validity and HTTP locks. |
| riskRemainingChecks.ts | PASS | Drivers/register/history/reporting context/projection/privacy/query/auth/locks; no fake analytics. |
| Chained IMG-01–04 frontend render/completion checks | PASS | Labels/panels, unavailable vs verified zero, maps/filters, date/View All, selections, saved history/bases and disabled controls. |
| run-risk-matrix-tests.cjs | PASS | Both 25-cell matrices, basis/cell/category callbacks, counts/table reconciliation, page/View All, loading/error isolation. |
| run-risk-configuration-tests.cjs | PASS | Eleven panels, exact dictionaries/versions, unavailable/stale/error states, disabled edits/toggles, native disclosures/link. |
| run-risk-remaining-tests.cjs drivers/register/history/reports | PASS, four stages | Insight selection; search/category/page/risk selection; exact historical pair/reset; request search/category/navigation and disabled generation. |
| run-cp-tests.cjs | PASS | Existing CP calculation regression. |
| integrationChecks.ts | PASS | Existing Integration Hub isolated regression with mocks. |

The existing source files were not edited to strengthen tests. Unsupported workflows were checked as disabled/unavailable, not exercised as working operations. No new full browser interaction/hydration tests were created. Direct handler/SSR tests do not prove effect timing, real router behavior, full keyboard/accessibility, live ownership, realistic load or complete cross-module regression. Unrelated modules have preservation evidence and the named regressions, not exhaustive functional certification.

## 10. Desktop/mobile rendering and fresh defects

Current `frontend/src/app/globals.css` and Tailwind configuration were compiled into an OS temporary directory. Existing test component states were captured as static SSR HTML with network-blocking CSP, mock API access, a visible synthetic/local notice and fresh headless Chrome profiles. No application server or authenticated browser session was opened. DOM measurement covered full page width; PNGs capture the viewport and do not prove every offscreen interaction or visual detail.

Evidence directory: `C:/Users/Lenovo/AppData/Local/Temp/klinthru-risk-100-audit-d06LiJ/`. It contains current CSS, static HTML, screenshots and `browser-results.json`; it is temporary evidence, not an application deliverable. The temporary capture harness initially had a syntax error and produced no rendered pages; it was corrected without source edits. The populated detail capture was subsequently narrowed to an exact matching Risk/revision; its corrected measurements below are the final results.

Thirty final measurements across fifteen captured states cover all ten tabs. Requested windows 1672/600 yielded measured viewports **1650/578 CSS px**. All 30 browser processes and screenshots succeeded; 29/30 measurements had no document overflow. One additional diagnostic capture reproduced the same Overview defect.

| Tab / captured state | Desktop | Narrow | Interpretation |
|---|---|---|---|
| Overview, unavailable | PASS width | PASS width | Static state only. |
| Overview, populated synthetic | PASS width | PARTIAL — overflow | Viewport 578px, document scroll width 908px. |
| Register, populated synthetic | PASS width | PASS width | Table scrolls within its container. |
| Assessment, matching saved synthetic + unavailable | PASS width, both | PASS width, both | Corrected exact-pair capture; no real approvals implied. |
| Matrix, populated synthetic | PASS width | PASS width | Neutral count cells, scrollable tables. |
| Drivers, unavailable | PASS width | PASS width | No fabricated populated analytics state. |
| Treatment, populated synthetic + unavailable | PASS width, both | PASS width, both | Populated chart values exist only in renderer fixtures, not production summary. |
| History, saved synthetic | PASS width | PASS width | Historical aggregates still unavailable. |
| Reports, unavailable | PASS width | PASS width | Template labels only, no generated records. |
| Related, synthetic references + unavailable | PASS width, both | PASS width, both | Includes missing-source disclosure, no live source call. |
| Configuration, synthetic + unavailable | PASS width, both | PASS width, both | Structural checks only; no green readiness claim. |

### Defects and exact recommended fixes (not applied)

| ID / priority | Evidence | Status and required fix |
|---|---|---|
| UI-A01 / P2 | `risk-assessment-overview.tsx`, populated Latest / Key Risks: panel right edge 908px at 578px viewport; table min-width 850px | PARTIAL. The mobile grid item/panel does not shrink around its inner scroll container. Under approved UI scope, constrain grid/panel min-width so horizontal scrolling stays in the table; repeat populated and empty narrow checks. |
| UI-A02 / P2 | `risk-register-workspace.tsx` uses `detail.history.slice(0,4)`; backend detail history sorted ascending | PARTIAL. Recent Activity can show oldest events. Agree ordering, then display latest while retaining full immutable history. |
| SRC-A01 / P1 | `riskRelatedSources.ts` CP test-point location fallback uses `row.kp ? ... : null` | PARTIAL, code-established edge case. Numeric KP 0 is treated as missing when location is absent. Under approved fix scope use explicit null/undefined handling and approved KP units; do not invent conversion. Not exercised against a real zero-KP record. |
| UI-A03 / P2 | Assessment mini-matrix and detail/treatment/related badges hardcode known-label colors; matrix/config require approved palette | PARTIAL. Obtain palette policy and consistently bind it, or approve neutral treatment until available. These colors do not prove approved severity criteria. |
| API-A01 / P2 | Router unknown GET returns text claiming only IMG-01 endpoints exist | PARTIAL. Correct stale diagnostic after approval of route-file edit; retain unsupported-operation lock. |
| API-A02 / P1 | Overview/methodologies/treatment/readiness responses lack explicit private/no-store in this router; frontend request is no-store | PARTIAL. Review central/intermediary behavior and consistently set confidential response policy. No proven live cache leak is claimed. |
| API-A03 / P1 | Risk/treatment populations materialized; selectors capped 200; Hub capped100; action aggregate requires complete ≤100 page | PARTIAL. Approve stable server paging/count/completeness contracts and test authorized scale. Never sum a truncated page. |
| UI-A04 / P2 | Register fields, source links, full-view semantics, Risk Drivers report request, update provenance | PARTIAL. Finish only against approved DTO/service contracts and separately approved UI/navigation scope. |

## 11. Missing engineering and governance approvals

Each item is **MISSING FIELD — APPROVAL NEEDED**, not automatically approved by source code or this report.

| Decision group | Required approved fields/contracts |
|---|---|
| E1 / methodology | Authoritative method document, owner/approval reference, applicability, qualitative vs quantitative scope and version/effective date. |
| E2 / PoF-CoF | Likelihood criteria/probability time basis/units/boundaries; consequence dimensions, units, guidance, combinations and uncertainty. Conditional DOCX labels are insufficient. |
| E3 / scenario identity | Risk_ID allocation/format, normalized scenario/asset/threat/failure mode, KP units/tolerance, duplicate search, separate-scenario reason/authority and collision/idempotency/concurrency policy. |
| E4 / evidence | Required inputs, confidence/sufficiency, freshness/staleness, source versions, snapshot canonicalization/hash verification and critical-input gates. |
| R1/R2 / scoring | Acceptance/applicability of ordinal product scoring or alternate approved method; exact matrix/method/rule IDs/versions, all 25 classifications, thresholds, boundary precedence, actions/dictionaries/palette. Legacy 70/40 helper and screenshot bands are not authority. |
| JSON/subrecord contracts | Scope/narrative/control/result/evidence shapes, stable likelihood/consequence/control IDs, RiskIndicator projection, source-link version/retirement lifecycle. |
| Permissions | Role/action/object/field matrix, tenant/asset/delegation scope, source ACL parity, note/evidence visibility, catalog access and export permissions. |
| Approval lifecycle | Authoritative statuses/transitions, review/approval/acceptance authority, self-approval/delegation/escalation, configuration change authority and append-only audit. |
| Controls/treatment/ALARP | Effectiveness and residual forecast/verified policy; evidence and reassessment linkage; treatment/ALARP ID rules, criteria/tolerability/alternatives, authority and cost/reduction semantics. |
| KPI/reviews | Active groups, missing-review/coverage/exclusion behavior, calendar/timezone/intervals/anchors/overrides/urgency, primary-source counting, percentages/rounding/baselines. Existing validator constraints await acceptance. |
| Drivers/history | Canonical attribution/evidence/overlap/denominator/rank/tie/average/impact rules; historical as-of populations, buckets, comparability, movements, cadence and overdue history. |
| Sources/events | Per-source exact identity/version/access/derived fields/units/freshness/error/navigation; immutable evidence; reassessment consumer and DOCX §51 publication/dedup/retry/subscription contracts. |
| Actions/reports/notifications | Actual Central Action provider; approved report templates/categories/basis/population/versions, Report_Run_ID→Document_ID; preview/download/export/schedule/recipient/timezone/retention; notification delivery policy. |
| Database/release | Exact authorized target, model relationships/constraints/immutability/privileges, reviewed deployment/client/rollback plan, genuine approved record provenance and separate nonproduction/release authorization. |

Already settled DOCX requirements are preserved: official Risk ownership, original engineering ownership, many-to-many references, optional defect, three bases, immutable history/versions/snapshots, scenario deduplication, Central Action execution, central reports/documents/technical integrations, critical-input blocking and no automatic official reduction. They do not supply missing method values, roles or deployed records.

## 12. Dependency-ordered fixes and acceptance gates

1. **P0 — Owner decisions:** resolve E1–E4/R1–R2, identity/JSON/evidence and permission/lifecycle decisions. Attach actual approval references/versions; keep every unresolved field unavailable.
2. **P0 — Native contracts:** establish source IDs/versions/access/units/freshness, consequence inputs, evidence/hash and source-link version lifecycle. Preserve owning modules; no duplicate engineering stores.
3. **P0 — Review deployment/integrity plan:** only after decisions and separately authorized scope, specify thirteen-model constraints, immutable approved versions, append-only decisions/events, concurrency/idempotency, least privilege and rollback. No deployment work is authorized by this audit.
4. **P0 — Separately authorized target verification:** later confirm exact nonproduction environment/client/tables/constraints and approved record provenance. No screenshot seeds. Local absence of migrations is not remote inventory evidence.
5. **P0 — Read completion/security:** implement authorized native readers/DTOs; correct unit/zero-KP issue, response cache/error policy, stable paging/completeness and access tests. Verify historical reads survive source outages without live replacement.
6. **P0 — Governed writers:** separately authorize scenario search/create, link/reassess, draft/save/submit/review/approve/reject/accept/close with transactions, immutable snapshots and event contracts. Keep default controls locked until acceptance.
7. **P1 — Connected engineering:** Central Actions, controlled treatment/ALARP/effectiveness; KPI/review policies; Driver/history algorithms; official report/document/schedule/notification integrations. Completion alone never verifies reduction.
8. **P2 — Approved UI fixes:** Overview populated mobile containment, latest activity ordering, register completeness, approved palette/units/provenance, full-view/source navigation and missing report request. Preserve tab order/header cleanup/shared theme; obtain approval for changes.
9. **P0 release gate — Real acceptance evidence:** authorized nonproduction authenticated UI/API/native-source tests, cross-user denial, actual three bases/versions/hashes, DB immutability, duplicate/concurrency tests, outages/staleness, action/report ownership, realistic load and preservation regressions. Production release remains a separate explicit approval.

## 13. Preservation and final disposition

The audit started from existing uncommitted work. No reset, checkout, cleanup, source rewrite or migration was performed. Before/after SHA-256 manifests cover backend/frontend source, Prisma schema/migrations, frontend verification scripts, existing top-level Markdown reports, top-level artifact files and backend/frontend package manifests/locks. **Preservation PASS: all 332 baseline files match, with zero changed, zero deleted and zero unexpected additions in that manifest.** This includes 123 backend source files and 136 frontend source files. The requested audit report is the sole intended new workspace artifact and is excluded from the baseline comparison. Temporary browser evidence lives outside application source. This preservation check does not certify every unrelated module's runtime behavior.

**NOT READY:** local read-only feature coverage is PARTIAL; operational methodology, integrations, database enforcement and governed lifecycle are BLOCKED; live data and full authenticated behavior are UNVERIFIED. Offline PASS results and mounted tabs do not change that verdict. Keep unavailable states and mutation locks. Stop after this audit.
