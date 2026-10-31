# AI Predictions — IMG-01 verbatim data inventory, mapping and conflicts

20 October 2026. **DATA / REVIEW ONLY. No implementation approval inferred.**

Reference: `../All-doc/new/ai prediction/AI Predictions Pipeline Dashboard.png` (IMG-01), compared with `../All-doc/new/AI prediction.docx` and current source. IMG-02 is not merged into this inventory. Previous `AI-PREDICTIONS-STEP-0-INVENTORY.md` remains unchanged.

Text below transcribes visible spelling/case/numbers/units, with visual line wrapping collapsed. Icon descriptions and explanatory mapping are separate from the transcription. Unlabelled chart coordinates, marker metadata, hidden menus, tooltip text and interaction results are **UNVERIFIED**, not reconstructed. All example names, IDs, dates, counts, measurements and outcomes remain screenshot references: none is a verified operational record or approved rule.

Classifications: **NEW** = no equivalent local AI binding/view; **UPDATE** = existing partial component/read path; **UNCHANGED** = preserve owner/architecture/existing route; **CONFLICT** = reference/DOCX/code disagreement; **UNVERIFIED** = evidence unavailable; **MISSING FIELD — APPROVAL NEEDED** = required approved rule/contract missing. NEW/UPDATE do not authorize coding or schema/API changes.

## 1. Existing source chains used in the mapping

Each code below expands to backend files → existing API → local DB declarations → frontend. Later rows refer to these codes so each visual item has a traceable mapping. **No AI prediction-result, forecast-series, model-run, model-version, AI input-snapshot, scenario, outcome-link or analysis-schedule model/API was found in the current Prisma schema/AI router.** Missing fields are logical DOCX requirements, not proposed schema columns. Live database state is UNVERIFIED; no Neon connection occurred.

