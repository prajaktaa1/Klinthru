# AI Predictions IMG-06 — Scenario Analysis

21 October 2026. **DONE: local unavailable-state UI. BLOCKED: immutable scenario cloning/execution and saved simulation results.** Scope ends at IMG-06.

References: `../All-doc/new/ai prediction/ChatGPT Image Oct 7, 2026, 03_31_45 AM-5.png`, viewed at original resolution; `../All-doc/new/AI prediction.docx` P0226–0271, root/model-run/snapshot/idempotency rules; existing Step0 and IMG-01–05 reports; current source. All screenshot numbers below are reference examples, not operational inputs, approved ranges or simulated results.

## Implemented

- Fifth in-place tab in existing `/ai-predictions`; prior Overview/Results/Trends/Prioritization views, source readers, shared header/KPIs, nine-tab order, routes/schema/shared styling and other modules preserved. Later tabs disabled.
- Five reference scenario cards with descriptions, three parameters/units each, Base Case current-conditions slot, five unavailable slider tracks and four Apply Scenario buttons.
- Fifteen input values are explicitly N/A and disabled. No numeric pressure/CP/inspection defaults, min/max bounds, slider thumb positions or dropdown options invented. Slider-shaped disabled tracks are not operational range inputs; approved bounds and a cloned baseline are missing.
- Three reference chart panels, axes/units, scenario legends and missing-results explanations; AI Recommendation, four benefit slots, full-analysis/report controls and explicit scenario/base/model/run/snapshot/confidence/source-lineage fields.
- No synthetic curves, bars, zero baseline comparison, green recommended-strategy claim, cost rating or confidence. No clone/AI_Scenario_ID/run was created. Execution remains blocked rather than simulating on live records or fabricated baseline data.
- Component imports no operational API, writable store, source mutation callback or execution provider. Shared readiness is technical status only. The view explicitly prohibits CP/SCADA/Risk/Defect/schedule changes and requires human approval before recommendation handoff.

## Reference capture

Shared heading `AI Predictions`; subtitle `Predict, prioritize and prepare for the future. AI-driven insights for pipeline integrity, based on historical data and current conditions.`; breadcrumb Home › Integrity Management › AI Predictions; `Export`, `Run AI Analysis`.

Reference KPI examples:36 Predicted High-Risk Locations/+12% vs. last run;28 Likely New Defects (12 months)/+8%;14 Assets Requiring Early Inspection/+40%;18 Estimated Life Reduction/Segments affected;87% Model Confidence/+3%. All remain N/A, with the existing documented aggregate/scoring/confidence blockers.

Tabs: Overview, Prediction Results, Deterioration Trends, Inspection Prioritization, **Scenario Analysis** selected, Model Performance, Related Data, Reports, Configuration. No additional major tab or route created.

Title `Scenario Analysis`; subtitle `Compare what-if scenarios to evaluate the impact of different strategies on pipeline integrity, risk, and remaining life.`; information text `Adjust scenario parameters to see projected outcomes based on AI models.`

### Cards/parameters — screenshot examples only

| Card / description | Pressure Cycle (cycles/day) | CP Effectiveness (%) | Next Inspection (months) | Controls |
|---|---|---|---|---|
| 1. Base Case; Current Conditions; Baseline scenario using current operating conditions and planned activities. | 3 | 85 | 12 | Read-only value boxes; blue baseline emphasis. |
| 2. Increased Pressure Cycle; Evaluate the impact of higher pressure cycling due to increased throughput. | 6 | 85 | 12 | Pressure slider; Apply Scenario. |
| 3. Improved CP; Assess benefits of enhanced cathodic protection (CP) performance. | 3 | 95 | 12 | CP slider; Apply Scenario. |
| 4. Delayed Inspection; Evaluate risk of extending inspection intervals due to resource constraints. | 3 | 85 | 24 | Inspection slider; Apply Scenario. |
| 5. Mitigation Scenario; Combined strategy with improved CP and accelerated inspection. | 3 | 95 | 6 | CP and inspection sliders; Apply Scenario. |

Icons: bars, rising trend, shield, clock, wrench. Sliders have no printed min/max/step; hidden options are unknown. No scenario-specific dropdown is visibly present in this image, so none is invented. Current Conditions is N/A without a verified source snapshot. Visible model examples do not authorize CP effectiveness conversion from millivolts or pressure-cycle extraction from pressure samples.

### Comparison charts

