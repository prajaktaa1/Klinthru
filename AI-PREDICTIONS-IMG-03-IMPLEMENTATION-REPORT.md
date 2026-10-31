# AI Predictions IMG-03 — Prediction Results

21 October 2026. Scope: IMG-03 only; operational saved AI outputs remain **BLOCKED**.

References: `../All-doc/new/ai prediction/ChatGPT Image Oct 7, 2026, 03_31_36 AM-2.png`, viewed at original resolution; `../All-doc/new/AI prediction.docx`; existing Step0 and IMG-01/02 mappings/reports; current source. All screenshot records below are transcription for review, never inserted application data or approved engineering rules.

## Implemented UI and data boundary

- Existing `/ai-predictions` workspace now switches between Overview and Prediction Results in place. All nine tab labels/order remain; later tabs remain disabled. IMG-02 Overview and IMG-01 expandable source context/readers are retained.
- Reference five filters, Clear Filters, register headers/sort affordances, select-all checkbox, pagination/rows-per-page affordances, Predictions by Type panel, Prediction Details panel and View Full Analysis control are present. Missing datasets show N/A; unsupported filtering/sorting/selection/export/analysis remains disabled. No example rows, fake zero totals or predicted bar lengths appear.
- Reference header/five KPI cards remain shared with Overview and display N/A. Reference PipeSecure branding/global navigation is not adopted; the existing Klinthru shell/routes/shared styles remain unchanged.
- Detail panel retains prediction identity/outcome/horizon/confidence slots and adds explicit N/A model/version/run, feature version, snapshot, source lineage, status, reviewer and review-status slots required by DOCX. No prediction, immutable history, review or upstream engineering record is created or changed.
- AI Risk Outlook and review status remain separate concepts. Prediction ≠ Defect_ID; AI Risk Outlook ≠ Risk_ID. No thresholds, confidence calibration, model promotion or review permissions are inferred from the screenshot.

### Backend/API/DB/component mapping

| Item | Existing verified local path | Missing operational binding / disposition |
|---|---|---|
| Auth/readiness | `backend/src/routes/aiPredictions.ts` → `aiPredictions/readinessData.ts` / `readiness.ts` → authenticated GET `/api/ai-predictions/readiness`; `frontend/src/lib/apiClient.ts` → workspace | Technical availability only; not an AI register, KPI population or type distribution. Reused unchanged. |
| Saved register / filtering / sorting / paging / type counts | No corresponding saved-output API in the inspected AI router or AI persistence model in `backend/prisma/schema.prisma` | BLOCKED; no API/DTO/schema is invented. Native source counts are not prediction counts. |
| Prediction subject/location | `routes/pipelines.ts`, `routes/assetMaster.ts`, `data/store.ts`; GET `/api/pipelines`, `/api/asset-master/segments?pipelineId=…`, `/assets?pipelineId=…`; `Pipeline.id,pipelineCode,pipelineName`; `Segment.id,pipelineId,segmentId,startKp,endKp`; `Asset.id,assetId,pipelineId,segmentId,kp,latitude,longitude` | Native context only. No saved AI_Prediction_ID → native subject/location link exists; no example display code is treated as an internal ID. Pipeline filter remains disabled without a result provider. |
| Historical source context | Existing AI growth GET → `corrosionGrowthData.ts` → `IliAnomaly.featureId,depthMm,inspectionRunId` / `IliInspectionRun.pipelineId,inspectionDate,authorId`; CP GET `/api/cp-monitoring/:pipelineId` → native reading history/unit metadata | IMG-01 readers, exact scope checks and source401 cache clearing unchanged. Actual observations are not forecasts/results and cannot fill this register. |
| Official risk | Native Risk APIs/repositories; `Risk.riskId,currentApprovedRevisionId`; `RiskAssessmentRevision.methodologyVersionId,matrixVersionId,inherentResult,currentResult,residualResult,sourceSnapshot,contentHash` | Risk-owned approved state remains untouched. Screenshot High Risk/Monitor/Low Risk is not an approved review-state mapping or engineering classification rule. |
| Model/run/snapshot/confidence/detail lineage | DOCX logical root fields P0064–0090 and separate run P0091–0104; no saved provider found locally | N/A pending approved immutable snapshot/model/feature/run and source-version contract. No schema inferred. |
| Full analysis / row actions / review | DOCX P0063: selected prediction, confidence, model/run version, horizon, explanation and source lineage; P0105–0112 proposed advisory review states | BLOCKED without selected verified ID, destination/filter context and authorized review workflow. No record creation or acceptance endpoint added. |
| Header Export / Run AI Analysis | Existing readiness reason; central `routes/reports.ts` / `routes/documents.ts` ownership retained | AI export dataset/template/document linkage and execution provider absent. Disabled; native engineering reports are not substituted. |
| Frontend | Existing `ai-predictions-workspace.tsx` → new local `ai-prediction-results.tsx` | Same page route/schema/dependencies; no other module redesigned. |