| Code | Existing backend and API | Existing DB fields / authority | Existing frontend and limitation |
|---|---|---|---|
| F | No backend needed for static labels; existing `/ai-predictions` page | No DB field for labels/icons/tab titles | `frontend/src/app/ai-predictions/page.tsx` mounts `AiPredictionsWorkspace mode="real"`; `frontend/src/components/ai-predictions-workspace.tsx:835`. Current page is a readiness workspace, without the reference nine-tab selector or Overview panels. |
| H | Existing auth routes, `backend/src/middleware/auth.ts`, `backend/src/lib/access.ts`; existing navigation targets | `User.id,name,role`; screenshot identity/notification3 are not actual user/notification values | `frontend/src/components/shell.tsx`, `sidebar.tsx`, `auth-provider.tsx`; preserve current shared shell. No AI-specific search/notification record provider established. |
| R | `backend/src/routes/aiPredictions.ts`; `backend/src/aiPredictions/readinessData.ts:27`; `readiness.ts:55`; GET `/api/ai-predictions/readiness` | Owner-scoped counts from `Assessment`, `Pipeline`, `DeviceRecord`, `CpReadingHistory`; `IliAnomaly.featureId`/`IliInspectionRun.inspectionDate` repeat counts. Readiness is not a forecast, model confidence, prediction population or run. | `frontend/src/lib/apiClient.ts:815` → workspace readiness effect; existing `KpiCard`, `Details`, `BlockedState`, `AnalysisStatusCard`, `EmptyRegister`, `ModelPerformanceCard`. Backend has eight readiness capabilities; UI has nine status cards, not nine tabs. |
| G | `backend/src/routes/aiPredictions.ts`; `aiPredictions/corrosionGrowthData.ts:31`; `corrosionGrowth.ts:78`; `failureCriterion.ts:30`; GET `/api/ai-predictions/corrosion-growth/:pipelineId` (backend also accepts optional `featureId`) | `IliAnomaly.featureId,anomalyType,orientation,depthMm,inspectionRunId`; `IliInspectionRun.pipelineId,inspectionDate,authorId`. Deterministic measured growth; no trained model/run/forecast points. Failure criterion unresolved because native caller supplies no approved configuration. | `apiClient.ts:819` → existing workspace pipeline selection → `CorrosionGrowthForecastChart:362`. Renders two historical depths, not future AI predictions. Current helper supplies pipeline only, not feature selection. |
| M | `backend/src/routes/pipelines.ts`, `routes/assetMaster.ts`, `data/store.ts`; GET `/api/pipelines`, `/api/asset-master/segments?pipelineId=…`, `/api/asset-master/assets?pipelineId=…` | `Pipeline.id,pipelineCode,pipelineName,nominalWallThickness,wallThicknessUnit,createdById`; `Segment.id,pipelineId,segmentId,startKp,endKp`; `Asset.id,assetId,pipelineId,segmentId,kp,latitude,longitude,coordinates`. Full pipeline route geometry/CRS and AI location grouping not established. | Existing `pipeline-selector.tsx`; master UI `frontend/src/app/asset-master/page.tsx`; no reference AI hotspot/GIS table binding. Native IDs remain separate from display codes. |
| I | `backend/src/routes/ili.ts`, `backend/src/ili/data.ts`; GET `/api/ili/runs/:pipelineId`, `/api/ili/anomalies/:pipelineId`, `/api/ili/assessment-results/:pipelineId` | `IliInspectionRun.id,runReference,inspectionDate,sourceMetadata`; `IliAnomaly.id,featureId,kpKm,depthMm,depthPercent,orientation,measurementMetadata`; `IliAssessmentResult.methodology,methodologyVersion,inputSnapshot,result,calculatedAt` | Native `ili-analysis-workspace.tsx`, `/ili-analysis`. G consumes limited measured history; these source records cannot substitute AI_Prediction_ID or AI run provenance. |
| C | `backend/src/routes/cpMonitoring.ts:139`, `cpMonitoring/data.ts:90`; GET `/api/cp-monitoring/:pipelineId` after parent owner-scope validation | `CpReadingHistory.id,testPointId,pipelineId,readingAt,measurementType,referenceElectrode,valueMv,valueV,quality,protectionStatus`; `CpReadingEvaluation.criteriaVersionId,evaluationMethodVersion,status`; native CP criteria/rectifier history | AI `apiClient.ts:925` → `CpHistoricalTrendChart:517`; native `cp-monitoring-workspace.tsx`. Stored CP history does not supply an AI effectiveness forecast or risk-reduction percentage. |
| S | `backend/src/routes/scada.ts`, `utils/scadaData.ts`; GET `/api/scada/overview?pipelineId=…`, `/api/scada/tags/:id/history` | `ScadaTag.id,pipelineId,assetId,engineeringUnit,sourceSystemId`; `SharedTimeSeriesReading.tagId,sourceTimestamp,normalizedUtcTimestamp,value,engineeringUnit,quality`; `ScadaIndicator.indicatorId,value,engineeringUnit,measuredAt`; native events/anomalies | Native `scada-dashboard.tsx`, `/scada`. Current AI real SCADA panels are unavailable; demo arrays/charts are not production bindings. |
| E | `backend/src/routes/assessments.ts`, `routes/externalPipeData.ts`, `data/store.ts`; GET `/api/assessments`, `/api/external-pipe-data` | `Assessment.id,type,pipelineId,input,result,inspectionDate,authorId`; `ExternalPipeData.id,type,pipelineId,input,result,updatedAt`. JSON does not establish every required corrosion feature, version or model-approved input. | Existing internal/external-corrosion workspaces and routes. No AI forecast adapter to these histories. |
| K | `backend/src/routes/riskAssessments.ts`; `data/riskAssessmentRepository.ts`, `riskAssessmentDetailRepository.ts`, `riskTreatmentRepository.ts`; GET `/api/risk-assessments/overview`, `/assessment-details`, `/history`, `/treatments` | `Risk.riskId,pipelineId,currentApprovedRevisionId`; `RiskAssessmentRevision.id,methodologyVersionId,matrixVersionId,inherentResult,currentResult,residualResult,sourceSnapshot,approvedAt,contentHash`; source links/events/treatment baselines | Existing Risk components and `/risk-assessment`. Official Risk remains here. No AI acceptance/reassessment adapter or live approved-data evidence. |
| D | Confirmed Defect backend/API/model contract absent in inspected routes/schema | No verified Defect_ID/revision/repair/outcome fields available for this AI contract; do not substitute ILI IDs or Assessment records | Existing `defect-manager-workspace.tsx`, `/defect-manager` uses explicit unavailable confirmed-record workflows. Imported demoDefects/iliDemoAnomalies are excluded. |
| O | `backend/src/routes/reports.ts`, `routes/documents.ts`; GET `/api/reports/workspace-data/:pipelineId`, native report download endpoints; document list/version/download endpoints | Legacy `Report.id,assessmentId,input,result,generatedAt,authorId` is not an AI Report_Run_ID; `ManagedDocument.documentId`/`DocumentVersion.documentVersionId,revision,fileHash,approvalStatus` map to SQL `Managed_Document`/`Document_Version` with mapped field names | Existing `report-workspace.tsx`, `/report`; Document Management `/document-upload`. AI-specific dataset/export/report-run/document-link contract absent; preserve central file/report ownership. |
| N | No existing AI saved-output/run/schedule/model/scenario API or persistence model | Missing logical AI_Prediction_ID,model/run/version,forecast/recommendation/source-snapshot/confidence/as-of/status/approval/outcome contracts, as specified later | No working counterpart to the IMG-01 saved-results/map/insight/schedule panels. R/G and current demos cannot supply these values. |

Readiness `store` calls and repository functions above were **read as source only**, not invoked. Current runtime permissions, deployed tables, true populations, model artifacts and historical source versions remain UNVERIFIED.

## 2. Global shell, title and navigation — verbatim