| Panel | Printed axes/legend | Printed results / disposition |
|---|---|---|
| Projected Defect Growth; Cumulative predicted defects over 10 years | Y Number of Defects;0/20/40/60/80/100. X Years;0/2/4/6/8/10. Legend Increased Pressure(red), Delayed Inspection(orange), Base Case(blue), Mitigation Scenario(purple), Improved CP(green). | No numeric point labels. No line values reconstructed from pixels. No plotted series until an approved saved simulation exists. |
| Projected Remaining Life; Estimated remaining life (years) | Y Remaining Life (Years);0/10/20/30/40. X Base Case/Increased Pressure/Improved CP/Delayed Inspection/Mitigation Scenario. | Bars24/16/32/18/30 respectively. All unavailable; native deterministic RUL is not scenario output. |
| Risk Change by Scenario; Change in overall risk score vs. base case | Y Risk Change;−60%/−40%/−20%/0%/20%/40%/60%. X same five scenarios. | Base0%, Increased Pressure+52%, Improved CP−38%, Delayed Inspection+28%, Mitigation−45%. No baseline or risk-normalization formula approved; even Base0% remains N/A. |

Reference horizons/axes are display examples, not approved sampling/forecast contracts. Implementation retains panel labels, unit descriptions and legend intent with N/A coordinates/results; no fake lines/bars/uncertainty or default scale bounds.

### Recommendation and benefits

`AI Recommendation`; `Mitigation Scenario is the recommended strategy` with green check. Narrative: `The mitigation scenario (improved CP + accelerated inspection) provides the best balance of risk reduction and cost, with 45% lower risk than the base case and an estimated 6 additional years of remaining life compared to the current plan.`

`Key Benefits vs. Base Case`: −45% Overall Risk; +6 years Remaining Life; −62% Predicted Defects; Moderate Additional Cost. Buttons `View Full Analysis` (right arrow), `Download Scenario Report` (document icon).

No recommendation/cost claim is displayed as fact. Missing objective function, cost basis, model outputs, comparative population and human-review authority remain blocked. Report/full-analysis controls disabled without saved scenario identity and owner destination.

## Existing backend/frontend/data contracts

| Requirement | Existing local authority/API/files | Usage or missing contract |
|---|---|---|
| Readiness / source auth | `backend/src/routes/aiPredictions.ts` → `aiPredictions/readinessData.ts`, `readiness.ts`; authenticated GET `/api/ai-predictions/readiness`; private/no-store; `frontend/src/lib/apiClient.ts` → workspace | Reused unchanged technical availability. It supplies no scenario inputs/results or snapshots. |
| Deterministic measured ILI context | Existing GET `/api/ai-predictions/corrosion-growth/:pipelineId`; `corrosionGrowthData.ts`/`corrosionGrowth.ts`; `IliAnomaly.featureId,depthMm,inspectionRunId`; `IliInspectionRun.pipelineId,inspectionDate,authorId` | Existing IMG-01/04 measured data preserved. No extrapolation or scenario branching from selected observations; no invented model-run lineage. |
| CP input evidence | Native GET `/api/cp-monitoring/:pipelineId`; `routes/cpMonitoring.ts`, `cpMonitoring/data.ts`; `CpReadingHistory` timestamp/measurement/electrode/value/quality and criteria/evaluation versions | Native potentials are not CP Effectiveness85/95%. Requires an approved model feature definition, source projection/versions, quality/criterion rules and cloned snapshot. |
| SCADA input evidence | Native GET `/api/scada/overview?pipelineId=…`, `/api/scada/tags/:id/history`; `routes/scada.ts`, `utils/scadaData.ts`; `ScadaTag` source/subject/unit, `SharedTimeSeriesReading` value/engineeringUnit/timestamps/quality | Pressure readings do not define pressure cycles/day. Cycle detection/window/filter/unit/feature version must be approved; no source writes or derived feature added. |
| Subject and inspection baseline | Native Pipeline/Segment/Asset IDs/context; governed inspection/planning owner required for current schedule | Subject metadata is not an immutable scenario baseline or approved next-inspection interval. No schedule/API/field invented. |
| Risk/Defect engineering ownership | Existing Risk APIs/models, immutable `RiskAssessmentRevision` inherent/current/residual/version/source snapshot; native Defect ownership remains separate | No native Risk score conversion, reassessment, treatment acceptance or new Defect/Risk record. Scenario outlook stays advisory. |
| Clone / hypothetical inputs / simulation | DOCX P0242–0257 requires AI_Scenario_ID, current snapshot→clone→hypothetical variables→simulation→results→base comparison | No approved saved scenario/clone/run/result API/model in inspected AI router/schema. Missing provider means no clone/execution occurs. No new route/schema/client response invented. |
| Reproducibility / permissions | DOCX snapshot/run/feature/config/model and idempotency rules | Need immutable base/source IDs/versions/timestamps/cutoff, supported parameter ranges/units, model eligibility/version, separate run/snapshot lineage, expiry/retries/concurrency and read/run/review permissions. No fabricated identifiers. |
| Acceptance / report handoff | DOCX P0258–0271: recommendation→human approval→Action/Risk Treatment/Engineering Review; existing central Report/Document and Integration Hub ownership | Missing accepted recommendation/Action identity, separation of duties, native review destination and central scenario-report dataset/template/document linkage. Execution/acceptance/export stays disabled. |
| Frontend | Existing workspace → new `ai-scenario-analysis.tsx` | Five in-place tabs; no writable scenario persistence or source mutation integration. |

