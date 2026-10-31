# AI Predictions IMG-07 — Model Performance

21 October 2026. **DONE: safe local Model Performance UI. BLOCKED: verified model/evaluation/outcome/governance providers and operational metrics.** Scope ends at IMG-07.

References: `../All-doc/new/ai prediction/ChatGPT Image Oct 7, 2026, 03_31_48 AM-6.png`, viewed at original resolution; `../All-doc/new/AI prediction.docx` P0272–0307/P0327–0342/P0383–0400 and snapshot/run rules; existing Step0 and IMG-01–06 reports; current source. All reference values below are documentation examples, never application records or approved thresholds.

## Implemented

- Sixth in-place tab on existing `/ai-predictions`; prior views/source readers, shared header/KPIs, nine-tab order, routes/schema/dependencies/shared styling and other modules preserved. Later tabs remain disabled.
- Five validation metric cards; four calibration/training/retraining/current-version cards; actual-outcome calibration and performance-history chart panels;10 feature-importance labels/tracks; model-health and governance panels; period selector/history/governance controls.
- All unavailable values, deltas, timestamps, dataset counts, version/approval/owner evidence, drift/health states, outcome links and lineage show N/A. No green Healthy/Approved/Good/Stable claim or service availability is inferred from technical readiness.
- No fabricated scatter points, perfect-calibration diagonal, time-series curves, feature percentages or monitoring thresholds. Reference features/categories retain labels only, with neutral unavailable tracks and no inferred weights/causation.
- Model validation scores, portfolio prediction confidence and individual prediction confidence are explicitly separate. Shared ambiguous Model Confidence remains N/A pending its existing definition decision; it is never filled with accuracy or a training score.
- Governance includes model/run/evaluation IDs, dataset/feature versions, train/validation dates, snapshot, approver/effective/retired dates, plus actual-outcome link slots. No model is retrained, approved or promoted. Candidate retraining requires data-quality validation, benchmark validation and explicit human approval before promotion.
- Missing history/governance navigation and period/filter datasets keep controls disabled. No new model execution/acceptance API or writable source operation.

## Reference capture

Shell `PipeSure`; `Pipeline Integrity Platform`; Dashboard/Assets/Inspections/Integrity Management/AI Predictions/Reports; search `Search assets, locations, or reports...`; bell badge3; JD/John Doe/Integrity Manager. Existing Klinthru shell/authenticated identity remains unchanged.

Shared heading/subtitle/breadcrumb, Export and Run AI Analysis; KPI examples36/+12%,28/+8%,14/+40%,18 Segments affected,87%/+3% remain N/A. Same nine tabs; Model Performance selected. None of those examples establishes an approved run/population/confidence contract.

Title `Model Performance`; subtitle `Evaluate model accuracy, reliability, and health. Monitor performance over time and ensure trusted AI predictions.`; Last updated `Apr 27, 2025 10:42 AM`; dropdown `Last 12 months`. Hidden options are unknown; no options/version choice invented.

### Metrics and metadata

| Label | Printed value | Printed supporting text |
|---|---|---|
| Model Accuracy | 87.3% | +3.1% vs. last period; upward arrow |
| Precision | 84.6% | +2.8%; upward arrow |
| Recall (Sensitivity) | 81.9% | +4.2%; upward arrow |
| False Positives | 4.8% | −1.6%; downward arrow |
| False Negatives | 7.1% | −2.3%; downward arrow |
| Confidence Calibration | Good calibration (ECE: 0.042) | Predicted probabilities align well with actual outcomes. |
| Training Data Health | High Quality | 124,532 inspection records |
| Last Retraining Date | Mar 15, 2025 | Next scheduled: Jun 15, 2025 |
| Model Version (Current) | v2.3.1 | View version history → |

Help/info icons accompany reference metrics/cards. Dataset/cohort, denominators, delta convention (percent versus percentage points), observation window, calibration binning/ECE definition, quality rules and version/run evidence are missing. None of the printed numbers or state labels is installed as actual data.

### Charts and feature importance

