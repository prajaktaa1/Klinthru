# AI Predictions IMG-04 — Deterioration Trends

21 October 2026. **Safe local UI/read bindings implemented; operational forecasts BLOCKED.** Scope ends at IMG-04.

References: `../All-doc/new/ai prediction/ChatGPT Image Oct 7, 2026, 03_31_39 AM-3.png` viewed at original resolution; `../All-doc/new/AI prediction.docx`, especially P0153–0190; existing Step0 and IMG-01–03 evidence; current code. Screenshot values below are review references, never operational records, approved thresholds or synthetic inputs.

## Implemented behavior

- Existing `/ai-predictions` page now supports Overview, Prediction Results and Deterioration Trends in place. Nine-tab order, shared header/KPIs, existing source readers and prior views remain. Later tabs stay disabled.
- Reference filter row; three upper and two lower chart panels; axis/unit labels; Historical/AI Predicted/Confidence Band legends; explicit missing start date/model/snapshot/interval fields; five insight panels; Generated timestamp and Recommendation control.
- Forecast curves, confidence shading, reference date ticks/Today cutoff, threshold lines, risk bands, example narratives and percentages are not fabricated. They show N/A/blocked explanations. Empty axes describe unavailable time coordinates. Risk Score0–100 is retained as reference copy with an explicit scale-not-approved qualification; it is not a calculated score or adopted classification.
- The corrosion panel reuses the existing authenticated, selected-pipeline ILI measurement chart under **Historical actuals · repeated ILI depth**. The existing select-only PipelineSelector is available in “Select historical source.” Compatible source responses show actual depth/date/feature context; other states show N/A. Forecast content is a separate unavailable panel. No measured growth rate is extrapolated into a future curve.
- Historical source values are withheld during failed/readiness loading states and continue to use existing subject/feature checks, source401 clearing and native backend compatibility checks. The existing historical chart accessibility label now explicitly identifies ILI depth measurements.
- No remaining-wall thickness is inferred by subtracting arbitrary nominal thickness; no defect counts are reconstructed from ILI observations; no official Risk scale is normalized to100; no life threshold or confidence interval is invented.

## Reference inventory

### Shared heading/KPIs/tabs

Heading `AI Predictions`; subtitle `Predict, prioritize and prepare for the future. AI-driven insights for pipeline integrity, based on historical data and current conditions.` Breadcrumb `Home` › `Integrity Management` › `AI Predictions`; buttons `Export`, `Run AI Analysis` with document/plus icons. Existing Klinthru shell/navigation retained.

| Value | Label | Supporting text |
|---|---|---|
| 36 | Predicted High-Risk Locations | +12% vs. last run |
| 28 | Likely New Defects (12 months) | +8% vs. last run |
| 14 | Assets Requiring Early Inspection | +40% vs. last run |
| 18 | Estimated Life Reduction | Segments affected |
| 87% | Model Confidence | +3% vs. last run |

Tabs: `Overview`, `Prediction Results`, `Deterioration Trends` selected, `Inspection Prioritization`, `Scenario Analysis`, `Model Performance`, `Related Data`, `Reports`, `Configuration`. Shared KPI values remain N/A because no saved AI aggregate/confidence provider exists. Earlier documented risk/confidence naming decisions remain unresolved.

### Filters

| Label | Printed selection | Implementation |
|---|---|---|
| Pipeline | All Pipelines | Disabled forecast selector; separate existing historical source selector uses the native API. |
| Segment | All Segments | Disabled until an authorized forecast subject catalog exists. |
| Defect Category | All Defect Categories | Disabled; no invented taxonomy/options. |
| Time Window | Next 20 Years | Visible reference selection, disabled; not a generated20-year forecast. |
| Model Version | v2.3 (Latest) | N/A; no verified eligible model version exists. Latest never selects/promotes a model automatically. |

`Reset Filters` with reset icon, disabled because no approved forecast filter dataset is present. Hidden options are not visible and are not reconstructed.

### Five charts, axes and legends

All five references show `Historical` blue solid line/points, `AI Predicted` red dashed line and `Confidence Band` pink shading. They show a dashed `Today` marker near2025, historical observations followed by a future curve and increasing uncertainty. Exact point values, timestamps, lower/upper bounds and confidence coverage are not numerically printed and are not inferred from pixels.

