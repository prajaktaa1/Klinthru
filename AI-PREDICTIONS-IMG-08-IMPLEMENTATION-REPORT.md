# AI Predictions IMG-08 — Related Data

21 October 2026. **DONE: safe local UI/module navigation. BLOCKED: verified AI-to-original-record links and operational lineage.**

References: supplied `ChatGPT Image Oct 7, 2026, 03_31_51 AM-7.png`; `../All-doc/new/AI prediction.docx` P0343–0373; Step0 and IMG-01–07 reports; current source. Screenshot IDs/counts/content are examples, never inserted records or verified relationships.

## Implemented

- Seventh in-place tab; previous views/source readers, shared header/KPIs, nine-tab order, routes/schema/dependencies/shared styles and other modules preserved. Reports/Configuration remain disabled.
- Five filters, Reset/Apply, linked-record table/checkbox/column/download/paging controls, lineage structure, source distribution and right-side Record Details.
- Functional local help, detail close/reopen and Details/AI Connection/Linked Records/Documents sections. Missing IDs/versions/status/relevance/counts/percentages/details/model/run/snapshot values show N/A. No source record copied, renamed or fabricated.
- Verified existing native module navigation for ILI, SCADA, CP, Defect Manager, Risk, Sensors, ECDA and Documents. These links explicitly open module catalogs, **not selected records or verified AI evidence**. Native module pages retain their own API/permission handling.
- Exact source-record navigation, query/filter/export/selection and verified lineage edges remain blocked. Calling every source list and presenting unrelated records as AI-linked would invent relationships; that was not done.
- Diagram arrows are labelled unverified structure; counts and source bars are neutral N/A. Current source values never replace frozen input-snapshot values. AI remains advisory.

## Reference coverage

Shared reference KPIs36/28/14/18/87% and run deltas remain N/A. Existing Klinthru shell retained instead of image PipeIntel branding/John Doe identity/notification2.

Heading `Related Data`; subtitle `Explore linked data sources and supporting records for AI predictions. Validate insights with underlying evidence.`; `Learn more about related data`.

Filters: Source Module=All Modules; Pipeline=All Pipelines; Segment=All Segments; Date Range=Last12months; Link Status=All Statuses. Reset/Apply Filters, Columns/Download controls visible but data operations disabled without approved providers. Hidden choices are unknown.

Table `Linked Records (124)` becomes N/A. Columns: checkbox, Date, Source Module, Record ID, Title / Description, Pipeline, Segment, Relevance, Link Status, ellipsis/Actions. Screenshot-only rows:

| Source | Reference ID / description | Date | Relevance / link state |
|---|---|---|---|
| Defect Manager | DM-2024-0017 / External corrosion feature | Oct14,2024 | High / Linked |
| Risk | RISK-2024-0043 / High consequence area | Oct12,2024 | High / Linked |
| SCADA | SCADA-88421 / Pressure drop anomaly | Oct11,2024 | Medium / Linked |
| Sensor Health | SEN-7632 / Vibration sensor offline | Oct10,2024 | Medium / Linked |
| CP Readings | CP-55677 / Low pipe-to-soil potential | Oct08,2024 | Medium / Linked |
| ILI | ILI-2023-118 / Metal loss anomaly (ILI) | Oct05,2024 | High / Linked |
| ECDA | ECDA-0091 / High ECDA likelihood | Oct02,2024 | Medium / Under Review |
| Documents | DOC-44721 / Construction record drawing | Sep28,2024 | Low / Linked |

All reference rows use PL-001; segments SEG-012 except Sensor Health SEG-013 and ECDA SEG-015. No row is rendered as operational data. Footer Showing1to8of124records, pages1–5/…/16 and rows-per-page8: counts/pages become N/A;8 is a UI page-size setting only.

Lineage: ILI3,SCADA5,CP4,Defect6,Risk3,Sensor2,ECDA2,Documents4 → AI-PRED-0036 → Predicted High-Risk Location PL-001/SEG-012,Confidence87%. No original IDs or immutable run/snapshot mapping prove these edges. UI shows N/A and retains native ownership.

Source chart examples Defect6/26%,Risk3/13%,SCADA5/22%,Sensor2/9%,CP4/17%,ILI3/13%,ECDA2/9%,Documents4/17% total29records/126%, distinct from124 linked rows. No synthetic reconciliation/normalization or inferred denominator.

Record Details reference: DM-2024-0017/Linked; tabs Details/AI Connection/Linked Records(6)/Documents(2); source Defect Manager; External corrosion feature; description external corrosion detected in ILI with estimated depth35%WT; PL-001–Northern Line; SEG-012(KP12.4–13.1); location12.78; Oct14,2024; High severity/Open status/High AI relevance; AI-PRED-0036 with High risk of growth in12months; View in Defect Manager. All remain N/A. Percent WT is not converted to millimetres; source severity/status is not prediction review status.

## Source contracts and blockers