No backend change was warranted: the existing approved APIs provide no additional compatible saved-results contract. Backend authorization/build regressions were requested for preservation; local schema declarations do not establish the remote database state. No Neon connection or authenticated operational API was used.

## Complete legible reference capture

Visual wrapping is collapsed; hidden dropdown options, tooltip contents, row ellipsis menus and off-screen records are not visible and are not invented.

### Shared shell/header/KPIs/tabs

- Brand `PipeSecure`; tagline `Safer Pipelines. A More Resilient Tomorrow.`; search `Search pipelines, assets, predictions...`; shortcut `Ctrl + K`; bell with red dot; help `?`; avatar `JD`; `John Doe`; `Integrity Manager`; user chevron.
- Sidebar `Dashboard`, `Pipeline Network`, `Integrity Management`, `AI Predictions` (selected), `Inspections`, `Assets`, `Risk Management`, `Reports`, `Data Management`, `Configuration`, `Help & Support`, `Collapse`.
- Breadcrumb `Home` › `Integrity Management` › `AI Predictions`; heading `AI Predictions`; subtitle `Predict, prioritize and prepare for the future. AI-driven insights for pipeline integrity, based on historical data and current conditions.`; buttons `Export`, `Run AI Analysis` (plus icon).
- KPI1 `36`, `Predicted High-Risk Locations`, `+12% vs. last run` (up arrow).
- KPI2 `28`, `Likely New Defects (12 months)`, `+8% vs. last run` (up arrow).
- KPI3 `14`, `Assets Requiring Early Inspection`, `+40% vs. last run` (up arrow).
- KPI4 `18`, `Estimated Life Reduction`, `Segments affected`.
- KPI5 `87%`, `Model Confidence`, `+3% vs. last run` (plus icon).
- Tabs `Overview`, `Prediction Results` (selected), `Deterioration Trends`, `Inspection Prioritization`, `Scenario Analysis`, `Model Performance`, `Related Data`, `Reports`, `Configuration`.

These KPI example values already conflict with missing live contracts and DOCX risk/confidence wording decisions. None is displayed as an actual value. Shared shell example identity/branding is not adopted.

### Register, filters and controls

Title `Prediction Results`; subtitle `Detailed AI prediction results for pipeline integrity risks and future conditions.` Header `Showing 1–10 of 124 results`; previous/next chevrons.

| Filter | Visible selected value |
|---|---|
| Pipeline | All Pipelines |
| Risk Type | All Risk Types |
| Time Horizon | All Horizons |
| Confidence | All Confidence Levels |
| Status | All Statuses |

`Clear Filters` with reset icon; dropdown chevrons. Headers below include literal screenshot `KPI Range (km)`; canonical KP versus KPI wording is unresolved and no new unit conversion is assumed. Select-all and ten row checkboxes; sort indicators beside data headers; row Actions shown as ellipsis. First row blue-highlighted; colour is not approval/ownership evidence.