| ID | Visible text / number | Mapping | Classification / disposition |
|---|---|---|---|
| H01 | `KLINTHRU™`; `PIPELINE INTEGRITY MANAGEMENT` | H; static branding | UNCHANGED existing brand ownership; exact shell rendering UNVERIFIED. |
| H02 | `DATA TODAY. SAFER TOMORROW.` | H; static slogan | UNCHANGED; no DB or AI calculation. |
| H03 | `Search (Pipeline, KP, Defect ID, Risk ID, ...)` | H,M,D,K; no unified AI/search contract | UNVERIFIED search behavior; no source lookup or result scope inferred from placeholder. |
| H04 | Notification badge `3`; help `?`; avatar `JD`; `John Doe`; `Integrity Manager`; user dropdown chevron | H → User fields for actual signed-in identity only | UNVERIFIED actual identity/notification provider; MISSING FIELD — APPROVAL NEEDED role/notification contract. Screenshot role does not grant authority. |
| H05 | `Dashboard` | H → existing `/dashboard` | UNCHANGED owner/route. |
| H06 | `ASSET & DATA FOUNDATION`; `Pipeline / Asset Master`; `Integration Hub`; `Document Management` | H → `/asset-master`, `/integration-hub`, `/document-upload` | UNCHANGED existing owner routes; no new hierarchy or styling. |
| H07 | `MONITORING & OPERATIONS`; `Sensors`; `SCADA`; `Cathodic Protection` | H → `/sensors`, `/scada`; existing CP owner routes `/cp-dashboard`, `/cp-monitoring`, `/cp-engineering-gap-analysis` | UNCHANGED ownership; UNVERIFIED screenshot CP menu expansion/destination. Do not invent a parent route. |
| H08 | `INTEGRITY ASSESSMENT`; `Corrosion Management`; `ECDA Assessment`; `ILI Analysis` | H → existing corrosion routes, `/ecda-assessment`, `/ili-analysis` | UNCHANGED ownership; UNVERIFIED screenshot Corrosion Management parent menu. |
| H09 | `INTEGRITY MANAGEMENT`; `Defect Manager`; `Risk Assessment`; `AI Predictions` | H → `/defect-manager`, `/risk-assessment`, `/ai-predictions` | UNCHANGED current destinations; AI selected. |
| H10 | `REPORTING & OUTPUT`; `Reports & Analytics` | H,O → `/report` | UNCHANGED central reporting owner. |
| H11 | `SETTINGS & ADMINISTRATION`; `Settings` | H; no Settings destination identified in current sidebar navItems | UNVERIFIED destination; no route proposed. |
| H12 | `Home`; `Integrity Management`; `AI Predictions` (breadcrumb) | H,F; static labels; existing AI destination | UPDATE/UNVERIFIED breadcrumb navigation; preserve existing routes. |
| H13 | `AI Predictions` | F → existing workspace title | UNCHANGED text; no structure/style change. |
| H14 | `Predict, prioritize and prepare for the future. AI-driven insights for pipeline integrity, based on historical data and current conditions.` | F; existing subtitle instead describes readiness | UPDATE reference copy; advisory interpretation from DOCX still required. |
| H15 | `Export`; `Run AI Analysis` | F,R,N,O | UPDATE current disabled scan control; NEW export/orchestration contracts. No supported run/export inferred. |
| H16 | `Overview`; `Prediction Results`; `Deterioration Trends`; `Inspection Prioritization`; `Scenario Analysis`; `Model Performance`; `Related Data`; `Reports`; `Configuration` | F,N; nine tab titles; Overview selected | NEW tab control relative to current readiness workspace; UNCHANGED reference nine-tab order. This task does not implement it. |
| H17 | Footer `KLINTHRU™`; `Pipeline Integrity Management System`; `Version 1.0.0`; `Confidential`; `© 2026 KLINTHRU. All rights reserved.` | H; static shell/footer; no AI DB mapping | UNCHANGED owner; UNVERIFIED actual deployed version/confidentiality classification. Screenshot version/year are not release evidence. |

Icons without independent text: product logo; search magnifier; notification bell; help circle; user dropdown; menu/category icons and chevrons; purple chip title icon; export-document icon; plus icon on Run AI Analysis. These are visual controls/decoration, not additional source data. Tooltips/expanded menus/ARIA labels are not visible and remain UNVERIFIED. No shell/styling change is proposed.

## 3. Five KPI cards — complete visible values and mapping

| ID | Number | Label | Secondary text / symbol | Existing frontend and data mapping | Classification / DOCX conflict |
|---|---|---|---|---|---|
| K01 | `36` | `Predicted High-Risk Locations` | up arrow; `+12% vs. last run` | F.KpiCard exists, but current real card is Critical Forecast from R.defectPrediction readiness. Required saved AI outlook location count and comparable prior run are N; M provides native scope only; K owns official Risk. | UPDATE / CONFLICT; MISSING FIELD — APPROVAL NEEDED advisory name, location population/deduplication, elevated-outlook rule, horizon, prior-run comparability and delta formula. DOCX P0004 requires AI-Predicted Elevated-Risk Locations or Predicted Risk Outlook. |
| K02 | `28` | `Likely New Defects (12 months)` | up arrow; `+8% vs. last run` | N prediction count/type/horizon + prior-run comparison; D native confirmed defects unavailable; R counts cannot substitute. | NEW / UNVERIFIED; MISSING FIELD — APPROVAL NEEDED concern-count versus expected count/probability meaning, time basis and population. DOCX P0047: click → Prediction Results filtered Prediction_Type=New Defect. No Defect_ID creation. |
| K03 | `14` | `Assets Requiring Early Inspection` | up arrow; `+40% vs. last run` | N inspection recommendations with M stable asset scope; no existing priority engine/count | NEW / CONFLICT if treated as approved requirement; MISSING FIELD — APPROVAL NEEDED “early” window, eligibility/coverage, deduplication and human-planning semantics. DOCX P0047 click → Inspection Prioritization. |
| K04 | `18` | `Estimated Life Reduction` | `Segments affected` | N affected-segment aggregate + saved advisory life estimate. Current F Avg Pipeline RUL displays at most selected G feature RUL, not this count. M native segment IDs only. | UPDATE / CONFLICT count versus life magnitude; MISSING FIELD — APPROVAL NEEDED affected-segment definition, reduction threshold, base/forecast/horizon and advisory unit. DOCX P0004/P0185–0190/P0047: model estimate, separate from approved engineering RUL; click → Deterioration Trends. |
| K05 | `87%` | `Model Confidence` | `+3% vs. last run` | F card real value is Not Available; R.modelConfidence has no registry/evaluation evidence; N saved model-validation or portfolio-confidence metric | UPDATE / CONFLICT; MISSING FIELD — APPROVAL NEEDED Portfolio Prediction Confidence versus Model Validation Score, weighting/denominator, version/window and percentage versus percentage-point change. P0300–0307 separates these meanings and individual confidence; P0047 click → Model Performance. |

