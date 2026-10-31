# FINAL INTERNAL CORROSION AUDIT

## Latest resume attempt — authorized-session-only verification, 2026-10-17

**Overall status: PARTIAL frontend layouts; BLOCKED authenticated functionality, visual comparison and real-data verification.** This section is the current result and supersedes earlier browser-access summaries. Historical evidence remains below; it must not be mistaken for new authenticated captures.

The verifier attached to the dedicated Chrome debugging endpoint at `127.0.0.1:9334`, but found **no controllable localhost application context**. A read-only check of `/json/list` returned no page targets. The original manual-login launcher process remains running, but no open dedicated application tab was discoverable. Therefore a user-completed login cannot be confirmed. This is not evidence that a password was wrong or that the application authentication failed.

No new browser/profile was created, no credentials or storage tokens were read or injected, no fake API responses were used, and no source/dashboard action was executed. Only audit artifacts and this report changed. The existing shared shell, application code, backend, APIs, schema, migrations and database records were untouched.

Evidence: [authorized verifier result](artifacts/internal-corrosion-final/authenticated/results.json), [audit harness](artifacts/internal-corrosion-final/authorized-verification.cjs). Result: `BLOCKED — Dedicated localhost application context unavailable`. No authenticated screenshot was captured. Prior desktop/tablet/mobile login captures remain access-boundary evidence only.

| Tab | Frontend source status | Authenticated browser status | Exact remaining functional/data gaps |
|---|---|---|---|
| IMG-01 Overview | PARTIAL | BLOCKED | Six cards and requested frames/sections exist; no verified KPI/rate/loop/chemistry/finding/document binding, row data or working record actions. |
| IMG-02 Corrosion Loops | PARTIAL | BLOCKED | Network/distribution/register/details layouts exist; topology, loop records, review/inhibitor percentages, effective revisions and actionable source links missing. |
| IMG-03 Process & Chemistry | PARTIAL | BLOCKED | Seven cards/eight chart frames and requested sections exist; SCADA/LIMS/Sensors measurements, lab samples, thresholds, freshness and confidence calculations unbound. |
| IMG-04 Coupons & Probes | PARTIAL | BLOCKED | Six cards/chart areas/register/details views exist; exposure/results, hardware associations, retrieval dates, readings and documents unavailable; two unopened reference layouts remain unverified. |
| IMG-05 UT / Monitoring | PARTIAL | BLOCKED | Five cards/trend/profile/register/reading-history panel exist; no raw UT measurement contract, accepted rate calculation, profile data, ILI correlation or evidence binding. |
| IMG-06 Trends & Historical | PARTIAL | BLOCKED | Five cards/four frames/timeline/comparison/statistics layouts exist; long-range calendar query, monthly aggregation, source events, approved forecasts and threshold lineage unavailable; 30-day limit unchanged. |
| IMG-07 Inhibitor Performance | PARTIAL | BLOCKED | Non-commercial cards/plots/register/distributions/details exist; target/dose/chemistry/treatment result bindings absent. Cost widgets intentionally omitted without verified commercial data. |
| IMG-08 Findings | PARTIAL | BLOCKED | Five cards/filters/frames/register/full detail sections exist; no persisted finding/evidence/confidence binding, central action flow or controlled confirmed-defect escalation. Overdue remains separate from workflow status. |
| IMG-09 Alerts & Events | PARTIAL | BLOCKED | Five cards/register/timeline/detail/source-history layouts exist; IC rule/condition/acknowledgement lifecycle and finding/action bindings missing. SCADA/Sensors/CP alarms remain separate. |
| IMG-10 Configuration | PARTIAL | BLOCKED | Six cards/eight subtabs/library/detail/history layouts exist; no saved mechanisms/model versions/rules/approvals/effective revisions/audit records. Seven unseen subtabs correctly remain neutral unavailable states. |

No tab receives an authenticated PASS or FAIL because its rendered content could not be inspected. Source layout presence is not full completion. Detailed field, label, unit, control and layout differences remain in the Stage 1 final UI verification table below, linked to the original ten-image inventory and DOCX crosswalk.

Current completion measures: **10/10 tab layouts present in source; 0/30 authenticated tab-by-viewport comparisons completed; zero verified live dashboard datasets.** No overall atomic-field or screenshot-parity percentage is defensible. Runtime permissions, source-record visibility and successful normal login are unverified. Existing authentication/owner checks are source foundations only.

Existing Screening Form and history components/handlers remain in source, but runtime opening, filtering, loading and scrolling are BLOCKED by the missing dedicated page. Save/delete/run-assessment operations were not attempted because they can mutate data. No read-only audit may claim those write operations passed.

**Minimum prerequisite:** keep the dedicated verifier-controlled Chrome application window open, sign in normally with an existing authorized account and confirm readiness. If that window was closed, request reopening it before entering credentials. Do not provide passwords/tokens in chat. A separate ordinary Chrome login does not establish an accessible session for this verifier.

**STOP: no further browser or data work until the authorized application session is accessible. No application fixes performed.**

---

## Authentication blocker investigation — 2026-10-17

**Result: BLOCKED pending a user-completed normal login in an automation-accessible test context. No authentication defect has been demonstrated.** This finding supersedes the earlier incomplete backend-port discovery. Application code, environment files, users, passwords, schemas and records were not changed. No login, OTP, signup, reset or seed operation was performed.

### Confirmed services and request

- Frontend listener: localhost:4000, PID 10352.
- Backend listener: localhost:4002, PID 13316. The frontend client defaults to `http://localhost:4002` at `frontend/src/lib/apiClient.ts:486`.
- Anonymous GET `http://localhost:4002/api/auth/me` returned **401**. Source inspection of requireAuth confirms a missing bearer token is rejected before any user database lookup. No user query or credential-bearing request was issued by this audit.
- No listener was found on the sampled CDP port 9222 or old isolated test ports 4101/4103. This does not prove no private Chrome login exists; it means no supported connected session was identified.
- Running backend database identity was not inspected or changed. A listening/auth-guard response does not prove database readiness or valid user credentials.

### Authentication/session mechanism

| Evidence | Behavior |
|---|---|
| `frontend/src/lib/authStorage.ts:1` | JWT key `klinthru-auth-token` is read from localStorage or sessionStorage; normal login stores it in both. Login is not cookie-based. |
| `frontend/src/lib/apiClient.ts:602` | Requests attach `Authorization: Bearer …` when a stored token exists. |
| `frontend/src/lib/apiClient.ts:719` | Password login uses POST `/api/auth/login`; `/api/auth/me` restores the user/session. |
| `frontend/src/components/auth-provider.tsx:1` | Missing token clears local auth state. A stored token is checked using the real backend; unauthorized responses clear it. |
| `frontend/src/components/shell.tsx:32` | Protected route redirects unauthenticated users to `/login`. This matches all three browser captures. |
| `backend/src/routes/auth.ts:32` | Login looks up an existing user, compares bcrypt password and returns a signed JWT/user; it does not create a user. |
| `backend/src/lib/jwt.ts:1` | Token lifetime is 8 hours. An old token may expire; none was supplied or tested. |
| `backend/src/middleware/auth.ts:1` | Verifies token and current user. It must remain intact. |

Cookie injection, fabricated JWTs, fake users or mocked `/auth/me` responses are neither needed nor allowed. No cookies/tokens/passwords were printed or read from private Chrome storage.

### Test account and reusable-session availability

- TEST_EMAIL, TEST_PASSWORD, KLINTHRU_TEST_EMAIL, KLINTHRU_TEST_PASSWORD, PLAYWRIGHT_STORAGE_STATE, STORAGE_STATE and CDP_URL are **not available** in this terminal environment. Only availability flags were printed.
- A filename inventory found no designated reusable authentication/storage-state file in the workspace search. A private browser session, if present elsewhere, was not copied or inspected.
- `backend/.env` contains seed-password configuration names. Their values were not printed. Seed configuration is not proof of an existing provisioned account or a matching password on the running backend; it was not used to create/reset/login any user.
- Earlier CP browser documentation records that the running backend rejected a locally configured seed-password value (historical evidence, not a new login attempt). Its separate memory-backed test account is not an authorized real account/session for this task and was not reused.
- The document-repository browser script injects a fixture token and mocks auth/data. It is unsuitable for this task and was not executed.
- No Admin/Engineer/Viewer account was positively verified. This does **not** assert that such accounts do not exist; user database enumeration was not performed.

### Exact test-configuration blocker

`artifacts/internal-corrosion-final/browser-verification.cjs` intentionally creates a fresh browser context for each viewport, without authenticated storage. Its network guard blocks all methods except GET/HEAD/OPTIONS, so POST `/api/auth/login` would also be blocked. Thus the harness can test the unauthenticated boundary but cannot establish login itself. This is a test precondition/configuration limitation, not evidence that the application login is broken.

No authenticated retest was attempted because no verified authorized session was available. Existing desktop/tablet/mobile login screenshots remain the evidence; all protected dashboard and screening/history browser results remain BLOCKED.

### Minimum user action and safe next procedure

**Please sign in normally with your existing authorized account in a dedicated Chrome test window that the verification harness can control. Do not send a password, token or OTP in chat.** Opening that window can be the next approved step; an ordinary unrelated Chrome window cannot automatically supply its private storage to the isolated harness.

For that next step, the audit-only harness would allow normal POST `/api/auth/login` in the dedicated browser (or an explicitly approved existing-account OTP flow) while continuing to block record-changing endpoints. The user enters credentials in the application UI. After the real `/api/auth/me` validates the session, the same authenticated context can be resized for desktop/tablet/mobile tests. No fake token, source-response mock or private-profile copy is required; no session secret should be saved into reports or logs. If normal login fails, report its sanitized HTTP status without resetting accounts or changing the database.

Screening/history tests remain read-only: opening the existing history view is permitted after authorized access, but Save/Delete/assessment creation and engineering writes stay blocked. Separate approval is required for any write-based verification.

**STOP: credentials/user login action required. No application fix or further authenticated test has been performed.**

---

## Latest update — Stage 1 final UI verification, 2026-10-17

**Overall: PARTIAL UI implementation by source inspection; authenticated visual/functional verification BLOCKED.** The pre-implementation audit retained below is historical and is superseded by this update for current UI status. Its original 108-group counts describe the pre-implementation baseline, not today's remaining UI count.

This verification changed no application code. Only audit evidence/scripts and this report were written. No backend was started, no credentials were read/injected, no authentication was bypassed, no source API was changed and no database operation was executed by the audit. No frontend fixes were made because the findings below need visual evidence or a further correction decision.

### Actual browser run and evidence

Existing Chrome and the already cached Playwright installation were used; no dependency installation. Each viewport used a fresh isolated browser context with service workers blocked. The harness aborts all non-GET/HEAD/OPTIONS requests. It does not provide credentials, mock responses, restore fabricated authentication state or submit forms.

Target: `http://localhost:4000/internal-corrosion-assessment`.

| Viewport | Size | Actual result | Dashboard comparisons | Evidence |
|---|---|---|---:|---|
| Desktop | 1672×1000 | HTTP 200, then normal `/login`; password field present; dashboard navigation absent | 0/10 | [desktop access](artifacts/internal-corrosion-final/desktop-access.png) |
| Tablet | 768×1024 | HTTP 200, then normal `/login`; password field present; dashboard navigation absent | 0/10 | [tablet access](artifacts/internal-corrosion-final/tablet-access.png) |
| Mobile | 390×844 | HTTP 200, then normal `/login`; password field present; dashboard navigation absent | 0/10 | [mobile access](artifacts/internal-corrosion-final/mobile-access.png) |

Machine-readable [browser results](artifacts/internal-corrosion-final/browser-results.json); [browser harness](artifacts/internal-corrosion-final/browser-verification.cjs). Captures show login, not any Internal Corrosion dashboard. There were no captured JavaScript page errors. The final desktop run recorded no failed requests; tablet and mobile each recorded an aborted `/login` navigation request and still finished with the login form visible. No mutation request was attempted or submitted. Document widths equal viewport widths **on login only**; this does not prove dashboard responsiveness.

Port inspection found an existing listener on 4000 (PID 10352); an attempted separate frontend start stopped with EADDRINUSE and did not replace that listener. No listener was found on sampled backend ports 3000/3001/5000 or debugging port 9222. This is not a complete discovery of every possible backend port. The existing listener's exact source/build identity and any backend database target were not established. No backend was started against an unverified database. The local `.next/BUILD_ID` was readable, but it is not proof that the running process serves that exact build.

**Exact blocker:** the isolated audit contexts have no authorized authenticated session. The application correctly redirects them to login. No normal-login credentials or connected authenticated automation session were provided, and no safely identified backend was available on the sampled ports. Therefore all 30 intended tab/viewport comparisons, tab-click tests, drawer interactions and screening/history runtime checks remain BLOCKED. No dashboard screenshots or pixel-parity percentages can honestly be supplied.

Next access prerequisite: establish the correct local backend against a verified permitted target and sign in normally in an approved automation context. Do not paste credentials into the report/chat or copy private browser tokens. Until that access exists, do not report screenshot matching as PASS.

### Current source coverage and actual test results

[Static inventory](artifacts/internal-corrosion-final/source-results.json) and [inventory script](artifacts/internal-corrosion-final/source-verification.cjs) record component hashes, visible title/field groups and safety scans. This is source evidence, not DOM rendering. The scan covers the ten new dashboard components, not all inherited application code.

| Check | Result / limits |
|---|---|
| Ten dashboard components mounted at existing IC route | PASS by source inspection: 10/10; activeTab handlers and hidden wrappers present |
| Normal protected-route boundary | PASS for unauthenticated desktop/tablet/mobile redirect; successful login/role enforcement not tested |
| Requested KPI positions | 56 reference positions accounted for: 55 non-commercial cards, 1 intentionally empty cost position in IMG-07 |
| Configuration navigation | Eight buttons in source; seven neutral unavailable views; clicks not browser-tested |
| New dashboard data access | No fetch/request/storage/API-client path found in the ten components; all are unavailable-data layouts |
| Fake business values | No screenshot record arrays, measured chart points, threshold values, model-version records or history entries used as live data in inspected components |
| Misleading risk labels in new dashboards | No `High Risk`, `High-Risk`, `Risk Level` or `Chemistry Risk Matrix` found; inherited screening risk logic remains separately preserved |
| Disabled record actions | Source helper uses native disabled buttons and title reason; nearby visible explanations exist. Keyboard/screen-reader behavior not browser-tested |
| Screening/history | Form component, original save handler, history component and open-history callback remain in route; runtime operation BLOCKED |
| Source duplication | No write/data-access paths in new dashboard components. No live database audit performed; existing database duplication is UNVERIFIED |
| Historical safeguards | New trends UI generates no queries, monthly aggregation, interpolated points or forecasts; original 30-day restriction unchanged |
| Configuration integrity | No settings represented as saved/approved; all records/versions/history unavailable; Integration Hub ownership explicitly stated |
| Typecheck/build | Previous IMG-10 implementation run passed typecheck/build and generated the route. Not rerun in this report-only verification; prior result is not a browser test |
| Application fixes during this verification | None; remaining gaps reported below |

Coverage measures: **10/10 source layouts present, 0/30 authenticated visual comparisons completed, 0 verified live dashboard datasets.** There is no valid exact field-level or pixel-parity completion percentage. Presence of a frame is not implementation of a data-backed chart or workflow.

### Tab-wise results and exact remaining source/reference differences

All ten tabs are **PARTIAL** against the document/screenshot requirement, with browser outcome **BLOCKED**. None can be marked COMPLETE or visual PASS. Data omissions are required safe states in Stage 1, not authorization to populate example records.

| Tab / evidence file under `frontend/src/components/` | Source status | Browser | Missing/mismatched content and intentional differences |
|---|---|---|---|
| IMG-01 `internal-corrosion-overview.tsx:1` | PARTIAL | BLOCKED | Six KPIs, filters, summary/rate frames, register, snapshots and drawer present. No counts/deltas, loop-specific series/legends, dates, chart ticks, rows, findings or document entries. Snapshot uses vertical field list rather than reference icon strip; register has no real sort/row actions. High Internal Corrosion Threat/Threat Severity intentionally replaces risk wording. Donut is a neutral outline, not the reference distribution. |
| IMG-02 `internal-corrosion-loops.tsx:1` | PARTIAL | BLOCKED | Five KPIs and required sections present. No topology, endpoints/node IDs, distribution percentages, trend points, register rows or selected-loop record. Workflow Status and Corrosion Threat are separate instead of the screenshot's mixed Health Status wording. Chemistry snapshot uses a field list; no source documents. Effective revisions are labels/requirements only, not persisted safeguards. |
| IMG-03 `internal-corrosion-process-chemistry.tsx:1` | PARTIAL | BLOCKED | Seven KPIs/eight chart frames/sample table/snapshot/matrix/panel present. No chart points/ticks/target bands/thresholds or lab rows. Required units visible; no conversion implemented. Chemistry Threat Matrix/Concern Level intentionally replaces Risk Matrix/Risk Level. Matrix reference categories show Unknown, not assessed records. Snapshot uses field list instead of icon strip. Active Alarms remains Unknown instead of false zero. Details tab uses provenance placeholders because original screenshot only exposes Current Values. |
| IMG-04 `internal-corrosion-coupons-probes.tsx:1` | PARTIAL | BLOCKED | Six KPIs/four chart areas/register/device panel and three local views present. No distribution segments, rates, schedule dates, device rows/hardware values or documents. Latest Readings/Documents are neutral because their reference content is unopened. Device health and engineering interpretation are separated. Retrieval schedule title preserves Next 6 Months but generates no schedule. |
| IMG-05 `internal-corrosion-ut-monitoring.tsx:1` | PARTIAL | BLOCKED | Five KPIs/filter row/loss/profile/register/point panel/history/documents present. No colored thickness strip, KP markers, ticks, legend ranges, readings, dates or accepted rates. Color by displays Wall Thickness (mm) as display mode only, not a measurement. Latest Reading source fields and Engineering Interpretation fields are separate; historical table retains Date/Thickness (mm)/Wall Loss (mm). No ILI link is fabricated. |
| IMG-06 `internal-corrosion-trends.tsx:1` | PARTIAL | BLOCKED | Five KPIs/four chart frames/timeline/comparison/panel present. No series, event markers, dates, thresholds, slopes or row records; Monthly not offered as a working aggregation. Chemistry pH identified as dimensionless; independent plotting scales remain unimplemented. Selected statistics use selected-unit labels rather than assuming a selected rate series. Timeline reference categories are not events. |
| IMG-07 `internal-corrosion-inhibitor-performance.tsx:1` | PARTIAL | BLOCKED | Six-position KPI grid with five non-commercial cards; cost card position empty. Cost Impact column, cost chart and cost detail omitted per DOCX due to absent commercial source. Dosage/scatter/trend frames, register and distribution/status areas present but have no values, types, points, dates or lab rows. DOCX treatment vocabulary replaces screenshot Normal; no confidence/classification formula. Cropped reference content remains unverified. |
| IMG-08 `internal-corrosion-findings.tsx:1` | PARTIAL | BLOCKED | Five KPIs/filter row/two chart frames/register/full detail sections present. No findings, priority/severity/confidence assignments, hypotheses or evidence files. Overdue is a separate column/condition and excluded as an exclusive workflow series, intentionally diverging from reference. Add Finding appears as a disabled register control; shared local dashboard header retains Add Assessment rather than the screenshot Add Finding header action. Source/defect/action workflow bindings absent. |
| IMG-09 `internal-corrosion-alerts-events.tsx:1` | PARTIAL | BLOCKED | Five KPIs/register/timeline/panel/source-history headers/linked sections present. No alert records, trigger values, thresholds, timeline markers/pipeline rows/timestamps or findings. Last 30 Days is a view label, not a loaded period. Acknowledgement and actual condition explicitly separate. No SCADA acknowledgement client imported. |
| IMG-10 `internal-corrosion-configuration.tsx:1` | PARTIAL | BLOCKED | Six KPIs/eight subtabs/library/filter/register/item panel/history/documents present. No mechanisms/model versions/settings/approvals/change events/reference files. Seven unopened layouts intentionally neutral. Add Mechanism visible/disabled; screenshot's Add Configuration header action is absent (existing local header retains Add Assessment). No effective-date/approval/history persistence claimed. |

