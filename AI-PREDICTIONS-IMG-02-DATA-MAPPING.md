# AI Predictions — IMG-02 mapping and approval conflicts

21 October 2026. **MAPPING ONLY — no implementation performed. Await approval.**

References: `../All-doc/new/ai prediction/ChatGPT Image Oct 7, 2026, 03_31_33 AM-1.png` (IMG-02, viewed at original resolution); `AI Predictions Pipeline Dashboard.png` in the same directory (IMG-01, existing full transcription in `AI-PREDICTIONS-IMG-01-DATA-MAPPING.md`); `../All-doc/new/AI prediction.docx`; existing Step 0, IMG-01 implementation and completion reports; current source.

Both images represent **Overview**, within the same nine reference tabs. IMG-02 is not a new tab or authorization to replace IMG-01. All printed IDs, names, dates, counts, scores and percentages below are **reference examples only**, not verified records, approved thresholds or data to insert. Visual wrapping is collapsed; icons are described separately. Hidden menus, tooltips, clipped map text and unlabelled chart values cannot be transcribed reliably and are explicitly blocked.

Classification: **NEW** = absent AI item/provider; **UPDATE** = an existing partial component/read path; **UNCHANGED** = retain existing binding/ownership or matching reference text; **CONFLICT** = reference/DOCX/current-contract disagreement; **BLOCKED** = unavailable evidence, required field, approved rule or destination. Classifications may coexist: a matching reference label can have a blocked data binding. These classifications do not authorize implementation. Required missing decisions are marked **MISSING FIELD — APPROVAL NEEDED**.

## 1. Verified local source chains

Every item below maps through these chain identifiers. Paths are repository-relative. Source/schema inspection establishes local declarations and code paths, not deployed tables, operational records or approved AI artifacts. No authenticated live request or Neon connection was made.