| Chart | Y label and printed ticks | X labels | Additional reference markings / disposition |
|---|---|---|---|
| Corrosion Growth Trend | Corrosion Depth (mm);0.0,2.0,4.0,6.0,8.0,10.0,12.0 | 2020,2025,2030,2035,2040,2045 | Existing actual repeated ILI depths are reusable; no AI forecast/bounds provided. |
| Wall-Thickness Decline | Wall Thickness (mm);0.0,5.0,10.0,15.0,20.0,25.0 | 2020,2025,2030,2035,2040,2045 | Critical Threshold (6 mm), red dashed line. **Not adopted**; critical method/threshold/source approval missing. |
| Defect Growth Trend | Number of Defects;0,20,40,60,80,100 | 2020,2025,2030,2035,2040,2045 | No confirmed Defect history/population or saved count forecasts. Native anomaly counts do not substitute. |
| Remaining Life Projection | Remaining Life (Years);0,10,20,30,40,50 | 2020,2025,2030,2035,2040,2045 | End of Life Threshold (5 years), red dashed line. **Not adopted**; advisory estimate and failure criterion missing. |
| Risk Trajectory Over Time | Risk Score (0 - 100);0,20,40,60,80,100 | 2020,2025,2030,2035,2040,2045 | High Risk / Medium Risk / Low Risk shaded zones. **Not adopted**; outlook method/scale/class boundaries missing. No current-Risk conversion. |

The screenshot's Today marker is not the client's current date and is not an approved prediction start/cutoff. No2025 boundary or2020–2045 sampling range is installed as operational history. Actual ILI chart axes derive only from actual endpoint depth values; measured source dates are printed alongside the chart. Forecast panels have no populated series or bands.

### AI Insights — printed examples only

Title `AI Insights`; `Generated: Apr 28, 2025 10:24`.

| Title | Printed narrative |
|---|---|
| Increasing Corrosion Growth | Corrosion depth is predicted to increase by +68% over the next 10 years, with highest growth in Segment A-12. |
| Accelerated Wall-Thickness Loss | Wall thickness is forecast to reach critical levels in 8–12 years for 14 segments, primarily due to external corrosion. |
| Rising Defect Count | Total defects are expected to increase by +85% by 2045, with corrosion and metal loss defects driving the increase. |
| Reduced Remaining Life | Average remaining life is projected to decrease from 28 years to 16 years (-43%) across affected segments. |
| Elevated Risk Outlook | Pipeline risk is forecast to move from Medium to High by 2035 if no additional mitigation is taken. |
| Recommendation | Prioritize inspection and mitigation for 14 high-risk segments, and consider accelerated monitoring for segments with predicted rapid deterioration. |

Reference uses rising arrows/bars, clock, warning and shield icons; Recommendation has a document icon and right chevron. Implementation retains the titles/icon emphasis with N/A/evidence-specific blocked descriptions and disabled recommendation handoff. No affirmative prediction claim, fake generation timestamp or engineering recommendation is generated.

## Backend → API → DB → frontend bindings

| Binding | Existing verified local contract | Usage / missing fields |
|---|---|---|
| Readiness/auth | `backend/src/routes/aiPredictions.ts` → `aiPredictions/readinessData.ts` / `readiness.ts`; authenticated GET `/api/ai-predictions/readiness`; `frontend/src/lib/apiClient.ts` → workspace | Technical availability only. Not a model, forecast, confidence or aggregate KPI. Existing private/no-store behavior unchanged. |
| Historical ILI depth | AI router → `aiPredictions/corrosionGrowthData.ts` → `corrosionGrowth.ts`; GET `/api/ai-predictions/corrosion-growth/:pipelineId` with optional backend featureId | Owner-scoped `IliAnomaly.featureId,depthMm,anomalyType,orientation,inspectionRunId` joined to `IliInspectionRun.pipelineId,inspectionDate,authorId`. Existing API chooses only compatible repeated measurements, emits source fields; no frontend engineering recalculation. Frontend `fetchCorrosionGrowth` → `scopedAiGrowth` → existing historical chart and new trends prop. |
| Subject selection | Existing `PipelineSelector mode="select-only"`; `apiClient.ts`; native pipeline GETs / `routes/pipelines.ts`, `data/store.ts` | `Pipeline.id,pipelineCode,pipelineName`; selected native ID scopes existing requests. No pipeline creation/update workflow introduced. Native segment/master records are not AI forecasts. |
| Critical wall/life criterion | `aiPredictions/failureCriterion.ts`, existing API criterion metadata | Currently unconfigured; screenshot6mm/5years do not supply an approved method/version/source. No criterion defaults added. |
| Actual CP context | Native CP GET and existing `aiCpHistoricalSeries`; `CpReadingHistory` timestamps/measurement/electrode/units | Existing IMG-01 context preserved in Overview; potential readings are not corrosion-depth, wall, life or risk forecasts. |
| Official risk | Existing Risk APIs/repos; `Risk.riskId,currentApprovedRevisionId`, immutable `RiskAssessmentRevision` methodology/matrix/source snapshot, inherent/current/residual results | Owner state unchanged. No automatic normalization, reassessment or new Risk_ID revision. |
| AI forecast/model/snapshot/insights | No corresponding saved provider in inspected AI router/schema | DOCX P0161–0174 requires Forecast_ID, Source_Metric, Forecast_Date/Horizon, Predicted_Value, Lower_Bound, Upper_Bound, Confidence, Model_Version, Source_Snapshot; P0355–0373 adds exact source IDs/versions/timestamps/cutoff/features/config. All missing rather than invented schema. |