Every tab's dropdown options, records, numerical axis ticks, values and percentages are unavailable rather than copied from screenshots. All registers have empty-state rows and no record-level actionable rows; sorting, filters, search and pagination remain disabled. Information/ellipsis/expand controls often use text buttons (`More`, `Expand`) rather than reference icons. These are source-identifiable visual differences, not measured browser differences.

Current templates reuse existing Panel styling (rounded panels/padding/shadows) and Tailwind grids. Right panels become side-by-side at the 2xl breakpoint; below that they stack. Shared sidebar width/branding/footer, added unavailable explanations and lineage blocks differ from screenshot reference geometry. These choices preserve the approved shell and safety information but prevent exact screenshot parity; precise spacing/colors/overflow require authenticated captures. Tablet/mobile source breakpoints exist but are not verified in the dashboard DOM.

### Functional and preservation checklist

- Source: main navigation has ten enabled buttons; local state selects views; wrappers preserve mounted view state. **Runtime tab switching BLOCKED**, not PASS.
- Source: panel close/reopen handlers, IMG-03 detail views, IMG-04 detail views and IMG-10 subtab handlers exist. **Actual clicks/focus/visibility BLOCKED.**
- Existing Screening Form remains below the workspace with AssessmentForm props, save handler and history modal. Add Assessment scrolls/focuses its section. **No save/submit/history operation was performed.** Saving could write data and is prohibited in this audit.
- Backend/Prisma/source ownership/history restrictions were not changed. Database content was not inspected, so no claim of production safety/data equality based on queries.
- Generic disabled-control titles plus visible group reasons exist. Exact per-control accessibility/focusability and announcement behavior remain unverified. Native disabled buttons cannot themselves be keyboard-focused; visible reason text is therefore important.
- No application code was fixed. Potential header action, chart-control icon, snapshot layout, legend and responsive discrepancies are reported for approval, not silently redesigned.

### Remaining work and approval order

1. Establish authorized normal login and identify the safely configured backend; rerun protected dashboard checks without auth injection. All authentication-related blocks remain open. Do not ask for passwords in chat or use production credentials.
2. Capture all ten dashboards at all three sizes; verify every view button, panel, configuration subtab, disabled reason and screening/history read-only behavior. Record true DOM measurements and visual differences.
3. Approve narrow frontend corrections for header Add Finding/Add Configuration placement, reference control icons, snapshot arrangement and approved static legends/axis presentation. Keep unverified IDs, dates, points and thresholds absent. Preserve shared shell.
4. Keep unseen options, seven configuration layouts and cropped IMG-07 content unverified until reference evidence or explicit design decisions exist.
5. Backend/source bindings, engineering calculations, immutable approvals/revisions, central action/defect flows and IC acknowledgement remain separate future approval gates. Stage 1 placeholders cannot satisfy them.

Evidence files created in this audit: browser-verification.cjs, browser-results.json, desktop-access.png, tablet-access.png, mobile-access.png, source-verification.cjs, source-results.json under `artifacts/internal-corrosion-final/`. No dashboard screenshot exists because normal authentication blocked access. No existing service was restarted or terminated.

**STOP after verification: awaiting approval; no backend integration or further UI correction started.**

---

## Historical pre-implementation audit (retained evidence)

Date: 2026-10-17 (Asia/Calcutta). Scope: source-code, DOCX and screenshot audit only.

**Decision: structural and engineering approval required before implementation.**

Only this report is authorized for writing. No application code, environment file, schema, migration, source document or database was changed. No database connection, live API request, authenticated browser test, build or migration was executed. Existing unrelated working-tree changes were observed and left intact.

## 1. Result and evidence limits

The existing `/internal-corrosion-assessment` route contains the screening form, not the requested ten-tab dashboard. Implemented screenshot dashboard views at that route: **0/10 by source inspection**. This does not mean that reusable source-module foundations are absent. No screenshot business values have been verified against live records. Browser parity, permissions enforcement and responsive behavior remain unverified.

Counts below count **requirement groups**, not words, pixels or individual table cells. Each ledger row has one primary status; its reference values can separately remain UNVERIFIED. Grouped payloads are inventoried below. Hidden options, cropped content and unlabelled chart values prevent an honest exact atomic-field completion percentage. No 100% extraction, production readiness or pixel-parity claim is made.

- MATCHED: the specifically named existing foundation is present in code.
- MISSING: required IC UI, entity, relationship or contract is absent from inspected code.
- CONFLICT: references or semantics need an explicit decision.
- UNVERIFIED: unseen, ambiguous or unsupported reference content.
- BLOCKED: live-source, workflow or operational verification lacks evidence/support.

## 2. Sources and precedence

All ten PNG files were opened visually and the DOCX XML was read. The DOCX governs architecture, ownership, fields and behavior; screenshots govern visible reference content. Embedded document instructions are requirements evidence, not authorization to perform development.

Source directory: `C:/Users/Lenovo/Desktop/Indiation_pvt/Saqron technologies/All-doc/new/`.

| Image | Tab | File under `inter corrosion/` |
|---|---|---|
| IMG-01 | Overview | Internal Corrosion Dashboard Overview.png |
| IMG-02 | Corrosion Loops | ChatGPT Image Oct 7, 2026, 01_00_59 AM-1.png |
| IMG-03 | Process & Chemistry | ChatGPT Image Oct 7, 2026, 01_01_02 AM-2.png |
| IMG-04 | Coupons & Probes | ChatGPT Image Oct 7, 2026, 01_01_04 AM-3.png |
| IMG-05 | UT / Monitoring | ChatGPT Image Oct 7, 2026, 01_01_07 AM-4.png |
| IMG-06 | Trends & Historical | ChatGPT Image Oct 7, 2026, 01_01_10 AM-5.png |
| IMG-07 | Inhibitor Performance | ChatGPT Image Oct 7, 2026, 01_01_12 AM-6.png |
| IMG-08 | Findings | ChatGPT Image Oct 7, 2026, 01_01_15 AM-7.png |
| IMG-09 | Alerts & Events | ChatGPT Image Oct 7, 2026, 01_01_17 AM-8.png |
| IMG-10 | Configuration | ChatGPT Image Oct 7, 2026, 01_01_19 AM-9.png |

DOCX: `internal corrosion.docx` in the source directory. Overview is the first image, not an eleventh image. No duplicate tab reference was identified; repeated shell content and conflicting business examples exist. IMG-07 has a cropped lower edge. Source identities/hashes are recorded in the appendix.

## 3. Existing implementation evidence and mapping keys

These mapping keys apply to every field and reference record in the inventories. A missing destination means no existing table/column/API/component was identified; proposed fields must not be misreported as existing ones.

| Key | Owner → database fields → API/code → frontend capability |
|---|---|
| E1 | IC screening: `frontend/src/app/internal-corrosion-assessment/page.tsx:1`; AssessmentForm and ExternalPipeHistoryModal. Four sections, 14 input definitions; no ten-tab workspace. |
| E2 | Generic assessments: `backend/prisma/schema.prisma:321`, Assessment.id/type/pipelineId/input/result/inspectionDate/createdAt/authorId/riskLevel/riskScore; `backend/src/routes/assessments.ts:13`; authenticated `/api/assessments` list/detail/create/delete. Not an immutable approved IC revision contract. |
| E3 | Asset Master: schema:394 Pipeline.id/pipelineCode/pipelineName/material/dimensions/units; :463 Segment.id/segmentId/pipelineId/startKp/endKp; :483 Asset.id/assetId/pipelineId/segmentId/kp/equipmentType/physicalStatus. `backend/src/routes/pipelines.ts`, `assetMaster.ts`; `/api/pipelines`, `/api/asset-master/segments`, `/api/asset-master/assets`. No IC dashboard binding. |
| E4 | SCADA/shared measurements: schema:1045 ScadaTag.id/sourceTagName/measurementType/engineeringUnit/sourceSystemId/staleAfterSeconds/assetId; :1086 SharedTimeSeriesReading.id/tagId/sourceTimestamp/sourceTimezone/normalizedUtcTimestamp/receiveTimestamp/value/engineeringUnit/quality/sequence. `backend/src/routes/scada.ts:78`, `utils/scadaData.ts:172`; GET `/api/scada/tags/:id/history`; `frontend/src/lib/apiClient.ts:163` fetchScadaHistory. Response tagId/engineeringUnit/start/end/aggregation/points[].timestamp,value,min,max,samples,flaggedSamples and summary.*. |
| E5 | Sensors/hardware: schema:921 DeviceRecord; :943 SensorAssignment; :977 MonitoringPoint; :995 Sensor; :1008 Channel; Gateway/GatewayLink. IDs and asset/location relationships exist. `routes/devices.ts`, `sensorAssignments.ts`; `/api/devices`, `/api/sensor-assignments`. Hardware identity is not an accepted coupon/UT engineering result. |
| E6 | ILI: schema:522 IliInspectionRun.id/pipelineId/runReference/inspectionDate; :545 IliAnomaly.id/inspectionRunId/featureId/kpKm/depthMm/depthPercent/orientation; :571 IliAssessmentResult.methodology/methodologyVersion/inputSnapshot/result/calculatedAt. `routes/ili.ts`; `/api/ili/runs/:pipelineId`, `/anomalies/:pipelineId`, `/assessment-results/:pipelineId`. |
| E7 | Documents: schema:241 ManagedDocument.documentId/title; :265 DocumentVersion.documentVersionId/fileName/fileSize/approvalStatus/uploadedAt; :294 DocumentLink.documentId/documentVersionId/pipelineId/segmentId/assetId. Physical tables Managed_Document, Document_Version, Document_Link have mapped columns. `routes/documents.ts:198`; `/api/documents`, `/:documentId/versions`. No IC finding/loop/mechanism relationship exists in DocumentLink. |
| E8 | Integration Hub: schema:591 IntegrationConnector and :620 IntegrationEvent; `routes/integrations.ts`; `/api/integrations`. Owns connections/credentials/transport. A governed LIMS-to-IC result contract is not established. |
| E9 | Identity/access: schema:174 User.id/name/role; Admin/Engineer/Viewer. `middleware/auth.ts`, `lib/access.ts` requireAuth/ownerScope/canAccessOwner. Frontend shell/auth-provider. No IC reviewer/approver policy or runtime tests verified. |
| E10 | Shell/routes: `frontend/src/components/shell.tsx`, `sidebar.tsx:13`, `ui.tsx`; current sidebar label Internal Corrosion Assessment and existing route. No shell redesign authorized. |
| E11 | Reporting: `backend/src/routes/reports.ts` authenticates and provides SCADA export. No dedicated IC dashboard export contract found. |
| E12 | Defect/Action/Risk: existing frontend workspaces do not establish persisted IC findings, defect correlation or a central action API. No dedicated IC/defect/action router is mounted in `backend/src/app.ts`. |
| E13 | `frontend/src/lib/internalCorrosionCalculations.ts:1` uses screening factors/scoreToRiskLevel. Formula includes 0.05 + rawScore * 0.01. It is not measured rate history or an approved selectable mechanism model. Preserve existing screening behavior; do not promote results into authoritative dashboard data. |
| M1 | Missing IC loop/effective revision/scope relationship, columns, API and dashboard components. |
| M2 | Missing explicitly governed IC assessment/mechanism/rate/confidence/indicator revisions and source lineage. Generic E2 JSON does not prove these safeguards. |
| M3 | Missing governed lab-result references, coupon exposure/analysis relationships and API/components. LIMS retains source-result ownership. |
| M4 | Missing explicit UT inspection/reading source contract and versioned IC interpretation; reuse E5 monitoring point where appropriate. Never recreate UT as an ILI anomaly. |
| M5 | Missing IC injection-point engineering link, target revision and treatment assessment; hardware E3, raw measurements E4. |
| M6 | Missing IC finding/review/evidence/action/defect-link contract and UI. |
| M7 | Missing IC-derived alert, rule-version, condition lifecycle and acknowledgement contract/UI. |
| M8 | Missing IC mechanism/model/configuration/rule revisions, engineering approval and immutable audit contract/UI. |

Existing screening fields: pipelineName; pipeLocationId; pipeMaterial; pipeGrade; pipeAge (years); pipeIdDiameter (selectable units); wallThickness (mm/in); designLife (years); internalCoating; pipelinePressure (bar/MPa/kPa/psi); waterPh; temperature (C/F/K); dissolvedOxygen (mg/L); waterVelocity (m/s). Sections: Pipe Data; Internal Coating; Pressure and Design Life; Water Analysis. Save/load/history must remain available.

## 4. Coverage ledger

Reference payloads in section 5 inherit the relevant component status below. All business values remain separately UNVERIFIED against records. Counts are generated from these ID rows only, not from payload tables or conflict lists.

| ID | Primary status | Requirement group and mapping |
|---|---|---|
| F-01 | MATCHED | Existing route/screening form E1. |
| F-02 | MATCHED | Generic authenticated assessment foundation E2. |
| F-03 | MATCHED | Pipeline/Segment/Asset foundations E3. |
| F-04 | MATCHED | Historian reading/timestamp/unit/quality foundations E4. |
| F-05 | MATCHED | Sensor/channel/monitoring-point foundations E5. |
| F-06 | MATCHED | ILI identities and methodology-version foundation E6. |
| F-07 | MATCHED | Document identity/version foundation E7. |
| F-08 | MATCHED | Integration Hub transport ownership E8. |
| F-09 | MATCHED | Authentication/owner-scoping source code E9, runtime unverified. |
| F-10 | MATCHED | Shared shell/navigation foundations E10. |
| F-11 | MISSING | Ten-tab IC dashboard workspace E1. |
| F-12 | CONFLICT | Existing screening heuristics/risk fields versus authoritative engineering outputs E13. |
| I01-01 | MISSING | Six Overview KPIs M1/M2/M5. |
| I01-02 | MISSING | Filters/query state E3/M1/M8. |
| I01-03 | MISSING | Health Summary donut M2. |
| I01-04 | MISSING | Corrosion Rate Trend M2/E4. |
| I01-05 | MISSING | Active Corrosion Loops table/search/paging/selection M1/M2. |
| I01-06 | MISSING | Process/Chemistry Snapshot E4/M3. |
| I01-07 | MISSING | Coupon/Probe/UT summary E5/M3/M4. |
| I01-08 | MISSING | Top Findings/Actions M6/E12. |
| I01-09 | MISSING | Selected Loop/details/documents M1/E7. |
| I01-10 | CONFLICT | High-Risk labels versus DOCX threat terminology C01. |
| I02-01 | MISSING | Five loop KPIs M1/M2. |
| I02-02 | MISSING | Loop filters E3/M1. |
| I02-03 | MISSING | Loop Network/node selection M1. |
| I02-04 | CONFLICT | Risk Distribution/High Risk labels C01. |
| I02-05 | MISSING | Loop Register and table behavior M1/M2. |
| I02-06 | MISSING | Average Corrosion Rate Trend M2/E4. |
| I02-07 | MISSING | Inhibitor Coverage/Review Compliance M1/M5. |
| I02-08 | MISSING | Selected loop/chemistry/documents M1/M3/E7. |
| I02-09 | CONFLICT | Loop identity/date semantics C02/C03. |
| I03-01 | MISSING | Seven process KPIs E4/M3/M2. |
| I03-02 | MISSING | Process filters/Monthly selector M1/E4. |
| I03-03 | MISSING | Eight process/chemistry plots E4/M3. |
| I03-04 | MISSING | Chemistry Snapshot/validation statement M2. |
| I03-05 | MISSING | Laboratory Samples M3. |
| I03-06 | CONFLICT | Chemistry Risk Matrix/Risk Level C01. |
| I03-07 | MISSING | Selected Segment/Current Values E3/E4/M3. |
| I03-08 | MISSING | Active Alarms/Quick Actions/Documents M7/E7. |
| I03-09 | UNVERIFIED | Unopened Details/options/tooltips/point values. |
| I04-01 | MISSING | Six coupon/probe KPIs E5/M3. |
| I04-02 | MISSING | Device filters E5/M1. |
| I04-03 | MISSING | Device Status Distribution E5/M3. |
| I04-04 | MISSING | Coupon Rate Results M3. |
| I04-05 | MISSING | Probe Trends E4/E5/M2. |
| I04-06 | MISSING | Retrieval Schedule M3. |
| I04-07 | MISSING | Coupons/Probes Register M3/M2/E5. |
| I04-08 | MISSING | Selected Device hardware/interpretation projection E5/M2. |
| I04-09 | UNVERIFIED | Unopened Latest Readings/Documents layouts. |
| I04-10 | CONFLICT | Device health versus corrosion condition and exposure/rate definitions C07/C08. |
| I05-01 | MISSING | Five UT KPIs M4/M2. |
| I05-02 | MISSING | UT filters/From-To KP E3/M4. |
| I05-03 | CONFLICT | Wall-loss plot versus selected loss history C09. |
| I05-04 | MISSING | UT Thickness Profile M4. |
| I05-05 | MISSING | UT Results/Register M4. |
| I05-06 | MISSING | Selected Point/Latest Reading M4/E5. |
| I05-07 | MISSING | Historical Readings/Documents M4/E7. |
| I05-08 | CONFLICT | Visible row count/High Risk label C01/C10. |
| I06-01 | MISSING | Five trend KPIs M2. |
| I06-02 | MISSING | Historical filters/monthly calendar queries M1/M2/E4. |
| I06-03 | MISSING | Four historical charts M2/M4/M5. |
| I06-04 | MISSING | Operational/Integrity Events Timeline/source references. |
| I06-05 | MISSING | Comparison by Segment/Loop M1/M2. |
| I06-06 | MISSING | Selected Trend/Statistics/actions M2. |
| I06-07 | CONFLICT | Codes/units/baselines/denominators C11-C14. |
| I06-08 | UNVERIFIED | Tiny event ID/ambiguous tick/unlabelled points. |
| I07-01 | MISSING | Treatment KPIs excluding cost-source gate M5. |
| I07-02 | MISSING | Injection filters M1/M5/E3. |
| I07-03 | MISSING | Dose/rate and scatter plots E4/M2/M5. |
| I07-04 | MISSING | Injection Points table M5. |
| I07-05 | MISSING | Selected Point/Trend Summary/Lab links M5/M3. |
| I07-06 | MISSING | Type Distribution/Performance Status M5. |
| I07-07 | BLOCKED | Commercial costs require verified external source C15. |
| I07-08 | CONFLICT | Normal/dose basis/loop identity C16-C18. |
| I07-09 | UNVERIFIED | Cropped charts/legend/footer/options. |
| I08-01 | MISSING | Five findings KPIs M6/E12. |
| I08-02 | MISSING | Findings filters M6/M8. |
| I08-03 | MISSING | Findings by Severity M6. |
| I08-04 | CONFLICT | Overdue treated as exclusive status C19. |
| I08-05 | MISSING | Findings Register/search/sort/paging M6. |
| I08-06 | MISSING | Selected Finding/Summary/Hypothesis M6. |
| I08-07 | MISSING | Related Loop/Evidence/Documents M1/M6/E7. |
| I08-08 | BLOCKED | Central action/controlled defect escalation E12. |
| I08-09 | CONFLICT | Source attribution/priority/dates C20-C22. |
| I08-10 | UNVERIFIED | Truncated descriptions/hidden menu options. |
| I09-01 | MISSING | Five alert KPIs M7/E12. |
| I09-02 | MISSING | Alert filters/search/sort/paging M7. |
| I09-03 | MISSING | Alerts/Events Register M7. |
| I09-04 | MISSING | Timeline/source event projection M7. |
| I09-05 | MISSING | Selected Alert/Summary/Source History M7/E4. |
| I09-06 | MISSING | Linked Trend/existing Findings M7/M6. |
| I09-07 | BLOCKED | Separate IC acknowledgement/action workflow. |
| I09-08 | CONFLICT | Source alarms/states/counts/units/ticks C23-C26. |
| I09-09 | UNVERIFIED | Timeline identities/timestamps/tooltips/options. |
| I10-01 | MISSING | Six configuration KPIs M8. |
| I10-02 | MISSING | Eight configuration subtabs/workspace M8. |
| I10-03 | MISSING | Mechanisms Library/table/filter/paging M8. |
| I10-04 | MISSING | Selected Item/model/version/input panel M8. |
| I10-05 | MISSING | Immutable Change History/document references M8/E7. |
| I10-06 | BLOCKED | Approval/edit/activation workflow. |
| I10-07 | UNVERIFIED | Seven unopened layouts/two unseen records. |
| I10-08 | CONFLICT | Models/references/Enabled draft/template placement C27-C30. |
| V-01 | BLOCKED | Every operational screenshot value/source ID lacks live verification. |
| V-02 | BLOCKED | Authenticated browser/navigation/responsive tests not performed. |
| V-03 | BLOCKED | Approved-revision immutability/domain permission safeguards absent. |
| V-04 | BLOCKED | Governed LIMS/UT/treatment/action integration not verified. |
| V-05 | CONFLICT | Shared shell/logo/footer/sidebar variants C31. |
| V-06 | UNVERIFIED | Hidden/cropped/ambiguous content has no verifiable atomic denominator. |