| Chain | Backend files → existing API | Prisma fields / authority | Existing frontend → limitation |
|---|---|---|---|
| F | Static text/icons need no backend | No DB field for a panel label | `frontend/src/app/ai-predictions/page.tsx` mounts `AiPredictionsWorkspace mode="real"`; `frontend/src/components/ai-predictions-workspace.tsx:833`. Current readiness workspace has no nine-tab Overview layout. Existing `KpiCard:260`, `CorrosionGrowthForecastChart:363`, `CpHistoricalTrendChart:518`, `EmptyRegister:574`, `ModelPerformanceCard:768` are partial components, not screenshot implementations. |
| H | `backend/src/middleware/auth.ts`, `lib/access.ts`; existing auth/user paths | `User.id,name,role`; no verified reference notification count or global-search result contract | `frontend/src/components/shell.tsx`, `sidebar.tsx`, `auth-provider.tsx`. Preserve actual Klinthru brand, navigation and authenticated identity. Notification dialog currently says service not configured. |
| R | `backend/src/routes/aiPredictions.ts:17` → `aiPredictions/readinessData.ts`, `readiness.ts` → GET `/api/ai-predictions/readiness` | Scoped source availability/counts from native records; no prediction-result, run, confidence or portfolio population fields | `frontend/src/lib/apiClient.ts:815` → workspace readiness state/status cards. Eight backend capabilities and nine UI readiness cards are not the nine reference tabs. |
| G | Same router:26 → `aiPredictions/corrosionGrowthData.ts`, `corrosionGrowth.ts`, `failureCriterion.ts` → GET `/api/ai-predictions/corrosion-growth/:pipelineId` (optional backend `featureId`) | `IliAnomaly.featureId,anomalyType,orientation,depthMm,inspectionRunId`; `IliInspectionRun.pipelineId,inspectionDate,authorId`. Compatible measured observations, not a trained forecast. Failure criterion remains unconfigured. | `apiClient.ts:819` → `scopedAiGrowth` in `frontend/src/lib/ai-predictions-bindings.ts` → existing historical-depth chart. Frontend helper supplies pipeline only. Native millimetres cannot become a Condition Index. |
| M | `backend/src/routes/pipelines.ts`, `routes/assetMaster.ts`, `data/store.ts` → GET `/api/pipelines`, `/api/asset-master/segments?pipelineId=…`, `/api/asset-master/assets?pipelineId=…` | `Pipeline.id,pipelineCode,pipelineName,createdById`; `Segment.id,pipelineId,segmentId,name,startKp,endKp`; `Asset.id,assetId,pipelineId,segmentId,kp,latitude,longitude,coordinates` | `frontend/src/components/pipeline-selector.tsx`; `frontend/src/app/asset-master/page.tsx`. Native identifiers/location context only; no approved AI hotspot, route geometry/CRS or region projection. |
| I | `backend/src/routes/ili.ts`, `ili/data.ts` → GET `/api/ili/runs/:pipelineId`, `/anomalies/:pipelineId`, `/assessment-results/:pipelineId` | `IliInspectionRun.id,runReference,inspectionDate,sourceMetadata`; `IliAnomaly.id,featureId,kpKm,depthMm,depthPercent,orientation,measurementMetadata`; `IliAssessmentResult.methodology,methodologyVersion,inputSnapshot,result,calculatedAt` | `frontend/src/components/ili-analysis-workspace.tsx`; native `/ili-analysis`. Actual source observations/assessments are not saved AI outputs or AI snapshots. |
| C | `backend/src/routes/cpMonitoring.ts`, `cpMonitoring/data.ts` → GET `/api/cp-monitoring/:pipelineId` with parent ownership check | `CpReadingHistory.id,pipelineId,testPointId,readingAt,measurementType,referenceElectrode,valueMv,valueV,quality,protectionStatus`; `CpReadingEvaluation.criteriaVersionId,evaluationMethodVersion`; native criteria versions | `apiClient.ts:925` → `scopedAiCp`, `aiCpHistoricalSeries` → `CpHistoricalTrendChart`; native `cp-monitoring-workspace.tsx`. Grouped actual history and native units only, not corrosion-risk explanations, scores or life forecasts. |
| S | `backend/src/routes/scada.ts`, `utils/scadaData.ts` → GET `/api/scada/overview?pipelineId=…`, `/api/scada/tags/:id/history` | `ScadaTag.id,pipelineId,assetId,sourceSystemId,engineeringUnit`; `SharedTimeSeriesReading.tagId,sourceTimestamp,normalizedUtcTimestamp,value,engineeringUnit,quality`; `ScadaIndicator.indicatorId,value,engineeringUnit,measuredAt` | `frontend/src/components/scada-dashboard.tsx`. Native telemetry context; no existing saved AI feature/snapshot/forecast binding for IMG-02. |
| E | `backend/src/routes/assessments.ts`, `routes/externalPipeData.ts`, `data/store.ts` → GET `/api/assessments`, `/api/external-pipe-data` | `Assessment.id,type,pipelineId,input,result,inspectionDate,authorId`; `ExternalPipeData.input,result,updatedAt` | Existing corrosion workspaces. JSON fields alone do not approve soil-change features, a Condition Index, CO₂ forecast or deterioration method. |
| K | `backend/src/routes/riskAssessments.ts`, `data/riskAssessmentRepository.ts`, `riskAssessmentDetailRepository.ts`, `riskTreatmentRepository.ts` → GET `/api/risk-assessments/overview`, `/assessment-details`, `/history`, `/treatments` | `Risk.riskId,pipelineId,currentApprovedRevisionId`; `RiskAssessmentRevision.id,methodologyVersionId,matrixVersionId,sourceSnapshot,inherentResult,currentResult,residualResult,approvedAt,contentHash` | Existing Risk components and `/risk-assessment`. Official current Risk and its three states remain Risk-owned; these records are not AI future probabilities or risk scores. |
| O | `backend/src/routes/reports.ts`, `routes/documents.ts` → GET `/api/reports/workspace-data/:pipelineId`, native report download and document list/version/download routes | Prisma `Report.id,assessmentId,input,result,generatedAt,authorId`; `ManagedDocument.documentId`; `DocumentVersion.documentVersionId,revision,fileHash,approvalStatus` (mapped document SQL tables) | `frontend/src/components/report-workspace.tsx`, `/report`, `/document-upload`. Legacy engineering reports do not provide an AI report dataset/run. AI template/export and final document linkage require owner contract. |
| J | `backend/src/routes/integrations.ts` → GET `/api/integrations/connectors`, `/summary`, `/events` | `IntegrationConnector.id,name,status,enabled,authorId`; `IntegrationEvent` | Existing Integration Hub; connections/events are not an AI scheduler, inspection plan or central Action contract. |
| N | No saved AI-result, model/run/version, forecast, insight, recommendation or analysis-schedule API found in current AI router | No corresponding AI persistence models found in `backend/prisma/schema.prisma`; DOCX logical fields listed in section 9 are missing contracts, not proposed columns | Current blocked/unavailable UI remains truthful. No demo branch, readiness count, actual measurement or native Risk result may substitute a prediction. Remote DB state remains unknown. |

AI router uses `requireAuth` and `Cache-Control: private, no-store`. Existing authenticated paths must preserve source-owner access; this is not evidence of approved AI run/review/promote permissions. The IMG-01 completion report documents offline typecheck/build/regression passes; these do not prove real-data availability for IMG-02.

## 2. Shell, header and all nine tabs — verbatim