No backend source/API/schema change was warranted without an approved compatible forecast contract. Existing backend readers/build/auth regressions are verified for preservation. Local model declarations cannot establish live DB state. No live operational or Neon verification was performed.

## Remaining blockers

1. Approved persisted forecast/model/run/version/input-snapshot provider, exact immutable source provenance, cutoff, interval coverage/bounds and model permission/promotion contracts. Source histories never become forecasts through extrapolation or renamed DTOs.
2. Compatible wall-thickness and confirmed defect history; governed advisory life estimates; forecast metric/unit/cohort/aggregation definitions; critical wall/end-of-life criteria; advisory risk scale/classes distinct from Risk Assessment. No screenshot threshold is approval evidence.
3. Model-specific filter catalog, approved eligible versions/horizons, insight/explanation evidence, source ACL parity, expiry/idempotency, recommendation identity and human-approved owner/Action handoff.
4. Authenticated populated operational data evidence after those contracts exist. Test fixtures and local unavailable-state screenshots do not supply it.

## Exact maintained files changed

1. `frontend/src/components/ai-deterioration-trends.tsx` — new local trend/filter/insight UI with separated native historical context and blocked forecasts.
2. `frontend/src/components/ai-predictions-workspace.tsx` — enable third tab, pass existing scoped historical data/selector; clarify actual-chart accessibility label.
3. `frontend/scripts/run-ai-img04-tests.cjs` — isolated trend/state/no-synthetic-value regressions.
4. `frontend/scripts/run-ai-img03-tests.cjs` — update navigation expectation now that the third tab is authorized.
5. `AI-PREDICTIONS-IMG-04-IMPLEMENTATION-REPORT.md` — reference capture, source mapping, dependencies and results.

Build/check/screenshot artifacts live in `tmp/ai-img04-review/`. No shared styles, dependencies, routes, schema/migrations, backend source or other modules were changed. No Neon access, seeds, database writes or production deployment. **STOP after IMG-04.**

## Verification

| Check | Result / limits |
|---|---|
| Frontend/backend typechecks | PASS; frontend `tsc --noEmit --incremental false`, backend `tsc -p tsconfig.json --noEmit`. |
| Backend emitted build | PASS; isolated output under `tmp/ai-img04-review/backend-dist`; application not started. |
| Frontend optimized production build | PASS, exit0; compilation/type validation, all32 static pages and existing dynamic route. Isolated source copy matches final maintained component hashes. No environment files copied; telemetry disabled; unreachable loopback API. Working build outputs untouched. |
| IMG-04 regression | PASS: five chart panels, labels/units/lineage slots; no synthetic curves/intervals/reference thresholds/model versions; loading/failure suppress supplied historical context; Overview/Results/Trends event/state navigation; later tabs remain blocked. |
| Existing IMG-01–03 regressions | PASS: source/feature scope,401 cache clearing, native CP series/units and ambiguity/zero behavior, unavailable-state overview/results, no feature-as-aggregate or demo values; previous navigation expectation updated for the authorized third tab. |
| Backend AI regression | PASS: injected read-only/source-scoped SQL, unavailable versus empty, demo exclusion, unchanged response keys, unauthenticated401 and private/no-store response headers. No storage initialization or database access. |
| Responsive visual checks | PASS: exact Chrome CDP viewports1672/820/390px, no page-level horizontal overflow, full-height screenshots captured; desktop/mobile inspected. Production CSS with isolated unavailable-state render. Native large charts retain their existing internal scroll container. |
| Preservation | PASS within baseline:340 pre-existing files,338 unchanged; existing changes only the workspace and IMG-03 navigation test. Backend/schema/migrations/routes/shared styles/dependencies/other modules and previous reports match baseline. New component/test/report are additions. |
| Operational data / end-to-end limits | BLOCKED: no live authenticated records, approved model/forecast provider or populated forecast evidence. Static browser rendering and isolated state/DTO tests do not establish hydrated live workflows. Historical reader behavior is verified locally; existence/values of operational records are not claimed. |

Local tests use isolated verification inputs and prohibit operational requests. Test fixtures are not records or engineering approvals. No Neon access, database writes, migrations, seeds or production changes occurred.