Visible card icons respectively: rising chart; warning triangle; clock; leaf; target. No filter is shown beside these KPIs. Scope/as-of/model version/run ID/source snapshot/active-state definition are not printed and cannot be inferred. All numeric values are UNVERIFIED screenshot examples, not defaults.

## 4. Map — complete visible inventory

| ID | Visible text / control / content | Existing mapping | Classification / missing fields |
|---|---|---|---|
| MP01 | `Predicted Risk Hotspots (Next 5 Years)` | F has no map; N five-year saved AI outlook + M location/geometry; K official Risk stays separate | NEW / CONFLICT advisory-risk terminology. No trained future-risk model or hotspot definition. |
| MP02 | Satellite-style basemap, connected pipeline route, colored circular point markers | M Asset.latitude/longitude/coordinates and Segment.startKp/endKp are limited source context; full route/basemap/CRS/AI markers N | NEW / UNVERIFIED actual positions, pipeline identity, marker IDs/count/population, CRS, source versions and imagery licensing/provider contract. Pixel positions are not coordinates. |
| MP03 | `Very High Risk`; `High Risk`; `Medium Risk`; `Low Risk` | N advisory classification; K source approved historical Risk context only | CONFLICT / MISSING FIELD — APPROVAL NEEDED model-derived outlook classes, thresholds, legend meaning and palette authority. Visible dots: red/orange/yellow/green respectively; no scores or boundaries printed. |
| MP04 | `+`; `−`; stacked-layer icon | F no AI-map component; M location context | NEW controls; UNVERIFIED zoom/layer options, initial extent and supported interaction. No labels invented for hidden layers. |
| MP05 | `View in GIS` with map icon | N destination/filter contract; existing app routes do not establish full GIS handoff | NEW / MISSING FIELD — APPROVAL NEEDED native GIS owner/destination and filter serialization/access. DOCX P0055–0056 requires full GIS view with current filters. |

No visible numeric coordinates, KP labels, scale bar, map search or geographic place names are present in this panel. No map datum, route geometry or marker record can be recovered as authoritative data from the raster.

## 5. Predicted defect-count chart — exact labelled data

Title: **`Predicted Defect Count (Next 5 Years)`**. Vertical tick labels, bottom to top: **`0`, `10`, `20`, `30`, `40`, `50`**. No printed vertical-axis unit title, legend or dropdown. The title supplies count/horizon context.

| Horizontal label | Printed bar value | Visible bar color | Existing binding / classification |
|---|---:|---|---|
| `2026` | `28` | Red | N saved AI count/bucket; NEW / UNVERIFIED |
| `2027` | `34` | Orange | N saved AI count/bucket; NEW / UNVERIFIED |
| `2028` | `42` | Yellow | N saved AI count/bucket; NEW / UNVERIFIED |
| `2029` | `31` | Yellow | N saved AI count/bucket; NEW / UNVERIFIED |
| `2030` | `18` | Green | N saved AI count/bucket; NEW / UNVERIFIED |

Existing F has SVG chart primitives (`ChartFrame`, `ChartGrid`, `ChartLegend`) and historical G/C displays, but no persisted annual defect forecast/API. D is not a forecast source. **MISSING FIELD — APPROVAL NEEDED:** annual independent versus cumulative counts, expected number versus thresholded concerns, one population/model/run/cut-off, model-supported horizon/buckets and color semantics. Bar heights must not establish severity. Reference total153 is arithmetic across displayed bars, not a verified five-year unique-defect count; overlapping/cumulative years must not be summed without a contract.

## 6. Remaining-life donut — every label/count/percentage

Title: **`Remaining Life Distribution`**. Centre: **`428`**, **`Segments`**.

| Visible legend label | Count | Percentage text | Visible color | Mapping / classification |
|---|---:|---|---|---|
| `< 5 years` | `46` | `(11%)` | Red | N saved segment AI life estimates + M segment scope; NEW / UNVERIFIED |
| `5 – 10 years` | `102` | `(24%)` | Orange | Same |
| `10 – 20 years` | `156` | `(36%)` | Yellow | Same |
| `> 20 years` | `124` | `(29%)` | Green | Same |

Counts sum428 and rounded percentages sum100%, but this only checks reference arithmetic. It does not prove real segments or approved banding. R/G cannot populate a portfolio distribution; G lacks an approved failure criterion and returns a selected compatible feature, not one life per segment.

**MISSING FIELD — APPROVAL NEEDED:** which estimate governs a segment, eligible population, missing-estimate treatment, distinct segment count, boundary inclusion at5/10/20years, rounding and advisory band definitions. DOCX P0185–0190 prohibits replacing approved engineering remaining-life records.

## 7. AI insights — all five statements verbatim

Title: **`AI Key Insights`**. Visible icons in order: warning triangle; upward arrow; information circle; trend chart; gear/target-like icon. No timestamp/model/run identifier printed.