| Item | IMG-02 text / visible control | Mapping and classification |
|---|---|---|
| Brand | `Pipeline360`; `Safer Pipelines. A More Resilient Tomorrow.` | H; **CONFLICT** with IMG-01/Klinthru branding. Preserve existing shell; do not adopt reference brand/style. |
| Search | `Search assets, locations, inspections...` with search icon | H/M/I; **CONFLICT / BLOCKED**: differs from IMG-01 placeholder; no approved unified search/result/access contract. |
| Identity | Bell badge `3`; `?`; avatar `JD`; `John Doe`; `Asset Integrity Manager`; dropdown chevron | H; **CONFLICT / BLOCKED**: identity/role wording differs from IMG-01. Use authenticated user only, never reference name/role/count. Hidden menu/help content not shown. |
| Sidebar | `Dashboard`; `Assets`; `Integrity Management`; nested `Overview`, `Inspections`, `Assessments`, `AI Predictions`, `Risk Management`, `Reports`; `Maintenance`; `Operations`; `Data Management`; `Administration`; `Collapse` | H; **CONFLICT** with current route/group structure and IMG-01 shell. Integrity Management expanded; AI Predictions selected; three following operational/admin groups and Maintenance show collapsed chevrons. Collapse has double-left chevrons. Do not infer or create routes from labels. |
| Breadcrumb | `Home` › `Integrity Management` › `AI Predictions` | H/F; **CONFLICT** with current navigation contract; no new intermediate route implied. |
| Heading | `AI Predictions` | F; **UNCHANGED** reference/module title. Purple chip icon is decorative. |
| Subtitle | `Predict, prioritize and prepare for the future. AI-driven insights for pipeline integrity, based on historical data and current conditions.` | F; **UNCHANGED** versus IMG-01; **UPDATE** versus current readiness subtitle. Static copy, not evidence of model availability. |
| Header buttons | `Export` (document icon); `Run AI Analysis` (plus icon) | F/O/N; **UNCHANGED** reference intent; **BLOCKED** AI export and execution contracts. No execution/write authorized. |
| Tab 1 | `Overview` — selected | F; **UNCHANGED** versus IMG-01; **NEW** tab selector versus code. |
| Tab 2 | `Prediction Results` | F/N; **UNCHANGED** reference; **NEW / BLOCKED** saved-output view/provider. |
| Tab 3 | `Deterioration Trends` | F/G/I/N; **UNCHANGED** reference; **NEW / BLOCKED** AI forecast view/provider. |
| Tab 4 | `Inspection Prioritization` | F/N/J; **UNCHANGED** reference; **NEW / BLOCKED** recommendation contract. |
| Tab 5 | `Scenario Analysis` | F/N; **UNCHANGED** reference; **NEW / BLOCKED** sandbox contract. |
| Tab 6 | `Model Performance` | F/N; **UNCHANGED** reference; **UPDATE / BLOCKED** existing unavailable performance card is not a model-evaluation view. |
| Tab 7 | `Related Data` | F/M/I/C/S/E/K; **UNCHANGED** reference; **NEW / BLOCKED** immutable AI lineage projection. |
| Tab 8 | `Reports` | F/O; **UNCHANGED** reference; **NEW / BLOCKED** AI-specific central report dataset. |
| Tab 9 | `Configuration` | F/N/J; **UNCHANGED** reference; **NEW / BLOCKED** AI governance/configuration provider. Hub credentials remain Hub-owned. |

Sidebar icons, row/card/table status colours, chart markers, arrows, info icons and chevrons have no independent engineering data contract. Existing styling/components remain unchanged. No footer is visible in IMG-02; absence is not approval to remove IMG-01/current footer.

## 3. All five KPI cards — verbatim

| Value | Label | Supporting text | Mapping / classification |
|---|---|---|---|
| `36` | `Predicted High-Risk Locations` | `+12% vs. last run` with upward arrow | F/N + M location identity, K ownership boundary. **UNCHANGED** versus IMG-01; **CONFLICT / BLOCKED** versus DOCX P0004. Need approved elevated-risk metric, population/deduplication, horizon, threshold/version and comparable run delta; not native current Risk. |
| `28` | `Likely New Defects (12 months)` | `+8% vs. last run` with upward arrow | F/N, future concerns only. **UNCHANGED / BLOCKED**: root prediction count/type/horizon/run comparison absent. DOCX P0047 click → Prediction Results filtered New Defect. Do not count ILI anomalies or create Defect_IDs. |
| `14` | `Assets Requiring Early Inspection` | `+40% vs. last run` with upward arrow | F/M/N. **UNCHANGED / BLOCKED**: recommendation eligibility, asset population and run delta absent. Click → Inspection Prioritization; no approved schedule implied. |
| `18` | `Estimated Life Reduction` | `Segments affected` | F/M/N. **UNCHANGED / BLOCKED**: value counts segments, not years or percent. Require estimate baseline, affected-segment eligibility, horizon and model lineage. Click → Deterioration Trends. |
| `87%` | `Model Confidence` | `+3% vs. last run` with upward arrow | F/N; current real card is Not Available. **UNCHANGED** reference; **CONFLICT / BLOCKED** DOCX P0300–0307: portfolio prediction confidence versus model-validation score. Define denominator/weighting/window and relative-percent versus percentage-point delta. Click → Model Performance. |

Card icons respectively: rising bars/arrow, warning triangle, clock, leaf, target. These do not establish trend desirability or severity rules. All KPI populations, as-of dates and run IDs are absent from the reference. Repeated printed values across IMG-01/02 do not establish approved operational data.

## 4. Map, charts and selectors — complete visible inventory

### Map