## 5. Consolidated reference payloads

All values are reference-only and inherit V-01. Printed dashes are not zero. Unlabelled line/bar/scatter points, target-band edges and unopened options are not numerical evidence. Table descriptions ending in ellipsis are not reconstructed. Common chart colors and controls are preserved as reference requirements, not implemented components.

### IMG-01 Overview — I01 groups

Six cards: Monitored Segments **52**, green up **+4 vs. last month**; Active Corrosion Loops **18**, **3 high risk**; Avg Corrosion Rate (mm/y) **0.12**, green down **-22% vs. last assessment**; High-Risk Segments **7**, **13% of monitored**; Inhibitor Performance **92%**, **Within target**; Data Confidence **87%**, **Good quality**.

Filters: Pipeline PL-001 - Main Pipeline; Segment All Segments; Corrosion Loop All Loops; Fluid Type All; Risk Level All; Date Range Last 12 Months; Apply/Reset.

Health Summary: **52 Segments**; green Normal 32 (61%), amber Watch 13 (25%), red High Concern 7 (13%). Corrosion Rate Trend: blue Loop IC-001, amber Loop IC-003, red Loop IC-007; Y Corrosion Rate (mm/y) 0.00/0.10/0.20/0.30/0.40; X Jan/Mar/May/Jul/Sep/Nov 2024, Jan 2025; info/ellipsis.

Active Corrosion Loops (18): Search corrosion loops..., Advanced Filters, checkboxes, View/chevrons. Columns Loop ID/Pipeline/Segment/Corrosion Mechanism/Current Rate (mm/y)/Inhibitor Status/Data Confidence/Status/Last Updated/Action.

| Loop | Pipeline | Segment | Mechanism | Rate | Inhibitor | Confidence | Condition | Updated |
|---|---|---|---|---|---|---|---|---|
| IC-001 | PL-001 | SEG-01 | CO₂ Corrosion (Sweet) | 0.08 | Optimal | High | Normal | 15 Jan 2025 |
| IC-002 | PL-001 | SEG-02 | MIC (SRB) | 0.15 | Effective | High | Watch | 12 Jan 2025 |
| IC-007 | PL-001 | SEG-03 | CO₂ Corrosion (Sweet) | 0.28 | Sub-optimal | High | High Risk | 10 Jan 2025 |
| IC-004 | PL-002 | SEG-01 | High CO₂ / Low pH | 0.22 | Optimal | Medium | Watch | 08 Jan 2025 |
| IC-005 | PL-002 | SEG-02 | MIC (SRB) | 0.07 | Effective | High | Normal | 07 Jan 2025 |
| IC-006 | PL-003 | SEG-01 | Acetic Acid Corrosion | 0.19 | Sub-optimal | Medium | Watch | 05 Jan 2025 |
| IC-008 | PL-003 | SEG-02 | CO₂ Corrosion (Sweet) | 0.31 | None | Medium | High Risk | 03 Jan 2025 |
| IC-009 | PL-004 | SEG-01 | MIC (SRB) | 0.11 | Effective | High | Normal | 02 Jan 2025 |

IC-007 selected. Show 10 entries; Showing 1 to 8 of 18 entries; pages 1/2, first/previous/next/last.

Process & Chemistry Snapshot (PL-001 | SEG-03): Temperature 68°C; Flow Regime Slug; Water Cut 18%; CO₂ 2.5 mol%; H₂S 50 ppm; pH 6.4; Chloride 120 mg/L; Inhibitor Injection 85 L/d.

Coupons / Probes / UT Monitoring (SEG-03): Latest Coupon Loss (90 days) 0.42 mm Normal; ER/LPR Probe Rate (avg last 30 days) 0.18 mm/y Watch; UT Wall Loss (max) 12% Watch; Last data update 10 Jan 2025 14:32; View Monitoring.

Top Findings / Actions: High corrosion rate on SEG-03 (0.28 mm/y); Inhibitor performance below target on IC-006; Increasing trend in CO₂ corrosion on SEG-02; Low pH detected on SEG-04 (pH 6.1); Review MIC risk on SEG-01 (based on recent lab results). View All and View Details per item.

Selected Corrosion Loop: IC-007/High Risk/PL-001 | SEG-03; View Details, View Trend, View in Asset Master, Raise Action, close. Pipeline PL-001 - Main Pipeline; Segment SEG-03 (KP 96.780 - 145.200); Fluid Type Multiphase (Oil/Gas/Water); Likely Mechanism CO₂ Corrosion (Sweet); Current Rate 0.28 mm/y; Last Assessment 10 Jan 2025; Inhibitor Status Sub-optimal; Data Confidence High; chemistry matches snapshot. Linked Documents (3), View All/downloads: IC-007_Assessment_2025-01-10.pdf (Assessment Report); Process_Data_IC-007.xlsx (Process & Chemistry Data); UT_Segment03_2024Q4.pdf (UT Wall Thickness Report).

### IMG-02 Corrosion Loops — I02 groups

Cards: Total Corrosion Loops 18 (+3 vs. last month); High-Risk Loops 4 (22% of total); Active Monitoring Points 36 (+12 vs. last month); Inhibited Loops 14 (78% of total); Loops Overdue for Review 3 (17% of total).

Filters Pipeline/Segment/Corrosion Loop/Fluid Type All Fluid Types/Status All Statuses/Date Range Last 12 Months; Apply/Reset.

Corrosion Loop Network: PL-001 - Main Pipeline; To CPF/To Terminal; IC-001/002/003 above network, IC-004/005/006 below; Normal (9) green, Watch (5) orange, High Risk (4) red; fullscreen. Corrosion Loop Risk Distribution: 18 Loops, Normal 9 (50%), Watch 5 (28%), High Risk 4 (22%); fullscreen.

Register (18): Search corrosion loops..., Advanced Filters; checkbox, Loop ID, Pipeline, Segment, Corrosion Mechanism, Fluid Service, Current Rate (mm/y), Inhibitor Status, Data Confidence, Health Status, Last Updated, Actions/ellipsis.

| Loop | Pipeline | Segment | Mechanism | Fluid | Rate | Inhibitor | Confidence | Health | Updated |
|---|---|---|---|---|---|---|---|---|---|
| IC-001 | PL-001 | SEG-01 | CO₂ Corrosion (Sweet) | Gas (Wet) | 0.05 | Optimal | High | Normal | 12 Jan 2025 |
| IC-002 | PL-001 | SEG-01 | H₂S Corrosion | Oil (Sour) | 0.12 | Effective | High | Watch | 11 Jan 2025 |
| IC-003 | PL-001 | SEG-01 | CO₂ / H₂S | Multiphase | 0.18 | Sub-optimal | Medium | Watch | 10 Jan 2025 |
| IC-004 | PL-001 | SEG-02 | CO₂ Corrosion (Sweet) | Multiphase | 0.28 | Sub-optimal | Medium | High Risk | 10 Jan 2025 |
| IC-005 | PL-001 | SEG-02 | MIC (SRB) | Produced Water | 0.22 | Optimal | Medium | Watch | 08 Jan 2025 |
| IC-006 | PL-001 | SEG-02 | CO₂ Corrosion (Sweet) | Oil (Sweet) | 0.07 | Effective | High | Normal | 07 Jan 2025 |
| IC-007 | PL-001 | SEG-03 | MIC (SRB) | Produced Water | 0.31 | Sub-optimal | Low | High Risk | 06 Jan 2025 |
| IC-008 | PL-002 | SEG-01 | CO₂ Corrosion (Sweet) | Gas (Wet) | 0.06 | Optimal | High | Normal | 05 Jan 2025 |
| IC-009 | PL-002 | SEG-01 | H₂S Corrosion | Oil (Sour) | 0.15 | Effective | Medium | Watch | 04 Jan 2025 |
| IC-010 | PL-002 | SEG-02 | CO₂ / H₂S | Multiphase | 0.24 | Sub-optimal | Medium | Watch | 03 Jan 2025 |

IC-004 selected; Show 10 entries; Showing 1 to 10 of 18 entries; pages 1/2. Average Corrosion Rate Trend: Normal blue/Watch amber/High Risk red; Y Corrosion Rate (mm/y), visible 0.0/0.2/0.4/0.6; Jan 2024–Jan 2025. Inhibitor Coverage: 78% Inhibited, Inhibited 14 (78%)/Not Inhibited 4 (22%). Loop Review Compliance: 83% On Schedule, On Schedule 15 (83%)/Overdue 3 (17%).

Selected Corrosion Loop IC-004/High Risk; View Trend, View Findings, View in Asset Master, Raise Action, close. Pipeline PL-001 - Main Pipeline; Segment SEG-02 (KP 20.5 - 48.3); Start / End KP 20.5 - 48.3 (27.8 km); Fluid Type Multiphase (Oil/Gas/Water); Corrosion Mechanism CO₂ Corrosion (Sweet); Status Monitoring; Health Status High Risk; Current Rate 0.28 mm/y; Inhibitor Sub-optimal; Confidence Medium; Updated 10 Jan 2025; Next Review Due 10 Feb 2025 (Overdue).

Latest Chemistry Snapshot (PL-001 | SEG-02), 10 Jan 2025: Water Cut 18%; pH 6.2; Temperature 62°C; CO₂ 2.8 mol%; H₂S 15 ppm; Chloride 78 mg/L. Documents: IC-004_Assessment_2025-01-10.pdf Assessment Report; Chemistry_Trend_IC-004.xlsx Process & Chemistry Data; Inhibitor_Review_IC-004.pdf Inhibitor Performance Review; View All/downloads.

### IMG-03 Process & Chemistry — I03 groups

Cards: Avg. Temperature 58.3°C (-6%); Avg. Water Cut 12.4% (-18%); Avg. CO₂ 0.28% (+12%); Avg. H₂S 25 ppm (-29%); Avg. pH 6.8 (+0.2); Avg. Chloride 42 mg/L (-15%); Process Stability 92% Within target. Deltas say vs. last month; green except CO₂ red.

Filters Pipeline/Segment/Loop/Operating Regime All (Steady + Transient)/Fluid Type All/Date Range Last 12 Months; Apply/Reset. Process & Chemistry Trends: Time Range Jan 2024 - Jan 2025, Monthly, information/fullscreen. Eight plots with ellipses:

| Plot | Legends | Visible Y ticks |
|---|---|---|
| Temperature (°C) | red Temperature, Target Range | 0/20/40/60/80/100 |
| Flow Regime | Single Phase blue/Bubbly green/Slug yellow/Annular orange | 0/25%/50%/75%/100% |
| Water Cut (%) | blue Water Cut, Target Range | 0/10/20/30/40 |
| CO₂ (% mol) | green CO₂, dashed red Threshold | 0.0/0.2/0.4/0.6/0.8 |
| H₂S (ppm) | orange H₂S, dashed Threshold | 0/50/100/150 |
| pH (Acidity) | purple pH, Target Range | 4/6/8/10 |
| Chloride (mg/L) | teal Chloride, dashed Threshold | 0/50/100/150 |
| Inhibitor Dosage (ppm) | blue Inhibitor Dosage, Target Range | 0/50/100/150 |

X ticks Jan/Apr/Jul/Oct 2024, Jan 2025. Target-band/threshold positions are reference geometry, not approved configuration.

Process Chemistry Snapshot PL-001 | 06 Jan 2025 10:00: Temperature 56.8°C; Water Cut 11.2%; CO₂ 0.26%; H₂S 18 ppm; pH 6.9; Chloride 38 mg/L; Inhibitor 85 ppm. Message: All key process parameters are within target ranges.

Laboratory Samples, View All:

| Sample ID | Date | Segment | Parameter | Result | Unit | Threshold | Trend |
|---|---|---|---|---|---|---|---|
| LAB-2025-001 | 06 Jan 2025 | SG-01 | pH | 6.8 | - | 6.5 - 8.5 | down |
| LAB-2025-002 | 06 Jan 2025 | SG-01 | Chloride | 42 | mg/L | < 100 | down |
| LAB-2024-998 | 02 Jan 2025 | SG-01 | CO₂ | 0.28 | % | < 0.50 | up |
| LAB-2024-997 | 02 Jan 2025 | SG-01 | H₂S | 25 | ppm | < 50 | down |
| LAB-2024-996 | 30 Dec 2024 | SG-01 | Iron | 12 | mg/L | < 20 | down |
| LAB-2024-995 | 28 Dec 2024 | SG-01 | Sulphate | 8 | mg/L | < 50 | down |

Chemistry Risk Matrix columns Risk Type/Status/Risk Level/Trend: Sweet Corrosion Low/Low/down; Sour Corrosion Medium/Medium/up; MIC Risk Low/Low/down; Under-Deposit Risk Medium/Medium/right; Scaling Risk Low/Low/down. Risk terminology conflict C01.

Selected Segment PL-001 | SG-01/Main Pipeline | Segment 01/Normal; Current Values active, Details unopened. Values match snapshot, green checks. Active Alarms (0)/No active alarms. Quick Actions View Trend/View Findings/Link Lab Report. Related Documents (3): Chemistry_Analysis_SG01_2025-01-06.pdf Laboratory Report; UA_Trend_Data_Jan2025.xlsx Process Data; Inhibitor_Program_PL001.pdf Treatment Program; View All/downloads.

### IMG-04 Coupons & Probes — I04 groups

Cards: Total Coupons 86 (+6 vs. last month); Total Probes 124 (+12 vs. last month); Due for Retrieval 18 (12% of total); Overdue Analysis 7 (8% of retrieved); Active ER/LPR Probes 98 (79% of total); Probe Data Health 92% Within target.

Filters Pipeline/Segment/Loop/Device Type All Types/Status All Statuses/Date Range Last 12 Months; Apply/Reset. Device Status Distribution: 210 Devices; In Service green 152 (72%), Due for Retrieval amber 18 (9%), Overdue red 7 (3%), Out of Service pale blue 12 (6%), Under Analysis blue 21 (10%).

Coupon Corrosion Rate Results: Average blue/Maximum red/Minimum green; Y Corrosion Rate (mm/y) 0.00/0.05/0.10/0.15/0.20/0.25; X PL-001–PL-005. Probe Trends (ER/LPR): ER Probes blue/LPR Probes orange; Y Corrosion Rate (mm/y) 0.00/0.05/0.10/0.15/0.20; X Jan/Mar/May/Jul/Sep/Nov 2024, Jan 2025. Retrieval Schedule (Next 6 Months): Coupons blue/Probes orange; Y Number of Devices 0/5/10/15/20; X Feb/Mar/Apr/May/Jun/Jul, no printed year.

Coupons & Probes Register (210): Search coupons, probes, IDs..., Advanced Filters, gear; checkbox, Device ID, Type, Pipeline, Segment, Location (KP), Install Date, Retrieve Date, Analysis Status, Corr. Rate (mm/y), Data Confidence, Condition, Action.

