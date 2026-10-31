# AI Predictions IMG-05 — Inspection Prioritization

21 October 2026. **DONE: safe local UI. BLOCKED: operational recommendations, scoring, GIS and owner handoffs.**

References: `../All-doc/new/ai prediction/ChatGPT Image Oct 7, 2026, 03_31_42 AM-4.png` viewed at original resolution; `../All-doc/new/AI prediction.docx` P0191–0225 plus root prediction/snapshot/permissions rules; existing Step0 and IMG-01–04 reports; current code. Screenshot examples below are documentation only, never application records or approved rules.

## Implemented

- Fourth tab enabled in existing `/ai-predictions` workspace. Overview, Results, Trends, source readers, nine-tab order, Klinthru shell and shared header/KPIs preserved. No new routes, schema, dependencies or shared styling.
- Reference filter/header, ranked table with all11 columns and priority-sort affordance, Download/formats, pagination, Priority Heat Map, location/GIS panel and Recommendation Rationale.
- Missing counts, priority scores, risk classes, inspection dates/methods, remaining life, confidence, model/run/snapshot provenance and recommendations show N/A. N/A is distinct from zero or an empty verified population.
- Heat-map cells remain neutral N/A; reference class/legend labels do not become engineering thresholds. Map remains unavailable with disabled zoom/layers/View All; no fake basemap, markers, route or numeric scale.
- Missing data operations are disabled. No fake recommendation row, selection, confidence, rationales, export or inspection schedule. Reference Inspection Due explicitly means an advisory recommended window, never an approved schedule.
- Rationale includes missing recommendation/prediction identities, location scope, drivers, method/window, model/run/snapshot/source lineage, review status and Action_ID. Engineer acceptance and the existing central Action/planning owner are required before any external CMMS handoff through Integration Hub.

## Reference capture and differences

Shared header: `AI Predictions`; subtitle `Predict, prioritize and prepare for the future. AI-driven insights for pipeline integrity, based on historical data and current conditions.`; `Export`, `Run AI Analysis`. Breadcrumb `Home` › `Integrity Management` › `AI Predictions`.

KPI examples:36 Predicted High-Risk Locations/+12% vs. last run;28 Likely New Defects (12 months)/+8%;14 Assets Requiring Early Inspection/+40%;18 Estimated Life Reduction/Segments affected;87% Model Confidence/+3%. All remain N/A; no approved aggregate/confidence contract exists. Existing nine tabs/order retained, Inspection Prioritization selected in this view.

Reference shell is `PipeGuard` with Dashboard/Assets/Inspections/Integrity Management/AI Predictions/Reports navigation, search `Search assets, locations, or keywords...`, notification icon, JD/John Doe/Integrity Engineer and user chevron. Existing Klinthru shell/identity/navigation is preserved rather than adopting another reference brand.

### Filters and table

Heading `Inspection Prioritization`; subtitle `AI-ranked assets and segments for proactive inspection based on predicted risk, remaining life, and consequence.`; `Last analysis: Apr 22, 2025 10:24 AM` → N/A.

| Filter | Visible selection |
|---|---|
| Pipeline | All Pipelines |
| Risk Class | All Risk Classes |
| Region | All Regions |
| Inspection Due Window | Next 12 Months |
| Inspection Method | All Methods |

`Clear Filters`/reset icon; hidden dropdown options are unknown. All forecast/recommendation filters remain disabled without their approved result/catalog provider. Next12Months is reference UI copy, not a generated operational horizon.

Title `Ranked Inspection Recommendations (36)` → N/A; subtitle `Assets and segments prioritized by AI based on risk, consequence, and remaining life.`; `Download` with separate dropdown chevron. Table columns and screenshot-only examples:

| # | Asset / Segment and STA | Pipeline | Priority Score | Predicted Risk | Inspection Due | Inspection Type | Recommended Method | Remaining Life | Confidence | Actions |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | KP-1023; STA 12+340 – 12+780 | Northern Line | 98 | Very High | May 15, 2025 | ILI | MFL (High Resolution) | 2.1 yrs | 92% | View; … |
| 2 | VAL-556; STA 45+120 | Central Line | 95 | Very High | May 28, 2025 | Direct Assessment | UT / RT | 3.4 yrs | 89% | View; … |
| 3 | KP-3187; STA 78+450 – 78+910 | Eastern Line | 92 | High | Jun 10, 2025 | ILI | Geometry + MFL | 4.2 yrs | 88% | View; … |
| 4 | CS-0042; STA 102+300 | Northern Line | 88 | High | Jun 22, 2025 | ECDA | UT | 4.8 yrs | 85% | View; … |
| 5 | KP-2761; STA 18+220 – 18+900 | Western Line | 85 | High | Jul 5, 2025 | ILI | MFL (Standard) | 5.1 yrs | 84% | View; … |
| 6 | VAL-778; STA 63+410 | Central Line | 82 | Medium | Jul 18, 2025 | Visual Inspection | Close Visual (CVI) | 6.3 yrs | 81% | View; … |
| 7 | KP-4410; STA 91+100 – 91+540 | Eastern Line | 78 | Medium | Aug 2, 2025 | ECDA | UT | 6.7 yrs | 79% | View; … |
| 8 | TS-0091; STA 27+600 | Southern Line | 76 | Medium | Aug 14, 2025 | Direct Assessment | PAUT | 7.2 yrs | 77% | View; … |
| 9 | KP-6008; STA 110+220 – 110+780 | Western Line | 71 | Low | Sep 5, 2025 | ILI | Caliper | 8.1 yrs | 74% | View; … |
| 10 | VAL-230; STA 5+320 | Northern Line | 68 | Low | Sep 18, 2025 | Visual Inspection | Drone / Aerial | 8.4 yrs | 72% | View; … |