| Visible text / element | Mapping / classification |
|---|---|
| `Predicted Risk Hotspots`; `View Full Map` | F/M/N; **CONFLICT** with IMG-01 View in GIS/horizon/map presentation; **BLOCKED** hotspot and native full-map destination contract. |
| Legend `AI Predicted Risk`; `High Risk`; `Medium Risk`; `Low Risk`; `Pipeline` | N forecast classification + M geometry; **CONFLICT**: IMG-01 also has Very High, and map horizon Next 5 Years. No method/threshold/model version or horizon printed here. Do not reuse official Risk bins automatically. |
| Controls `+`, `−` | F/M; **UNCHANGED** zoom intent; **BLOCKED** actual map provider/geometry. No layers control visible here. |
| Scale `0`, `25`, `50 km` | M geospatial projection/scale; **NEW / BLOCKED**. These are reference scale markings, not pipeline length/KP values. |
| Basemap `Riverton`, `Mapleton`, `Clearview` | M; **NEW / BLOCKED**: screenshot-only place labels; no verified location records. Additional bottom-right label is clipped/too unclear for reliable verbatim transcription. No guessed spelling or lookup substitution. |
| Blue pipeline line; red/amber/green circular markers and translucent halos on a terrain/street basemap | M geometry + N saved prediction IDs/location/category. **CONFLICT / BLOCKED** versus IMG-01 satellite/four classes. No numeric marker IDs, exact coordinates, KP values or hidden tooltips printed. Marker data cannot be recovered from pixels. |

### Predicted Defect Count

| Visible text / element | Mapping / classification |
|---|---|
| `Predicted Defect Count`; info icon | F/N; **UNCHANGED** title intent, **BLOCKED** forecast count dataset. |
| Selector `Next 12 Months`; dropdown chevron | N horizon/start/as-of contract; **CONFLICT** with IMG-01 annual 2026–2030. Hidden options not visible and not invented. |
| Legend `AI Predicted`; `Historical Average` | N future count buckets + I/native confirmed-history owner as approved input only. **NEW / BLOCKED** comparable history population, years/window and averaging method absent. ILI anomalies are not a confirmed Defect history. |
| Y-axis `Number of Defects`; ticks `0`, `10`, `20`, `30`, `40`, `50` | N typed count/projection; **UNCHANGED** count unit intent, **BLOCKED** data semantics. Counts are not probabilities or actual Defect_IDs. |
| X-axis `Jan`, `Feb`, `Mar`, `Apr`, `May`, `Jun`, `Jul`, `Aug`, `Sep`, `Oct`, `Nov`, `Dec` | N dated forecast/history buckets; **CONFLICT** annual versus monthly view. No year/start date/timezone shown. |
| Twelve dark-blue and twelve light-blue bars | N; **NEW / BLOCKED**. No individual bar values printed; no numeric reconstruction from heights. Monthly versus cumulative counts and relationship to KPI28 require approval. |

### Remaining Life Distribution

| Visible text / element | Mapping / classification |
|---|---|
| `Remaining Life Distribution`; info icon | F/N; **UNCHANGED** title; **BLOCKED** saved advisory remaining-life population. |
| Donut centre `1,245`; `Segments` | M eligible segment identity + N run population; **CONFLICT** with IMG-01428. Not the native segment count without verified eligible forecasts. |
| `> 20 years` — `45%` (green) | N advisory life estimate/bin/version; **CONFLICT / BLOCKED** differing bands/population/percentages. |
| `10 – 20 years` — `28%` (blue) | N; **CONFLICT / BLOCKED**. |
| `5 – 10 years` — `18%` (yellow) | N; **CONFLICT / BLOCKED**. |
| `2 – 5 years` — `7%` (orange) | N; **CONFLICT / BLOCKED** new band versus IMG-01. |
| `< 2 years` — `2%` (red) | N; **CONFLICT / BLOCKED** new band versus IMG-01. |

No per-bin counts printed in IMG-02. Do not derive integer counts from rounded percentages. Boundary inclusivity at2/5/10/20, estimate method/unit/version, missing/expired estimates and rounding require explicit contract. DOCX P0185–0190 separates AI life estimate from engineering RUL.

### Deterioration trend

| Visible text / element | Mapping / classification |
|---|---|
| `Deterioration Trend (Sample Segment)`; info icon | F/G/I/E/N; **CONFLICT** with IMG-01 remaining-wall-thickness view. Current chart is historical depth mm, neither reference metric. |
| Selector `Segment PR-1042`; dropdown chevron | M native segment identity + N saved forecast subject; **NEW / BLOCKED** verified record mapping and hidden options. PR-1042 is reference text, not an approved default. |
| Legends `Historical`, `AI Predicted`, `Confidence Range` | I/E actual observations + N separate forecast/bounds; **UNCHANGED** reference separation intent; **BLOCKED** compatible source metric/forecast/interval provider. |
| Y-axis `Condition Index`; ticks `0`, `20`, `40`, `60`, `80`, `100` | N approved Source_Metric/method/version; **CONFLICT / BLOCKED**: no index definition, normalization or unit contract. Never convert depth/CP/Risk to an index by assumption. |
| X-axis `2020`, `2021`, `2022`, `2023`, `2024`, `2025`, `2026`, `2027`, `2028`, `2029`, `2030` | I source date + N forecast date/horizon; **CONFLICT** with IMG-01 2024–2034. Exact point timestamps not printed. |
| `Historical` →; ← `AI Prediction`; vertical dashed division | I/N cutoff/start date; **UPDATE / BLOCKED**. Divider lies between2024/2025 visually; no exact date inferred. |
| `Estimated life reduction:`; `~4.2 years` | N model estimate versus baseline/version; **NEW / BLOCKED**. No failure threshold, baseline life or calculation supplied. |
| Blue solid observations; red dashed future line/markers; pale interval band | I/E/N; **UPDATE / BLOCKED**. No numeric point values, interval bounds, coverage or model version printed. Do not reconstruct values or join future forecasts into actual histories. |