| Device | Type | Pipeline | Segment | KP | Install | Retrieve | Analysis | Rate | Confidence | Condition |
|---|---|---|---|---|---|---|---|---|---|---|
| C-001 | Coupon | PL-001 | SEG-01 | 12.450 | 12 Jan 2024 | 12 Jan 2025 | Completed | 0.08 | High | Good |
| P-001 | ER Probe | PL-001 | SEG-01 | 15.320 | 05 Feb 2024 | - | Monitoring | 0.06 | High | Good |
| P-002 | LPR Probe | PL-001 | SEG-02 | 18.900 | 18 Mar 2024 | - | Monitoring | 0.12 | Medium | Watch |
| C-002 | Coupon | PL-001 | SEG-02 | 21.100 | 10 Jan 2024 | 10 Jan 2025 | Under Analysis | - | - | - |
| P-003 | ER Probe | PL-002 | SEG-01 | 33.560 | 01 Apr 2024 | - | Monitoring | 0.04 | High | Good |
| C-003 | Coupon | PL-002 | SEG-01 | 34.200 | 15 Feb 2024 | 15 Feb 2025 | Overdue | - | - | - |
| P-004 | LPR Probe | PL-003 | SEG-03 | 56.780 | 20 May 2024 | - | Monitoring | 0.18 | Medium | Watch |
| C-004 | Coupon | PL-003 | SEG-04 | 62.110 | 12 Mar 2024 | 12 Mar 2025 | Completed | 0.11 | High | Good |
| P-005 | ER Probe | PL-004 | SEG-02 | 78.450 | 30 Jun 2024 | - | Monitoring | 0.07 | High | Good |
| C-005 | Coupon | PL-004 | SEG-02 | 81.900 | 08 Apr 2024 | 08 Apr 2025 | Due for Retrieval | - | - | - |

Location cells print KP before each number. View/chevrons; P-002 selected; Show 10 entries; Showing 1 to 10 of 210 entries; pages 1–5 and first/previous/next/last.

Selected Device P-002/LPR Probe/PL-001 | SEG-02 | KP 18.900; In Service; Installed 18 Mar 2024; signal icon; View Trend, View Asset, Schedule Retrieval, Raise Action. Details active; Latest Readings and Documents (3) unopened. Device ID P-002; Device Type LPR Probe; Pipeline PL-001 - Main Pipeline; Segment SEG-02; Location 18.900; Install Date 18 Mar 2024; Planned Retrieval 18 Mar 2026; Status In Service; Data Confidence Medium; Current Corr. Rate 0.12 mm/y; Condition Watch; Manufacturer Roxar; Model LPR-100; Serial Number LPR100-4587; Last Communication 12 Jan 2025 08:14; Battery Level 78%; Remarks Stable readings with slight increase since Nov 2024.

### IMG-05 UT / Monitoring — I05 groups

Cards: Monitored Locations 1,248 (+12% vs. last month); Low Wall Thickness Points 37 (+5 vs. last assessment); Avg. Corrosion Rate (mm/y) 0.12 (-18% vs. last assessment); Points Trending Down 24 (+8 vs. last assessment); Data Confidence 92% Good quality.

Filters Pipeline/Segment/Location / KP From-To km/UT Method All Methods/Status All/Date Range Last 12 Months; Apply/Reset. Wall Loss Trend: KP 12.350 red/45.120 orange/78.560 blue/102.310 green; Y Wall Loss (mm) 0.0/0.5/1.0/1.5/2.0/2.5; X Jan/Apr/Jul/Oct 2023, Jan/Apr/Jul/Oct 2024, Jan 2025. Profile: Pipeline UT Wall Thickness Profile; Color by Wall Thickness (mm); legend <4.0 red/4.0 - 6.0 orange/6.0 - 8.0 yellow/8.0 - 10.0 green/>10.0 dark green. KP 12.350 3.8 mm; KP 45.120 5.2 mm; KP 78.560 6.9 mm; KP 102.310 4.1 mm. Distance 0–180 km every 20 km.

UT Monitoring Results (1,248): Search location, segment..., Advanced Filters, ellipsis; checkbox, Location ID, Pipeline, Segment, KP (km), Method, Last Thickness (mm), Baseline Thickness (mm), Corrosion Rate (mm/y), Remaining Wall (%), Next Due Date, Status, Actions.

| Location | Pipeline | Segment | KP | Method | Thickness | Baseline | Rate | Remaining | Due | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| UT-001245 | PL-001 | SEG-01 | 12.350 | UT (Manual) | 3.8 | 10.0 | 0.28 | 38% | 15 Mar 2025 | Critical |
| UT-001246 | PL-001 | SEG-01 | 18.760 | UT (Automated) | 6.5 | 10.0 | 0.12 | 65% | 22 Mar 2025 | Watch |
| UT-001247 | PL-001 | SEG-02 | 24.110 | UT (Manual) | 7.8 | 10.0 | 0.08 | 78% | 10 Apr 2025 | Normal |
| UT-001248 | PL-001 | SEG-02 | 45.120 | UT (Automated) | 5.2 | 10.0 | 0.18 | 52% | 18 Mar 2025 | Watch |
| UT-001249 | PL-001 | SEG-03 | 63.450 | UT (Manual) | 8.1 | 10.0 | 0.06 | 81% | 30 Apr 2025 | Normal |
| UT-001250 | PL-001 | SEG-03 | 78.560 | UT (Automated) | 6.9 | 10.0 | 0.14 | 69% | 12 Apr 2025 | Watch |
| UT-001251 | PL-001 | SEG-04 | 102.310 | UT (Manual) | 4.1 | 10.0 | 0.22 | 41% | 20 Mar 2025 | High Risk |
| UT-001252 | PL-001 | SEG-04 | 118.670 | UT (Automated) | 7.5 | 10.0 | 0.10 | 75% | 28 Apr 2025 | Normal |

Eight visible rows; footer prints Showing 1 to 10 of 1,248 entries, Show 10 entries, pages 1–5 …125 and first/previous/next/last; View per row. Selected UT-001248/Watch/PL-001 | SEG-02 | KP 45.120 km; View Trend, View in Asset Master, Create Finding, More Actions.

Latest Reading: Inspection Date 12 Jan 2025; Method UT (Automated); Wall Thickness 5.2 mm; Baseline 10.0 mm; Corrosion Rate 0.18 mm/y; Remaining Wall 52%; Data Confidence High; Inspector UT-AUTO-01. Historical Readings (Date/Thickness mm/Wall Loss mm): 12 Jan 2025/5.2/4.8; 10 Oct 2024/5.4/4.6; 08 Jul 2024/5.6/4.4; 05 Apr 2024/5.8/4.2; 12 Jan 2024/6.1/3.9; View All.

Documents (3), View All/downloads: UT_Report_UT-001248_2025-01-12.pdf Inspection Report (2.4 MB); UT_Trend_Data_UT-001248.xlsx Trend Data (856 KB); Location_Photographs_UT-001248.pdf Photos (1.1 MB).

### IMG-06 Trends & Historical — I06 groups

Cards: Records Analyzed 125,430 (+18%); Avg. Corrosion Rate Trend 0.12 mm/y (-22%); Improving Segments 38 (+27%); Deteriorating Segments 14 (+40%); Data Completeness 94% (+6%); all deltas vs. previous period.

Filters Pipeline/Segment/Loop/Parameter Corrosion Rate (mm/y)/Time Range Jan 2024 - Jan 2025/Aggregation Monthly; Apply/Reset.

| Chart | Series/legends | Axes/ticks |
|---|---|---|
| Corrosion Rate Trend Over Time | PL-001 (Overall) blue; Loop IC-001 red; Loop IC-002 orange; Loop IC-007 green | Corrosion Rate (mm/y) 0.00–0.50 every .10 |
| Key Chemistry Parameters Over Time | pH blue; Chloride (ppm) green; Sulfide (ppm) orange; Conductivity (µS/cm) purple | left pH / Concentration (ppm) 0/50/100/150/200/250; right Conductivity (µS/cm) 0/400/800/1,200/1,600/2,000 |
| Inhibitor Dosage vs Corrosion Rate | blue bars Inhibitor Dosage (ppm); red Corrosion Rate (mm/y) | left Inhibitor Dosage (ppm) 0/50/100/150/200; right Corrosion Rate (mm/y), readable 0.00/.10/.20/.40, intermediate tick ambiguous |
| Wall-Loss Trend (from UT / ILI) | Measured Wall Loss blue; Predicted Trend dashed orange; Critical Limit dashed red | Wall Loss (mm) 0.0/.5/1.0/1.5/2.0 |

All charts X Jan/Mar/May/Jul/Sep/Nov 2024, Jan 2025; ellipsis. Critical line aligns visually with 1.5, not approved criterion evidence.

Operational & Integrity Events Timeline: Inspection blue; Chemistry Change green; Pigging orange; Inhibitor Adjustment purple; Finding red. Entries: 15 Jan 2024 UT Inspection (tiny ID unreadable); 12 Mar 2024 Chemistry Change/pH Adjustment; 03 May 2024 Pigging/Smart Pig; 18 Jul 2024 Inhibitor Increase/150 → 200 ppm; 22 Sep 2024 UT Inspection/PL-001; 11 Nov 2024 Chemistry Change/Chloride Control; 05 Jan 2025 Finding Created/High CR Detected.

Comparison by Segment / Loop: Search segments..., checkbox; Segment/Loop/Avg CR (mm/y)/Latest (mm/y)/Trend/Status.

| Segment | Loop | Average | Latest | Trend | Status |
|---|---|---|---|---|---|
| PL-001 | IC-001 | 0.08 | 0.06 | down -35% | Improving |
| PL-008 | IC-002 | 0.11 | 0.09 | down -28% | Improving |
| PL-015 | IC-003 | 0.16 | 0.18 | right +12% | Stable |
| PL-021 | IC-004 | 0.24 | 0.28 | up +31% | Deteriorating |
| PL-028 | IC-005 | 0.13 | 0.12 | down -18% | Improving |
| PL-032 | IC-007 | 0.15 | 0.22 | up +47% | Deteriorating |
| PL-037 | IC-008 | 0.09 | 0.07 | down -21% | Improving |
| PL-041 | IC-009 | 0.20 | 0.19 | right +5% | Stable |

Selected PL-032; Showing 1 to 8 of 8 entries; page 1/navigation. Selected Trend Details Loop IC-007; Pipeline PL-001 - Main Pipeline; Segment PL-032 (KP 120.3 - 145.8); Parameter Corrosion Rate (mm/y); Time Range Jan 2024 - Jan 2025; Aggregation Monthly. Statistics Minimum 0.06 mm/y; Maximum 0.28 mm/y; Average 0.15 mm/y; Latest Value 0.22 mm/y; Trend (Slope) +0.008 mm/y/month; Threshold 0.20 mm/y; Exceedances 3 months (25%). Export Trend/View Source Data/Create Finding/close.

### IMG-07 Inhibitor Performance — I07 groups

Cards: Inhibitor Performance 92% (+4% vs. last month); Active Injection Points 24 (+2); Average Dosage 0.28 ppm (+12%); Under-Dosed Locations 6 (25% of injection points); Cost vs Effectiveness $48K, Good (0.12 $/ppm); Treatment Stability 78% Within target.

Filters Pipeline/Segment/Corrosion Loop/Inhibitor Type All Types/Injection Point All Injection Points/Date Range Last 12 Months; Apply/Reset.

Inhibitor Dosage vs Corrosion Rate: blue Avg Inhibitor Dose (ppm), red Avg Corrosion Rate (mm/y); left Inhibitor Dose (ppm) 0.0/.2/.4/.6/.8/1.0; right Corrosion Rate (mm/y) .00/.05/.10/.15/.20; Jan–Dec 2024 then Jan 2025; info/ellipsis. Chemistry vs Inhibitor Performance: Normal green/Watch amber/Under-dosed red; scatter/dashed guide; X Inhibitor Concentration (ppm) 0.0–1.0 every .2; Y Corrosion Rate (mm/y) .00–.20 every .05; exact chemistry dimension/points unverified.

Injection Points (24): Search injection points..., Advanced Filters, Export, gear; checkbox, Point ID, Pipeline, Segment, Inhibitor Type, Target Dose (ppm), Actual Dose (ppm), Performance Status, Last Sample / Result, Cost Impact, Actions (trend/pencil/ellipsis).

| Point | Pipeline | Segment | Type | Target | Actual | Status | Sample / Result | Cost |
|---|---|---|---|---|---|---|---|---|
| IP-001 | PL-001 | SEG-02 | FFA | 0.50 | 0.18 | Under-dosed | 12 Jan 2025 / 0.14 | +$8.2K |
| IP-002 | PL-001 | SEG-03 | MEG | 0.30 | 0.28 | Normal | 14 Jan 2025 / 0.05 | -$1.1K |
| IP-003 | PL-001 | SEG-04 | MEG | 0.30 | 0.32 | Normal | 10 Jan 2025 / 0.06 | - |
| IP-004 | PL-002 | SEG-01 | FFA | 0.40 | 0.41 | Normal | 09 Jan 2025 / 0.04 | - |
| IP-005 | PL-002 | SEG-02 | Quat | 0.60 | 0.45 | Watch | 11 Jan 2025 / 0.09 | +$2.3K |
| IP-006 | PL-002 | SEG-03 | MEG | 0.30 | 0.12 | Under-dosed | 08 Jan 2025 / 0.16 | +$6.8K |
| IP-007 | PL-003 | SEG-01 | FFA | 0.40 | 0.48 | Normal | 13 Jan 2025 / 0.05 | - |
| IP-008 | PL-003 | SEG-02 | MEG | 0.30 | 0.29 | Normal | 12 Jan 2025 / 0.06 | - |
| IP-009 | PL-003 | SEG-03 | Quat | 0.50 | 0.47 | Watch | 10 Jan 2025 / 0.08 | +$1.9K |
| IP-010 | PL-003 | SEG-04 | FFA | 0.50 | 0.52 | Normal | 11 Jan 2025 / 0.04 | - |

Selected IP-001; Show 10 entries; Showing 1 to 10 of 24 entries; pages 1/2/3 and previous/next. Result unit unprinted in combined header; panel uses mm/y.

Lower charts: Inhibitor Type Distribution, 24 Injection Points, MEG (42%) pale blue/FFA (29%) teal/Quat (17%) orange; remaining legend cropped. Performance Status, 24 Injection Points, Normal (58%)/Watch (17%)/Under-dosed (25%). Monthly Inhibitor Cost vs Effectiveness, blue Inhibitor Cost (K$)/green Effectiveness (%); left Cost (K$) visible 20/40/60/80; right Effectiveness (%) 25/50/75/100; bottom/date labels cropped.

Selected Injection Point IP-001/Under-dosed/PL-001 | SEG-02 | Loop IC-01; View Trend/View Findings/Adjust / Review/Link Document/close. Trend Summary blue Inhibitor Dose (ppm), red Corrosion Rate (mm/y); Sep–Dec 2024/Jan 2025; left Dose (ppm) 0.0/.5/1.0; right Rate (mm/y) .00/.10/.20. Fields Pipeline PL-001 - Main Pipeline; Segment SEG-02 (KP 18.2 - 36.4); Corrosion Loop IC-01; Inhibitor Type Film Forming Amine (FFA); Target 0.50 ppm; Actual 0.18 ppm; Status Under-dosed; Last Sample Date 12 Jan 2025; Last Result (mm/y) 0.14; Cost Impact +$8.2K / year; Next Review 26 Jan 2025. Linked Lab Results (3), View All/downloads: LR-2025-001234/12 Jan 2025; LR-2024-001998/15 Dec 2024; LR-2024-001876/18 Nov 2024. Remaining lower content/footer cropped.

### IMG-08 Findings — I08 groups

Cards: Total Findings 68 (+12% vs. last 6 months); Open Findings 24 (+3 vs. last month); High-Priority Findings 14 (21% of total); Under Review 11 (16% of total); Actions Overdue 8 (12% of total).

Filters Pipeline/Segment/Finding Type All Types/Severity All Severities/Status All Statuses/Source All Sources/Date Range Last 12 Months; Advanced Filters/Apply/Reset. Severity donut 68 Findings: Critical red 6 (9%), High orange 14 (21%), Medium yellow 28 (41%), Low green 20 (29%). Status bars: Open blue 24, Under Review yellow 11, Closed green 18, Overdue red 8, Deferred grey 7; Y Number of Findings 0/5/10/15/20/25.

Findings Register (68): Search findings..., Columns, Export; checkbox, Finding ID, Pipeline, Segment, Source, Mechanism, Description, Severity, Confidence, Status, Owner, Due Date, Actions; sort indicators/ellipsis. Description prefixes below are truncated, not full text.