Priority Score has sort arrows; risk/priority/confidence colours are examples, not approved thresholds. Stationing datum/units and asset code joins are not inferred. Dates/windows remain recommendations rather than assignments. No example rows are rendered.

Footer `Showing 1–10 of 36 recommendations`; previous/next; pages1–4 with1 selected; `Rows per page: 10`. Missing totals/pages become N/A; page-size10 is a UI setting, not a result count. No operational paging or View/ellipsis row action can run without saved record IDs.

### Heat map

`Priority Heat Map`; `Risk vs. Consequence matrix for inspection prioritization.`; legend Critical(red), High(orange), Medium(amber), Low(teal). X-axis `Predicted Risk`; Y-axis `Consequence`. Printed counts:

| Consequence / Predicted Risk | Low | Medium | High | Very High |
|---|---|---|---|---|
| Very High | 0 | 2 | 7 | 9 |
| High | 1 | 5 | 8 | 3 |
| Medium | 4 | 3 | 2 | 1 |
| Low | 6 | 1 | 0 | 0 |

Cells total52, different from36 recommendations. No denominator/overlap explanation or classification policy exists. Implementation shows16 neutral N/A cells with class labels; it does not invent a severity mapping or reuse the official Risk Matrix.

### GIS and rationale

`Recommended Inspection Locations`; `Geographic view of top AI-prioritized inspection locations.`; `View All`; route/markers; legend Very High/High/Medium/Low; zoom +/− and layers; map place labels Riverton/Clearwater/Stone Ridge; scale0,10,20,40km. Exact geographic coordinates, route geometry/CRS, source IDs, popup contents and marker populations are not supplied. All are unavailable rather than reconstructed from pixels.

`Recommendation Rationale`; ellipsis; `KP-1023`; `STA 12+340 – 12+780`; badge `Very High Priority`.

Key Drivers:

- High predicted corrosion risk due to CP underperformance
- Historical metal loss trend indicating acceleration
- Near high-consequence area (river crossing)
- Remaining life estimated at 2.1 years

`AI Confidence` = `92% (High)`; `Recommended Action` = `Schedule ILI with high-resolution MFL within 30 days`.

Those explanations require exact prediction/model/snapshot and CP/ILI/geographic evidence. The sample action is not scheduling permission or an approved inspection deadline/method. Implementation shows N/A and a human-acceptance boundary; no derived CP performance/life score or recommendation is generated.

## Backend/API/DB/component mapping

| Requirement | Existing local source chain | Disposition |
|---|---|---|
| Readiness and auth | `backend/src/routes/aiPredictions.ts` → `aiPredictions/readinessData.ts`, `readiness.ts`; authenticated private/no-store GET `/api/ai-predictions/readiness`; `frontend/src/lib/apiClient.ts` → existing workspace | Reused technical availability only. Not a recommendation population, confidence or priority score. |
| Recommendation register/filter/sort/counts/details | No saved recommendation endpoint/model in inspected AI router/Prisma schema | BLOCKED; no new route/schema/response contract invented. DOCX P0193–0210 requires AI_Inspection_Recommendation_ID, Pipeline_ID/Segment_ID/KP_Range, Priority_Score, Predicted_Concern/Risk_Outlook, Recommended_Inspection_Window/Method, Remaining_Life_Estimate, Prediction_Confidence and AI_Prediction_ID(s). |
| Subject and GIS context | Native `/api/pipelines`, `/api/asset-master/segments?pipelineId=…`, `/assets?pipelineId=…`; `routes/pipelines.ts`, `routes/assetMaster.ts`, `data/store.ts`; `Pipeline.id,pipelineCode,pipelineName`; `Segment.id,pipelineId,segmentId,startKp,endKp`; `Asset.id,assetId,pipelineId,segmentId,kp,latitude,longitude` | Native context exists; approved recommendation→subject joins, stationing/region/CRS, full route geometry and scoped native GIS destination are absent. No unlinked native coordinates presented as recommended locations. |
| Source evidence | Existing ILI growth GET and `IliAnomaly`/`IliInspectionRun`; native CP GET and `CpReadingHistory`/criteria; native Risk readers and immutable `RiskAssessmentRevision` | Existing IMG-01/04 bindings preserved. Source observations/statuses do not establish forecasts, CP effectiveness, priorities or recommendation methods. Official Risk and engineering remaining life remain source-owned. |
| Human acceptance / Action / CMMS | DOCX P0217–0225; existing Integration Hub routes and `IntegrationConnector`/`IntegrationEvent` are connection/event owners | Central Action_ID/planning ownership, permission, approval and idempotent handoff provider absent. Connectors are not schedules/recommendations. No scheduling endpoint or upstream write added. |
| Downloads | Existing Reports/Document owner routes and models | Missing AI export dataset/template/format/ACL/report-run/document link. Existing engineering report files cannot substitute an AI recommendation report. |
| Model/run/snapshot lineage | DOCX root/run/snapshot contracts; no saved AI provider locally | N/A for model/version/run/snapshot/source lineage. No mutable source cache is claimed as an immutable run snapshot. |
| Frontend | Existing workspace → new `ai-inspection-prioritization.tsx` | Same page and components, fourth tab only. Later tabs disabled; no global shell redesign. |