No additional approved simulation contract was found, so backend source/response/schema remained unchanged. Local schema inspection does not establish deployed/live DB state. No Neon/live operational request was made.

## Remaining blockers

1. Authorized immutable source snapshot→scenario clone provider and AI_Scenario_ID lifecycle. No live-record editing or inferred baseline allowed.
2. Model-specific parameter definitions/units/ranges/steps, compatible source feature projections (particularly CP effectiveness and pressure cycles), eligible approved model/version and hypothetical input versioning.
3. Saved simulation/run/results/intervals, comparable baseline/population, risk-change method, life/defect estimates, cost/objective policy and evidence-grounded recommendation.
4. Source/scenario/model permissions, snapshot retention/expiry, idempotency/concurrency and human-reviewed acceptance to central owner workflows/reporting. No automatic model promotion or upstream changes.
5. Operational authenticated records and sandbox runtime verification once those contracts exist. Local unavailable-state rendering is not an executed simulation or proof of deployed isolation.

## Exact maintained files changed

1. `frontend/src/components/ai-scenario-analysis.tsx` — five blocked scenario cards, comparisons, recommendation/benefit/lineage UI.
2. `frontend/src/components/ai-predictions-workspace.tsx` — enable fifth in-place tab, preserve existing views/readers.
3. `frontend/scripts/run-ai-img06-tests.cjs` — isolated parameter/result/data-boundary/navigation regression.
4. `frontend/scripts/run-ai-img03-tests.cjs` — authorized fifth-tab navigation expectations.
5. `frontend/scripts/run-ai-img05-tests.cjs` — authorized fifth-tab navigation expectations.
6. `AI-PREDICTIONS-IMG-06-IMPLEMENTATION-REPORT.md` — reference capture, mappings, blockers and verification.

Generated build/check/screenshot artifacts: `tmp/ai-img06-review/`. No Neon access, schema changes, migrations, seeds, database writes or production deployment. **STOP after IMG-06.**

## Verification

| Check | Result / limits |
|---|---|
| Frontend/backend typechecks | PASS. |
| Backend emitted build | PASS; isolated output under `tmp/ai-img06-review/backend-dist`; application not started. |
| Frontend production build | PASS on final source, exit0: optimized compilation/type validation, all32 static pages and existing dynamic route. Copied component hashes and compiled Scenario UI verified. Isolated copy excludes environment files, disables telemetry and uses unreachable loopback API; working build directories untouched. |
| IMG-06 regression | PASS: five-tab event/state navigation and earlier source context retained;15 N/A parameter inputs; five unavailable slider tracks without numeric range defaults; four Apply buttons disabled; missing clone/run/snapshot/result slots; no simulation curves, reference benefit values, fake model recommendations or source requests. Runtime clone/isolation verification remains blocked because no execution provider exists. |
| IMG-01–05 regressions | PASS: existing layouts/unavailable states, historical/forecast separation, scoped source/feature checks,401 clearing, homogeneous native CP units/history, invalid/duplicate/mixed inputs blocked, zero retained, no selected-feature-as-aggregate or demo values. Earlier navigation expectations updated for authorized fifth tab. |
| Backend AI auth/read-only regression | PASS: injected source-scoped SELECT contracts, unavailable versus empty, demo exclusion, unchanged response keys, authenticated routes,401 denial and private/no-store headers. No storage initialization or database connection. |
| Responsive visual checks | PASS at exact Chrome CDP viewports1672/820/390px; no document horizontal overflow. Full-height screenshots captured using production CSS; desktop/mobile inspected. Local static unavailable-state rendering only. |
| Preservation | PASS within346-file baseline:343 unchanged; existing changes only workspace and IMG-03/05 navigation tests. New component/test/report are additions. Backend/schema/migrations/routes/shared styles/dependencies/other modules and prior reports match baseline. |
| Operational limits | BLOCKED: no live authenticated records, immutable scenario clone, approved simulation engine or populated model outputs. Isolated React event/state and static browser tests do not establish hydrated/live execution, deployed permissions or runtime sandbox isolation. No simulation was run. |

Verification fixtures are isolated test inputs, never operational records or engineering approvals. No Neon access, schema/migration changes, seeds, database writes or production deployment.