| Prediction ID | Pipeline | Segment | KPI Range (km) | Prediction Type | Predicted Outcome | Time Horizon | Confidence | Status | Generated On | Actions |
|---|---|---|---|---|---|---|---|---|---|---|
| AI-2024-001 | Northeast Line | SEG-12A | 12.4 – 13.1 | Corrosion | High likelihood of external corrosion | 12 months | 92% | High Risk | Mar 15, 2024 | … |
| AI-2024-002 | Gulf Coast Line | SEG-07B | 45.2 – 46.8 | Soil Movement | Potential geohazard impact | 6 months | 87% | Monitor | Mar 15, 2024 | … |
| AI-2024-003 | Midwest Line | SEG-03C | 78.1 – 79.4 | Pressure | Anomalous pressure trend | 3 months | 81% | High Risk | Mar 14, 2024 | … |
| AI-2024-004 | West Region | SEG-18D | 102.6 – 103.9 | Cracking | Possible crack initiation | 12 months | 76% | Monitor | Mar 14, 2024 | … |
| AI-2024-005 | Northeast Line | SEG-21A | 201.3 – 202.1 | Manufacturing | Potential seam anomaly | 24 months | 73% | Low Risk | Mar 13, 2024 | … |
| AI-2024-006 | Gulf Coast Line | SEG-11C | 33.8 – 35.0 | Environment | Increased corrosion risk (environmental) | 12 months | 88% | Monitor | Mar 13, 2024 | … |
| AI-2024-007 | Southeast Line | SEG-09A | 67.1 – 68.5 | Third-Party | Higher third-party interference risk | 6 months | 69% | Monitor | Mar 12, 2024 | … |
| AI-2024-008 | Midwest Line | SEG-15B | 89.4 – 91.0 | Flow Assurance | Potential flow restriction | 12 months | 82% | Monitor | Mar 12, 2024 | … |
| AI-2024-009 | West Region | SEG-06C | 14.6 – 15.9 | Corrosion | Elevated internal corrosion risk | 18 months | 78% | Monitor | Mar 11, 2024 | … |
| AI-2024-010 | Northeast Line | SEG-28D | 156.2 – 157.8 | Cracking | Potential SCC risk | 24 months | 71% | Low Risk | Mar 11, 2024 | … |

Footer `Rows per page:` selector `10`; `1–10 of 124 results`; previous chevron; pages `1` (selected), `2`, `3`, `4`, `5`, `...`, `13`, another `13`, next chevron. Duplicate terminal13 is captured as a reference inconsistency, not replicated as operational paging. N/A replaces unverified totals/page numbers. Page-size10 is a UI setting, not a prediction count.

### Predictions by Type

| Type label | Printed count | Colour |
|---|---|---|
| Corrosion | 28 | Red |
| Cracking | 18 | Purple |
| Soil Movement | 16 | Orange |
| Pressure | 14 | Blue |
| Environment | 12 | Green |
| Third-Party | 10 | Amber |
| Flow Assurance | 8 | Light blue |
| Manufacturing | 6 | Red |

Title `Predictions by Type`; horizontal coloured bars/type icons. Counts total112, distinct from register124: no denominator/exclusion/overlap explanation exists. UI retains the eight reference category labels/accents with N/A counts and neutral unavailable tracks; taxonomy remains pending and no lengths/percentages are fabricated.

### Prediction Details

Title `Prediction Details`; badges `High Risk`, `92% Confidence`.

| Label | Printed value |
|---|---|
| Prediction ID | AI-2024-001 |
| Pipeline | Northeast Line |
| Segment | SEG-12A |
| KPI Range | 12.4 – 13.1 km |
| Prediction Type | Corrosion |
| Predicted Outcome | High likelihood of external corrosion at coating disbondment locations. |
| Time Horizon | 12 months |
| Generated On | Mar 15, 2024 10:24 AM |

Button `View Full Analysis` with external-link icon. This reference does not show model/run/snapshot identity, source versions, explanation lineage, reviewer or review status. DOCX requirements remain mandatory; all missing slots are explicit N/A. No selected example is installed as a real prediction. No model outcome/confidence/status threshold is approved by the sample colours.

## Remaining blockers and dependencies