DOCX P0153–0175 additionally requires explicit Prediction Start Date, Model Version and retained forecast/bound/snapshot fields. Those are missing from both this reference and the existing AI forecast contract.

## 5. AI Key Insights — verbatim

Panel `AI Key Insights` (lightbulb icon); action `View Details` (right chevron). **CONFLICT** with IMG-01's insight wording and `View All Insights`; DOCX P0049–0050 defines View Details as a right drawer, not an unspecified new page.

| Title | Description | Badge | Mapping / classification |
|---|---|---|---|
| `Increased corrosion risk detected` | `High anomaly scores in 6 segments due to soil condition changes.` | `High` | E/C/M/N; **CONFLICT / BLOCKED**: exact soil feature history/version, anomaly score/model, six eligible segments, explanation/evidence and severity method missing. Native CP status does not prove this statement. |
| `Rising defect probability` | `AI model predicts 28 new defects in next 12 months.` | `Medium` | N; **CONFLICT / BLOCKED**: title probability versus displayed count; typed forecast and run/population missing. No automatic defect creation. |
| `Early inspection recommended` | `14 assets show significant deterioration changes.` | `Medium` | M/I/E/N; **CONFLICT / BLOCKED**: model-approved significant-change definition, recommendation IDs/windows and eligible asset linkage missing. |
| `Potential life reduction` | `18 segments may experience reduced life (2–5 years).` | `Low` | M/N; **CONFLICT / BLOCKED**: unclear whether2–5years is loss amount or prediction horizon; do not choose either. Need baseline, units, model/run and per-segment estimate. |
| `Model confidence improved` | `Confidence increased by 3% with latest data.` | `Info` | N; **CONFLICT / BLOCKED**: confidence meaning, comparison runs, latest-data cutoff and delta convention missing. New data does not authorize model promotion. |

Visible row icons: warning triangle, rising bars, information circle, leaf, rising bars/arrow. No prediction IDs, model/run/version, source snapshot, individual confidence or evidence links printed. Need saved explanation records linked to immutable outputs; do not generate statements directly from availability counts.

## 6. Top Predicted High-Risk Segments — verbatim and per-column mapping

Panel `Top Predicted High-Risk Segments` with warning icon; `View All` action. **CONFLICT** with IMG-01 column/ID/metric shape and DOCX official-Risk naming boundary. No search, filter, sort, selection or pagination control visible in this panel.

| Rank | Segment ID | Location | Risk Score | Primary Concern | Predicted Issues | Suggested Action |
|---|---|---|---|---|---|---|
| 1 | PR-1042 | Riverdale – Mapleton | 0.92 | External Corrosion | 3 | Inspect within 3 months |
| 2 | PR-0876 | Clearview – Benton | 0.87 | Stress Corrosion | 2 | Detailed assessment |
| 3 | PR-2210 | Mapleton – Easton | 0.84 | Metal Loss | 2 | Inspect within 6 months |
| 4 | PR-0654 | Weston – Riverton | 0.81 | CO₂ Corrosion | 1 | Schedule inspection |
| 5 | PR-1789 | Clearview – Hillside | 0.78 | Third-Party Damage | 2 | Increase monitoring |

| Field/control | Existing fields / required contract | Classification |
|---|---|---|
| Rank | N approved saved-output ranking, eligibility/as-of/tie-breaking | **NEW / BLOCKED**. Reference order is not a ranking algorithm. |
| Segment ID | M `Segment.id,pipelineId,segmentId`; N exact prediction subject link | **UPDATE / BLOCKED** real display/native ID mapping; do not equate PR codes with internal IDs or IMG-01 PL/S codes. |
| Location | M segment name/KP and Asset coordinates; N saved subject scope | **UPDATE / BLOCKED** authoritative location labels/join; do not geocode example names into records. |
| Risk Score | N typed Prediction_Value/Probability, metric/unit/method/model version; K remains official-Risk owner | **CONFLICT / BLOCKED** versus IMG-01 categorical Predicted Risk plus confidence. 0.92 is not proven probability, percent, confidence, PoF×CoF or native Risk score. No conversion/threshold mapping approved. |
| Primary Concern | N Prediction_Type/Predicted_Outcome and taxonomy; I/E may supply governed source context | **NEW / BLOCKED** accepted concern vocabulary and linkage; source anomaly class is not automatically an AI outcome. |
| Predicted Issues | N count/unit/horizon/aggregation/exact constituent prediction IDs | **NEW / BLOCKED**: no horizon or issue definition printed. Do not count native defects/anomalies as future issues. |
| Suggested Action | N recommendation ID, window/method/evidence; J central accepted Action handoff | **CONFLICT / BLOCKED**: advisory only. No generated approved inspection/repair schedule or upstream write. |
| View All / row selection | F/N exact prediction/subject/filter and corresponding existing view/drawer | **NEW / BLOCKED** destination and saved root IDs absent. DOCX P0052–0063; no route invented. |