| Existing owner chain | Verified local binding | Missing AI contract |
|---|---|---|
| AI readiness | `routes/aiPredictions.ts` → `readinessData.ts`/`readiness.ts`; authenticated private/no-store GET `/api/ai-predictions/readiness`; existing client/workspace | Availability is not linked-record evidence. Current AI router also has measured growth GET only; no saved AI source-link provider. |
| ILI | Existing `/ili-analysis`; `apiClient.fetchIliRuns/fetchIliAnomalies` → `/api/ili/runs/:pipelineId`, `/anomalies/:pipelineId`; `routes/ili.ts`, `ili/data.ts`; native `IliInspectionRun.id`, `IliAnomaly.id` distinct from featureId/display codes | Exact original record/revision→prediction/snapshot relationship absent. Do not treat feature IDs as canonical anomaly IDs. |
| CP | `/cp-monitoring`; existing `fetchCpMonitoringData` → `/api/cp-monitoring/:pipelineId`; native `CpReadingHistory.id`, pipeline/testpoint/timestamp/electrode/value metadata | No verified AI input link to a reading/evaluation/version; no screenshot ID conversion. |
| SCADA | `/scada`; existing overview/tag-history GETs; `routes/scada.ts`, `utils/scadaData.ts`; native indicator/tag/event/history identifiers/timestamps/units/quality | Exact type/ID/version and frozen feature lineage absent; arbitrary telemetry cannot be linked as evidence. |
| Sensors | `/sensors`; existing devices/source-owned assignment APIs and `DeviceRecord.id,deviceId` | Inventory and latest state do not prove a saved AI Sensor Health input. |
| Risk | `/risk-assessment`; native Risk read APIs/repos; `Risk.riskId`, immutable `RiskAssessmentRevision.id,sourceSnapshot,contentHash` | No AI source-link/version relationship. Official inherent/current/residual revisions stay owner-managed. |
| Defect / ECDA | Existing `/defect-manager`, `/ecda-assessment` | Confirmed Defect API/model and ECDA-specific version/ID projection not verified for this AI contract. Module routes alone cannot validate screenshot aliases/IDs. |
| Documents | `/document-upload`; existing list/version/download APIs; `ManagedDocument.documentId`, `DocumentVersion.documentVersionId,revision,fileHash` | Exact prediction/snapshot document version/permission link absent; retain business/internal identifier distinction. |

All native destinations rechecked against `sidebar.tsx` and existing app pages; relevant read-client contracts inspected. Source APIs remain invoked through their original modules; no new AI backend endpoint/response/schema was invented.

Required approvals/contracts: saved prediction/run/snapshot source-link provider; original module/type/ID/version/timestamp/cutoff mappings; snapshot feature/config/model lineage; original-record permission parity and exact owner detail destination/filter handoff; relevance/link-status definitions; aggregate population/overlap/completeness; reporting/export scope. Current owner records must not overwrite historical snapshot inputs or become duplicated engineering masters. Local schema declarations do not establish deployed database state.

## Exact maintained files changed

1. `frontend/src/components/ai-related-data.tsx` — source-link UI, verified module navigation and local detail/help interactions.
2. `frontend/src/components/ai-predictions-workspace.tsx` — seventh in-place tab.
3. `frontend/scripts/run-ai-img08-tests.cjs` — source boundaries/navigation/detail regressions.
4. `frontend/scripts/run-ai-img03-tests.cjs` — authorized seventh-tab expectation.
5. `frontend/scripts/run-ai-img05-tests.cjs` — authorized seventh-tab expectation.
6. `frontend/scripts/run-ai-img06-tests.cjs` — authorized seventh-tab expectation.
7. `frontend/scripts/run-ai-img07-tests.cjs` — authorized seventh-tab expectation.
8. `AI-PREDICTIONS-IMG-08-IMPLEMENTATION-REPORT.md` — this report.

Artifacts: `tmp/ai-img08-review/`. No Neon access, schema/migrations, seeds, source duplication, DB writes or production deployment. **STOP after IMG-08.**

## Verification

| Check | Result / limits |
|---|---|
| Frontend/backend typechecks | PASS. |
| Backend emitted build | PASS; isolated output under `tmp/ai-img08-review/backend-dist`; no application startup. |
| Frontend optimized production build | PASS on final source, exit0: optimized compilation/type validation, all32 static pages and existing dynamic route. Component copies match final hashes; compiled Related Data UI checked. Isolated copy excludes environment files, disables telemetry and uses unreachable loopback API. Working build directories untouched. |
| IMG-08 regression | PASS: existing owner module destinations, no invented IDs/source links/counts, source-ownership boundary, loading/failure messaging, seven-tab navigation and earlier views retained, four source-detail sections, close/reopen and help handlers. All operational requests prohibited. |
| IMG-01–07 regressions | PASS: earlier layouts/blocked data, historical/forecast separation, exact source/feature checks,401 clearing, native CP units/ambiguity/zero rules, no demo or selected-feature-as-aggregate values, advisory recommendations, sandbox and model governance boundaries. Only authorized navigation expectations changed. |
| Backend read-only/auth regression | PASS: injected source-scoped SELECT contracts, unavailable versus empty, demo exclusion, unchanged response keys,401/authenticated routes and private/no-store headers. No storage initialization/DB connection. |
| Responsive visual checks | PASS: exact Chrome CDP widths1672/820/390px; one table; no document horizontal overflow. Full-height screenshots captured with production CSS; desktop/mobile inspected. Wide table/detail tabs scroll inside containers. |
| Preservation | PASS within352-file baseline:347 unchanged; existing changes only workspace and IMG-03/05/06/07 navigation tests. New component/test/report are additions. Backend/schema/migrations/routes/shared styles/dependencies/other modules and previous reports match baseline. |
| Operational limits | BLOCKED: no live authenticated exact-record AI source references or frozen lineage evidence. Native module catalogs are verified destinations, not verified record-level integrations. Static visuals/isolated React events do not establish hydrated live API workflows, source permissions or complete operational lineage. No source copies or synthetic relationships created. |

Review fixtures are isolated test inputs, not operational records or engineering approvals. Generated artifacts remain in `tmp/ai-img08-review/`. No Neon access, schema/migrations, seeds, DB writes or production deployment.