1. Approved saved AI prediction/result API and full root identity/lineage fields (DOCX P0064–0104), immutable source snapshot/version/cutoff contract, record/source ACL parity, expired/stale behavior and idempotency. Schema/routes are unchanged; no replacement contract designed.
2. Typed prediction taxonomy versus Risk Type; KPI Range versus KP; outlook/classification versus advisory review Status; confidence definition/calibration/version; population reconciliation112/124 and delta/cohort definitions for shared KPIs. No screenshot values become rules.
3. Authorized read/filter/sort/page/count/detail and source/full-analysis destination contracts; review permissions and accepted state transitions. DOCX P0105–0112 recommends Generated/Under Review/Accepted/Rejected/Superseded/Expired; screenshot risk categories cannot substitute those review states.
4. Operational authenticated records/models are unavailable for verification. Source ILI/CP/SCADA/Risk readings, demo fixtures and screenshot predictions cannot substitute saved AI outputs. Review stays advisory and never creates Defect_ID, Risk_ID, schedules or upstream assessments.

## Verification / changed files

Tests use isolated fixtures/rendering only, not operational records.

| Check | Result / evidence |
|---|---|
| Frontend typecheck | PASS; local `tsc --noEmit --incremental false`. |
| Backend typecheck and emitted build | PASS; isolated output in `tmp/ai-img03-review/backend-dist`, no backend application startup. |
| Frontend production build | PASS on final source: optimized compilation/type validation, all32 static pages and existing dynamic route; exit0. Environment files excluded, telemetry disabled, API pointed at unreachable loopback. Working build directories were not replaced. |
| IMG-03 rendering/navigation regression | PASS: all register and lineage fields, no screenshot records/counts/confidence, N/A rather than zero, blocked filter/sort/select/page/analysis controls, loading/source-failure states, actual tab event handlers switching Results/Overview, later tabs blocked, source context retained. No requests allowed. |
| IMG-01/02 regressions | PASS: preserved overview layout/blocked states, exact source identity/feature checks,401 cache clearing, homogeneous native CP history/units, ambiguous/duplicate/invalid series blocked, actual zero retained, no source-as-prediction or selected-feature-as-aggregate substitution. |
| Backend AI contract/authorization regression | PASS: source-scoped read-only SELECT contracts, unavailable versus empty, demo exclusion, unchanged response keys,401 without authentication and private/no-store response headers. Injected local readers/test actor; no storage initialization or database connection. |
| Responsive UI | PASS: exact Chrome CDP viewport widths1672/820/390px, one results table, no document horizontal overflow; table/tabs scroll within their containers. Full-height desktop/tablet/mobile screenshots captured; desktop/mobile inspected. Artifacts in `tmp/ai-img03-review/`. |
| Verification limits | Static browser renders use actual production CSS and unavailable states; navigation is exercised by isolated React event/state regression. Live authenticated, populated AI rendering and hydrated end-to-end review workflows remain BLOCKED, not claimed as verified. |
| Preservation | PASS:337 baseline files,336 unchanged; the only existing-file change is the AI workspace component. New component/test/report are additions. Backend/schema/migrations/routes/shared styles/dependencies/other modules and earlier reports match baseline. Generated review artifacts are outside this comparison scope. |

Maintained files:

1. `frontend/src/components/ai-predictions-workspace.tsx` — enable in-place Overview/Prediction Results navigation, retain all existing source-reader logic.
2. `frontend/src/components/ai-prediction-results.tsx` — reference-aligned unavailable-state register/filter/type/detail UI.
3. `frontend/scripts/run-ai-img03-tests.cjs` — isolated no-request data-boundary and real tab-event regression.
4. `AI-PREDICTIONS-IMG-03-IMPLEMENTATION-REPORT.md` — complete reference capture, mappings, blockers and verification.

Generated local build/check/screenshot artifacts are under `tmp/ai-img03-review/`; they are not application dependencies/routes. **No Neon access, schema changes, migrations, seeds, database writes or deployment. STOP after IMG-03.**