| Panel | Printed details | Disposition |
|---|---|---|
| Confidence vs. Actual Outcomes | Subtitle Model confidence is well calibrated with actual results.; legend Actual Failures/Actual Non-Failures/Perfect Calibration; x Predicted Confidence0.0/0.2/0.4/0.6/0.8/1.0; y Actual Failure Rate0.0/0.2/0.4/0.6/0.8/1.0; red/blue points and dashed diagonal | Claim replaced with a requirement for matched predictions/actuals; no point values reconstructed or negative outcomes inferred. Axes/legend labels retained with N/A evidence. |
| Model Performance Over Time | Track key performance metrics across model versions.; Accuracy/Precision/Recall; y0%/20%/40%/60%/80%/100%; x Apr2024/Jun2024/Aug2024/Oct2024/Dec2024/Feb2025/Apr2025; three lines | No unprinted point values inferred. No fabricated dates/curves or mixing different model-version populations. |
| Feature Importance | Top factors driving model predictions.;10 horizontal bars | Labels retained, all values N/A; no attribution method/feature version/model artifact supplied. |

Printed feature weights:

| Feature | Reference percentage |
|---|---|
| External Corrosion Risk | 28% |
| Coating Condition | 18% |
| Soil Resistivity | 12% |
| Pipe Age | 10% |
| Previous Detections | 8% |
| Operating Pressure | 7% |
| Temperature Variation | 6% |
| Wall Thickness | 5% |
| Segment Geometry | 4% |
| Nearby Construction | 2% |

These are not approved risk weights, severity rules or causal effects. No metric is calculated from native source availability/counts.

### Health and governance

`Model Health`; `Healthy`; `Model is performing within expected range.`; green checks beside Prediction accuracy87.3%, Data drift No significant drift, Input data quality Good, Model stability Stable, Service availability99.9%. Implementation shows N/A/health not verified; no green health/approval checks.

| Model Governance field | Reference value |
|---|---|
| Model type | Gradient Boosted Trees |
| Use case | Pipeline defect prediction |
| Version | v2.3.1 |
| Approved for use | Yes (Mar 15, 2025) |
| Model owner | Data Science Team |
| Review frequency | Quarterly |
| Next review | Jun 15, 2025 |

Button `View Governance Details` with document/right-arrow icons. All values/approval evidence remain N/A. Screenshot owner/date/Yes is not an approval or role grant.

## Backend/API/DB/component mapping

| Requirement | Existing local source / logical DOCX contract | Usage / blocker |
|---|---|---|
| Readiness/auth | `backend/src/routes/aiPredictions.ts` → `aiPredictions/readinessData.ts`, `readiness.ts`; authenticated private/no-store GET `/api/ai-predictions/readiness`; `frontend/src/lib/apiClient.ts` → workspace | Reused technical source availability only. It is not trained model health, confidence, accuracy, drift or service uptime. |
| Model registry/evaluation/history | DOCX P0274–0299: AI_Model_ID, AI_Model_Version_ID, Model_Type, Use_Case, Training_Data_Version, Feature_Set_Version, Training_Date, Validation_Date, accuracy/precision/recall/FPR/FNR, calibration/data drift/model drift, Approval_Status/Approved_By/Effective_From/Retired_Date | No approved persisted model/evaluation endpoint/model in inspected AI router/Prisma schema. N/A; no new route/schema/DTO fields invented. |
| Actual-outcome tracking | DOCX P0327–0342: AI_Prediction_Outcome_Link, exact AI_Prediction_ID, Actual_Source_Module, Actual_Record_ID, Outcome_Date, Outcome (Occurred/Did Not Occur/Partially Occurred/Unknown), Evaluation_Status | No saved prediction/outcome-link provider. Source absence cannot be labelled Did Not Occur; outcome window/censoring/adjudication and source ACL contract required. No links manufactured. |
| Native source evidence | Existing ILI, CP, SCADA, Risk/assessment/document read contracts; source-owned records/versions | Prior source readers preserved. Observation counts, native assessments and official Risk state are not validation labels or model training history. No automatic label extraction. |
| Calibration/drift/feature importance | Versioned model/evaluation/feature artifacts and declared cohort/window/method required | No metric provider. Missing formulas/denominators, drift/health thresholds, uncertainty, attribution method and comparable version history remain blocked. |
| Snapshot/run lineage | DOCX immutable source IDs/versions/timestamps/cutoff, feature/config/model versions; separate AI_Model_Run_ID | Actual source snapshots in other modules are not AI model training/evaluation snapshots. Missing AI identities shown N/A; no mutable-cache lineage claimed. |
| Governance / promotion permissions | DOCX P0383–0400: new data→candidate dataset→quality validation→candidate training→validation/benchmark→approval→production promotion | No approved registry/permission/approval evidence/provider. No retraining or promotion call; existing roles do not imply validation/promotion grants. |
| Frontend | Existing workspace → new `ai-model-performance.tsx`; previous unavailable `ModelPerformanceCard` preserved in Overview source context | Sixth in-place tab only; no other module/shared style change. |