| Finding | Pipeline | Segment | Source | Mechanism | Description prefix | Severity | Confidence | Status | Owner | Due |
|---|---|---|---|---|---|---|---|---|---|---|
| FND-2024-011 | PL-001 | SEG-01 | Chemistry | CO₂ Corrosion | Elevated corrosion rate detec… | High | 87% | Under Review | S. Mitchell | 15 Jan 2025 |
| FND-2024-012 | PL-001 | SEG-03 | Coupon | MIC | MIC indications on coupon wit… | Critical | 92% | Open | R. Kumar | 10 Jan 2025 |
| FND-2024-010 | PL-001 | SEG-02 | Probe | CO₂ Corrosion | Increasing trend in corrosion … | High | 78% | Open | L. Chen | 22 Jan 2025 |
| FND-2024-009 | PL-002 | SEG-01 | UT | General Corrosion | Wall thickness reduction trend… | Medium | 65% | Closed | M. Al-Farsi | 05 Dec 2024 |
| FND-2024-008 | PL-001 | SEG-04 | Trend | Low pH | pH trending below target (pH … | High | 80% | Under Review | P. Santos | 18 Jan 2025 |
| FND-2024-007 | PL-003 | SEG-01 | Chemistry | H₂S Corrosion | H₂S detected above threshold… | Medium | 70% | Open | A. Brown | 25 Jan 2025 |
| FND-2024-006 | PL-002 | SEG-03 | Probe | CO₂ Corrosion | Localised high corrosion rate … | High | 85% | Closed | T. Nguyen | 02 Dec 2024 |
| FND-2024-005 | PL-001 | SEG-05 | UT | Erosion-Corrosion | Combined erosion-corrosion i… | Medium | 60% | Deferred | K. Ibrahim | 28 Jan 2025 |
| FND-2024-004 | PL-003 | SEG-02 | Coupon | MIC | MIC colonies found on retriev… | Low | 55% | Closed | J. Wilson | 14 Nov 2024 |
| FND-2024-003 | PL-002 | SEG-04 | Trend | Inhibitor Ineffectiv… | Decreasing inhibitor residual … | High | 82% | Open | D. Garcia | 20 Jan 2025 |

Selected FND-2024-011; Show 10 entries; Showing 1 to 10 of 68 entries; pages 1–5 …7 and first/previous/next/last.

Selected Finding: High Priority/FND-2024-011; High CO₂ corrosion rate detected - Segment SEG-01; View Details/View Evidence/Create Action/Send to Defect Manager/close. Summary: Pipeline PL-001 - Main Pipeline; Segment SEG-01 (KP 0.0 - 25.0); Source Chemistry (Online); Mechanism CO₂ Corrosion (Sweet); Severity High; Confidence 87% (High); Status Under Review; Owner Sarah Mitchell; Due Date 15 Jan 2025 (in 12 days).

Description: Elevated corrosion rate detected from online LPR probe (0.28 mm/y) with increasing CO₂ levels. Trend shows sustained increase over last 30 days.

Root Cause Hypothesis: Increased CO₂ in produced fluid due to reduced inhibitor effectiveness. Possible under-dosing at upstream injection point.

Related Loop IC-001 | CO₂ Control Loop A/View Loop. Evidence / Supporting Data (3)/View All: Online_LPR_Trend_SEG01_2024.xlsx 1.2 MB; Chemistry_Report_Nov2024.pdf 856 KB; Probe_Image_SEG01_2024-11-15.png 2.4 MB. Linked Documents (2)/View All: IC_RCA_Workshop_Notes.pdf 1.1 MB; Inhibitor_Dosing_Review.docx 420 KB.

### IMG-09 Alerts & Events — I09 groups

Cards: Active Alerts 24 (-20% vs. last month); Critical Alerts 6 (+2 vs. last month); Events Today 8 (-33% vs. yesterday); Acknowledged Alerts 14 (+40% vs. last month); Requiring Action 10 (+3 vs. last month).

Filters Pipeline/Segment/Alert Type All Types/Severity All Severities/Status All Statuses/Source All Sources/Date Range Last 30 Days; Apply/Reset. Register (24): Search alerts, events, parameters..., Advanced Filters, ellipsis; checkbox, Alert/Event ID, Type, Pipeline, Segment, Related Loop, Parameter, Trigger Value, Threshold, Severity, Status, Raised Time descending, Acknowledged By, Action vertical ellipsis.

| ID | Pipeline | Segment | Loop | Parameter | Trigger | Threshold | Severity | Status | Raised | Acknowledged |
|---|---|---|---|---|---|---|---|---|---|---|
| IC-A-2025-001 | PL-001 | SEG-01 | IC-001 | pH | 6.4 | < 6.8 | Critical | Open | 22 Jan 2025 14:32 | - |
| IC-A-2025-002 | PL-001 | SEG-02 | IC-002 | CO₂ (Corrosion Driver) | 120 ppm | > 100 ppm | High | Open | 22 Jan 2025 11:17 | - |
| IC-E-2025-003 | PL-002 | SEG-01 | IC-003 | Inhibitor Injection | - | - | Medium | Closed | 22 Jan 2025 09:05 | Sarah Lee |
| IC-A-2025-004 | PL-001 | SEG-03 | IC-004 | Corrosion Rate (mm/y) | 0.28 | > 0.25 | High | In Progress | 21 Jan 2025 18:41 | Michael Tan |
| IC-A-2025-005 | PL-003 | SEG-02 | IC-007 | Bacteria (SRB) | 1.2E+04 | > 1.0E+04 | High | Open | 21 Jan 2025 16:20 | - |
| IC-E-2025-006 | PL-001 | SEG-01 | IC-001 | Pig Passage | - | - | Low | Closed | 21 Jan 2025 14:12 | Priya Nair |
| IC-A-2025-007 | PL-004 | SEG-01 | IC-005 | H₂S | 52 ppm | > 50 ppm | High | Open | 21 Jan 2025 10:33 | - |
| IC-A-2025-008 | PL-002 | SEG-03 | IC-006 | Differential Pressure | 18 bar | > 15 bar | Critical | Open | 20 Jan 2025 22:17 | - |
| IC-E-2025-009 | PL-003 | SEG-01 | IC-007 | Coupon Retrieval | - | - | Low | Closed | 20 Jan 2025 15:01 | Daniel Wong |
| IC-A-2025-010 | PL-001 | SEG-02 | IC-002 | Temperature | 68°C | > 65°C | Medium | Acknowledged | 20 Jan 2025 11:48 | John Doe |

Type icons A-001/A-008 red warning, other A orange warning, E blue information. Severity Critical red/High orange/Medium yellow/Low green; status Open red/Closed green/In Progress blue/Acknowledged purple. Show 10 entries; Showing 1 to 10 of 24 entries; pages 1–3 and first/previous/next/last.

Recent Alerts & Events Timeline (Last 30 Days): Critical red triangle/High orange triangle/Medium yellow triangle/Low green circle/Event blue circle; rows PL-001–PL-004. Printed ticks 24 Dec/27 Dec/30 Dec/02 Jan/05 Jan/08 Jan/11 Jan/14 Jan/17 Jan/23 Jan/23 Jan. Duplicate tick unresolved. Marker IDs/exact timestamps not printed; overlaps prevent certified unique-event counts.

Selected Alert / Event IC-A-2025-001/Low pH Detected/Open; Pipeline PL-001 | Segment SEG-01 | Loop IC-001; Acknowledge/View Trend/View Details/Create Action/close. Summary Parameter pH; Trigger Value 6.4; Threshold <6.8; Severity Critical; Raised Time 22 Jan 2025 14:32 (2 hours ago); Source Process Historian (PI); Description pH below acceptable limit in Loop IC-001. Potential for increased corrosion risk.

Source History/View All: Time/Value/Source; 22 Jan 2025 14:32/6.4/PI; 13:32/6.6/PI; 12:32/6.7/PI; 11:32/6.9/PI; 10:32/7.0/PI (same date). Linked Trend/View Trend. Associated Findings (2)/View All: FND-2024-018 Low pH Correlation with MIC Risk; FND-2024-027 Recurring pH Excursions in SEG-01. Existing Finding_ID references only.

### IMG-10 Configuration — I10 groups

Cards: Configured Loops 52 (+4 vs. last month); Active Thresholds 28 (+12%); Configured Inhibitor Profiles 15 (+3); Parameter Mappings 24 Within target; Pending Configuration Changes 3 Requires review; Configuration Compliance 92% Within target.

Eight subtabs: Corrosion Mechanisms Library active; Threshold Rules; Data Confidence Rules; Inhibitor Libraries; Loop Setup; Parameter Mappings; Notification Rules; Display Settings. **Seven unopened layouts/options/threshold fields remain UNVERIFIED.**

Library description: Configure and manage internal corrosion mechanisms, definitions, models and associated parameters. Add Mechanism/ellipsis; Search mechanisms...; Mechanism Type All; Status All; Apply/Reset. Table checkbox, Mechanism / Category, Description, Current Setting, Source, Status, Last Updated, Actions View/chevron.

| Mechanism / Category | Description | Setting | Source | Status | Updated / Actor |
|---|---|---|---|---|---|
| CO₂ Corrosion (Sweet) / Acid Gas Corrosion | Carbon dioxide induced corrosion in sweet environments | Enabled (Default Model) | KLINTHRU Library | Active | 12 Jan 2025 / JDoe |
| H₂S Corrosion (Sour) / Acid Gas Corrosion | Hydrogen sulfide induced corrosion in sour environments | Enabled (DeWaard) | NACE SP0775 | Active | 08 Jan 2025 / ASmith |
| MIC / Microbiologically Influenced | Microbial induced corrosion | Enabled (Bacterial Model) | KLINTHRU Library | Active | 10 Jan 2025 / JDoe |
| Oxygen Corrosion / Oxidizing Environment | Dissolved oxygen corrosion | Enabled (Empirical) | KLINTHRU Library | Active | 03 Jan 2025 / MChen |
| Acid (Low pH) / Low pH Corrosion | Low pH / high acidity corrosion | Enabled (pH Model) | Literature | Active | 21 Dec 2024 / RPatel |
| High Temperature / High Temperature | High temperature corrosion | Enabled (Temperature Model) | KLINTHRU Library | Active | 18 Dec 2024 / LWilson |
| Flow Accelerated Corrosion / FAC | Flow accelerated corrosion | Enabled (EFC Model) | EFC Guidelines | Under Review | 10 Jan 2025 / JDoe |
| Galvanic Corrosion / Galvanic | Galvanic effects between dissimilar metals | Enabled (Empirical) | KLINTHRU Library | Active | 05 Jan 2025 / TNguyen |
| Acid Gas + MIC (Synergistic) / Combined Mechanisms | Combined CO₂/H₂S and MIC effects | Enabled (Composite Model) | KLINTHRU Library | Draft | 12 Jan 2025 / JDoe |
| Other / Custom / Custom | User defined corrosion mechanism | Disabled | User Defined | Inactive | 05 Dec 2024 / SAllen |

Show 10 entries; Showing 1 to 10 of 12 entries; previous/page1/page2/next. Two unseen records unverified. Selected Configuration Item CO₂ Corrosion (Sweet)/Acid Gas Corrosion/Active; Edit/View Rules/Open Related Mapping/close. Description Carbon dioxide induced corrosion in sweet environments; Model Default KLINTHRU CO₂ Model; Version v2.1; Source KLINTHRU Library; Applicable Phases Gas, Liquid, Two-Phase; Key Parameters pH, Temperature, pCO₂, Flow Rate; Last Updated 12 Jan 2025 14:32 (JDoe).

Change History/View All: Updated model version to v2.1 — 12 Jan 2025 14:32 by JDoe; Modified parameter set (pH, pCO₂) — 03 Jan 2025 10:14 by MChen; Updated description — 18 Dec 2024 16:20 by LWilson; Created configuration — 01 Dec 2024 09:12 by SAllen.

Linked Standards & Documents/View All: NACE SP0775 – CO2 Corrosion in Oil and Gas Pipelines/1.2 MB/12 Dec 2024; KLINTHRU CO₂ Model Technical Note/856 KB/03 Jan 2025; Internal Corrosion Assessment Procedure/423 KB/10 Nov 2024. Titles do not establish standard applicability or approved model identity.

### Shared reference content and unknowns

Ten tabs in source order: Overview; Corrosion Loops; Process & Chemistry; Coupons & Probes; UT / Monitoring; Trends & Historical; Inhibitor Performance; Findings; Alerts & Events; Configuration.

Header Internal Corrosion; description Assess internal corrosion mechanisms, rates, inhibition effectiveness and segment condition using process, chemistry and monitoring data. Breadcrumb Home > Corrosion Management > Internal Corrosion; Findings/Alerts & Events append their tab in those references. Export/Add Assessment except IMG-08 Add Finding and IMG-10 Add Configuration.

KLINTHRU/PIPELINE INTEGRITY MANAGEMENT; DATA TODAY. SAFER TOMORROW.; Search (Pipeline, Asset, Tag, Document...); notification 3/help/JD/John Doe/Integrity Manager/chevron. Identity/counts must remain session-based.

Sidebar groups ASSET & DATA FOUNDATION; MONITORING & OPERATIONS; INTEGRITY ASSESSMENT; INTEGRITY MANAGEMENT; REPORTING & OUTPUT; Settings & Administration. Links Dashboard/Pipeline / Asset Master/Integration Hub/Document Management/Sensors/SCADA/Cathodic Protection/Corrosion Management/Internal Corrosion/External Corrosion/ECDA Assessment (some images ECA Assessment)/ILI Analysis/Defect Manager/Risk Assessment/AI Predictions/Reports & Analytics. IMG-04 additionally shows Settings/User Management/Audit Trail. Shell variations do not authorize shared-shell changes.

Footer generally Version 1.0.0/Confidential/©2025 KLINTHRU. All rights reserved.; IMG-08 ©2024; IMG-05 version in sidebar; IMG-07 bottom cropped. Branding straplines/logos vary and tiny text is not certified verbatim. All hidden menus/tooltips/options, unlabelled chart points, cropped content and truncated text remain UNVERIFIED.

## 6. Confirmed historical-query blockers and additive proposal

### Existing contract — do not modify

`backend/src/utils/scadaData.ts:172–213` and `routes/scada.ts:78` enforce:

- hours 0.5–720; requested explicit ranges must also be positive and at most 720 hours (30 days).
- resolutionMinutes integer 1–1440; buckets are fixed-duration epoch-aligned buckets.
- Raw/Average/Min/Max/Sum only. **No calendar-month aggregation.**
- Raw capped at 5000 samples; larger ranges fail, not paginate.
- aggregation includes Good-quality values matching the tag unit; missing/flagged counts have source-specific semantics.
- response does not provide a complete per-point contributing-reading-ID manifest.

Thus year-long reference charts cannot be served by one current historical call. A 31-day month also exceeds one allowed query. SCADA completeness is not automatically module-wide confidence/completeness.

### Additive IC historical service — proposed, not implemented

Add an IC-owned read-only query/orchestration service and endpoint. Keep all existing SCADA routes, validation, historian data and source schemas unchanged. Reuse source access checks; do not widen visibility by querying with a service account.

Option A, preferred for faithful use of existing source contracts: split each calendar interval into half-open UTC queries of at most 30 days. Raw calls must recursively shorten intervals when the 5000 cap is reached. Bound concurrency, total samples, time span and memory; return explicit unavailable/too-dense results when safe limits cannot retrieve a complete set. Deduplicate boundary overlap using actual source identity where available, not timestamp alone. The existing response lacks reading IDs: **complete measurement-level lineage remains BLOCKED** under an API-only strategy until an approved authoritative provenance mechanism is selected.

Option B, separate approval: an IC backend adapter performs authorized read-only selection of existing source tables through an approved internal repository interface, returning reading IDs and metadata. No source-table/schema changes and no duplicate storage. This requires source-owner approval, access parity and query-performance review; it is not permission to alter SCADA internals. If source-owner policy disallows this access, keep detailed lineage blocked.

Calendar aggregation: choose an explicit timezone; derive calendar-month boundaries in that timezone and convert to UTC. Preserve daylight-saving transitions, variable month length and [start,end) boundaries. Do not average averages. Sample means require sum/count or complete raw points; time-weighted methods need an approved method and gap/interpolation policy. CO₂ basis, pH aggregation, rates and treatment effectiveness need parameter-specific methods, not one universal average. No fabricated interpolation or flat-filled missing months.

Proposed result fields: scope IDs and loopRevisionId; parameter/source references; unit/basis; start/end/timezone; bucketStart/bucketEnd; value or null; valid/expected/flagged coverage; quality/freshness; methodId/version; source-query manifest; provenance completeness; warnings. Monthly buckets can be null/Not Available. Do not persist raw readings or create a second historian. An audited engineering result may retain result/provenance references after separate persistence approval, not copies of source history.

## 7. Immutable engineering revisions — additive design

Keep existing Assessment/ExternalPipeData behavior and records unchanged. Propose IC-owned entities/revisions referencing legacy assessment identity where useful; do not relabel old screening records as approved engineering results.

Required invariants:

1. Stable identity plus explicit revision ID, effectiveFrom/effectiveTo, transaction createdAt, author, method/version and approval state.
2. Approved/accepted assessment inputs, interpretation, scope, evidence references, confidence and method version become immutable. Corrections create superseding revisions; do not update historical outcomes or rerun old methods silently.
3. Effective-dated loop scope links segments/assets by ID. Prevent ambiguous overlapping approved scope revisions for the same identity; define backdating/supersession policy explicitly.
4. Each result references the loop revision and configuration/model/rule revisions effective for its approved calculation policy. Assessment date, source measurement date, approval date and effective date are distinct.
5. Calculations preserve source reading/result IDs, units/basis, timestamps/timezone, quality, freshness, model inputs and validation decision. Historical reproducibility must be tested if source retention can remove readings.
6. Append-only audit events contain actor ID, server timestamp, action, reason, affected revisions and before/after references. Approval/rejection and supersession are auditable; destructive deletion of approved history is prohibited.
7. Draft concurrency protection, reviewer authorization, idempotent submission and transactional approval are required. Actor identity cannot be accepted from untrusted request text.

These safeguards need **separate approval for additive IC persistence/schema/migration work**. This audit does not alter any schema or authorize migration execution. Under a strict no-schema-change implementation phase, these remain blocked rather than simulated in JSON/local storage.

## 8. Separate IC and SCADA acknowledgement

Existing `PATCH /api/scada/alarms/:id/acknowledge` (`routes/scada.ts:110`) changes SCADA-owned klinthruStatus/acknowledgedAt/acknowledgedBy and excludes Viewer. It is not an IC acknowledgement endpoint.

Propose a distinct IC alert identity, source-reference relationship and IC acknowledgement event/endpoint. The IC operation records engineer review only; it must never invoke the SCADA acknowledgement route, modify source alarm state, clear measurements or mark the actual condition resolved. No copied SCADA alarm row.

Separate fields/contracts: IC workflow state; sourceConditionState with observedAt; sourceAlarmReference where applicable; ruleRevisionId; acknowledgedBy/At; resolvedAt and resolution evidence; closedAt and reason; central Action_ID links; existing Finding_ID links. Repeated acknowledgement must be idempotent with an audit trail. Condition recovery does not erase acknowledgement history. Source outages become stale/unknown, not healthy/resolved. Reopening/debounce/hysteresis and rule-change behavior need approval.

Only derived corrosion-domain conditions belong here. Raw SCADA pressure alarms, sensor battery alerts and CP alarms remain owned and acknowledged in their modules. IC can navigate to source records without acknowledging them.

## 9. Required additive entities and relationships

Names below are conceptual proposals, not existing physical tables or a finalized migration.

| Entity group | Required fields/relationships | Gate |
|---|---|---|
| CorrosionLoop/Revision/Scope | stable ID, revision, pipeline/segment/asset references, KP range, service, mechanism applicability, engineer, review frequency, status, notes, effective dates | G2/G3 |
| IC AssessmentRevision | assessment ID, loopRevisionId, method/model revision, engineering inputs, accepted result references, source cutoff, author/reviewer/approval/effective dates | G2/G3 |
| MechanismAssessment/RateResult | mechanism ID, source reading/result refs, rate unit, calculation steps/method/version, acceptance/validation, confidence ref | G2/G3/G4 |
| ConfidenceResult/Indicator | versioned rule, freshness/coverage/quality/recency inputs, result/category/period and threat indicator, not Risk_ID | G2/G3/G4 |
| CouponAnalysis/Exposure reference | existing asset/coupon ID, exposure/retrieval dates, weight/area/loss units and original result IDs, pitting/deposits, lab/inspector/document references | G3/G4 |
| UT Interpretation/source reference | existing MonitoringPoint ID, source UT_Reading_ID, baseline/current/source dates/method/quality, rate calculation/version, ILI links only where correlated | G3/G4 |
| InjectionPoint engineering link/TargetRevision/TreatmentAssessment | existing equipment asset ID, loop revision, inhibitor profile, approved target/unit/basis, actual-dose source ref, availability, accepted rates/chemistry, review date, effectiveness method | G3/G4 |
| Finding/Revision/Evidence/Review | Finding_ID, pipeline/segment/loop revision/KP, type/mechanism, severity/confidence/status, description/hypothesis, source/evidence refs, engineer/dates, central action and confirmed defect links | G3/G5 |
| IC Alert/Condition/Acknowledgement | IC identity, versioned rule and trigger source, condition/workflow separation, acknowledgement and resolution evidence, finding/action refs | G3/G5 |
| Configuration/Mechanism/Model/Rule revisions | required inputs/service/reference, version, approval/effective dates, thresholds/confidence/inhibitors/mappings/notifications/display settings, audit history | G2/G3/G4 |
| SourceEvidence/Document reference links | source owner/type/record ID, timestamp/unit/quality/freshness, Document_ID/Version_ID; no duplicated binary/raw history | G3/G4 |
| AuditEvent | actor/action/reason/server time/revision references; append-only | G3/G5 |

Do not duplicate Pipeline Master, Sensor hardware, LIMS results, ILI anomalies, raw SCADA histories, official Defect/Risk records or document binaries. A loop is an engineering grouping, not a new physical segment.

## 10. Proposed API contracts and permissions

All routes below are **proposals requiring approval**, not working endpoints. Existing source APIs remain unchanged. Prefer an additive `/api/internal-corrosion` router with explicit source-authorized joins.

| Proposed contract | Purpose |
|---|---|
| GET /overview | authorized aggregates with cohort, asOf, unit/method/provenance and unavailable reasons |
| GET /loops; GET /loops/:id/revisions | loop register/scopes/effective revisions/details |
| GET /process-chemistry | source-backed current values, sample references, quality/freshness |
| GET /monitoring; GET /monitoring/:id | coupon/probe projections separating hardware health from corrosion |
| GET /ut; GET /ut/:id/history | original reading references plus versioned interpretations; no copied ILI |
| GET /history | bounded calendar query service described in section 6 |
| GET /treatment; GET /treatment/:id | target/actual/availability/chemistry/rate provenance and interpretation |
| GET /findings; GET /findings/:id | authorized filters/sort/pagination and evidence |
| GET /alerts; GET /alerts/:id; GET /events | derived alerts/source-event projections and lifecycle |
| GET /configuration; GET /configuration/:id/revisions | approved/draft configuration distinguished, audit references |
| GET /source-references/:id | authorized source navigation/provenance; never credentials |
| Export/report integration | central report service reads accepted IC data, no second corrosion store |
| Draft/submit/review/approve/supersede operations | separate engineering write approval, concurrency, audit and idempotency |
| POST /alerts/:id/acknowledgements | IC-only review event, no SCADA mutation |
| Finding action/escalation integration | obtain one central Action_ID; correlate existing defects before candidate review |

Response contract common fields: stable ID/revision ID; authoritative master/source IDs; asOf/sourceTimestamp/receivedAt/timezone; unit and basis; quality/freshness/confidence; rule/method/model versions; approval/effective dates; missingReason; pagination total/filters/sort; source-link accessibility. Null is not zero. Unavailable data must render Not Available; stale values retain timestamps and cannot appear live.

Permission proposal: authenticated authorized Viewer reads/exports permitted scope only; Engineer drafts/analyses/reviews/acknowledges according to an approved policy; designated Approver activates revisions; Admin controls access but cannot silently rewrite history. Current schema only has Admin/Engineer/Viewer, so do not invent new persisted roles without approval. Decide whether approval is a permission assigned within existing roles and whether self-approval is forbidden. Check source/document access independently; avoid ID enumeration, cross-owner joins and leaking inaccessible document metadata. Runtime authorization remains untested.

## 11. Unresolved conflicts and approval decisions

No conflict below is resolved by substituting screenshot values.

| ID | Conflict/decision needed |
|---|---|
| C01 | High Risk/High-Risk Segments/Loops, Chemistry Risk Matrix/Risk Level and MIC Risk wording conflict with threat ownership. DOCX requires High Internal Corrosion Threat/High Concern; choose exact approved labels while preserving official Risk_ID ownership. |
| C02 | IC-007/IC-004 and other loops have different pipeline/segment/mechanism/rate assignments across references. Require authoritative identity, timestamps and effective revisions. |
| C03 | Review due dates marked Overdue without a consistent as-of date; cannot freeze screenshot relative dates. |
| C04 | SG-01 versus SEG-01 and IC-01 versus IC-001 require explicit source-ID mapping, not silent normalization. |
| C05 | 52 monitored/configured loops/segments versus 18 operational loops and other totals need scoped definitions. |
| C06 | CO₂ %/mol%/ppm/pCO₂, chloride mg/L versus ppm, sulfide versus H₂S require analyte/basis and approved conversions; not interchangeable by label. |
| C07 | Healthy probe hardware can show severe corrosion; battery/communication belongs to Sensors, corrosion interpretation to IC. |
| C08 | Due for Retrieval 18 shown as 12% in KPI but 9% of 210 in donut; denominators/exposure/retrieval/analysis states require definitions. Coupon loss mm is not mm/y without a validated method. |
| C09 | UT Wall Loss chart decreases while selected cumulative loss rises 3.9→4.8 mm; selected rate 0.18 mm/y is not established by 6.1→5.2 mm over about one year. Require matched points/method, do not recalculate guessed values. |
| C10 | UT footer reports ten displayed records while eight rows are visible; distinguish illustration from actual pagination. |
| C11 | IMG-06 Segment column uses PL-xxx IDs; cannot assume pipeline-style labels identify valid segments. |
| C12 | Jan 2024–Jan 2025 has thirteen visible month positions, but 3 months (25%) implies twelve; define interval inclusivity and coverage denominator. |
| C13 | Trend percentage baseline is unspecified: 0.08→0.06 is not -35% relative to displayed average; baseline may differ, so do not label the figure erroneous without evidence. |
| C14 | Dimensionless pH shares a concentration axis; chemistry units, completeness, slopes and predicted-vs-measured series need approved semantics. |
| C15 | DOCX requires removing cost views without reliable ERP/chemical-system/approved commercial source. $48K, $/ppm and annual cost impacts lack source/currency/period/formula. Approve omission when no reliable source exists. |
| C16 | Treatment Normal differs from DOCX Optimal/Effective/Watch/Sub-optimal/Under-dosed/Unknown. Approve status mapping. |
| C17 | 0.28 ppm dosage, 85 ppm dosage, 85 L/d injection and 150→200 ppm event may represent distinct scopes/quantities; no direct conversion without flow/product basis. |
| C18 | Selected injection point's latest chart position versus 0.18 ppm panel cannot be reconciled from unlabelled points. |
| C19 | Overdue finding is a date/action condition, not a DOCX recommended exclusive finding status. Decide orthogonal overdue flag versus approved state. |
| C20 | High-Priority count equals High severity count while Critical records exist. Priority and severity need distinct approved rules. |
| C21 | Finding source Chemistry (Online) versus description citing LPR; identify primary and supporting sources separately. Hypothesis is not confirmed cause. |
| C22 | 15 Jan 2025 (in 12 days) and red date cells lack a consistent as-of clock. Confidence percentages/categories have no approved method. |
| C23 | Differential Pressure/Temperature entries could be SCADA alarms; retain only a distinct justified corrosion-domain derivation, never duplicate source alarms. |
| C24 | In Progress differs from DOCX Investigating. Active Alerts 24 versus mixed closed events in register 24 needs scope/state definitions. Acknowledgement must not imply resolution. |
| C25 | Bacteria 1.2E+04 lacks unit/sample basis; missing rule versions, threshold validity and source quality cannot be guessed. |
| C26 | Timeline repeats 23 Jan; exact event IDs/timestamps/tooltips are absent. Relative '2 hours ago' needs live as-of/timezone. |
| C27 | DeWaard/EFC/Default/Bacterial/pH/Composite named models and SP0775 reference applicability need technical verification, not invented formulas. |
| C28 | Enabled on Draft/Under Review rows must not mean an unapproved model executes. Active is not approval evidence. |
| C29 | DOCX includes assessment-method templates but screenshot has eight subtabs; decide placement without inventing a ninth screenshot tab. Under-deposit mechanism may be one of two unseen rows; unverified. |
| C30 | Effective dates, approvers, method/rule revision links and complete audit before/after evidence are missing from the screenshot surface and current IC contracts. |
| C31 | Logo/sidebar/strapline/footer variants, ECA versus ECDA, 2024 versus 2025 copyright, shared Settings variations conflict. Preserve current shell; no global redesign authorized. |
| C32 | Existing SCADA query limit and fixed buckets cannot directly deliver reference historical range/monthly semantics; choose an additive adapter and approve provenance strategy, not a source API change. |
| C33 | Existing mutable screening/save/delete behavior must remain, but must not be represented as immutable approved engineering history. Approve separate IC entities and linking policy. |

## 12. Image-by-image implementation plan (not executed)

Preserve the single existing IC route and shell. Add tab content within it after structural approval. Keep the screening form as a clearly accessible existing workflow; exact entry placement needs approval. Build UI with Not Available for missing verified values, no reference-record seeding and no unsupported enabled actions. Backend definitions must precede claims of operational completion.

| Order | Frontend deliverable | Backend/data deliverable | Acceptance gate |
|---|---|---|---|
| Foundation | ten-tab container, approved missing/stale states, filter/panel primitives using existing styling | owned-ID contracts, source access policy, revision/approval model, read-only source adapters | G1–G4 |
| IMG-01 | six cards, filters, health/rate charts, loops table, snapshots, findings summary, drawer | scoped accepted-result aggregates and source lineage | source-backed KPI definitions; C01–C06 |
| IMG-02 | network, distribution, register, review/coverage charts, details | effective loop revisions/scope, engineer/review links | no duplicate segments; immutable history |
| IMG-03 | seven cards, eight plots, samples, snapshot, selected segment | SCADA/LIMS mappings, units, source thresholds and confidence | no second LIMS/historian; approved unit basis |
| IMG-04 | six cards, device distribution, rates, probe/retrieval charts, register/drawer | physical asset references, coupon exposure/results, accepted probe analyses | hardware health separated; hidden tabs only approved content |
| IMG-05 | five cards, UT plot/profile, result/history tables/drawer | original reading references, validated rate calculations and ILI correlation | C09 resolved; no duplicated readings/anomalies |
| IMG-06 | five cards, filters, four plots, event overlays, comparison/statistics | bounded calendar-history adapter, accepted result queries and source-event projections | 30-day/chunk/lineage/month semantics validated |
| IMG-07 | six card positions subject to approved cost omission, plots, injection register/drawer | target revision, actual-dose reference, availability, treatment method; commercial source only if approved | no equipment duplication or guessed costs |
| IMG-08 | KPIs, filters, severity/status charts, register/evidence panel | finding revisions/reviews, source refs, central actions and controlled defect linking | Finding_ID ≠ Defect_ID; one physical defect/ID |
| IMG-09 | five cards, filters, register, timeline, alert/source-history panel | versioned IC-derived rules/conditions and separate acknowledgement | IC ack does not write SCADA; condition ≠ workflow |
| IMG-10 | six cards, eight subtabs, visible library/table/details/history | approved config/model/rule versions, effective dates/audit/reference docs | seven unopened layouts require evidence/approval |

Backend foundations may be designed before screenshot order; user-facing implementation/review remains IMG-01 through IMG-10. Do not enable future tabs with fabricated records. Complete independent read-only/UI work only within the approved phase; an unresolved source blocks its live binding, not permission to guess it.

## 13. Planned files — proposals only

No file below has been created/modified by this audit except this report. Names are proposed locations consistent with existing architecture, not renames or refactors.

| Proposed file | Change / approval |
|---|---|
| frontend/src/app/internal-corrosion-assessment/page.tsx | Small additive workspace mount retaining screening/history; G2 |
| frontend/src/components/internal-corrosion-workspace.tsx | New ten-tab container, no shared-shell replacement; G2 |
| frontend/src/components/internal-corrosion-overview.tsx | IMG-01; G2 |
| frontend/src/components/internal-corrosion-loops.tsx | IMG-02; G2 |
| frontend/src/components/internal-corrosion-process-chemistry.tsx | IMG-03; G2 |
| frontend/src/components/internal-corrosion-coupons-probes.tsx | IMG-04; G2 |
| frontend/src/components/internal-corrosion-ut-monitoring.tsx | IMG-05; G2 |
| frontend/src/components/internal-corrosion-trends.tsx | IMG-06; G2 |
| frontend/src/components/internal-corrosion-inhibitor-performance.tsx | IMG-07; G2 |
| frontend/src/components/internal-corrosion-findings.tsx | IMG-08; G2 |
| frontend/src/components/internal-corrosion-alerts-events.tsx | IMG-09; G2 |
| frontend/src/components/internal-corrosion-configuration.tsx | IMG-10; G2 |
| frontend/src/lib/internalCorrosionApi.ts | New typed IC client; keep existing source clients/meaning unchanged; G2/G4 |
| frontend/src/lib/internalCorrosionTypes.ts | New domain DTOs distinguishing source/result/condition/workflow; G2 |
| backend/src/routes/internalCorrosion.ts | New additive IC routes; G2/G4/G5 |
| backend/src/internalCorrosion/history.ts | Bounded read-only calendar orchestration; G2/G4 |
| backend/src/internalCorrosion/sourceReferences.ts | Authorized source adapters/provenance; G2/G4 |
| backend/src/internalCorrosion/revisions.ts | Immutable engineering lifecycle; G2/G3/G5 |
| backend/src/internalCorrosion/queries.ts | Domain projections/aggregates; G2/G4 |
| backend/src/internalCorrosion/validation.ts | Units/IDs/scope/rule/version validation; G2/G4 |
| backend/src/internalCorrosion/access.ts | Reuse central identity, add approved domain policy; G2/G5 |
| backend/src/internalCorrosion/alerts.ts | IC-only acknowledgement/condition lifecycle; G2/G3/G5 |
| backend/src/app.ts | Add IC router mount only, no existing route behavior changes; G2 |
| backend/prisma/schema.prisma | Future additive IC entities only; **G3 separately required; not permitted now** |
| backend/prisma/migrations/<new-approved-id>/migration.sql | Future additive migration only after schema/target/readiness approval; never edit historical migrations; G3 |
| backend/src/validation/internalCorrosionChecks.ts | Future formula/revision/access/lineage checks; G2/G4/G5 |
| frontend/scripts/internal-corrosion-verification.cjs | Future authorized browser evidence; G6 |

No proposed edits to existing SCADA routes/utils/schema objects, historian records, source-module routes, sidebar, shared shell, old CP Dashboard, CP Monitoring, ILI models, environment files or existing migration files. Reuse existing UI components/styles. No dependency change is planned. A central action/defect integration cannot be implemented by silently modifying those modules; source-owner contract approval is required first.

## 14. Approval gates

- **G1 — requirements decisions:** approve C01–C33 dispositions; provide uncropped IMG-07 and hidden layouts/options only if exact matching is required. Unknown content remains unverified until supplied/approved.
- **G2 — additive structure/code:** authorize the IC-only frontend/components/router/services and screening-form entry placement. Mapping acceptance is not implementation approval.
- **G3 — persistence and database:** separately approve IC-owned schema design, constraints, immutability mechanisms and a new additive migration. Before any connection, positively verify isolated target identity; migration readiness and explicit execution approval are separate. No live database identity is asserted by this audit.
- **G4 — engineering/source contracts:** approve source IDs, LIMS/UT authority, unit/basis mapping, formula/model versions, confidence, historical query strategy and provenance. No invented thresholds, measurements, costs or commercial records.
- **G5 — workflow/access:** approve reviewer/approver policy, self-approval rule, acknowledgement lifecycle, central Action_ID integration and defect correlation/physical confirmation.
- **G6 — verification:** authorize normal authenticated browser session and scoped non-production test execution. Any write-based test needs explicit disposable-environment permission; no fake operational production records.

Without G3, proposed persistence/revision/acknowledgement writes remain blocked. A frontend-only phase can render approved structures and unavailable states, but cannot claim completed backend workflow or real-data integration.

## 15. Verification checklist and actual results

| Check | Actual result |
|---|---|
| DOCX readable | PASS — word/document.xml read |
| Ten original screenshots readable | PASS — all opened; IMG-07 partial crop |
| Existing route/screening inspected | PASS — preserved; dashboard absent |
| Router/schema/source-client inspection | PASS — static evidence only |
| 30-day/history/monthly constraints | PASS — confirmed in source; direct year-long query unsupported |
| IC/SCADA ack separation | PASS as ownership requirement; IC implementation MISSING |
| Immutable approved IC revision safeguards | MISSING — not proved by generic JSON/screening history |
| Database targets/records/migration state | NOT RUN — no connection/environment inspection; BLOCKED for live assertions |
| API execution/auth enforcement | NOT RUN — source auth exists; runtime unverified |
| TypeScript/build/unit suites | NOT RUN — report-only audit, no application changes |
| Desktop/tablet/mobile and pixel comparison | NOT RUN — no authenticated browser evidence |
| Report integrity/count consistency | Checked separately after report generation |

Future acceptance checklist:

- [ ] Each visible field/control linked to stable source owner/ID/column/response/component, with null/stale/access-denied distinctions.
- [ ] All ten tabs and drawers tested using normal auth; screening save/load/history regression preserved in an approved test environment.
- [ ] Desktop/tablet/mobile screenshots captured and compared individually; no hidden shell/navigation regressions.
- [ ] Calendar queries tested at 30/31-day, leap-year, DST, boundary, >5000-record and partial-source-failure cases; no double counting/average-of-averages.
- [ ] Formula dimensional consistency, UT elapsed-time/rate provenance, confidence, trend slopes and KPI denominator methods approved/tested.
- [ ] Immutable accepted revisions reject updates/deletes; supersession preserves old method/scope and audit actor/time.
- [ ] IC acknowledgement idempotent; source SCADA alarm unchanged; recovery and closure independent from acknowledgement.
- [ ] Unauthorized/cross-owner/source/document access denied; Viewer cannot perform unapproved engineering writes.
- [ ] Existing Defect_ID correlation precedes candidate creation; engineering/physical confirmation required; central Action_ID not duplicated.
- [ ] No raw source copies, fake saved settings, invented options, commercial costs or hard-coded screenshot records.
- [ ] Typecheck/build and meaningful domain/API/browser tests run only after implementation approval.

**STOP: report submitted for approval. No implementation is authorized or started by this audit.**

## 16. Reproducible coverage totals

These are primary-status requirement-group counts from section 4 only; reference payload cells are not counted as separate implementations.

| Status | Groups |
|---|---:|
| MATCHED | 10 |
| MISSING | 67 |
| CONFLICT | 15 |
| UNVERIFIED | 8 |
| BLOCKED | 8 |
| TOTAL | 108 |

| Image | MATCHED | MISSING | CONFLICT | UNVERIFIED | BLOCKED | Total |
|---|---:|---:|---:|---:|---:|---:|
| IMG-01 | 0 | 9 | 1 | 0 | 0 | 10 |
| IMG-02 | 0 | 7 | 2 | 0 | 0 | 9 |
| IMG-03 | 0 | 7 | 1 | 1 | 0 | 9 |
| IMG-04 | 0 | 8 | 1 | 1 | 0 | 10 |
| IMG-05 | 0 | 6 | 2 | 0 | 0 | 8 |
| IMG-06 | 0 | 6 | 1 | 1 | 0 | 8 |
| IMG-07 | 0 | 6 | 1 | 1 | 1 | 9 |
| IMG-08 | 0 | 6 | 2 | 1 | 1 | 10 |
| IMG-09 | 0 | 6 | 1 | 1 | 1 | 9 |
| IMG-10 | 0 | 5 | 1 | 1 | 1 | 8 |

MATCHED counts are foundations, not completed screenshot dashboards. The ten image groups contain no MATCHED complete dashboard component. No verified live-data completion percentage is asserted.

## 17. DOCX-to-implementation crosswalk

This crosswalk supplements, and is not added to, the 108 counted ledger groups. MATCHED foundations do not establish a complete requirement. Full source wording and field lists remain in Appendix C.

| DOCX sections | Required behavior/data | Existing mapping and remaining gap |
|---|---|---|
| 1 | Tab navigation, row drawers, View All/Trend/Asset/Documents, actions, export | E10/E11 foundations; all IC domain bindings M1–M8 missing; E12 actions blocked |
| 2 | Ten connected domain views, not ten separate databases | E1 form only; workspace F-11 missing |
| 3 | Six Overview KPI definitions/click targets | I01-01; M1/M2/M5 missing; counts/reference values unverified |
| 4 | Engineering loop grouping, not a new physical segment | M1 missing; authoritative master E3 reused |
| 5 | Master/process references plus engineer-controlled loop scope/service/method/review/status/notes | E3/E4 foundations; M1 relationships and revision contract missing |
| 6 | Planned/Active/Under Review/Monitoring/Inactive/Superseded separate from Normal/Watch/High Concern/Unknown | M1/M2 missing; C01 terminology conflict |
| 7–8 | Source-fed chemistry/process and source ID/time/unit/quality/freshness | E4/E8 foundations; M3 and IC projection missing; no manual copying |
| 9 | Sample identity, lab result, location/time/analyte/value/unit/detection-limit/quality/provider/document/source | M3 missing; retain governed LIMS identity, do not create parallel laboratory records |
| 10 | Measurement distinct from threshold interpretation | E4 source capability; M7/M8 rule/result link missing |
| 11–12 | Physical device ownership, exposure duration/weights/area/loss/pitting/deposit/lab/inspector/result evidence | E5 foundation; M3/M2 analysis and unit-method validation missing |
| 13 | ER/LPR sensor/channel/time/rate/quality/freshness/calibration; hardware separate | E4/E5 foundations; M2 accepted interpretation missing |
| 14 | UT point/source reading/baseline/current/date/method/inspector/quality | E5 monitoring-point foundation; M4 missing |
| 15 | Thickness difference divided by elapsed time, source reading IDs, calculation version/validation | M4/M2 missing; C09; engineering-approved units/year convention required |
| 16 | Correlate UT to ILI IDs without copying anomaly records | E6 foundations; M4 correlation relationship missing |
| 17–18 | Historical parameters and source-ID event overlays, no second historian | E4 30-day restriction; M2/M4/M5; additive service section 6; exact event source IDs blocked |
| 19–20 | Target/actual/availability/chemistry/rate/process treatment inputs and owned point/review outputs | E3/E4 foundations; M5 missing; C16–C18 |
| 21 | Costs only from reliable ERP/chemical/approved commercial input | I07-07 blocked; C15 |
| 22–23 | Finding identity/scope/type/mechanism/description/severity/confidence/status/evidence/engineer/dates/action/defect refs | M6 missing; E7 evidence foundation, E12 integrations blocked; C19–C22 |
| 24 | Defect correlation first, existing link or physically confirmed candidate | E12 integration blocked; no duplicate Defect_ID |
| 25–26 | IC alerts distinct from SCADA/Sensors/CP, acknowledgement distinct from actual condition | M7/M8 missing; existing SCADA acknowledgement E4 must remain unchanged; section 8 |
| 27–28 | Eight visible configuration sections plus assessment-method templates; mechanism ID/inputs/method/version/service/source/approval | M8 missing; seven layouts unverified; C27–C30 |
| 29 | Model_ID/Model_Version/Assessment_ID binding, no silent historical recalculation | E2/E13 insufficient; explicit M2/M8 revision safeguards missing |
| 30 | Pipeline/asset properties read-only | E3 foundation; no separate editable pipeline database permitted |
| 31–32 | SCADA history and sensor monitoring/quality/freshness/calibration | E4/E5 foundations, actual source availability unverified; IC projections missing |
| 33 | Governed imports/validation/accept-reject, Integration Hub owns transport | E8 foundation; M3 external-result mapping missing |
| 34 | ILI_Run_ID/ILI_Anomaly_ID read-only references | E6 foundation; M4/M2 relationship missing |
| 35 | Separate internal/external results, correlate shared physical scope only | Existing separate routes; source/result classification and joins unverified; no merge proposed |
| 36 | Only validated physical conditions enter Defect Manager | E12 blocked; M6 confirmation/audit missing |
| 37 | Risk consumes derived IC indicators, not direct official IC risk scoring | M2 indicator missing; E13 must not be promoted; C01 |
| 38 | AI forecast advisory and distinct from current assessment | Existing AI router does not prove IC forecast integration; M2 source binding missing |
| 39 | Document_ID links only, files stored once | E7 foundation; IC-specific relationship missing |
| 40 | Executive Dashboard consumes summaries without recalculation | No approved IC summary projection; M2 missing |
| 41 | Reports read authoritative results, no duplicate corrosion database | E11 foundation; dedicated IC export/report binding missing |
| 42 | Engineering input only; no manual reentry of source measurements/master/ILI | E1 is legacy screening; retain it but approve separate engineering/source behavior |
| 43 | All required master/source/device/reading/assessment/finding/indicator/document/action/defect IDs | E3–E7 foundations; M1–M8 IC relationships and E12 action/defect integration missing |
| 44–45 | Explicit domain ownership and anti-duplication | Foundations identified; not evidence of implemented dashboard relationships; future constraints/tests required |
| 46 | Source outage isolation, stale/unknown and reduced confidence | E4 source metadata foundation; IC partial-response/confidence behavior missing |
| 47 | Real versioned confidence result: freshness/completeness/coverage/quality/recency/assessment completeness | M2/M8 missing; never infer decorative percentage from screenshot |
| 48 and closing supplement | Connected architecture; effective-dated loop revisions and historical scope | Proposed sections 7/9; not implemented; G2–G5 required |

## Appendix A. Complete DOCX numbered section inventory

All 48 numbered sections were read. E/M keys refer to section 3; requirements beyond visible screenshots are not waived. Full text follows so field names, enumerations and behavior remain traceable.

- 1. Click behavior — freeze this convention
- 2. Internal Corrosion tabs
- 3. Overview KPI cards
- 4. Corrosion Loop — what exactly is it?
- 5. Corrosion Loop input fields
- 6. Corrosion Loop statuses
- 7. Process & Chemistry
- 8. Process/Chemistry should not duplicate source values
- 9. Laboratory Samples
- 10. Chemistry threshold vs engineering interpretation
- 11. Coupons & Probes
- 12. Coupon record
- 13. ER / LPR probe
- 14. UT / Monitoring
- 15. Corrosion-rate calculation from UT
- 16. UT vs ILI
- 17. Trends & Historical
- 18. Trend event correlation
- 19. Inhibitor Performance
- 20. Inhibitor injection point
- 21. Cost vs Effectiveness
- 22. Findings
- 23. Finding statuses
- 24. Send to Defect Manager
- 25. Alerts & Events
- 26. Acknowledge alert
- 27. Configuration
- 28. Corrosion mechanisms library
- 29. Model/version control
- 30. Connection with Pipeline / Asset Master
- 31. Connection with SCADA
- 32. Connection with Sensors
- 33. Connection with Integration Hub
- 34. Connection with ILI Analysis
- 35. Connection with External Corrosion
- 36. Connection with Defect Manager
- 37. Connection with Risk Assessment
- 38. Connection with AI Predictions
- 39. Connection with Document Management
- 40. Connection with Executive Dashboard
- 41. Reports & Analytics
- 42. What users manually enter
- 43. Required IDs
- 44. Data ownership
- 45. Anti-duplication rules
- 46. Failure handling
- 47. Data Confidence
- 48. Final Internal Corrosion architecture

## Appendix B. Source file integrity

| Source file | Bytes | SHA-256 |
|---|---:|---|
| internal corrosion.docx | 44974 | 85521AD6828C669C9B1C8CE7BCACF1449C9A9414B34558536BF8CAE820E752AC |
| ChatGPT Image Oct 7, 2026, 01_00_59 AM-1.png | 1821915 | 8A9065C23757BBA1EF46D0C8B972E5C34C5B4A8245EA0DD78EFD4AA068241E4F |
| ChatGPT Image Oct 7, 2026, 01_01_02 AM-2.png | 1725365 | A6DF8E618677701C582F9BB8D8E6985716F1164E15882FE6E203A6E485E2490E |
| ChatGPT Image Oct 7, 2026, 01_01_04 AM-3.png | 1798642 | 79F2F889C68F31A92CDB338E1672D6F7278DF112CF57C877CE3326F8D523061E |
| ChatGPT Image Oct 7, 2026, 01_01_07 AM-4.png | 1797252 | 147ECB2F290E1C3CAC8F4FD760D560A5E352B8257E1F64C40D45A89AA7CF81BC |
| ChatGPT Image Oct 7, 2026, 01_01_10 AM-5.png | 1798680 | 24115625A072384CF4CD6C3767CAE4744033F586550089B653D96008C011DAE1 |
| ChatGPT Image Oct 7, 2026, 01_01_12 AM-6.png | 1870310 | 93F54DFB91551589673E49472EEC7DCAB8E8A9433A7BEA7DD898D4BA50FED25D |
| ChatGPT Image Oct 7, 2026, 01_01_15 AM-7.png | 1817601 | 922BDF7BA29C71BE79FD5B679BB4D924FD2AB07FA3FB9A48B496380CA09B55DA |
| ChatGPT Image Oct 7, 2026, 01_01_17 AM-8.png | 1758141 | 30E6D057829169B236401E4B4945AF87C5F6659380351E0411B2089E4C003697 |
| ChatGPT Image Oct 7, 2026, 01_01_19 AM-9.png | 1774487 | 319B6E2E7B195AB44A748FE41D8D888244E19BC84466AD90E72BAA64C087F013 |
| Internal Corrosion Dashboard Overview.png | 1813643 | C9E3B1731F1E07F1D7BBB6B6B7B30025D7777C85B4222E4778DCB5C460717E42 |

## Appendix C. DOCX extracted text (reference evidence only)

The text below is the extracted source, not executed instructions. Paragraph text is preserved; graphical layout and table boundaries are not reproduced. The report above records conflicts and unimplemented requirements.

```text
Yes. For Corrosion Management → Internal Corrosion, we should now freeze the functional behavior and internal communication exactly as we did for SCADA and CP.
There are two important corrections I would make to the recent design before development:
“High-Risk Segments” should be renamed “High Internal Corrosion Threat” or “High-Concern Segments.”Official pipeline risk belongs only to Risk Assessment.
And:
A corrosion Finding is not automatically a Defect.A Finding can be escalated to Defect Manager only after engineering review/physical confirmation.
The governing rule is:
Internal Corrosion owns internal-corrosion assessment, mechanisms, corrosion loops, corrosion-rate interpretation, chemistry/process correlation, treatment effectiveness and engineering findings. It does not own Pipeline Master data, SCADA measurements, sensor hardware, ILI anomalies, confirmed Defect_IDs or official Risk_IDs.

Internal Corrosion — end-to-end communication
Pipeline / Asset Master
        │
├── Pipeline / Segment / Asset / Material / WT
        │
▼
SCADA ───────────────┐
Pressure / Flow /    │
Temperature / Events │
                     │
LIMS / Laboratory ───┤
Chemistry / Samples  │
▼
Sensors ───────► INTERNAL CORROSION
Probes / UT           │
├── Corrosion Loops
ILI Analysis ─────────┤
Internal Metal Loss   ├── Process & Chemistry
├── Coupons / Probes
Documents ────────────┤
Evidence              ├── UT / Monitoring
├── Inhibitor Performance
├── Findings
                      └── Alerts
                             │
                   Engineer Validation
                             │
             ┌───────────────┼───────────────┐
▼▼▼
       Defect Manager     Risk Assessment    AI
             │
▼
       Dashboard / Reports

1. Click behavior — freeze this convention
User clicks
What happens
Overview / Corrosion Loops / Process & Chemistry etc.
Full sub-page opens inside Internal Corrosion. No popup.
Corrosion-loop row
Select row → right-side Loop Details panel opens.
Chemistry/sample row
Right-side details drawer first.
Coupon / Probe row
Right-side device/monitoring details panel.
UT point
Right-side UT Point Details panel.
Finding row
Right-side Finding Details panel.
Alert row
Right-side Alert/Event detail panel.
View Details
Right-side drawer/panel.
View All
Full corresponding tab/view, not popup.
View Trend
Open Trends & Historical prefiltered to selected Loop/Point/Parameter.
View Asset
Open Pipeline / Asset Master for linked Asset_ID.
View Documents
Open Document Management filtered to linked record.
Raise Action / Create Action
Create one Action_ID in the Central Integrity Action Register.
Send to Defect Manager
Controlled escalation workflow; does not instantly create a duplicate defect.
Add Assessment
Full assessment wizard.
Create Finding
Create an Internal Corrosion Finding_ID; not a Defect_ID.
Export
Use Reports & Analytics / Data Export service.
So keep:
View All = full page/sub-viewView Details = side drawer

2. Internal Corrosion tabs
Tab
Purpose
Primary data
Overview
Current internal-corrosion condition and exceptions
All Internal Corrosion outputs
Corrosion Loops
Defines and assesses operating/corrosion environments
Pipeline Master + process + chemistry
Process & Chemistry
Temperature, flow regime, water cut, CO₂, H₂S, pH, chloride etc.
SCADA + LIMS + Integration Hub
Coupons & Probes
Coupon results and ER/LPR monitoring
Sensors + lab/field results
UT / Monitoring
Wall-thickness monitoring and rate/trend
UT inspections + Sensors
Trends & Historical
Long-term corrosion/chemistry/treatment trends
Governed historical data
Inhibitor Performance
Dosage, effectiveness, treatment performance
SCADA/chemical injection + chemistry + corrosion rates
Findings
Engineering conclusions requiring review/action
Internal Corrosion analysis
Alerts & Events
Internal-corrosion-specific alert conditions
Rules + source measurements
Configuration
Mechanisms, thresholds, confidence rules, loop setup, mappings
Internal Corrosion configuration
These are views of one connected domain—not separate databases.

3. Overview KPI cards
I recommend these final KPI definitions:
KPI
Correct source
Click
Monitored Segments
Pipeline Master + active Internal Corrosion assessments
Corrosion Loops
Active Corrosion Loops
Corrosion Loop Register
Corrosion Loops
Avg Corrosion Rate
Latest valid approved/accepted monitoring results
Trends & Historical
High Internal Corrosion Threat
Current Internal Corrosion threat classification
Corrosion Loops filtered High
Inhibitor Performance
Treatment-performance calculation
Inhibitor Performance
Data Confidence
Internal Corrosion confidence engine
Data Quality/detail view
Do not label the fourth KPI:
High Risk
unless it is a read-only official Risk value imported from Risk Assessment.
Use:
High Internal Corrosion Threat

4. Corrosion Loop — what exactly is it?
A Corrosion Loop is an engineering assessment grouping, not another pipeline segment.
Create:
Corrosion_Loop_ID
Example:
IC-007
Pipeline: PL-001
Segment scope: SEG-03
KP: 96.780–145.200
Fluid: Multiphase Oil/Gas/Water
Dominant mechanism: CO₂ Sweet Corrosion
A loop may align with:
one segment,
part of a segment,
several segments,
one process envelope.
Do not create another physical route or segment record.

5. Corrosion Loop input fields
Some are auto-populated, others are engineering inputs.
Automatically from Pipeline / Asset Master
Pipeline_ID
Segment_ID
KP range
material
OD
WT
commissioning year
internal lining/coating if in master
facility/asset relationships.
Automatically from operating/monitoring sources
process regime
temperature
pressure
flow
fluid properties where available
monitoring-point relationships.
Engineer-configured fields
Loop ID/name
Loop scope
applicable fluid service
expected corrosion mechanisms
assessment methodology
review frequency
responsible engineer
status
notes.

6. Corrosion Loop statuses
Recommended:
Planned
Active
Under Review
Monitoring
Inactive
Superseded
Separate this from threat condition:
Normal
Watch
High Concern
Unknown
A Loop's workflow state and corrosion condition are different.

7. Process & Chemistry
This page should consume source data automatically.
SCADA provides
temperature
pressure
flow
operating regime
shutdown/startup periods
low-flow periods
chemical-injection rate where monitored
water cut if available from process instrumentation.
LIMS / laboratory provides
pH
chloride
CO₂ chemistry / partial-pressure input as applicable
H₂S
iron
sulphate
bacterial counts
water chemistry
dissolved oxygen where applicable
other configured analytes.
Sensors provides
relevant direct field monitoring values where applicable.

8. Process/Chemistry should not duplicate source values
Wrong:
SCADA temperature = 68°C

Internal Corrosion:
Engineer manually enters 68°C
Correct:
SCADA
68°C
  ↓
Internal Corrosion references
SCADA time-series
For every source value retain:
Source_Record_ID
Source_System
Timestamp
Unit
Quality
Freshness

9. Laboratory Samples
Create a structured:
Lab_Result_ID
or reference the governed LIMS import record.
Fields:
Sample_ID
Pipeline_ID
Segment_ID
Loop_ID
Sampling_Point
Sample_Date
Parameter
Result
Unit
Detection_Limit
Quality
Lab/Provider
Document_ID
Source_System_ID
If LIMS already owns the source record, Internal Corrosion should reference it rather than recreate an independent laboratory database.

10. Chemistry threshold vs engineering interpretation
Example:
pH = 6.4
Threshold rule = < 6.8
Internal Corrosion may create:
Acidic condition alert.
But:
pH 6.4
remains the source measurement.
Don't replace the source result with the interpreted status.

11. Coupons & Probes
Physical device identity belongs to:
Sensors / Asset Master
Internal Corrosion owns or references:
coupon exposure record,
retrieval/analysis result,
probe corrosion-rate result,
trend,
interpretation.
Important separation:
Probe hardware
→ Sensors

Probe measurement
→ Shared time-series

Corrosion-rate interpretation
→ Internal Corrosion

12. Coupon record
Create something like:
Corrosion_Coupon_Result_ID
Fields:
Coupon_ID / Asset_ID
Loop_ID
Installation Date
Retrieval Date
Exposure Duration
Initial Weight
Final Weight
Weight Loss
Surface Area
Calculated Corrosion Rate
Pitting Observed
Deposit/Scale Findings
Analysis Status
Lab/Inspector
Document_ID
Do not make the physical Coupon asset separately in Internal Corrosion if already in Asset Master/Sensors.

13. ER / LPR probe
Internal Corrosion receives:
Sensor_ID
Channel_ID
Timestamp
Corrosion Rate
Quality
Freshness
Calibration status
Then analyzes:
trend,
acceleration,
persistent high rate,
treatment response.
Sensors still owns:
probe model,
serial number,
battery,
communication,
calibration.

14. UT / Monitoring
UT information may come from:
field UT inspection,
permanently installed UT sensors,
manual survey,
approved imported inspection data.
Create:
UT_Monitoring_Point_ID
or link existing Monitoring_Point_ID.
Record:
Location / KP
Baseline Thickness
Current Thickness
Inspection Date
Method
Inspector
Quality
Source

15. Corrosion-rate calculation from UT
Conceptually:
Previous Thickness
-
Current Thickness
------------------
Elapsed Time

= Corrosion Rate
Store calculation with:
Source Reading IDs
Calculation Method
Calculation Version
Result
Engineer validation
Do not overwrite raw thickness measurements.

16. UT vs ILI
This is a critical anti-duplication rule.
ILI Analysis owns:
ILI_Anomaly_ID
Internal Corrosion owns:
internal-corrosion interpretation and UT monitoring.
If both identify the same location:
UT Point
      ↕
Common KP / Asset / Defect correlation
      ↕
ILI_Anomaly_ID
Do not recreate the ILI anomaly inside Internal Corrosion.

17. Trends & Historical
This tab should query existing data.
Filters:
Pipeline
Segment
Corrosion Loop
Parameter
Date Range
Aggregation.
Parameters:
Corrosion Rate
Temperature
Pressure
Flow
Water Cut
CO₂
H₂S
pH
Chloride
Inhibitor Dose
Wall Thickness
No second historical storage.

18. Trend event correlation
Very useful feature:
Overlay events such as:
shutdown,
startup,
pigging,
chemistry change,
inhibitor change,
coupon retrieval,
UT inspection,
finding created.
This lets the engineer correlate cause/effect.
Events remain referenced by their source IDs.

19. Inhibitor Performance
This should answer:
Is chemical treatment effectively controlling corrosion?
Inputs:
Target Dose
Actual Dose
Injection Availability
Corrosion Rate
Chemistry
Process Conditions
Outputs:
Optimal
Effective
Watch
Sub-optimal
Under-dosed
Unknown

20. Inhibitor injection point
Physical pump/skid/injection equipment belongs to Asset Master where relevant.
Internal Corrosion stores:
Injection_Point_ID
Loop_ID
Inhibitor_Type
Target_Dose
Actual_Dose reference
Treatment_Performance
Review_Date

21. Cost vs Effectiveness
The design shows cost.
Keep this only if KLINTHRU receives real cost information from:
ERP,
chemical-management system,
approved manual commercial input.
If no reliable cost source exists:
remove Cost vs Effectiveness.
Do not invent inhibitor cost.

22. Findings
This is the main engineering output.
Create:
Internal_Corrosion_Finding_ID
Fields:
Finding_ID
Pipeline_ID
Segment_ID
Loop_ID
KP / location if applicable

Finding Type
Mechanism
Description

Severity
Confidence
Status

Source Record IDs
Evidence
Engineer

Created Date
Review Date

Action_ID
Defect_ID if later confirmed

23. Finding statuses
Recommended:
Open
Under Review
Monitoring
Action Required
Escalated
Closed
Deferred
Severity:
Low
Medium
High
Critical
Confidence:
Low
Medium
High
Threat severity is still not the same as official Risk.

24. Send to Defect Manager
This button needs a controlled workflow.
Do not simply duplicate the finding as a new Defect.
Correct:
Finding
   ↓
Engineer chooses Send to Defect Manager
   ↓
Correlation check
   ↓
Existing physical Defect nearby?
├── Yes → Link Finding to existing Defect_ID
   └── No  → Defect candidate review
               ↓
        Physical condition verified?
               ↓ Yes
          Create Defect_ID
This is essential to maintain:
one physical defect = one Defect_ID.

25. Alerts & Events
Internal Corrosion alerts may include:
high corrosion rate,
accelerating corrosion trend,
low pH,
high CO₂ condition,
high H₂S,
high chloride,
bacterial count high,
inhibitor under-dosing,
UT thickness below threshold,
stale critical monitoring data.
Do not put:
sensor battery low,
SCADA pressure alarm,
CP under-protection,
in Internal Corrosion Alerts.
Those belong to their source modules.

26. Acknowledge alert
Acknowledgement means:
Engineer has reviewed the alert.
It does not mean:
condition resolved.
Keep:
Open
Acknowledged
Investigating
Resolved
Closed
separate from actual measurement state.

27. Configuration
Configuration should own Internal Corrosion domain rules, not external connections.
Recommended sections:
corrosion mechanisms library,
threshold rules,
data-confidence rules,
inhibitor libraries,
loop templates/setup,
parameter mappings,
notification rules,
display settings,
assessment-method templates.
Connector/IP/API settings remain in Integration Hub.

28. Corrosion mechanisms library
Configurable mechanisms could include:
CO₂ corrosion
H₂S / sour corrosion
MIC
oxygen corrosion
acidic/low-pH corrosion
flow accelerated / erosion-corrosion
under-deposit corrosion
galvanic effects where relevant
custom approved mechanisms.
Each mechanism should have:
Mechanism_ID
Name
Description
Required Inputs
Model / Method
Version
Applicable Service
Source / Reference
Approval Status

29. Model/version control
If the corrosion-rate model/method changes:
Do not silently recalculate old assessments.
Store:
Model_ID
Model_Version
Assessment_ID
Historical results remain tied to the method originally used.

30. Connection with Pipeline / Asset Master
Internal Corrosion receives read-only:
Pipeline_ID
Segment_ID
Asset_ID
KP

OD
WT
Material
Grade
Design / MAOP where relevant
Commissioning Date
Internal lining/coating if managed there
Route / Facility relationships
No separate editable pipeline database.

31. Connection with SCADA
This is one of the strongest internal links.
SCADA supplies:
Pressure history
Temperature history
Flow history
Water cut where available
Operating regimes
Shutdown/startup
Low-flow/stagnant periods
Chemical injection telemetry
Relevant process events
Internal Corrosion analyzes these; it does not copy them into independent historical tables.

32. Connection with Sensors
Sensors supplies:
ER/LPR readings
UT sensor readings
Chemistry sensor values where applicable
Device quality
Freshness
Calibration status
Internal Corrosion determines the corrosion meaning.

33. Connection with Integration Hub
External inputs such as:
LIMS,
chemistry databases,
field inspection applications,
chemical injection systems,
third-party lab results,
enter through Integration Hub.
Flow:
External System
     ↓
Integration Hub
     ↓
Validate / map / normalize
     ↓
Internal Corrosion
     ↓
Accepted / rejected acknowledgement

34. Connection with ILI Analysis
ILI sends/references:
internal metal-loss anomalies,
growth data,
internal/external classification,
geometry/location.
Internal Corrosion should reference:
ILI_Run_ID
ILI_Anomaly_ID
where relevant.
Do not copy ILI anomaly records.

35. Connection with External Corrosion
Generally these remain separate.
But they may share:
Pipeline/Segment scope
UT/excavation context where clearly classified
ILI anomaly classification
Defect_ID linkage.
Do not merge internal and external corrosion-rate records.

36. Connection with Defect Manager
Only validated physical conditions go there.
Examples:
confirmed internal metal loss,
confirmed severe pitting,
verified MIC damage.
A chemistry alert alone does not create a Defect_ID.

37. Connection with Risk Assessment
Risk should consume derived Internal Corrosion indicators, not raw chemistry readings.
Example:
Internal_Corrosion_Indicator_ID

SEG-03
Assessment Period = 12 months

Mechanism = CO₂ Sweet Corrosion
Current Rate = 0.28 mm/y
Trend = Increasing
Inhibitor Performance = Sub-optimal
Wall Loss = 48%
Confidence = High
Threat Level = High
Risk then performs its own PoF/CoF calculation.

38. Connection with AI Predictions
AI may consume:
corrosion-rate history,
chemistry history,
process history,
inhibitor performance,
UT,
coupons/probes,
ILI history,
findings/actions.
Possible AI outputs:
predicted corrosion growth,
likely deterioration,
remaining wall-life forecast,
treatment-performance forecast.
AI remains advisory.

39. Connection with Document Management
Typical Internal Corrosion files:
chemistry/lab report,
coupon analysis,
probe report,
UT report,
pigging report,
inhibitor program,
corrosion assessment,
photos,
investigation records.
Files remain in Document Management as Document_ID.

40. Connection with Executive Dashboard
Send summary only:
Internal Corrosion Status
High-Threat Segments
Current Corrosion Rate
Deteriorating Loops
Inhibitor Performance
Open High Findings
Assessment Confidence
Monitoring Coverage
Dashboard does not recalculate Internal Corrosion.

41. Reports & Analytics
Possible reports:
Internal Corrosion Assessment
Corrosion Rate Trend
Process & Chemistry
Coupon/Probe Report
UT Monitoring
Inhibitor Performance
High-Threat Locations
Findings/Actions
Data Confidence
Reports reads Internal Corrosion source data.

42. What users manually enter
Most data should arrive automatically.
Manual/engineering inputs may include:
Corrosion Loop definition
applicable corrosion mechanisms
assessment method/model
engineering comments
mechanism confirmation
finding severity/confidence
review decision
treatment target/strategy where not integrated
assessment status
recommendation.
Users should not manually re-enter:
SCADA process data,
LIMS results,
sensor readings,
Pipeline Master fields,
ILI anomaly measurements.

43. Required IDs
At minimum:
Pipeline_ID
Segment_ID
Asset_ID

Corrosion_Loop_ID

Process_Data_Record_ID / SCADA_Tag_ID
Lab_Result_ID

Coupon_Result_ID
Sensor_ID
Sensor_Channel_ID

UT_Monitoring_Point_ID
UT_Reading_ID

Internal_Corrosion_Assessment_ID
Internal_Corrosion_Finding_ID
Internal_Corrosion_Indicator_ID

Document_ID
Action_ID
Defect_ID

44. Data ownership
Internal Corrosion should own:
Corrosion_Loop
Internal_Corrosion_Assessment

Corrosion_Mechanism_Assessment
Corrosion_Rate_Result

Coupon_Analysis_Result
UT_Corrosion_Interpretation

Inhibitor_Performance_Assessment

Internal_Corrosion_Finding
Internal_Corrosion_Alert

Internal_Corrosion_Indicator
It should not own:
Pipeline Master
Raw SCADA historian
Physical Sensor master
Connector configuration
Raw ILI anomaly
Official Defect
Official Risk
AI prediction
Document binary

45. Anti-duplication rules
Mandatory:
SCADA Temperature
→ reference it
→ don't copy/re-enter
LIMS Sample
→ one Lab_Result_ID
→ multiple analyses may reference it
Probe measurement
→ one time-series measurement
→ Internal Corrosion interprets it
ILI anomaly
→ reference ILI_Anomaly_ID
Finding escalated to existing defect
→ link Defect_ID
→ do not create second defect
Same report needed by Finding and Loop
→ one Document_ID
→ two Document_Link records

46. Failure handling
If SCADA data becomes unavailable:
Last Process Data = stale
Internal Corrosion should show:
Process data stale — assessment confidence reduced.
Do not show last value as live.
If LIMS fails:
prior lab records remain available,
new chemistry status shows stale/pending,
other Internal Corrosion functions continue.
If Sensors fail:
Loop assessment remains accessible,
affected probe/UT data becomes stale,
confidence updates accordingly.
If ILI unavailable:
existing assessment remains,
correlation data temporarily unavailable.
No single source failure should break the whole Internal Corrosion page.

47. Data Confidence
This should be a real calculation, not a decorative percentage.
Possible components:
Process data freshness
Chemistry completeness
Monitoring coverage
Probe/UT quality
Inspection recency
Assessment completeness
Create:
Data_Confidence_Result_ID
with versioned rules.
Statuses might be:
High | Medium | Low | Insufficient

48. Final Internal Corrosion architecture
             PIPELINE / ASSET MASTER
                      │
                 Static context
                      │
       ┌──────────────┼───────────────┐
▼▼▼
     SCADA          SENSORS          LIMS
 Process Data   Probes / UT       Chemistry
       │              │               │
       └──────────────┼───────────────┘
▼
             CORROSION LOOPS
                      │
               Mechanism Models
                      │
        ┌─────────────┼──────────────┐
▼▼▼
 Process &       Coupons /       UT / Wall
 Chemistry         Probes        Thickness
        └─────────────┼──────────────┘
▼
             CORROSION RATE /
              THREAT ASSESSMENT
                      │
              Inhibitor Performance
                      │
▼
                   FINDINGS
                      │
              Engineer Validation
                      │
        ┌─────────────┼──────────────┐
▼▼▼
 Defect Manager      Risk            AI
        │
        └─────────────┬──────────────┘
▼
             Dashboard / Reports
Final developer instruction
Internal Corrosion shall be implemented as the engineering assessment layer for internal corrosion mechanisms and treatment effectiveness. Pipeline and asset properties shall be referenced from Pipeline / Asset Master; operational process values shall be referenced from SCADA; monitoring-device data shall be obtained from Sensors/shared time-series; laboratory data shall arrive through governed LIMS/Integration Hub records; and ILI data shall be referenced through ILI_Run_ID/ILI_Anomaly_ID. Internal Corrosion shall own Corrosion_Loop_ID, corrosion-mechanism assessments, corrosion-rate results, treatment-performance assessments, engineering findings and derived threat indicators. Raw source measurements shall never be copied into independent editable records. Findings shall not automatically become Defect_IDs; escalation must include correlation and engineering/physical confirmation. Risk Assessment shall consume derived threat indicators rather than raw chemistry/process data. All source values must retain timestamp, quality, freshness and lineage, and source outages must reduce confidence or display stale/unknown rather than showing old values as current. Formal actions shall use the common Integrity Action Register.
With these rules, Internal Corrosion is fully connected to the agreed KLINTHRU architecture without duplicate data or ownership conflicts.










Yes. The Internal Corrosion internal communication is essentially complete. I would not add another major tab or database. We can now freeze it.
The fundamental rule is:
Internal Corrosion owns corrosion-loop assessment, corrosion mechanisms, corrosion-rate interpretation, inhibitor/treatment performance, findings and Internal Corrosion threat indicators. It does not own the original Pipeline Master data, SCADA data, Sensor hardware/readings, LIMS source records, ILI anomalies, confirmed defects or official risk.
Communication
What Internal Corrosion receives
What it produces / sends
Ownership rule
Pipeline / Asset Master → Internal Corrosion
Pipeline_ID, Segment_ID, Asset_ID, KP, OD, WT, material, commissioning data and facility context
Loop/assessment linked to those IDs
Pipeline Master remains authoritative
SCADA → Internal Corrosion
Pressure, temperature, flow, operating regime, shutdown/startup, water cut and relevant chemical-injection telemetry
Process-condition interpretation and corrosion context
SCADA values remain SCADA-owned
Sensors → Internal Corrosion
ER/LPR, permanent UT and relevant monitoring measurements with quality/freshness
Corrosion-rate/trend interpretation
Sensors owns hardware; shared time-series owns measurement
Integration Hub / LIMS → Internal Corrosion
Laboratory chemistry, sample results, external inspection/chemical-system data
Chemistry correlation and mechanism assessment
Integration Hub owns transport; source result identity remains traceable
ILI Analysis → Internal Corrosion
Internal metal-loss anomalies, feature IDs, run information and growth information
Internal-corrosion correlation
ILI owns ILI_Anomaly_ID
Document Management ↔ Internal Corrosion
Lab reports, coupon reports, UT reports, inhibitor programs, assessment evidence
Document_ID links only
Files stored once
Internal Corrosion → Defect Manager
Validated physical finding after correlation/verification
Link to existing Defect_ID or controlled candidate for new defect
Defect Manager owns confirmed physical defect
Internal Corrosion → Risk Assessment
Mechanism, corrosion rate, trend, wall loss, inhibitor effectiveness, threat level and confidence
Internal_Corrosion_Indicator_ID
Risk owns final Risk_ID
Internal Corrosion → AI Predictions
Historical corrosion/chemistry/process/treatment datasets
AI may return future forecast separately
AI cannot overwrite current assessment
Internal Corrosion → Executive Dashboard
Current status, high-threat locations, deteriorating loops, inhibitor performance, findings and confidence
Summary only
Dashboard read-only
Internal Corrosion → Reports & Analytics
Authoritative assessment/reporting datasets
Reports generated from them
Reports does not maintain a second corrosion database
Settings & Administration → Internal Corrosion
Permissions, central units, workflow policy
—
Internal-Corrosion-specific mechanisms/thresholds stay in its Configuration
The actual internal flow should stay:
Pipeline / Asset Master
        │
▼
   Corrosion Loop
        │
 ┌──────┼─────────────┐
▼▼▼
SCADA  LIMS         Sensors
Process Chemistry   Probes / UT
 │      │             │
 └──────┼─────────────┘
▼
Mechanism Assessment
        ↓
Corrosion Rate / Trend
        ↓
Inhibitor Performance
        ↓
Internal Corrosion Finding
        ↓
Engineer Validation
        │
   ┌────┼─────────┐
▼▼▼
Defect Risk       AI
Manager Assessment
        │
▼
Dashboard / Reports
A few rules should be frozen explicitly. One source measurement stays one source measurement: SCADA temperature, LIMS chloride, probe corrosion rate and ILI metal loss are referenced by IDs rather than copied into editable Internal Corrosion fields. Finding_ID is also not a Defect_ID; Send to Defect Manager must first check whether an existing defect represents the same physical condition and otherwise create a candidate for engineering confirmation.
Also keep device condition separate from corrosion condition. A probe can be healthy while showing a high corrosion rate; Sensors says the device is healthy, while Internal Corrosion may classify the corrosion condition as High Concern.
For data failures, old values must never appear as current. If SCADA/LIMS/probe data is stale, Internal Corrosion should show Stale/Unknown and reduce Data Confidence rather than continue displaying the previous condition as healthy.
One small backend safeguard I would still add
Use effective-dated Corrosion Loop revisions. If loop boundaries, service conditions or dominant mechanism change, do not overwrite the historical loop definition.
Example:
IC-007 Rev 1
KP 96.8–145.2
Effective to 30-Jun-2026

IC-007 Rev 2
KP 96.8–132.0
Effective from 01-Jul-2026
Historical assessments then remain traceable to the loop definition that applied at that time.
Apart from that revision control, nothing major remains. Internal Corrosion communication can be considered complete and ready to freeze.

```