| ID | Exact visible statement | Existing data path / field mapping | Classification / DOCX comparison |
|---|---|---|---|
| IN01 | `High probability of external corrosion defects on PL-002 between KP 45–68 (83% confidence).` | M pipelineCode + native segment/KP scope; E/I corrosion context; N prediction probability/confidence/explanation/source snapshot | NEW / UNVERIFIED; MISSING FIELD — APPROVAL NEEDED probability versus confidence definition, units/KP datum, model/horizon/explanation evidence. Predicts concerns, never confirmed Defect_ID. |
| IN02 | `CP performance improvement expected to reduce risk by 32% on PL-003.` | C native CP history/criteria; M pipeline; K official Risk; N saved model/scenario forecast and explanation | NEW / CONFLICT if presented as verified reduction. MISSING FIELD — APPROVAL NEEDED approved hypothetical intervention/base/outlook metric/evidence; never change CP status or official Risk. |
| IN03 | `Potential 18% reduction in remaining life on Segment PL-004-S2 due to operating pressure cycles.` | M segment display identity; S operating indicator/history; N life forecast/causal explanation/snapshot | NEW / UNVERIFIED; model-specific pressure-cycle feature and causal/effect basis missing. No inference from device inventory or live settings. |
| IN04 | `Early inspection recommended for 12 locations within next 18 months.` | N saved inspection recommendations; M exact location scope; current backend has no rank/schedule engine | NEW / UNVERIFIED. MISSING FIELD — APPROVAL NEEDED location-versus-asset grouping,18-month window,eligibility and relationship to14-asset KPI/12-month defect KPI. Recommendation only. |
| IN05 | `Model confidence improved by 3% with latest SCADA and CP data.` | S/C native versions/timestamps; N model/run/validation or confidence comparisons | NEW / CONFLICT confidence versus actual validation. “Latest” cannot bypass data cut-off or human-approved model promotion. MISSING FIELD — APPROVAL NEEDED comparable versions,delta definition and source/feature lineage. |
| IN06 | `View All Insights` with right arrow | F/N full read destination | NEW / UNVERIFIED destination; DOCX View All requires corresponding full view. No additional major tab or guessed route proposed. |

## 8. Deterioration trend chart — labelled data only

| ID | Exact visible content | Existing mapping | Classification / limits |
|---|---|---|---|
| TR01 | `Deterioration Trend Prediction` | F.G chart is historical depth(mm); N required future wall-thickness series | UPDATE / NEW / CONFLICT metric and data basis. |
| TR02 | Vertical-axis label `Remaining Wall Thickness (%)`; ticks `0`, `20`, `40`, `60`, `80`, `100` | M nominalWallThickness/wallThicknessUnit + I actual measured depth context; N approved normalized remaining-thickness time series | MISSING FIELD — APPROVAL NEEDED original/nominal reference thickness, normalization, segment/feature scope, source IDs/units/version and method. No depth-to-percent conversion inferred. |
| TR03 | Horizontal labels `2024`, `2026`, `2028`, `2030`, `2032`, `2034` | N dated forecast/historical series; I source inspectionDate only partial | NEW / UNVERIFIED actual point timestamps; no calendar time inferred from tick positions. |
| TR04 | `Today` at vertical dashed divider | N forecast start/cut-off/as-of; F has no saved AI-run marker | NEW / UNVERIFIED actual date. DOCX P0153–0159 also requires explicit prediction start date and model version. |
| TR05 | Legend `Historical`; `AI Predicted`; `Confidence Range` | I/E source history; N saved forecast values and lower/upper bounds; F.ChartLegend partial | UPDATE / NEW. Blue historical solid line, red dashed prediction and pale shaded interval are visual reference. Confidence level/type is not printed. |
| TR06 | Descending lines and shaded future band | G only earlier/later measured depths; N future series/uncertainty | UNVERIFIED numerical vertices/bounds: no numeric point labels or source dataset supplied. No estimated pixel values are reported as exact data. |

No pipeline/segment selector, model selector, date filter, tooltip, interval percentage or export control is visible in this panel. DOCX P0160/P0175: future values never become actual measurements; later actuals remain separately source-owned and linked to prior predictions.

## 9. Top-five table — exact transcription

Title: **`Top 5 Predicted High-Risk Segments`**. Action: **`View All`** with chevron. Headers and every displayed cell:

| # | Pipeline / Segment | KP Range | Threat Type | Predicted Risk | Confidence |
|---|---|---|---|---|---|
| 1 | PL-002 / S3 | 45.0 – 68.0 | External Corrosion | Very High | 92% |
| 2 | PL-001 / S2 | 102.3 – 118.5 | Internal Corrosion | High | 88% |
| 3 | PL-004 / S1 | 22.0 – 34.0 | Mechanical | High | 84% |
| 4 | PL-003 / S4 | 76.2 – 89.1 | Third Party | High | 81% |
| 5 | PL-005 / S2 | 10.0 – 23.5 | Geohazard | Medium | 78% |

| Field/action | Existing backend / DB / API / frontend mapping | Classification / missing contract |
|---|---|---|
| Title, table, row count5 | F has no equivalent ranked Overview table; N saved ranked-result provider | NEW; CONFLICT advisory risk wording. Five screenshot rows are not real records. |
| `#` | N scoped sort/ranking; no source column | NEW; MISSING FIELD — APPROVAL NEEDED ranking metric,ties,stable ordering,eligibility and exact run/horizon. |
| `Pipeline / Segment` | M Pipeline.pipelineCode and Segment.segmentId with stable parent IDs; native master APIs; N prediction subject links | UPDATE native source context, NEW AI association; UNVERIFIED screenshot codes resolve to records. |
| `KP Range` | M Segment.startKp/endKp or saved prediction scope; N immutable scope snapshot | NEW binding; MISSING FIELD — APPROVAL NEEDED unit/datum/range normalization. IMG-01 does **not** print km in this header; do not borrow km from another image. |
| `Threat Type` | N saved AI prediction taxonomy; E/I/C/S context cannot choose threat automatically | NEW; MISSING FIELD — APPROVAL NEEDED canonical type IDs/labels. `Third Party` here differs from `Third Party Risk` in recent predictions. |
| `Predicted Risk` | N advisory outlook; K RiskAssessmentRevision results are official source context, not a substitute AI forecast | NEW / CONFLICT; approved advisory scale/threshold/version required. Visible Very High/High/Medium badges do not approve classification. |
| `Confidence` | N individual forecast confidence linked to exact model/run/snapshot | NEW / UNVERIFIED; distinct from portfolio/model validation. IN01 uses83% for similar location while this row uses92%; exact prediction linkage needed. |
| `View All` | F/N corresponding full results view | NEW; MISSING FIELD — APPROVAL NEEDED existing destination and filter/query context; no new route designed. |