No backend modification is justified by an existing additional approved recommendation contract. Local schema absence does not establish remote DB absence. No Neon/live authenticated data verification was attempted.

## Remaining approval dependencies

1. Approved saved recommendation/result/model/run/snapshot provider and source ACL parity, immutable versions/cutoff, expiry and idempotency.
2. Ranking/priority and consequence methodology, outlook classes, confidence semantics, life/window/method rules, eligible populations and52-versus36 reconciliation. Source-compatible inspection methods require approved applicability, not screenshot examples.
3. Region/stationing/geographic contracts and native GIS handoff; saved recommendation detail/filter/sort/page contracts; source-linked drivers/explanations.
4. Authorized advisory review/acceptance, central Action_ID/planning/CMMS ownership, report export and source-module permissions. AI cannot approve a schedule, mutate CP/Risk/ILI or generate Defect_ID/Risk_ID.
5. Operational populated evidence after approved contracts exist. Local unavailable-state renders/test fixtures are not live records.

## Maintained files changed

1. `frontend/src/components/ai-inspection-prioritization.tsx` — local reference layout with blocked recommendation, heat-map, GIS and rationale bindings.
2. `frontend/src/components/ai-predictions-workspace.tsx` — fourth in-place tab; previous views/readers preserved.
3. `frontend/scripts/run-ai-img05-tests.cjs` — isolated data-boundary/navigation regression.
4. `frontend/scripts/run-ai-img03-tests.cjs` — authorized fourth-tab navigation expectation.
5. `frontend/scripts/run-ai-img04-tests.cjs` — authorized fourth-tab navigation expectation.
6. `AI-PREDICTIONS-IMG-05-IMPLEMENTATION-REPORT.md` — this report.

Generated review/build/screenshot artifacts: `tmp/ai-img05-review/`. **No Neon access, writes, schema/migrations, seeds or production changes. STOP after IMG-05.**

## Verification

| Check | Result / limits |
|---|---|
| Frontend/backend typechecks | PASS. |
| Backend emitted build | PASS; isolated output under `tmp/ai-img05-review/backend-dist`; no backend application startup. |
| Frontend production build | PASS on final source, exit0: optimized compilation/type validation, all32 static pages and existing dynamic route. Isolated copy excludes environment files, disables telemetry and points API at unreachable loopback. Working build directories untouched. |
| IMG-05 regression | PASS: four-tab event/state navigation, prior views/source context retained, missing recommendation fields/lineage explicit, sixteen neutral N/A heat-map cells, unavailable filters/page/download/GIS/actions, advisory scheduling boundary, loading/error states, no screenshot records/scores/confidence. All operational requests prohibited. |
| IMG-01–04 regressions | PASS: previous layouts/blocked data, source pipeline/feature scope,401 cache clearing, native CP units/homogeneous groups, ambiguous/duplicate/invalid series handling, zero retained, no feature-as-aggregate or demo metrics. Only navigation expectations changed for the newly authorized fourth tab. |
| Backend AI regression | PASS: injected source-scoped read-only SQL, unavailable versus empty, demo exclusion, unchanged response keys, authenticated routes,401 without authentication and private/no-store headers. No storage initialization, database connection or writes. |
| Responsive visual checks | PASS at exact Chrome CDP widths1672/820/390px; two tables present; no document horizontal overflow. Full-height screenshots captured; desktop/mobile inspected with actual production CSS. Wide table/tabs use internal scroll containers. |
| Preservation | PASS within343-file baseline:340 unchanged; existing changes only workspace and IMG-03/04 navigation tests. New component/test/report are additions. Backend/schema/migrations/routes/shared styles/dependencies/other modules and earlier reports match baseline. Build component copies match final source hashes. |
| Verification limits | Local static browser renders and isolated React event/state tests do not establish hydrated/live authenticated workflows or populated recommendation correctness. Operational recommendation/model/GIS data remain BLOCKED; no live evidence claimed. |

Local verification fixtures are test inputs, never operational records or engineering approvals. Generated build/visual scripts and artifacts remain in `tmp/ai-img05-review/`. No Neon access, migrations, seeds, database writes or production deployment.