## 7. Recent AI Predictions — verbatim and per-column mapping

Panel `Recent AI Predictions` with clock icon; action `View All`.

| Date | Type | Location / Asset | Risk Score | Status |
|---|---|---|---|---|
| Apr 26, 2025 | New Defect | PR-1042 | 0.92 | Open |
| Apr 25, 2025 | Life Reduction | PR-2210 | 0.84 | Open |
| Apr 24, 2025 | High Risk | PR-0876 | 0.87 | In Review |
| Apr 24, 2025 | New Defect | PR-1789 | 0.76 | Open |
| Apr 23, 2025 | High Risk | PR-0654 | 0.81 | Closed |

| Field/control | Existing fields / required contract | Classification |
|---|---|---|
| Date | N Prediction_Time + timezone/as-of/ordering; source inspectionDate/createdAt is not prediction generation time | **CONFLICT / BLOCKED** versus IMG-01 March2026 dates and explicit Generated On. Dates are examples, not current results. |
| Type | N typed saved Prediction_Type | **NEW / BLOCKED** accepted taxonomy. `Life Reduction`/`High Risk` must not silently become engineering types. |
| Location / Asset | M native segment/asset IDs and display codes + N subject/prediction link | **UPDATE / BLOCKED** mixed subject-column semantics; displayed PR segment codes do not prove Asset_IDs. |
| Risk Score | N exact metric/value/unit per prediction/model/horizon | **CONFLICT / BLOCKED**: same ambiguity as top table. PR-1789 has0.78 in top table but0.76 here; may be different predictions/times, but no IDs/horizons prove it. Never reconcile by overwriting one. |
| Status | N Status/Reviewer/Review_Status | **CONFLICT / BLOCKED** DOCX P0105–0112 advises Generated/Under Review/Accepted/Rejected/Superseded/Expired and warns against engineering Open/Closed. Do not normalize `In Review` automatically. |
| View All / row drill-through | F/N root prediction ID, drawer/full-analysis context | **NEW / BLOCKED**. Reference omits IMG-01 Prediction ID, KP, outcome, horizon, confidence, generated/actions columns; DOCX still requires full identity/lineage in details. |

No paging/search/filter/export-per-row controls visible here. Their absence is not approval to remove IMG-01 fields or existing behavior. Screenshots lack reviewer, version, source snapshot and immutable revision identity.

## 8. Quick Actions and upcoming analyses — verbatim

Panel `Quick Actions` with lightning icon; each item has a leading icon and right chevron.

| Button | Supporting text | Mapping / classification |
|---|---|---|
| `Run AI Analysis` | `Process latest data and generate new predictions` | R/N; **UNCHANGED** intent, **BLOCKED** approved model/version/features, immutable cutoff/snapshot, run provider/job lifecycle, permissions and idempotency. Latest data must be frozen, not mutable live references. |
| `View High-Risk Locations` | `See all predicted high-risk segments on map` | M/N; **CONFLICT** with IMG-01 View Prediction Results; **BLOCKED** advisory outlook classification and exact map/filter destination. |
| `Generate Inspection Plan` | `Create inspection plan based on AI predictions` | N/J; **CONFLICT / BLOCKED** DOCX P0212–0225. Choose advisory recommendation wording and human acceptance → central Action_ID → planning owner/CMMS through Hub. No existing Action provider verified. |
| `Download Report` | `Export AI prediction results` | O/N; **CONFLICT** with IMG-01 Compare Scenarios / Export Data; **BLOCKED** central AI template/dataset/run/document/export contract. Existing native downloads are not AI results. |

Panel `Upcoming AI Analyses` with calendar icon; action `View All`.

| Scheduled Date | Analysis Type | Scope | Status |
|---|---|---|---|
| Apr 30, 2025 | Full Pipeline Analysis | All Assets | Scheduled |
| May 7, 2025 | Regional Analysis | Northern Region | Scheduled |
| May 14, 2025 | Focused Analysis | High-Risk Segments | Scheduled |
| May 21, 2025 | Life Prediction Update | Critical Assets | Scheduled |

| Field/control | Existing fields / required contract | Classification |
|---|---|---|
| Scheduled Date | N scheduler-owned job identity/date/timezone/recurrence/as-of | **CONFLICT / BLOCKED** versus IMG-01 five March/April2026 jobs; no AI scheduler API/model in current router/schema. |
| Analysis Type | N approved job/model/version/config mapping | **NEW / BLOCKED**; descriptive strings are not executable job definitions. |
| Scope | M authorized asset/segment IDs + N frozen scope/region/criticality definition | **NEW / BLOCKED**; no approved Northern Region/High-Risk/Critical Assets projection in current AI contract. All Assets must remain ACL-scoped. |
| Status | N scheduler lifecycle/result/run linkage | **NEW / BLOCKED**; screenshot Scheduled does not establish a queued job or approval. |
| View All / row | F/N existing schedule owner destination/selection/filter contract | **NEW / BLOCKED**; no new route or fake job. |

## 9. Reference differences and required approval decisions