No row selection checkboxes, page controls, dropdown filters or explicit row action buttons are printed in this table. Tiny unlabelled artifacts/glyphs do not establish extra functional controls. Table values retain the screenshot's labels; no canonical naming or unit conversion applied.

## 10. Quick actions — all four buttons

Title: **`Quick Actions`**.

| Visible button text | Existing map | Classification / required owner contract |
|---|---|---|
| `Run AI Analysis` | F disabled Run Full Prediction Scan; R.predictionScan; N orchestration/model-run/snapshot/job | UPDATE / NEW; MISSING FIELD — APPROVAL NEEDED authorized run scope,eligible approved model,input cut-off,idempotency and state/error behavior. No existing execution API. |
| `View Prediction Results` | F/N saved prediction register | NEW; UNVERIFIED destination/state/filter contract; does not open a duplicate engineering record. |
| `Compare Scenarios` | N sandbox base/scenario snapshots/runs/results | NEW; MISSING FIELD — APPROVAL NEEDED cloned hypothetical inputs/permissions; no live CP/SCADA/schedule/Risk changes. |
| `Export Data` | O central reports/documents and N AI export dataset/access | NEW; MISSING FIELD — APPROVAL NEEDED formats,source/field scope,lineage,as-of and authorization. No format is printed for this button. |

Icons: play-circle; vertical bar chart; connected scenario nodes; document. Header `Run AI Analysis` and header `Export` are additional visible instances, not different assumed workflows.

## 11. Recent-predictions table — every displayed value

Title: **`Recent AI Predictions`**. Headers and rows verbatim:

| Prediction ID | Pipeline / Segment | Location (KP) | Prediction Type | Predicted Outcome | Time Horizon | Confidence | Status | Generated On | Actions |
|---|---|---|---|---|---|---|---|---|---|
| AI-2026-001 | PL-002 / S3 | 45.0 – 68.0 | New Defect | 2 – 4 external defects | 1–3 years | 92% | Open | 12 Mar 2026 | View |
| AI-2026-002 | PL-001 / S2 | 105.2 | Remaining Life | -18% (from 22 to 18 years) | 5 years | 87% | Open | 12 Mar 2026 | View |
| AI-2026-003 | PL-004 / S1 | 28.5 | Corrosion Growth | 35% increase | 3 years | 84% | Open | 11 Mar 2026 | View |
| AI-2026-004 | PL-003 / S4 | 82.1 | Third Party Risk | High excavation risk | 1 year | 81% | Open | 11 Mar 2026 | View |
| AI-2026-005 | PL-005 / S2 | 18.0 | Geohazard | Increased movement | 5 years | 78% | Under Review | 10 Mar 2026 | View |

Each `View` has a downward chevron. A hidden dropdown/menu is not transcribed or inferred.

| Column | Existing DB/API/component mapping | Classification / missing fields |
|---|---|---|
| Prediction ID | N DOCX AI_Prediction_ID; F.EmptyRegister currently uses Defect ID and no persisted AI results | NEW / CONFLICT identity semantics. Allocation/uniqueness/version/retry contract missing; no screenshot ID inserted. |
| Pipeline / Segment | M native Pipeline/Segment records + N exact saved prediction subject references | UPDATE native context / NEW AI binding; stable IDs and same-pipeline checks missing as AI contract. |
| Location (KP) | M source scope or N immutable saved location; header gives KP but no distance unit | NEW / UNVERIFIED unit and datum; point versus range semantics required. |
| Prediction Type | N saved prediction-type ID/label | NEW; canonical taxonomy mapping missing; New Defect is an advisory concern, not confirmed Defect_ID. |
| Predicted Outcome | N saved typed output/value/unit/explanation; current F.EmptyRegister only unavailable RUL/growth/projected-RSF headings | NEW; output shape/units/base values and evidence missing. Percent increases/decreases must identify metric and baseline. |
| Time Horizon | N explicit saved horizon/start/end/time basis | NEW; MISSING FIELD — APPROVAL NEEDED calendar/interval semantics,1–3year range meaning,model support andexpiry. Cannot derive from Generated On text alone. |
| Confidence | N individual prediction confidence + model/run/source lineage | NEW; definition/calibration/version/evidence missing. Does not reuse KPI87%. |
| Status | N Status/Review_Status/Reviewer | CONFLICT `Open` versus DOCX P0105–0112 recommended Generated/Under Review/Accepted/Rejected/Superseded/Expired and prohibition on engineering Open/Closed meaning. State/transition authority requires approval. |
| Generated On | N Prediction_Time + AI_Model_Run_ID/cut-off | NEW; date-only text lacks timestamp/timezone and input cut-off. Screenshot dates not real generation evidence. |
| Actions / View | F/N exact prediction selection/drawer/full analysis | NEW; DOCX P0063 requires prediction,confidence,model/run version,horizon,explanation,source lineage and Open Full Analysis. No isolated duplicate record or upstream edit. |