No backend change was justified by an additional approved metric contract. Existing read-only API/build/auth tests verify preservation, not operational model results. Local schema absence does not establish live database absence. No Neon/live operational request occurred.

## Remaining blockers

1. Approved versioned registry/model/evaluation/run/dataset/feature/snapshot provider, exact immutable lineage and source/model access permissions.
2. Saved prediction→actual-outcome links, actual source ownership, observation horizons/censoring/adjudication and trustworthy positive/negative populations. No missing-record-as-negative assumption.
3. Approved metric definitions/denominators/windows/delta conventions; calibration/ECE/drift/health/uptime methodology and thresholds; feature attribution/importance artifacts; compatible per-version history.
4. Governance owner, candidate validation benchmarks, review/approve/promote/retire permissions and separation of duties; effective/retired dates and immutable approval history. Human approval must precede promotion.
5. Operational authenticated model/output/outcome evidence and populated UI verification after the contracts exist. No local test fixture or screenshot proves an active model.

## Exact maintained files changed

1. `frontend/src/components/ai-model-performance.tsx` — local metric/calibration/chart/feature/health/governance/outcome UI with blocked data.
2. `frontend/src/components/ai-predictions-workspace.tsx` — enable sixth in-place tab, preserve existing views/readers.
3. `frontend/scripts/run-ai-img07-tests.cjs` — isolated no-metric-fabrication, governance/outcome boundary and navigation regressions.
4. `frontend/scripts/run-ai-img03-tests.cjs` — authorized sixth-tab expectation.
5. `frontend/scripts/run-ai-img05-tests.cjs` — authorized sixth-tab expectation.
6. `frontend/scripts/run-ai-img06-tests.cjs` — authorized sixth-tab expectation.
7. `AI-PREDICTIONS-IMG-07-IMPLEMENTATION-REPORT.md` — this report.

Generated review/build/screenshot artifacts: `tmp/ai-img07-review/`. No Neon access, schema/migrations, seeds, database writes, model execution/promotion or production deployment. **STOP after IMG-07.**

## Verification

| Check | Result / limits |
|---|---|
| Frontend/backend typechecks | PASS. |
| Backend emitted build | PASS; isolated output under `tmp/ai-img07-review/backend-dist`; no application startup. |
| Frontend optimized production build | PASS on final source, exit0: compilation/type validation, all32 static pages and existing dynamic route. Component copies match final hashes and compiled Model Performance UI was checked. Isolated copy excludes environment files, disables telemetry and uses unreachable loopback API. Working build directories untouched. |
| IMG-07 regression | PASS: six-tab navigation and prior source context, N/A metrics/health/approval evidence, confidence-versus-validation distinction, model/outcome/lineage fields, required human promotion boundary, loading/failure states, no fabricated points/history/importance or screenshot metrics. Operational requests prohibited. |
| IMG-01–06 regressions | PASS: earlier layouts/blocked states; source pipeline/feature matching; source401 clearing; historical/forecast separation; homogeneous native CP units/history, invalid/mixed/duplicate inputs blocked and zero retained; no demo metrics or selected-feature aggregates; sandbox/recommendation boundaries preserved. Earlier navigation expectations updated for authorized sixth tab. |
| Backend AI read-only/auth regression | PASS: injected owner-scoped SELECT contracts, unavailable versus empty, demo exclusion, unchanged response keys, authenticated routes,401 denial and private/no-store. No storage initialization or DB connection. |
| Responsive visual checks | PASS: exact Chrome CDP widths1672/820/390px; no document horizontal overflow. Full-height screenshots captured using production CSS; desktop/mobile inspected. Local static unavailable-state renders only. |
| Preservation | PASS within349-file baseline:345 unchanged; existing changes only workspace and IMG-03/05/06 navigation tests. New component/test/report are additions. Backend/schema/migrations/routes/shared styles/dependencies/other modules and previous reports match baseline. |
| Operational limits | BLOCKED: no live authenticated model/evaluation artifacts or prediction/outcome links. Isolated React state/events and static visuals do not establish hydrated/live metric pipelines, deployed governance permissions, retraining/promotion or actual drift detection. No model executed or promoted. |

Local verification fixtures are test inputs, never operational records or engineering approvals. Generated artifacts remain in `tmp/ai-img07-review/`. No Neon, schema/migration changes, seeds, database writes or production deployment.