| Priority / decision | IMG-01 → IMG-02 / DOCX requirement | Safe disposition and exact missing contract | Files affected if separately approved |
|---|---|---|---|
| P1 Reference precedence | Same Overview/KPIs/nine tabs, different shell, panels/columns/actions; current readiness UI is different from both | **CONFLICT — MISSING FIELD — APPROVAL NEEDED** which IMG-02 data presentation supersedes or supplements IMG-01. Preserve current structure/styles/routes/components and IMG-01 until explicit decision. | Workspace; mapping reports. Shared shell/sidebar remain out of scope. |
| P1 AI result authority | Neither image nor code supplies a governed saved prediction/run register | **BLOCKED — MISSING FIELD — APPROVAL NEEDED** approved owner/API for DOCX P0064–0090: AI_Prediction_ID, Pipeline_ID/Segment_ID/Asset_ID/KP, Prediction_Type/Outcome/Time/Horizon/Value or Probability, Confidence, AI_Model_ID/Version_ID/Run_ID, Feature_Set_Version, Input_Snapshot_ID, Status/Reviewer/Review_Status. These are logical requirements, not invented schema. | AI router/repositories, schema only under separate approval; frontend types/client/workspace after an approved existing contract is identified. |
| P1 Advisory risk terminology/scoring | Both cards say Predicted High-Risk; IMG-01 categorical risk/confidence versus IMG-02 0.xx scores and three map classes | **CONFLICT — MISSING FIELD — APPROVAL NEEDED** choose DOCX P0004 AI-Predicted Elevated-Risk Locations or Predicted Risk Outlook; define typed score, scale/unit/horizon, class boundaries/version/population and ranking. Official Risk_ID and Inherent/Current/Residual remain untouched. | Workspace labels/types; future approved AI result projection; Risk owner read contract only. |
| P1 Confidence | Both87%/+3%; DOCX P0300–0307 separates portfolio confidence from validation score | **CONFLICT — MISSING FIELD — APPROVAL NEEDED** choose meaning/label, aggregation/window/denominator, calibration/model version and delta convention. Preserve per-prediction confidence separately. | AI metrics projection/types/workspace, model evaluation owner. |
| P1 Snapshot, model, permissions | DOCX P0355–0373/P0672–0677 requires immutable source IDs/versions/timestamps/cutoff/features/config/model, human promotion, expiry, idempotency | **BLOCKED — MISSING FIELD — APPROVAL NEEDED** source ACL parity and approved run/read/review/accept/export/config/retrain/validate/promote/retire authority; model lifecycle/version and persisted run snapshot contract. No source engineering mutation or automatic promotion. | Auth/access consumers, AI source adapters/run contracts, later persistence review; no current edits. |
| P2 Monthly count chart | IMG-01 annual2026–2030 counts28/34/42/31/18 → IMG-02 Jan–Dec forecast/history bars | **CONFLICT — MISSING FIELD — APPROVAL NEEDED** chart grain/start/year/horizon, noncumulative versus cumulative counts, historical baseline/cohort/window, uncertainty and KPI28 reconciliation. Existing readiness/growth GETs provide none. | Saved forecast/count projection, frontend chart/types; no new route presumed. |
| P2 Life distribution | IMG-01428/four bins/counts46/102/156/124 and11/24/36/29% → IMG-021245/five bins45/28/18/7/2% | **CONFLICT — MISSING FIELD — APPROVAL NEEDED** advisory estimate method/version/years, cohort, inclusive boundaries, missing/expired handling and percentage rounding. No screenshot threshold adopted. | Saved estimate aggregation/workspace; native engineering RUL unchanged. |
| P2 Trend metric | IMG-01 Remaining Wall Thickness (%)2024–2034 → IMG-02 Condition Index2020–2030/~4.2years | **CONFLICT — MISSING FIELD — APPROVAL NEEDED** source metric/method/unit/version and compatible historical source; DOCX P0161–0174 Forecast_ID, Source_Metric, Forecast_Date/Horizon, Predicted_Value, Lower_Bound, Upper_Bound, Confidence, Model_Version, Source_Snapshot plus explicit start date. Existing G depths and C potentials cannot supply index forecasts. | Source owner projection + AI forecast contract/types/chart; no engineering formula invented. |
| P2 Map / geography | IMG-01 satellite/Next5Years/four classes/View in GIS → IMG-02 terrain/three classes/View Full Map/scale | **CONFLICT — MISSING FIELD — APPROVAL NEEDED** approved geometry/CRS/map owner, prediction location joins/horizon/classes, permission filtering and full-map destination/current filter handoff. | Native master/GIS projection and workspace integration only after approved contract; no basemap dependency/style added. |
| P2 Insights / severity | Different five statements and categories; IMG-02 soil changes, six segments, counts14/18/28,2–5years,+3% | **CONFLICT — MISSING FIELD — APPROVAL NEEDED** saved explanation/evidence links to exact prediction/run/source snapshot; severity method, soil feature source and life-loss versus horizon meaning. View Details means drawer per P0049–0050. | AI explanation projection/workspace; native source modules retain ownership. |
| P2 Table identity / status | IMG-01 rich root output table and PL/KP/confidence → IMG-02 PR/location/score/status; PR-1789 scores differ | **CONFLICT — MISSING FIELD — APPROVAL NEEDED** exact IDs and separate predictions/as-of/horizons, status mapping, ranking, detail context and required lineage fields. DOCX warns against Open/Closed engineering semantics. | Saved-output DTO/types/workspace/drill-through. No silent column replacement. |
| P2 Inspection handoff | Generate Inspection Plan conflicts with DOCX P0212–0225 | **CONFLICT — MISSING FIELD — APPROVAL NEEDED** choose Create Inspection Recommendation or Send for Inspection Planning; approve AI_Inspection_Recommendation_ID, window/method/priority/evidence/prediction IDs, human acceptance, Action_ID owner and Hub/CMMS handoff. No approved schedule created by AI. | Existing planning/Action/Hub contracts and workspace; no verified Action provider to reuse yet. |
| P2 Reports | IMG-01 Export Data/Compare Scenarios → IMG-02 Download Report/map/plan | **CONFLICT — MISSING FIELD — APPROVAL NEEDED** central AI dataset/template/formats/filter/ACL, Report_Run_ID and final Document_ID linkage. DOCX P0374–0382 forbids another report database. Scenario action replacement also needs reference decision. | Reports owner projection, existing document links, AI client/workspace; no duplicate storage. |
| P3 Schedule | IMG-01 five jobs2026 → IMG-02 four jobs2025/scopes/status | **CONFLICT — MISSING FIELD — APPROVAL NEEDED** existing scheduler owner/API, job identity, approved model/version/config, scoped assets/region/criticality, timezone/recurrence/status/approver and resulting run IDs. None in current AI GETs. | Scheduler-owner projection and AI read DTO/workspace after separate contract approval. |
| P3 Outcome validation / failure | No outcomes/expiry visible; DOCX P0327–0342/P0487–0506/P0674–0677 still applies | **BLOCKED — MISSING FIELD — APPROVAL NEEDED** outcome link to later actual source ID/date/outcome/status; stale/expiry policy; model-defined unavailable-input handling, idempotent retries and isolated sandbox if scenarios retained. No absence-as-negative, zero substitution or future-data leakage. | AI governance/outcome/forecast contracts; existing upstream owners unchanged. |