The five rows share subjects/confidence values with the top-five table, but the screenshot prints no stable prediction linkage between the two. A matching row order/name/confidence does not prove they represent the same prediction/run. No pagination, per-page selector, local table filter or table-level View All is visible here.

## 12. Upcoming analyses — complete list

Title: **`Upcoming AI Analyses`**. Action: **`View All`** with chevron. Each entry has a clock icon. No column headings/status labels are printed.

| Analysis text | Date text | Existing mapping | Classification |
|---|---|---|---|
| Full Network Analysis | 15 Mar 2026 | N schedule/job + model/run eligibility/scope | NEW / UNVERIFIED |
| PL-002 Detailed Scan | 20 Mar 2026 | N schedule/job + M pipeline scope | NEW / UNVERIFIED |
| CP Effectiveness Model | 25 Mar 2026 | N configured model/job + C approved inputs only | NEW / UNVERIFIED |
| Corrosion Growth Update | 01 Apr 2026 | N model job/forecast; G measured on-demand reader is not a scheduler | NEW / UNVERIFIED |
| Risk Scenario Simulation | 05 Apr 2026 | N sandbox model/scenario schedule; K official Risk unchanged | NEW / UNVERIFIED |

Required logical fields have no existing declared target: job/schedule identity,model version,scope,cut-off,recurrence,scheduled timestamp/timezone,status,owner,approval,execution result/run link and failure state. **MISSING FIELD — APPROVAL NEEDED.** Dates already precede this review date; a screenshot has no current-as-of context, so these cannot be labelled genuinely upcoming or expired operational records. `View All` needs an approved corresponding full read destination; no tenth major tab is inferred.

## 13. Units, numbers, filters and non-text completeness

| Area | Explicit unit / boundary in IMG-01 | What remains UNVERIFIED / approval-needed |
|---|---|---|
| KPIs | counts36/28/14/18;12months;percent deltas12/8/40/3;87%;Segments affected | Count populations,run/horizon comparison,delta/rounding method;18 is a segment count, not years. |
| Hotspot map | Next5Years;four class labels | No KP/coordinate/distance unit or class thresholds printed; no numeric score shown. |
| Defect bars | years2026–2030;counts28/34/42/31/18;ticks0–50by10 | Annual versus cumulative interpretation;barcolor meaning;all uncertainty absent. |
| Life donut | 428Segments;years bands<5/5–10/10–20/>20;counts46/102/156/124;11/24/36/29% | Exact bin inclusivity;source estimate and rounding. |
| Insights | PL-002,KP45–68,83%;PL-003,32%;PL-004-S2,18%;12locations,18months;+3% | KP unit/datum and source scope;forecast basis/model/definition of percentages. |
| Trend | RemainingWallThickness%;ticks0/20/40/60/80/100;years2024–2034;Today;ConfidenceRange | No uncertainty level/point values/explicit startdate/modelversion or pipeline scope; no invented graph samples. |
| Top-five table | rank1–5;decimal KPranges;92/88/84/81/78%;VeryHigh/High/Medium | No distance unit,thresholds,ranking algorithm or exact AIresult linkage. |
| Recent table | point/rangeKP;count-range2–4;−18%;22→18years;35%;1–3/5/3/1/5years;92/87/84/81/78%;dates | Typed outputs,denominator,units/timezone,start/end,confidence semantics andstatus authority. |
| Upcoming list | five date strings,March/April2026 | No timezone,schedule state or current-as-of evidence. |
| Footer/header | notification3;Version1.0.0;copyright2026 | Not operational notification count,release state or current year policy. |

**Filters:** IMG-01 contains no visible local Pipeline,Segment,DateRange,Horizon,ModelVersion,Status orConfidence dropdown filter. Global search and map controls are visible. Table `View` chevrons and sidebar/user chevrons reveal no menu contents. Do not import filters from IMG-02 or later images. Current real-mode PipelineSelector is existing functionality, not an IMG-01 filter requirement or authority to remove it.

**Charts/map:** one map,one vertical bar chart,one donut,one time-series chart. Two tables each have five rows. Other content: five KPIs,five insight statements,four quick-action buttons,five upcoming entries,nine navigation tabs,shared shell/header/footer. No additional populated data panel or new source-owned record is implied by icons.

## 14. DOCX conflicts and required safeguards

DOCX references use the Step0 paragraph numbering (direct body paragraphs including blanks,excluding table text). Wording below describes the requirement; screenshot transcription above remains unmodified.