Unavailable fields cannot safely be sourced by calling another module and renaming its output. Current source tables may support future authorized input snapshots, but source availability does not establish model suitability, approved calculations or an AI output contract. No live approvals, artifact registry or deployed AI tables were assumed.

## 10. Safe reuse and stop conditions

**UNCHANGED — safe existing bindings to preserve:** authenticated real-mode page; existing readiness GET/status reasons; compatible owner-scoped ILI measured-growth reader; selected-pipeline/feature identity checks; source401 handling that clears cached context; native homogeneous CP historical series with actual electrode units; explicit unavailable states; existing master/native-source/report routes and their ownership. These are historical context and technical readiness, not any screenshot KPI/chart/result population.

**UPDATE potential, not implemented:** existing KpiCard/chart/status/register/performance components can consume an approved compatible dataset later. Their presence does not authorize nine-tab scaffolding, new selectors/routes, Condition Index calculations, hardcoded reference data or a merged Overview.

**BLOCKED real-data verification:** no current AI API exposes the IMG-02 prediction counts, risk scores/classes, monthly forecasts/history averages, life bins, index series/bounds, insight evidence, recommendations, saved output statuses, analysis schedules or AI report outputs. No authenticated operational evidence was requested or obtained. Local Prisma declarations cannot establish live table absence/readiness.

Prioritized approval checklist:

1. Resolve IMG-01/IMG-02 precedence without changing the approved structure, and choose DOCX-compliant risk/confidence/inspection wording.
2. Identify the approved saved AI output/model/run/snapshot provider and source-specific permissions, promotion and idempotency contracts.
3. Approve metric definitions: risk score/classes, KPI cohorts/deltas, monthly/history comparison, life bins, Condition Index/forecast intervals and insight severity/evidence.
4. Approve exact existing map/results/drawer/planning/Action/report/scheduler destinations and owner contracts, including statuses and scope.

## 11. Verification and exact changes

| Check | Result |
|---|---|
| IMG-02 visible inventory, all three tables, five KPIs, nine tabs and controls | Complete for legible printed content; clipped map label and hidden/unlabelled values explicitly BLOCKED. |
| Comparison with IMG-01, DOCX and current source | Complete local mapping; conflicts preserved for approval. |
| Operational data / deployed DB / AI artifacts | BLOCKED: no live authenticated evidence or Neon access. |
| Code/typecheck/build/regression execution | Not run: mapping-only task; no executable source changes. Prior IMG-01 passes are historical, not new IMG-02 verification. |
| Files changed | Added only `AI-PREDICTIONS-IMG-02-DATA-MAPPING.md`. |
| Preservation | Only this report was edited by this task. A task-start inventory covered336 existing files, but its hash payload was unavailable after the turn resumed; a complete before/after hash comparison cannot be claimed. Existing source was read, not edited. |

Preservation check on 21 October 2026: **441/441 file hashes unchanged; no added files in the checked scope.** No application or database commands were executed.

**STOP — awaiting explicit approval before any IMG-02 implementation. No code, routes, schema, migrations, styling, dependencies, upstream records or production changes.**