| Issue | IMG-01/code evidence | DOCX requirement / approval blocker |
|---|---|---|
| Advisory risk name | Predicted High-Risk Locations;Predicted Risk Hotspots;Top5PredictedHighRiskSegments;VeryHigh/High/Medium/Low | P0003–0004/P0133–0152: AI outlook ≠ official Risk. Choose approved advisory labels/scale/method; never write Risk_ID/results. **CONFLICT; MISSING FIELD — APPROVAL NEEDED.** |
| Confidence | KPI87%,individual83–92%,“improved3%” | P0300–0307/P0677: separate model validation,portfolio confidence and individual prediction confidence. Definition,aggregation,delta and calibration evidence missing. **CONFLICT.** |
| Defect counts | KPI28next12months;bar2026value28;recentrow2–4externaldefects/1–3years | P0105–0132: predictions only; no Defect_ID creation. These are different horizons/populations unless exact saved run contracts prove otherwise. **UNVERIFIED.** |
| Life reduction | KPI18Segmentsaffected;insight18%onPL-004-S2;recent−18%(22to18years)onPL-001/S2 | P0185–0190: advisory estimate separate from engineering RUL. Do not equate count18,percent18 and different subjects. Four-year reduction from22 is about18.18%;display rounding is not approved by screenshot. **CONFLICT/UNVERIFIED.** |
| Early inspection | KPI14assets;insight12locations/18months | P0191–0225: ranked recommendation,not approved schedule. Distinct assets/locations/windows may explain values,but no explanation supplied. **UNVERIFIED; grouping/window policy missing.** |
| CP risk benefit | insight32%riskreduction | Advisory forecast/intervention evidence only;never change CP settings/status or official Risk. No model/input/scenario/denominator identified. **MISSING FIELD — APPROVAL NEEDED.** |
| Current measured-growth reuse | Current card CorrosionRate(Max) uses one selected compatible feature;AvgPipelineRUL is not a portfolio average | P0047 portfolio summary must use governed saved AI outputs,not recalculate source engineering or mislabel individual deterministic readings. Existing G is partial historical context only. **UPDATE/CONFLICT.** |
| Historical/future separation | Trend legends distinguishHistorical/AI, but no snapshot/model/startdate printed | P0153–0175/P0355–0373 require immutable source IDs+versions+timestamps,cut-off,featurevalues/version,model/configversion,forecastbounds and known-at-time inputs;futureactuals never replace prediction. **NEW missing lineage.** |
| Prediction status | FourOpen andoneUnderReview rows | P0105–0112 recommended AIreview states;Open must not mean engineering Open/Closed. Reviewer/Review_Status transitions andauthority missing. **CONFLICT.** |
| Detail/navigation | View,ViewAll,ViewAllInsights,ViewinGIS,CompareScenarios | P0047–0063: exact-context KPI drill-through,rightdrawer,fullcorrespondingview,native source/GIS andOpenFullAnalysis. Existing destinations/filter contracts missing;no new route or major tab implied. **NEW/UNVERIFIED.** |
| Model/run eligibility | RunAIAnalysis andscheduledmodeljobs;no registry/version shown | P0091–0104/P0422–0430/P0673: one distinct run can yield many predictions;onlyeligibleApproved/Productionmodels;candidate retraining requires validation andhuman-approved production promotion. **MISSING FIELD — APPROVAL NEEDED.** |
| Scenario isolation | CompareScenarios;RiskScenarioSimulation schedule | P0226–0271/P0651–0661: clonedhypotheticalinputs only;no CP/SCADA/Risk/inspection edits. Human acceptance routesrecommendationtoownerworkflow. **UNCHANGED boundary;NEW missing contract.** |
| Retry/outcome/staleness | No visible runkey,outcomelink,expiry/as-of | P0487–0506/P0662–0676: idempotentretries,no duplicateactivepredictions;actualoutcomelinks;expiry/staleness;approvedmissing-inputbehavior;neverzero;AIfailuremustnotinterruptsourceoperations. **NEW / MISSING FIELD — APPROVAL NEEDED.** |
| Export/report ownership | HeaderExport,ExportData | P0374–0382: Reports&Analyticsownsreports;approvedfile→oneDocument_ID. Existing legacyReportrecordsare not AIruns.No parallelreport/file store. **UNCHANGED owner;NEW missing dataset/access contract.** |
| Permissions | ScreenshotIntegrityManager;currentauth/owner/Adminreadscope | Roles forrun/readconfidentialsnapshots/review/accept/export/catalog/config/validate/promote are not approved by the screenshot. Native source ACLs remain mandatory. **MISSING FIELD — APPROVAL NEEDED.** |

No threshold, color, forecast line, count, percentage, model confidence, inspection timing, remaining life, reduction or approval date from IMG-01 is adopted as an engineering rule or operational value.

## 15. Decisions required before implementation

1. Approve advisory naming and exact definitions of the five KPIs, affected populations, horizons, baseline comparisons, life bins, confidence meanings and rounding. No default values are supplied here.
2. Supply approved model/version/use-case eligibility, scoring, priority, remaining-life and CP-benefit methods, required features/units, intervals and failure criteria. Source wall thickness/MAOP alone cannot create a failure criterion.
3. Approve prediction/run/snapshot/feature/configuration lineage contracts, exact source ID/version/as-of/cut-off access, idempotency, expiry, immutable history and later actual-outcome links. No physical schema proposal or route change is made in this review.
4. Approve review states and the role/action/field/native-source permission matrix, including human acceptance and model promotion. Source ownership stays unchanged.
5. Provide owner-service contracts for run/schedule jobs, filtered results, drawers/full views/GIS, scenario sandbox, central Action/Risk/inspection handoffs and central export/report → Document_ID. Hidden filter/menu choices remain UNVERIFIED.

Preservation: SHA-256 comparison of 326 task-start source, schema/migration, script, package/lockfile and existing root-report files found zero changes or deletions. This mapping report is the sole addition in that scope.

**Stop point:** IMG-01 mapping and conflicts only. No application code, structure, Prisma schema, API route, styling, dependency or generated client was changed. No model run, test fixture, Neon read/write, migration, seed or deployment was performed. Wait for the user's next approval; approval of this mapping does not automatically approve engineering/security contracts or database operations.
