# EXTERNAL CORROSION — FINAL READ-ONLY DATA VERIFICATION

17 October 2026, Asia/Calcutta. **Overall: PARTIAL source implementation; authenticated UI, database values and real-data workflows: BLOCKED.** This is the current verdict. The sections below retain the earlier audit and implementation history; any earlier claim that Overview is absent, that no dashboard consumes CP data, that master editing/new calculations are enabled, or that the removed image redesign describes the current UI is superseded by this section and the restoration section immediately following it. IMG-01–IMG-10 were used for data/label/unit/option comparisons only. No screenshot layout, card arrangement, chart style, color or sample number is a current UI requirement.

## Evidence and verification boundary

| Requirement | Current result | Evidence |
|---|---|---|
| Original Klinthru External Corrosion structure | **PASS — source comparison, 1/1 exact** | `frontend/src/app/external-corrosion-assessment/page.tsx` equals `artifacts/external-corrosion-audit/ui-before-page.tsx`, SHA-256 `9E2268B9655639023831F1D51D7FF8D9198433DE3EA44C68EE20C7C8F1572493`; redesign-only stylesheet absent. This verifies the saved original structure, not an authenticated rendered page. |
| Supplied references | **PASS — integrity, 11/11** | Recomputed SHA-256 for the complete DOCX and all ten image files equals `artifacts/external-corrosion-audit/reference-manifest.json`; full 1,002-paragraph extraction is `docx-full-text.txt`. The detailed source-to-reference field, table, option, identifier and DOCX-section inventory remains later in this report. |
| Eleven tab declarations and source dispatch | **PASS — 11/11 source; BLOCKED — 0/11 browser** | `page.tsx`:577–590, 1965–2012. Overview and ten image-corresponding tabs are present. All three browser viewports redirected to `/login`. |
| Screenshot dashboard KPI labels | **PASS — 56/56 source labels; PARTIAL — 1/56 conditional owner-summary binding; BLOCKED — 0/56 authenticated/approved values** | `phase1-coverage.json`, `page.tsx`:605–624, 764–1720. The CP binding is recorded protected-point **percentage**, not certified current engineering compliance or a point count. The other 55 values render `Not Available`. Six additional DOCX Overview labels are present; approved Overview values verified 0/6. |
| Tab tables, charts, maps, filters and controls | **PARTIAL source; BLOCKED runtime** | All 23 dashboard table-header inventories, chart/map categories and control register are documented below. Except the scoped legacy assessment register and recorded CP case list, rows/series/geometry are unavailable. An unavailable placeholder is not evidence of an empty production table. |
| Frontend typecheck, build, existing CP tests, offline EC regression | **PASS within their scope** | Re-ran `npm.cmd run typecheck` (exit 0), `npm.cmd run build` (exit 0; 32/32 static pages), `npm.cmd run test:cp` (pass), and `node artifacts/external-corrosion-audit/verify.cjs` (exit 0; 50 field declarations/58 schema models inventoried). Previous exact-source offline EC regression: 132/132 in `restore-regression.log`. None establishes source-record correctness. |
| Read-only HTTP/browser access | **BLOCKED — authenticated checks 0/33 tab×viewport; actual DB traces 0** | `phase1-browser.cjs` tried desktop 1440×1000, tablet 768×1024, mobile 390×844. Each returned `/login` with zero EC tabs. `/api/health` 200; `/api/auth/me`, `/api/pipelines`, `/api/assessments`, `/api/external-pipe-data` 401. Dedicated browser exposed zero existing local application pages. No credentials, writes, seed data or records were used. `phase1-runtime-results.json` contains the latest access results. |

The source implementation can be inspected, but it cannot prove the deployed database has any record, that a displayed historical value matches its authoritative source, that a login user has permission, or that a button succeeds after click. All such requirements remain **BLOCKED** rather than PASS. Source-level failures below are still FAIL even though runtime reproduction is blocked.

Coverage denominators are explicit: source tab presence **11/11 = 100%**; image KPI label presence **56/56 = 100%**; conditional owner-summary binding **1/56 = 1.79%**; approved authenticated image KPI values **0/56 = 0%**; approved Overview values **0/6 = 0%**; authenticated tab/viewport checks **0/33 = 0%**. These percentages measure different things and must not be added together.

## Current tab-by-tab DATA verdict

Every row maps to the detailed tab field/KPI/table/option inventories later in this report. `page.tsx` line references refer to the restored source. The image identifier names a **data reference**, not a layout target.

| Tab / data reference | Current source result | Missing or incorrect data/mapping; runtime result |
|---|---|---|
| Overview / DOCX §4 | **PARTIAL; runtime BLOCKED** | Six exact labels and navigation; legacy assessment register reads scoped `/api/assessments` with search, inspection-date range, real list count, 10/25/50 pagination and record drawer (`page.tsx`:627–750, 1837–1850). Register records are never counted as approved assessed segments. All six approved KPI values, segment/source IDs, confidence and approval/revision lineage unavailable. |
| Coating Condition / IMG-01 | **PARTIAL; runtime BLOCKED** | Six labels, km length label and table columns present (`page.tsx`:764 onward). Coating survey/indication IDs, deduplicated holidays/disbondment, source geometry, approved classification, denominators and prior survey absent. Legacy form remains read-only for new engineering calculation/save. |
| CP Effectiveness / IMG-02 | **PARTIAL with confirmed label/unit FAIL; runtime BLOCKED** | CP Monitoring `summary.protectionCoveragePercent` conditionally fills “CP Compliant Points” (`page.tsx`:605–624, 930). That percentage is **not a point count** and has no approved evaluation/freshness lineage; label/semantic contract needs correction. The six-card renderer appends `%` to **all** cards, including count-like Marginal Points, Under-protected Segments and Over-protection Exceptions (`page.tsx`:930): **FAIL unit presentation**. No live value was viewed. Owner CP case rows retain reading ID, source status, timestamp, electrode and V/mV conversion; only actual UnderProtected/Critical statuses are filter options (`page.tsx`:888–1008). Severity/segment/evaluation ID unavailable; `Rectifiers Total` is registered count, not availability. |
| Soil & Environment / IMG-03 | **PARTIAL labels/units; source mapping FAIL; runtime BLOCKED** | Ω·m, pH, %, mg/kg headers/reference bands present (`page.tsx`:1034–1118). Survey/sample/result IDs, measurement method/quality/date, lab transport, source revision, approved classification and data values absent. Threshold text is illustrative, not executed/approved criteria. |
| Interference / IMG-04 | **PARTIAL labels; source mapping FAIL; runtime BLOCKED** | AC/DC categories and chainage km label present (`page.tsx`:1142–1233). No CP interference finding IDs, mitigation/action link, source/type population or measured AC/DC series. Source alarms are not copied as EC cases. |
| Field Surveys / IMG-05 | **PARTIAL labels; workflow FAIL; runtime BLOCKED** | Eight labels, method names and coverage km present (`page.tsx`:1282–1355). No governed schedule, survey/indication/document IDs, import validation, approved finding confirmation, dates or source rows; calendar controls disabled. “Confirmed Anomalies” is not proof of a confirmed physical defect. |
| ILI Correlation / IMG-06 | **PARTIAL labels; source mapping FAIL; runtime BLOCKED** | KP km, confidence and feature/growth headings present (`page.tsx`:1379–1446). No EC–ILI correlation ID, ILI run/anomaly ID relationship, matched-finding ID, location delta, reviewed confidence or consumed ILI-owned growth. |
| Findings / IMG-07 | **PARTIAL labels; workflow FAIL; runtime BLOCKED** | Six labels and register headers present (`page.tsx`:1454–1541). No finding ID graph, source links, complete controlled statuses/severities, owner/review/closure dates, central action or reviewed Defect Manager handoff. Filters, selection, pagination and creation disabled. Finding ≠ defect remains the required boundary. |
| Alerts & Events / IMG-08 | **PARTIAL labels; workflow FAIL; runtime BLOCKED** | Six labels and register headers present (`page.tsx`:1546–1650). No derived EC alert/source IDs, rules, acknowledgment/review lifecycle, assignee, dates or real export; filters/search/pagination disabled. |
| Trends & Historical / IMG-09 | **PARTIAL labels; calculation/source FAIL; runtime BLOCKED** | Six labels, metric/unit names and period selectors present (`page.tsx`:1680–1715). No comparable approved revisions, prior-period denominators, trend points, correlation R/n or historical queries; displayed R/n remain unavailable. |
| Configuration / IMG-10 | **PARTIAL labels; persistence FAIL; runtime BLOCKED** | Rule/library/category/template/notification/preference labels and CP mV/mA/m² criteria unit note present (`page.tsx`:1725–1774). No approved rule versions, option source IDs, threshold values, saved switch state, authorization or configuration write API. Integration Hub link is a source route, not proof of a configured connector. |

## Current cross-module and calculation findings

- **PARTIAL source ownership:** Pipeline Master supplies selectable pipeline IDs (`page.tsx`:1823–1833; `apiClient.ts`:949); External form master editing is locked. CP Monitoring supplies recorded test-point summaries/cases via `fetchCpMonitoringData` (`apiClient.ts`:866; `backend/src/cpMonitoring/data.ts`:245). Generic Assessment and ExternalPipeData storage (`backend/src/routes/assessments.ts`, `routes/externalPipeData.ts`, `data/store.ts`; `prisma/schema.prisma`) hold legacy snapshots. No authenticated UI→API→DB→authoritative-source value trace completed.
- **FAIL source lineage/relationships:** The generic JSON records do not establish Segment_ID/Asset_ID, coating indication/survey IDs, CP evaluation/criterion versions, ILI correlation IDs, document versions, confidence, semantic deduplication or effective-dated EC revisions. The existing external-pipe-data unique assessment ID is request identity, not physical-condition deduplication. `DATA-01`–`DATA-08` below inventory relationship defects; Phase 1 fixed the owner/id conflict and linked inspection-date cases but did not create a governed EC record graph.
- **PARTIAL calculation safeguards:** Phase 1 corrected measured wall-loss consistency, legacy unit reload and missing-electrode handling; new External calculations and saves are gated and unsupported output values display `Not Available` (`assessment-form.tsx`, `externalCorrosionCalculations.ts`, `page.tsx`:1777–1796). Old heuristic rate/life/burst/SCC/MIC/AC/risk code still exists for compatibility; it is not an approved model or source of dashboard KPIs. Threat ≠ Risk remains unresolved in historical generic records and downstream consumers. Current authoritative measurement/model revisions and actual results are **BLOCKED**.
- **FAIL controlled options:** The EC coating dropdown’s eight-value vocabulary differs from DOCX Good/Fair/Poor/Very Poor/Unknown and from the calculator vocabulary; reference coating-type chart labels lack approved mapping to the shared coating catalog. Finding, severity, confidence, survey, interference and correlation workflow option sets are missing/disabled. The exact comparison is under “Controlled options” below. No reference sample ID, threshold or value was treated as production data.
- **PARTIAL actions:** Source-implemented tab and pipeline scope changes, Overview register filters/pagination/drawer, CP case filters/pagination/drawer, and pipeline-scoped CP/Reports navigation remain intact. Most other panel actions, GIS controls, imports, finding/alert/configuration workflows and date selectors are disabled because supported contracts are absent (`page.tsx`:731–1774). No action has authenticated end-to-end PASS. Mutating workflows were not exercised under the audit-only instruction.

DOCX §§1–51 retain individual rows below. For the **current** source, override historical FAIL on §§**2, 4, 5, 8, 31, 32, 49** to **PARTIAL**: the restored Overview, limited drawer/navigation, read-only master form, recorded CP owner data and independent CP/assessment fetch-error handling exist, while their remaining requirements above are unmet. §3 remains PARTIAL but its old “Overview absent” explanation is obsolete. The other rows retain their prior statuses. Current section-group tally: **1 PASS / 15 PARTIAL / 34 FAIL / 1 UNVERIFIED = 51**; fully verified DOCX group coverage **1/51 = 1.96%** at source level, **0/51** end-to-end authenticated. A section is a compound requirement, so this is not field-level coverage. Reference label presence 56/56 and DOCX section satisfaction must never be conflated.

**Next verification dependency:** a normal authorized login in a controllable browser with read-only access to identified owner records. Until then all eleven runtime tabs, source IDs/values/timestamps, current database contents, workflow clicks and responsive rendering are BLOCKED. Corrections involving unsupported source contracts or methods require separate approval; no code, route, schema, migration or database-record correction was made in this audit.

---

# EXTERNAL CORROSION — ORIGINAL KLINTHRU STRUCTURE RESTORED

17 October 2026, Asia/Calcutta. **RESTORED: the External Corrosion frontend page is byte for byte equal to its saved state immediately before the IMG-01–IMG-10 UI redesign.** The previous UI implementation section below is now historical and does not describe the current screen. The original Klinthru layout and Phase 1 corrections are authoritative. The DOCX and images remain references for fields, labels, units, options, calculations and source mappings only.

## Targeted restoration and evidence

Git history shows one committed version of `frontend/src/app/external-corrosion-assessment/page.tsx` (`1d2df19`, “Add Klinthru frontend”). That commit predates the approved Phase 1 changes; resetting to it would have removed those corrections. The reliable pre-redesign version was saved at `artifacts/external-corrosion-audit/ui-before-page.tsx` immediately before the IMG-01–IMG-10 implementation. `git diff --no-index` between that snapshot and the redesigned page identified a 548-line targeted difference (202 insertions, 346 deletions); the exact comparison was retained in `artifacts/external-corrosion-audit/ui-restore-targeted-diff.patch`. No broad Git reset was used.

Only the unintended UI work was reversed:

| Item | Restored result | Evidence/status |
|---|---|---|
| `frontend/src/app/external-corrosion-assessment/page.tsx` | Restored exactly from the pre-redesign snapshot. Original Phase 1 dashboard component markup, panel/card order, Tailwind classes, header, scope toolbar, 11-tab navigation, inline charts/maps/tables, filters, quick actions, and directly visible legacy assessment form on Coating Condition are back. Recent shield header, compact CSS grid, icon KPI helper, neutral map/chart redesign, moved panel toolbars, collapsible form and local footer are gone. | **PASS — source structure**. Restored page and snapshot share SHA-256 `9E2268B9655639023831F1D51D7FF8D9198433DE3EA44C68EE20C7C8F1572493`. |
| `frontend/src/app/external-corrosion-assessment/external-corrosion.css` | Removed the stylesheet created only for the unapproved image-layout implementation; the restored page has no import or dependency on it. | **PASS — removed unintended styling**. File absent; source search finds no `ec-workspace`, `ec-dashboard`, `KpiCards`, `UnavailableMap`, `ec-panel-tools` or recent layout markers. |
| Shared Klinthru chrome and domain files | No restoration edits to shared shell/sidebar, global styling, API client, calculation library, backend store/app or schema. | **PASS — sampled preservation**: 7/7 pre-redesign file hashes unchanged; see `artifacts/external-corrosion-audit/restore-preservation-results.json`. |
| Other pre-existing repository work | Left untouched, including other users’ dirty files, routes, schema and migrations. | **PASS — targeted change scope**. No database connection, migration, seed, API write, record deletion or broad checkout/reset was used. |

The earlier isolated browser screenshots `ui-{desktop,tablet,mobile}-*.png` depict the removed redesign and **must not be used as evidence of the current UI**. The current UI structure was verified against the actual pre-redesign source snapshot through byte equality. An authenticated current UI comparison remains **BLOCKED** by the previously observed `/login` redirect; no visual runtime PASS is claimed.

## Phase 1 functionality preserved

- **PASS — source inventory:** all 11 tabs, all 56 dashboard KPI labels and all six DOCX Overview labels remain. `phase1-coverage.cjs` counted 56/56 labels and the same one conditional CP Monitoring owner-summary path. Source inventory is distinct from real-data coverage.
- **PASS — source behavior:** the dedicated Overview assessment register, pipeline/tab URL scope, existing CP case search/status/pagination/details, assessment history modal, Reports and CP Monitoring navigation, legacy assessment loading, guarded external calculations and owner data protections are in the restored snapshot. The form and its original placement are intact.
- **PASS — regression:** 132/132 offline External Corrosion checks passed, including unit conversion, date, measured-loss and CP status guards; existing CP calculation suite passed. Their test scope remains offline/current-source only.
- **PASS — sampled ownership:** the existing frontend calculation library, API client, backend store/app and schema retain their hashes from before the image-layout work. Pipeline/Asset Master, CP Monitoring, ILI Analysis and other owner boundaries were not edited by this restoration.
- **PARTIAL — data:** one conditional recorded CP summary binding exists for `CP Compliant Points`; it is not a verified current/approved engineering compliance value. The other 55 dashboard KPIs and all six approved Overview values still lack governed authoritative contracts. Missing data is shown as `Not Available`; screenshot sample values were not copied.
- **BLOCKED — authenticated verification:** no authorized application session or populated owner data was available in the prior browser attempt (three viewport requests redirected to `/login`; protected APIs returned 401). Real KPI values, live controls, maps, charts and end-to-end workflows are not certified here.

## Verification after restoration

| Check | Outcome | Evidence |
|---|---|---|
| Exact comparison to the pre-redesign page | **PASS — 1/1 byte-identical** | Pre-image snapshot and current page SHA-256 above; `ui-restore-targeted-diff.patch` records the reversed difference. |
| Restored tab/KPI/Overview label inventory | **PASS — 11/11, 56/56, 6/6 labels** | `artifacts/external-corrosion-audit/phase1-coverage.json`; this measures source presence only. |
| Sampled shared/domain file preservation | **PASS — 7/7 unchanged** | `artifacts/external-corrosion-audit/restore-preservation-results.json`. |
| Frontend typecheck | **PASS — exit 0** | `artifacts/external-corrosion-audit/restore-typecheck.log`. |
| Frontend production build | **PASS — exit 0** | `artifacts/external-corrosion-audit/restore-build.log`. |
| Existing CP tests | **PASS** | `artifacts/external-corrosion-audit/restore-cp-tests.log`. |
| Offline External Corrosion regressions | **PASS — 132/132** | `artifacts/external-corrosion-audit/restore-regression.log`. |
| Authenticated original-layout and real-data checks | **BLOCKED — 0 verified** | Existing read-only `phase1-runtime-results.json`; no authenticated session. |

The data, mapping and contract gaps detailed later in this report still apply. Layouts, charts, map designs and colors from the ten images are no longer implementation targets. Any future correction should modify only a verified field, label, option, unit, calculation or source binding inside the restored Klinthru structure.

---


# EXTERNAL CORROSION — FRONTEND UI IMPLEMENTATION UPDATE

17 October 2026, Asia/Calcutta. **Actual frontend changes implemented across all 11 tabs. Overall: PARTIAL visual implementation; authenticated application visual acceptance and real-data verification: BLOCKED.** This section supersedes earlier UI-layout findings and source line numbers. The Phase 1 and original audit remain below as historical evidence. No claim of exact pixel parity or 100% completion is made.

## Scope and reference evidence

The entire supplied DOCX was read through its 1,002-paragraph extraction, and IMG-01 through IMG-10 were visually inspected. The inputs and SHA-256 fingerprints are recorded in `artifacts/external-corrosion-audit/reference-manifest.json`; the DOCX extraction is `artifacts/external-corrosion-audit/docx-full-text.txt`. There is no supplied Overview screenshot. Its six labels/destinations follow the DOCX. The existing assessment register remains explicitly identified as legacy history, not approved segment assessment coverage.

This implementation changes only two application files:

- `frontend/src/app/external-corrosion-assessment/page.tsx`: reference-shaped panel composition, reusable icon KPI rendering, existing chart helpers replaced with empty chart-family presentations, empty map controls and legends, survey calendar, panel-header controls, compact header/footer, and collapsible legacy assessment form. Existing APIs, scope selection, source navigation, filters, pagination and detail drawers are retained. The recorded CP percentage now includes its `%` unit.
- `frontend/src/app/external-corrosion-assessment/external-corrosion.css`: styles scoped to `.ec-workspace`; reference blue tabs/buttons, green module icon, compact typography and borders, six/eight-card rows, chart/map/table/quick-action styling, tab-specific desktop grids and responsive tablet/mobile layouts. No shared stylesheet or shared chrome changes.

Supporting audit scripts, logs, HTML and browser screenshots are in the existing `artifacts/external-corrosion-audit/` directory. No application folders, routes, API contracts, backend logic, schema, migrations or database records were added/modified in this UI implementation. Existing local changes from before this task are not claimed as this implementation's changes.

## Image-wise visual implementation

Every row below is **PARTIAL**, with browser evidence for **isolated empty-state components**. Authenticated integrated visual acceptance is **BLOCKED** for every image. Screenshots use actual current presentation functions, actual React/lucide, actual Tailwind configuration, global styles and the new scoped stylesheet. They contain no sample records, mock API responses or fabricated authentication. The isolated wrapper reserves desktop space for chrome; it does not render or certify the application shell. It does not hydrate/test application interactions.

| Image | Implemented reference composition | Browser evidence (desktop; matching tablet/mobile files also exist) | Remaining visual/data gap |
|---|---|---|---|
| IMG-01 Coating Condition | Six icon KPI cards; map / stacked-segment plot / distribution donut; findings and inspection tables; coating-type donut / deteriorated-area table / 2×2 quick actions. Legacy form collapsed beneath dashboard, opens for a loaded record. | `artifacts/external-corrosion-audit/ui-desktop-01.png` | Verified map geometry, assessment totals, coating series and findings unavailable. Empty tables cannot reproduce populated row heights/badges. |
| IMG-02 CP Effectiveness | Six cards; map / line-series frame / segment donut; cases table left of correlation scatter frame; summary / five-icon performance strip / quick actions. Existing recorded CP case controls retained. | `artifacts/external-corrosion-audit/ui-desktop-02.png` | Only the existing recorded CP summary/cases/rectifier count paths are supported; approved segment compliance, time series, correlation and uptime remain unavailable. Actual owner data not accessed. |
| IMG-03 Soil & Environment | Six cards; map spanning two chart rows; resistivity, pH, moisture and chloride bar-chart frames; two tables; assessment summary / insights / quick actions. Colored map legend includes reference units. | `artifacts/external-corrosion-audit/ui-desktop-03.png` | Field/lab geometry and measurements absent. Reference classification bands are presentation labels, not approved or executed engineering rules. |
| IMG-04 Interference | Six cards; map / AC-versus-DC chart frame / severity donut; findings table left of mitigation donut; insights / ranked sources / quick actions. | `artifacts/external-corrosion-audit/ui-desktop-04.png` | Interference records, severity, mitigation and source totals unavailable; no invented AC/DC measurements or case IDs. |
| IMG-05 Field Surveys | Eight cards; route map / calendar plus upcoming-survey register / method chart plus severity donut; latest-survey table / stacked-trend frame / quick actions. | `artifacts/external-corrosion-audit/ui-desktop-05.png` | No schedule dates, survey records, imports or coverage series available. Calendar month/navigation remain unavailable/disabled; screenshot month/dates are not copied. |
| IMG-06 ILI Correlation | Six cards; map / correlation donut / horizontal feature-chart frame; correlation register left of grouped growth frame and quick actions. | `artifacts/external-corrosion-audit/ui-desktop-06.png` | No governed External Corrosion↔ILI finding-link or approved growth-comparison contract. ILI source data is not copied into EC. |
| IMG-07 Findings | Six cards; broad register with existing filters/search moved into header; severity donut above status plot on right; recent activity and quick actions below. | `artifacts/external-corrosion-audit/ui-desktop-07.png` | Finding records, confidence, assignment and defect-handoff workflows unavailable; controls disabled. Finding and confirmed defect remain separate. |
| IMG-08 Alerts & Events | Six cards; combined trend frame / source donut / severity chart; filter bar; register with search/export in header; vertical quick actions. | `artifacts/external-corrosion-audit/ui-desktop-08.png` | No EC alert records, assignees or acknowledgement/action API; source alarms remain with source modules. |
| IMG-09 Trends & Historical | Six cards; scope/date controls; coating line / CP stacked / interference line frames; assessment history / historical scatter frame / quick actions; observations register. Legend colors follow each supplied series definition. | `artifacts/external-corrosion-audit/ui-desktop-09.png` | No verified historical series, trend denominators, periods or correlation coefficients; no fabricated years, points, trend arrows or coefficients. |
| IMG-10 Configuration | Module/integration summary row and nine numbered rule/library/notification/preferences cards in three desktop columns; existing Integration Hub link retained; tables, unknown-state switches, selects and role area styled. | `artifacts/external-corrosion-audit/ui-desktop-10.png` | Configuration records and save APIs unavailable. No sample thresholds, recipients, active states or permissions are asserted. DOCX ownership takes precedence over reference “Risk” labels: threat terminology remains. |
| Overview (DOCX; no image) | Six icon navigation cards plus existing scoped assessment register, search/date filters, pagination and details. | `artifacts/external-corrosion-audit/ui-desktop-00.png` | Six approved segment/assessment/threat/confidence indicators unavailable. No image-based exact visual verdict is applicable. |

Common implemented elements: green shield title block, pale-blue 11-tab strip with active underline, compact blue controls, navy panel headings, light-blue table headers, bounded horizontal table scrolling, colored legend markers, consistent unavailable values, map-control chrome, paired icon quick actions and local footer. Existing sidebar, application branding, notifications, theme control, header and navigation files remain unchanged. Their appearance differs from the supplied concept chrome and is deliberately preserved as requested. A real pipeline/source toolbar remains visible; it is necessary to retain existing source-scoped workflows even though the reference concepts do not show that toolbar.

## Browser verification boundaries and corrected defects

`ui-render-check.cjs` extracts the current presentation functions and existing header/nav/scope/footer JSX from the application source; no parallel application UI or duplicate production component is maintained. It renders them through React with `pipeline: null`, `cp: null` and no records. Source SHA-256 is in `ui-render-results.json`. All network requests are blocked; the final run made **0 network requests** and reported **0 page errors**. The wrapper's unhydrated callbacks are not counted as functional workflow verification.

Chrome screenshots were generated at desktop **1672×941**, tablet **768×1024**, and mobile **390×844**. Assertions cover all 11 tab buttons, KPI counts/columns, presence and bounds of panels, unavailable states, document width and KPI overflow. Ten desktop image-specific relational checks verify reference panel order/placement (including the two-row soil map, Field Survey right-hand result summary and the left-hand ILI register). These are layout relation checks, not pixel-difference comparisons or populated-chart certification.

Confirmed browser mismatches corrected during this implementation:

- CP System Performance overflowed the tablet viewport by 1px and its five unavailable values overlapped; cards now have bounded columns, smaller unavailable text and icons.
- A broad SVG selector enlarged the chart-empty icon; it now sizes only the grid SVG and keeps the empty icon at 22px.
- Soil map/four chart arrangement was originally wrong; the map now spans the two compact chart rows.
- Survey summary originally appeared below the map; it now sits on the right, with method plot above severity donut, and the lower register/trend/actions aligned.
- ILI register/growth placement, CP case/scatter placement, and interference findings/mitigation ordering corrected to the supplied reference.
- Configuration tablet cards inherited desktop spans; they now use the tablet grid and stack on mobile.
- Findings filters and Alerts search moved, rather than duplicated, into their reference panel headers.

Actual application checks used read-only `phase1-browser.cjs` against `http://localhost:4000/external-corrosion-assessment` at **1440×1000**, **768×1024**, and **390×844**. All three reached `/login`, with 0 visible EC tabs. CDP port 9334 exposed 0 existing local application pages. No authentication bypass or credential/token extraction was attempted. API health at port4002 returned 200; `/api/auth/me`, `/api/pipelines`, `/api/assessments` and `/api/external-pipe-data` returned 401. These are authentication-boundary observations, not passing data/API-contract tests. Evidence: `phase1-runtime-results.json` and `phase1-{desktop,tablet,mobile}-access.png`.

## Actual bounded coverage and test results

| Measure | Verified numerator / denominator | Result and limit |
|---|---|---|
| Existing tabs rendered in isolated browser | 11/11 | 100% tab presence only; not full requirement coverage |
| Screenshot-tab KPI labels rendered | 56/56 | 100% label/card presence only; no screenshot business numbers copied |
| Additional DOCX Overview labels rendered | 6/6 | 100% label presence; values unavailable |
| Reference panel arrangement relations checked | 10/10 images | 100% of the ten specified bounded relation checks; no exact pixel-parity claim |
| Isolated responsive render checks | 33/33 | PASS for bounded presentation assertions; 11 tabs × 3 viewports |
| Authenticated tab/viewport verification | 0/33 | 0%; BLOCKED by login (actual attempts at three viewports) |
| Authenticated image visual acceptance | 0/10 | 0%; BLOCKED; every image remains PARTIAL overall |
| Dashboard owner-summary source bindings | 1/56 | 1.79%; recorded CP percentage only, conditional on existing source guards |
| Approved/current dashboard KPIs verified end-to-end | 0/56 | 0%; 55 lack governed contracts and the recorded CP path is not certified approved/current compliance |
| Approved Overview KPI values verified | 0/6 | 0%; source data/contracts unavailable |
| Protected sampled file hashes unchanged in UI task | 7/7 | PASS; shell, sidebar, API client, calculation library, backend store/app and schema — see `ui-preservation-results.json` |
| Frontend `npm.cmd run typecheck` | exit0 | PASS; `ui-typecheck.log` |
| Frontend `npm.cmd run build` | exit0; 32/32 pages generated | PASS; final source compiled, type/lint validation and build traces completed. `ui-build.log` |
| Existing `npm.cmd run test:cp` | exit0 | PASS: “CP calculation tests passed.” |
| Existing offline External Corrosion regression checks | 132/132 | PASS; actual current-source arithmetic/mapping guards only, not real-data certification |

The 33 isolated renders contain 77 panel nodes per complete set of tabs (76 across the image tabs plus the Overview register, including nested Field Survey chart panels). This is a count of the current DOM, not an additional reference-requirement denominator. No total pixel-match or full DOCX completion percentage can be supported from these checks. Earlier 51 DOCX section-group and atomic requirement results remain historical; their end-to-end blockers are not resolved by styling.

## Preserved workflows and remaining blockers

- **PASS — source preservation:** existing pipeline selection/refresh, tab URLs, Overview filter/reset/pagination/details, CP case filter/reset/pagination/details, CP Monitoring navigation, Reports navigation, history modal and loaded legacy assessment form remain in the same page/components. No business calculation was changed by the UI work; only the existing recorded percentage's display unit was added. Their authenticated execution is **BLOCKED**, not reported PASS.
- **PASS — safe unavailable presentation:** missing KPI values and deltas remain `Not Available`; empty plots do not draw sample bars, points, slopes, slice proportions, annotations or numeric axes. A neutral ring indicates absence rather than a zero/100% distribution. Maps show a neutral empty canvas rather than invented imagery, routes or locations. Numeric category bands are reference labels and do not execute a classification.
- **PARTIAL — exact visual parity:** icon artwork is the installed lucide icon set, not the reference's filled/illustrated artwork. Empty-state row heights/plot annotations/map detail and status badges differ naturally from populated concepts. Shared shell/branding are retained. Typography/spacing have bounded isolated browser evidence; integrated shell, populated rows, live drawers and dark-mode parity remain **UNVERIFIED/BLOCKED**.
- **BLOCKED — APPROVAL NEEDED:** governed sources/APIs for approved assessment coverage, coating/soil/interference/survey interpretations, findings, EC alerts, historical series, confidence, revisions, stale-data policy and configuration save workflows. No missing API or field was invented. These require separately approved domain/backend work and owner contracts.
- **BLOCKED:** authenticated populated UI comparisons and every supported-control end-to-end check require an available authorized session and actual owner records. This UI implementation does not request or fabricate production/staging data.
- **BLOCKED — APPROVAL NEEDED:** new assessments, GIS actions/layers, survey import/validation, finding creation/defect handoff, alert acknowledgement/actions, historical exports and configuration edits without existing verified contracts remain disabled. Existing supported source/register actions retain their handlers.

Review the image-wise screenshots and `ui-render-results.json` for the implemented frontend. Application visual acceptance and production-data accuracy remain open; this work must not be described as 100% complete.

---


# FINAL EXTERNAL CORROSION AUDIT — PHASE 1 UPDATE

17 October 2026 (Asia/Calcutta). **Overall: PARTIAL implementation; BLOCKED authenticated UI and real-data verification. Phase 1 is not fully complete.** This update supersedes the corresponding baseline findings below. The baseline remains historical evidence, including its former no-code-changes statement and old line numbers.

The user approved safe Phase 1 code corrections while explicitly prohibiting new architecture, folders, routes, schema, migrations, invented APIs/fields and production/staging data changes. Five existing source files were edited. Audit scripts/evidence use the existing audit artifact folder. No application records, seed data, API write requests, environment changes, deployments, database connections or migrations were created/executed by this work. Local typecheck/build outputs were generated normally. No authenticated session was fabricated, and no user credentials or storage tokens were read/injected.

## Phase 1 request disposition

| Requested correction | Current result | Status |
|---|---|---|
| Restore Overview according to DOCX | Dedicated Overview now opens by default. All six DOCX KPI labels exist; supported destination tabs open, assessment coverage opens its register, and unavailable confidence details stay disabled. A separate legacy assessment register reads the existing assessment API; it is explicitly not approved segment coverage. | PARTIAL — structure/source wiring implemented; six approved Overview values BLOCKED |
| Bind all 56 dashboard KPIs to authoritative data | One conditional **recorded owner-summary** binding exists for CP Compliant Points. It reads the existing CP Monitoring percentage without local reclassification. It is not certified current compliance. The other55 require unavailable domain records/contracts and remain Not Available. | PARTIAL for1 recorded source path; **55 BLOCKED — APPROVAL NEEDED**;0 approved/current KPI values verified |
| Fix buttons, filters, navigation and pagination | Existing tab URLs preserve pipeline/tab scope. Overview and recorded CP case lists have real search/date-or-status filters, reset, bounded pagination, page-size controls and detail drawers. History has scoped filtering, real pagination and request-race protection. CP navigation preserves pipeline; Export opens existing Reports for actual review/export. | PARTIAL — source implementation; authenticated actions BLOCKED; unsupported workflow actions remain disabled |
| Correct verified mapping/calculation/unit defects | OD/pressure/wall/temperature reload conversions fixed, missing inspection dates remain missing, linked inspection date read uses existing Assessment, measured loss agrees with percent loss, unsupported CP electrode/status derivation withheld, external OD no longer falls back to inside diameter. | PASS for the offline checks specified below; PARTIAL overall — engineering method acceptance remains blocked |
| Preserve all11 tabs/design | All11 labels, dedicated tab bodies, original56 KPI labels and existing panel/table/chart styling retained. Overview, scope controls and source-record controls added using existing visual conventions. Shared shell, route paths and stylesheet untouched. | PASS source preservation; layout/interactive parity BLOCKED |
| No fake/mock/demo/hardcoded business values | No demonstration fixture or sample business record is bound to the UI. Legacy prototype outputs are withheld. Unsupported values remain Not Available. Zero appears only where an existing owner response establishes a recorded zero. | PASS source check; actual records BLOCKED |
| Preserve ownership and lineage | Source pipeline, point/reading IDs, measurement/electrode, timestamps and recorded status are carried into source details; CP remains read-only. Master editing removed from this EC form. UI does not manufacture source/evaluation/confidence IDs or substitute findings/segments with generic assessment counts. | PARTIAL — governed quality/evaluation/revision contracts missing |

## Actual bounded coverage

| Measure | Verified count | Percentage / limit |
|---|---:|---|
| Requested tab labels and dedicated bodies in source | 11/11 | Source structure only; no end-to-end completion claim |
| DOCX Overview KPI labels | 6/6 | Six approved values remain unavailable |
| Original dashboard KPI labels preserved | 56/56 | Label presence is not data binding |
| Existing recorded-owner-summary source binding | 1/56 | **1.79% conditional source-path coverage**, not current approved compliance or verified production data |
| Other KPI source contracts unsupported | 55/56 | **98.21% BLOCKED — APPROVAL NEEDED** under the no-new-API/field/schema rules |
| Current approved KPIs verified against authoritative records | 0/56 | **0%**; even the recorded CP binding lacks approved-evaluation/freshness lineage from the current API |
| Authenticated requested-tab × viewport checks | 0/33 | **0%**, all blocked by login; includes Overview |
| Authenticated original-image comparisons | 0/30 | **0%**, ten image tabs × three viewports |
| Offline regression checks | 132/132 | All pass; covers120 unit combinations plus12 date/CP/mapping checks; not business-data certification |
| Typechecks/builds | 4/4 | Frontend/backend typechecks and builds pass, exit0 |
| Existing CP calculation suite | 1/1 suite | Pass; compatibility check, not an EC methodology approval |
| Database/source datasets reconciled end-to-end | 0 | BLOCKED; accessible verified dataset/population denominator unknown |

No aggregate completion percentage is defensible. The exact56-row source/blocker inventory is included below and preserved in [phase1-kpi-coverage.md](artifacts/external-corrosion-audit/phase1-kpi-coverage.md) and [phase1-coverage.json](artifacts/external-corrosion-audit/phase1-coverage.json).

## Implemented corrections and evidence

| Finding / correction | Exact current source evidence | Verification / remaining limit |
|---|---|---|
| Overview and existing assessment register restored | `frontend/src/app/external-corrosion-assessment/page.tsx`:627; default Overview and explicit dispatch near:1800/1984 | Source implements search, real inspection-date range, reset, record counts/page sizes and read-only record drawer. Author/approval/revision information absent from frontend contract stays unavailable. It does not count assessments as segments. Browser BLOCKED |
| Recorded CP percentage binding | Same page:605–624 and:1837 → existing `fetchCpMonitoringData` → GET `/api/cp-monitoring/:pipelineId` → `backend/src/cpMonitoring/data.ts`:summary.protectionCoveragePercent | Checks matching pipeline, connected source, nonzero denominator, count consistency, reading IDs/timestamps, finite percentage and owner rounding. Zero retained when established by source. This is recorded protection coverage, not a new EC compliance calculation |
| CP source cases, units and lineage | Same page:888 onward | Reads existing CP testPoints; preserves reading IDs/status/electrode/timestamps, converts known mV→V only when valueV missing, leaves severity/segment/evaluation/confidence unavailable. Filters only existing UnderProtected/Critical source statuses; no invented Marginal/OverProtected classifications. CP Monitoring opens at same pipeline, but reading-specific deep link is unsupported |
| Supplemental registered rectifier total | Same page CP System Performance | Reads existing `summary.rectifierCount` only with source availability and valid count. This is outside the56 cards. Registered count is not substituted for rectifier availability, uptime or output |
| CALC-08 unit reload/double normalization | `frontend/src/lib/externalCorrosionCalculations.ts`:7; `frontend/src/components/assessment-form.tsx`:643 | Existing display metadata restored before derivation; older canonical scalars without display metadata converted back to selected units. All120 OD×pressure×wall×temperature combinations pass save→load→normalize checks, including legacy metadata absence and nonmutation |
| Canonical master units and correct OD mapping | Shared form populatePipelineFields/getPipelineMasterDisplayValue | Fallback canonical pressure/wall values are converted to selected display units; missing outside diameter no longer borrows inside diameter for External. Actual master records BLOCKED |
| CALC-05 measured metal loss consistency | `externalCorrosionCalculations.ts`:319 | For nominal10mm/measured8mm arithmetic input, depth2mm and percent20 agree. Existing fallback/prototype model remains unapproved and cannot be run/saved through this workspace |
| CALC-01 missing/unknown CP electrode | Same calculation library:64; page deriveValues | Blank/nonfinite/incomplete/unknown electrode input cannot be called Protected. The page no longer derives CP compliance/status from legacy manual potentials. Governed evaluation source remains required |
| Missing date must not become today | Shared form:192 | Missing historical inspection date restores blank rather than fabricating the current date; offline regression passes |
| DATA-04 existing linked inspection date retained | `backend/src/data/store.ts`:2514–2538 | Reads inspectionDate from an existing owner-accessible Assessment only when assessment ID, pipeline/type and author agree with history. No schema/JSON field added. Independent history without a matching assessment remains without inspectionDate. Actual DB behavior BLOCKED |
| DATA-05 existing-ID owner/pipeline/type guard | Store:663/2227 | Memory and Prisma createAssessment branches reject conflicting existing identity before returning another record. Same-owner changed-payload/revision semantics remain unresolved; not claimed fully fixed. HTTP/actual DB checks BLOCKED |
| History filtering/pagination and stale-response protection | `frontend/src/components/external-pipe-history-modal.tsx`:76–180/410–414 | Uses existing optional pipelineId query; clears old rows/details during refresh/errors, ignores superseded search/detail responses and after-close responses, uses actual result count for pagination. Existing downloads preserved; authenticated verification BLOCKED |
| Temperature preview glyph/value correction | History modal:40–49 | Uses valid degree symbols and restored external temperature display metadata; nonfinite values unavailable. Internal source contract preserved |
| Unsafe prototype outputs / official risk presentation | Page renderMetrics:1777; shared form build guard:1368 and result/action rendering:2207 onward | New External calculations and pipe-data saves disabled and guarded until approved methodology/source lineage exists. Legacy engineering outputs and official-risk presentation are Not Available. Existing records remain accessible read-only; stored data was not rewritten |
| Read-only master ownership | Shared form isPipelineMasterLocked:779, scopePipeline controls | External form cannot edit/save Pipeline Master. Existing owner route remains unchanged. Internal form retains its existing behavior; shared unit corrections are covered by build/compatibility checks |

The source corrections above do not certify the existing empirical rate, life, burst-pressure, SCC/MIC/AC equations. CALC-02/03/04/06/07/09/11/12/13/14 remain wholly or partly **BLOCKED — APPROVAL NEEDED** for approved methods, controlled options, source quality/freshness and downstream contracts. No replacement coefficients, confidence formulas, stale-age thresholds or approved classifications were invented. The legacy calculation library remains for compatibility; the EC workspace gates its execution/persistence. This is not a new server-wide methodology enforcement contract.

## IMG-01–IMG-10 after Phase 1

| Reference | Source changes in this phase | Current comparison status |
|---|---|---|
| IMG-01 Coating Condition | Original six labels/layout retained; screenshot sample-denominator commentary removed; legacy outputs/master edits/new calculations gated; no governed coating source available | PARTIAL; visual/authenticated comparison BLOCKED |
| IMG-02 CP Effectiveness | Recorded owner-summary percentage, source case rows, search/status/reset/pagination/drawer/CP navigation and registered total added; other five KPIs unavailable | PARTIAL; actual values, approved/current classification and layout parity BLOCKED |
| IMG-03 Soil & Environment | Original six labels/frames retained; no raw lab result or confidence invented | BLOCKED — APPROVAL NEEDED for governed sources; visual comparison BLOCKED |
| IMG-04 Interference | Original six labels/frames retained; CP point stray-current readings are not rebranded as EC interference-assessment counts | BLOCKED — APPROVAL NEEDED; visual comparison BLOCKED |
| IMG-05 Field Surveys | Original eight labels/frames retained; CP survey records not substituted for EC field survey/confirmed anomaly populations | BLOCKED — APPROVAL NEEDED; visual comparison BLOCKED |
| IMG-06 ILI Correlation | Original six labels/frames retained; raw ILI anomaly totals not substituted for matched/unverified EC correlation records | BLOCKED — APPROVAL NEEDED; visual comparison BLOCKED |
| IMG-07 Findings | Original six labels/frames retained; legacy assessments not presented as findings or defects | BLOCKED — APPROVAL NEEDED; visual comparison BLOCKED |
| IMG-08 Alerts & Events | Original six labels/frames retained; raw CP/SCADA alarms not copied as derived EC alerts | BLOCKED — APPROVAL NEEDED; visual comparison BLOCKED |
| IMG-09 Trends & Historical | Original six labels/frames retained; no unapproved trend/rate/confidence/regression values | BLOCKED — APPROVAL NEEDED; visual comparison BLOCKED |
| IMG-10 Configuration | Existing sections retained, Integration Hub owner link preserved; no fabricated saved settings, options, active states or credentials | BLOCKED — APPROVAL NEEDED for persisted configuration; visual comparison BLOCKED |

Overview has no supplied image; its source structure is now PARTIAL rather than missing. The original ten images and DOCX inspected in the baseline remain governing references. No screenshot sample dates/IDs/counts were seeded.

## Remaining requirements: BLOCKED — APPROVAL NEEDED

- **55 unsupported KPI bindings:** per-row list below. Existing APIs do not provide approved coating/segment assessment coverage, holidays/disbondment/surveyed lengths, Marginal/OverProtection operational evaluations, uptime, EC confidence, environmental/interference assessment populations, field survey workflows, EC ILI correlations, finding/defect/action/alert lifecycles, or effective-dated historical EC indicators. Scope changes must first supply approved existing contracts; they cannot be invented here.
- **Recorded CP KPI itself:** current approved compliance, source evaluation ID, quality, validity and governed freshness classification are missing from the current response. Reading timestamp is displayed, never interpreted using an invented stale window. Confidence remains unavailable.
- **Six Overview values:** no approved segment/indicator/confidence contract. Generic saved assessment counts cannot fill these values.
- **Unsupported workflows:** coating/soil/interference survey creation, field import/validation/preview/quarantine/accept, confirmed finding/defect correlation, action creation, alert acknowledgement and configuration saves remain disabled. No new API, action register, model or table is created. Filters/pagination over nonexistent finding/alert/history datasets remain unavailable.
- **GIS and full-record deep links:** existing targets do not accept the required geometry/layer/reading/anomaly record context. CP pipeline navigation and Reports pipeline navigation work in source; this is not exact linked-record navigation. No fake GIS route or unsupported query fields are introduced.
- **Engineering methods and revisions:** accepted rate/life/burst/SCC/MIC/AC models, controlled option mappings, source/effective revisions, confidence and physical-condition deduplication require approved contracts. New assessment execution stays blocked; no engineering record is created or historical result overwritten.
- **Official risk/downstream history:** the existing generic Assessment/Report fields and other modules still contain legacy risk terminology/data. No schema migration or rewrite of stored production/staging records was authorized. Suppressing new unsupported EC outputs is not a certification of downstream Risk/AI/ECDA behavior.
- **Database/authenticated verification:** no accessible normal-login session and no verified isolated data target were supplied. No source-record identity, counts, timestamps, permissions, layouts, downloads or mutating workflows receive end-to-end PASS.

Approval of Phase 1 did not authorize new schema/routes/fields. These remaining items require an explicit expanded scope and approved source/method contracts, not another assumption about the existing APIs.

## Executed current checks

| Check | Actual result / evidence |
|---|---|
| Frontend typecheck | PASS exit0 — [log](artifacts/external-corrosion-audit/phase1-frontend-typecheck.log) |
| Backend typecheck | PASS exit0 — [log](artifacts/external-corrosion-audit/phase1-backend-typecheck.log) |
| Frontend production build | PASS exit0,32 static pages generated — [log](artifacts/external-corrosion-audit/phase1-frontend-build.log) |
| Backend build | PASS exit0 — [log](artifacts/external-corrosion-audit/phase1-backend-build.log) |
| Offline regression | PASS132/132 — [results](artifacts/external-corrosion-audit/phase1-regression-results.json), [harness](artifacts/external-corrosion-audit/phase1-regression.cjs) |
| Existing CP tests | PASS — [log](artifacts/external-corrosion-audit/phase1-cp-tests.log) |
| Anonymous API checks | Health200; auth/me, pipelines, assessments and external-pipe-data401. PASS for transport/auth boundary only; missing token rejects before DB/user query — [results](artifacts/external-corrosion-audit/phase1-runtime-results.json) |
| Dedicated browser access | BLOCKED;9334 exposes zero local application pages. No credentials/profile tokens inspected |
| Desktop/tablet/mobile | All redirect to login;0 tabs visible; no authenticated tab or real-data test executed. No write requests occurred. [desktop](artifacts/external-corrosion-audit/phase1-desktop-access.png), [tablet](artifacts/external-corrosion-audit/phase1-tablet-access.png), [mobile](artifacts/external-corrosion-audit/phase1-mobile-access.png) |
| Route/client/schema preservation | Compared unchanged hashes for existing API client, assessment/history routes, validation contract and Prisma schema — [evidence](artifacts/external-corrosion-audit/phase1-preservation.json). Source file hashes for five edited files are in coverage JSON |
| Real-data and mutating action verification | BLOCKED. No data access/authentication bypass, fixture injection, seed, login, save, import, acknowledgement, delete, deployment or migration performed |

Initial typechecks exposed two implementation errors (an unsupported frontend authorId access and a nullable linked-assessment check); both were corrected and subsequent typechecks/builds passed. No initial failed check is being reported as a final pass without a rerun. An approved build does not prove backend running-code freshness, database readiness, source authority or rendered layout parity.

The required next verification is a user-completed normal login in a controllable dedicated browser and an identified authorized source-data target. Read-only scope must remain enforced; write-workflow testing requires a separately approved disposable test target. No completion claim is made pending those checks.

## All 56 KPI source dispositions


| Tab | KPI | Status | Existing source / blocker |
|---|---|---|---|
| Coating Condition | Good Condition | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Coating Condition | Fair Condition | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Coating Condition | Poor Condition | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Coating Condition | Coating Holidays | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Coating Condition | Disbondment Indications | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Coating Condition | Surveyed Length | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| CP Effectiveness | CP Compliant Points | PARTIAL — recorded owner summary binding; current approved compliance BLOCKED | GET /api/cp-monitoring/:pipelineId → summary.protectionCoveragePercent; reading IDs/timestamps and denominator checked |
| CP Effectiveness | Marginal Points | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| CP Effectiveness | Under-protected Segments | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| CP Effectiveness | Over-protection Exceptions | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| CP Effectiveness | Rectifier Availability | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| CP Effectiveness | Data Confidence | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Soil & Environment | Soil Resistivity Zones | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Soil & Environment | Corrosive Areas | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Soil & Environment | Moisture Hotspots | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Soil & Environment | Stray Current Exposure | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Soil & Environment | Drainage Concerns | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Soil & Environment | Data Confidence | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Interference | Interference Locations | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Interference | Active Cases | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Interference | Critical Hotspots | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Interference | Mitigated Sites | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Interference | Pending Review | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Interference | Data Confidence | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Field Surveys | Surveys Completed | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Field Surveys | Open Surveys | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Field Surveys | CIPS Surveys | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Field Surveys | Close Interval (DCVG) | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Field Surveys | ACVG Surveys | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Field Surveys | Overdue Surveys | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Field Surveys | Confirmed Anomalies | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Field Surveys | Data Confidence | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| ILI Correlation | Correlated Anomalies | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| ILI Correlation | Unverified Anomalies | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| ILI Correlation | Matched Excavations | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| ILI Correlation | Growth Cases | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| ILI Correlation | Correlation Confidence | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| ILI Correlation | Pending Reviews | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Findings | Open Findings | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Findings | High Severity | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Findings | Under Review | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Findings | Action Required | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Findings | Linked to Defects | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Findings | Avg. Closure Time | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Alerts & Events | Open Alerts | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Alerts & Events | Critical Alerts | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Alerts & Events | Acknowledged | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Alerts & Events | Overdue Reviews | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Alerts & Events | Recently Resolved | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Alerts & Events | Alert Data Confidence | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Trends & Historical | Overall Corrosion Trend | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Trends & Historical | Segments Deteriorating | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Trends & Historical | Segments Improving | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Trends & Historical | Historical Surveys | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Trends & Historical | Long-term CP Correlation | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |
| Trends & Historical | Data Confidence | BLOCKED — APPROVAL NEEDED | No existing governed API/field for this KPI; Not Available |

---

## Baseline audit — before approved Phase 1

Audit date: 17 October 2026 (Asia/Calcutta). **Overall: FAIL for operational DOCX conformance; PARTIAL frontend structure; BLOCKED authenticated UI and actual database/source-data verification. This is not 100% completion.**

This report audits the current working copy. It supersedes older conclusions for this run, without altering the historical report at `artifacts/external-corrosion-final/FINAL-EXTERNAL-CORROSION-AUDIT.md`. Earlier report claims and screenshots are not fresh test results. The repository already had extensive uncommitted changes when this audit began.

Only this report and audit artifacts were intentionally written. Application code, routes, styles, configuration, schema and migrations were not edited. Typechecks/builds generated their normal local compiler/build outputs. No login, seed, database query, migration, import, save, delete, production/staging operation or application write request was performed. Browser interception rejected non-GET/HEAD/OPTIONS requests; zero such requests occurred. No credentials, tokens, user profiles or secret environment values were read or fabricated.

## Status and evidence conventions

- **PASS:** the stated, narrowly scoped check has current evidence. Source presence does not imply runtime success.
- **FAIL:** current source or a reproducible pure-function observation contradicts a requirement, or a required implementation is absent.
- **PARTIAL:** some structure or integration exists, but the requirement is incomplete.
- **BLOCKED:** verification requires an authenticated session, accessible authoritative records, a verified database target, or permitted write testing.
- **UNVERIFIED:** no sufficient evidence, including approved engineering methodology and options hidden in unopened reference menus.

`P` below means `frontend/src/app/external-corrosion-assessment/page.tsx`; `F` means `frontend/src/components/assessment-form.tsx`; `S` means `backend/src/data/store.ts`; `DB` means `backend/prisma/schema.prisma`. Line numbers refer to this working copy.

Current evidence:

| Artifact | Purpose |
|---|---|
| [Reference manifest](artifacts/external-corrosion-audit/reference-manifest.json) | Absolute paths, byte sizes and SHA-256 hashes for the DOCX and ten original PNGs |
| [Entire DOCX body text](artifacts/external-corrosion-audit/docx-full-text.txt) | 1,002 nonempty paragraphs, including tables, sections 1–51 and final repeated ownership/communication safeguards |
| [Current source inventory](artifacts/external-corrosion-audit/source-inventory.json) | AST inventory of 50 form field declarations, initial values, tabs, dashboard strings, legends, controls, attributes and all 58 Prisma model declarations; exact source line numbers |
| [Source manifest](artifacts/external-corrosion-audit/source-manifest.json) | SHA-256 hashes of the ten principal source files inspected, including the page, form, calculation, APIs, storage and schema |
| [Material/grade options](artifacts/external-corrosion-audit/material-grade-options.json) / [dropdown source catalog](artifacts/external-corrosion-audit/dropdown-source-catalog.json) | Exact 21-material catalog with material-dependent grades, shared coating options and backend enum declarations; source inventory rather than approved master-data certification |
| [Runtime results](artifacts/external-corrosion-audit/runtime-results.json) | Fresh anonymous API checks, dedicated-session discovery and three browser access attempts |
| [Calculation observations](artifacts/external-corrosion-audit/calculation-results.json) | Existing functions executed with ephemeral arithmetic inputs; no saved records or source mocks |
| [Audit harness](artifacts/external-corrosion-audit/verify.cjs) / [calculation harness](artifacts/external-corrosion-audit/calculation-probes.cjs) | Reproducible audit-only scripts |

## Reference access and verified coverage

The original references were found through a historical artifact, then independently read/inspected in this run. DOCX: `C:/Users/Lenovo/Desktop/Indiation_pvt/Saqron technologies/All-doc/new/exet corrosion.docx`. PNG folder: the sibling `extr corro/`. No replacement reference, OCR-generated interpretation or historical audit assertion substitutes for those originals.

| Measure | Verified numerator / denominator | Percentage and interpretation |
|---|---:|---|
| Original DOCX numbered sections read | 51 / 51 | Entire numbered document read; not a conformance percentage |
| Original images visually inspected | 10 / 10 | All originals inspected; not application screenshot parity |
| Requested tab labels in source | 11 / 11 | 100% label presence only |
| Dedicated tab bodies | 10 / 11 | 90.91% structural presence; Overview missing; all ten bodies incomplete |
| Reference KPI card labels in source (IMG-01–09) | 56 / 56 | 100% label presence only: eight groups of six plus eight Field Survey cards |
| Reference KPI cards connected to data | 0 / 56 | 0%; all render unconditional unavailable values |
| Fully operational, evidence-verified requested tabs | 0 / 11 | 0%; this does not mean every individual underlying legacy feature is absent |
| Authenticated image-tab × viewport comparisons | 0 / 30 | 0%; ten image tabs × desktop/tablet/mobile, all BLOCKED |
| Authenticated requested-tab × viewport checks including Overview | 0 / 33 | 0%; all BLOCKED |
| Form field declarations catalogued | 50 / 50 | Source inventory only; no verified live values |
| Live datasets reconciled UI → API → DB → authoritative source | 0 | BLOCKED; production record count/denominator unknown |
| Typechecks and builds | 4 / 4 | PASS for these four commands only; no engineering/data/visual certification |

There is **no defensible overall atomic-field completion percentage**: hidden dropdown/row menus, actual datasets and authenticated layouts cannot be exhaustively verified. Counts above have explicit bounded denominators and must not be combined into an overall completion claim.

## IMG-01–IMG-10 comparison

All filenames start `ChatGPT Image Oct 7, 2026, 01_13_` and end as listed below. All images show the eleven tabs, global Export/New Assessment, External Corrosion title/description, shield icon, application header/sidebar and footer. Shared chrome differs from the existing shell; preserving the shell takes precedence over any unapproved redesign. Images contain illustrative users, dates, IDs and engineering values; none were treated as production data.

| Image / original suffix | Tab / current source | Source comparison | Actual UI comparison |
|---|---|---|---|
| IMG-01 `30 AM-1.png` | Coating Condition, P:667 | PARTIAL: six KPI labels, map/chart/table/action titles exist. Reference top row is map + stacked segment bars + distribution donut; source uses map/chart then another chart row. Type mix/deteriorated areas/actions placement differs. No plotted values, routes, map controls for this tab, markers, row menus or detail drawer. Source adds legacy form and implementation notices absent from image. | BLOCKED |
| IMG-02 `32 AM-2.png` | CP Effectiveness, P:791 | PARTIAL: six cards, map, compliance trend, segment distribution, scatter, case/segment tables, system performance and four actions. Top three-panel composition and lower case/scatter arrangement differ. No CP points, calibrated axes, source linkage, live rectifier totals or scatter classification. | BLOCKED |
| IMG-03 `33 AM-3.png` | Soil & Environment, P:906 | PARTIAL: six cards, map, four chart frames, two tables, summary, insights and actions. Reference has large left map and four charts in a right 2×2 area; source separates map/distribution from three further charts. Static bands exist without approved rule versions. No real points/insights. | BLOCKED |
| IMG-04 `35 AM-4.png` | Interference, P:1014 | PARTIAL: six cards and all named panels/columns/actions. Map + AC/DC bars + severity donut reference becomes multiple two-column rows. Findings/mitigation and insights/source/actions hierarchy differs. No mitigations, sources, map scale or engineering records. | BLOCKED |
| IMG-05 `37 AM-5.png` | Field Surveys, P:1154 | PARTIAL: eight cards, route, calendar, upcoming list, method/severity/trend frames, latest-survey table and actions. Calendar/upcoming list are stacked rather than side-by-side; method/severity frame placement differs. No dates, schedule, survey points or import lifecycle. Literal `Close Interval (DCVG)` preserves a questionable reference method conflation. | BLOCKED |
| IMG-06 `40 AM-6.png` | ILI Correlation, P:1251 | PARTIAL: six cards, map, correlation/feature/growth frames, correlation table and four action descriptions. Reference three-panel upper row and large left table/right growth/actions composition differ. No ILI/source IDs, matched feature comparisons or correlation drawer. | BLOCKED |
| IMG-07 `42 AM-7.png` | Findings, P:1326 | PARTIAL: six cards, register/filters/search/selection/pagination, severity/status frames, recent activity and actions. Main register/side chart hierarchy is present, but bottom activity/actions become separate full-width panels. No finding lifecycle, row actions, source evidence or defect handoff. | BLOCKED |
| IMG-08 `44 AM-8.png` | Alerts & Events, P:1418 | PARTIAL: six cards, three-chart row, filters, register and action column broadly present. All charts/rows empty; no sorting, avatars, badges, date picker or acknowledgement. Source adds a page-size selector; global and register exports disabled. | BLOCKED |
| IMG-09 `46 AM-9.png` | Trends & Historical, P:1552 | PARTIAL: six cards, four filters, five plots, observation table and action descriptions. Broad three-chart/two-chart-plus-actions composition present; plots are empty HTML frames. Missing tick values, regression, series, time selection, sample size, effective revision selection and tooltips. | BLOCKED |
| IMG-10 `47 AM-10.png` | Configuration, P:1597 | PARTIAL: module/integration panels, seven rule/library tables plus notification and display/access sections. Source defaults to two columns below 2xl; reference is a three-column grid. No saved rules, mechanism/model versions, updater, active state or permissions. Threat terminology appropriately overrides screenshot Risk terminology. Integration Hub href exists. | BLOCKED |

**Overview:** FAIL, P:1826–1849. The label exists but falls through to a generic reserved-tab message. DOCX §4's six KPIs and assessment register/navigation are absent. There is no Overview reference screenshot in this supplied set. Default tab is Coating Condition (P:1673).

Across images, compact blue-bordered panels/icons have been replaced by rounded cards, color bars and empty-state text; global controls are on a separate row; header/breadcrumb/footer differ. These are source-visible differences, not measured browser pixel results. Reference menus are closed: additional dropdown options, row-menu commands and tooltip text are UNVERIFIED rather than guessed.

### Reference inconsistencies requiring definitions, not copied fixes

| Image | Observed illustrative inconsistency | Audit handling |
|---|---|---|
| IMG-01 | Distribution center 86 km versus legend total 146.2 km; rounded percentages sum to 101% | No denominator selected. Source's explanation of sample numbers is implementation commentary, not production data. |
| IMG-02 | Segment donut center 68 versus 53+8+5+1=67; point/segment labels use different bases | Need explicit KPI and population definitions before aggregation. |
| IMG-03 | Concern counts 8+18+27=53 versus 62 survey points | Missing/unassessed scope must be defined; do not normalize silently. |
| IMG-04 | In Progress 3 of 15 is printed 33%, while 3/15=20%; displayed mitigation percentages exceed 100% | Recalculate only from governed actual records and defined populations. |
| IMG-05 | `Close Interval (DCVG)` differs from the DOCX's separate CIPS/DCVG/ACVG/Close Interval options; schedule is a reference October 2026 calendar | Preserve uncertainty; do not create schedules or equate methods. |
| IMG-06 | Matched126 + Unverified34 + No Match12=172 versus center160; feature bars total132 | Define mutually exclusive populations and filtering before calculating. |
| IMG-07 | Register28 versus status bars28+12+10+6=56; severity8+10+7+3=28 | Specify open-only versus all findings and chart scopes. |
| IMG-08 | Critical8 labeled13% of Open24 rather than33.33%; `Last6Months` shows Apr–Oct, seven months | Do not reuse screenshot totals, percentages or dates. |
| IMG-09 | Descending scatter and positive R=0.78; deterioration28% from21% shown +7%, while AC18.4 from11.2 shown +64% | Decide signed correlation and percentage-points versus relative change, with documented formula. |
| IMG-10 | Risk labels/score conditions and sample CP thresholds conflict with DOCX ownership; template/criterion samples lack approval lineage | DOCX takes priority. Screenshot values do not become rules. |

## Tab-wise field, label, unit and data inventory

Every dashboard KPI below maps today to `UnavailableValue`, not to an API response. Every dashboard table maps to `EmptyTable` or a handwritten unavailable row. Every plot maps to an empty helper/frame; maps are styled divs. **Data mapping status for all dashboard items below: FAIL (no binding); actual source values: BLOCKED.** Headers, legends and display categories are static interface content, not mock records. Their exact declarations and line numbers are preserved in the AST inventory.

| Tab | KPI labels / additional summaries | Authoritative mapping required |
|---|---|---|
| Overview | Segments Assessed; Coating Condition Good; Segments with CP Concerns; High External Corrosion Threat; Interference Locations; Data Confidence | EC approved assessment coverage/condition/indicators, referenced CP summary and versioned confidence; none implemented |
| Coating | Good Condition; Fair Condition; Poor Condition; Coating Holidays; Disbondment Indications; Surveyed Length (km); historical deltas | Latest approved coating assessments and deduplicated indications, surveyed lengths and actual prior survey |
| CP | CP Compliant Points; Marginal Points; Under-protected Segments; Over-protection Exceptions; Rectifier Availability; Data Confidence (all source cards currently append %) | CP Monitoring compliance/point/segment/rectifier populations, source timestamps and confidence |
| Soil | Soil Resistivity Zones; Corrosive Areas; Moisture Hotspots; Stray Current Exposure; Drainage Concerns; Data Confidence (%). Summary: High Concern Areas, Moderate Concern, Low Concern, Total Survey Points | Soil/lab/sensor/GIS source results through governed import; EC interpretation separate from raw values |
| Interference | Interference Locations; Active Cases; Critical Hotspots; Mitigated Sites; Pending Review; Data Confidence (%). Insights: AC Locations, DC Locations, Critical (High), In Mitigation | CP interference findings and survey sources; EC interpretation, mitigation/action references |
| Field Surveys | Surveys Completed; Open Surveys; CIPS Surveys; Close Interval (DCVG); ACVG Surveys; Overdue Surveys; Confirmed Anomalies; Data Confidence (%) | Accepted survey metadata, indications and schedule; `Confirmed Anomalies` is not automatic physical defect confirmation |
| ILI | Correlated Anomalies; Unverified Anomalies; Matched Excavations; Growth Cases; Correlation Confidence (%); Pending Reviews | EC correlation links to ILI run/anomaly/growth IDs and excavation evidence |
| Findings | Open Findings; High Severity; Under Review; Action Required; Linked to Defects; Avg. Closure Time (days) | EC finding lifecycle, reviewed linkage to confirmed Defect_ID, actual closure timestamps |
| Alerts | Open Alerts; Critical Alerts; Acknowledged; Overdue Reviews; Recently Resolved; Alert Data Confidence (%) | Derived EC alert rules, source references, acknowledgements and lifecycle timestamps |
| Trends | Overall Corrosion Trend (%); Segments Deteriorating; Segments Improving; Historical Surveys; Long-term CP Correlation; Data Confidence (%) | Historical source datasets and effective EC revisions; signed correlation and population definitions |
| Configuration | Configuration Status; Last Updated; updater absent; notification saved state; per-role permissions | Approved configuration/rule versions, audit updater and persisted preferences; all unavailable |

### Every displayed dashboard table column

`/` within a label is literal. Semicolons delimit columns. All rows are missing, not verified empty databases. Source row IDs, locations, statuses, severities, dates, assignees, measurements and percentages therefore remain BLOCKED.

| Tab / table | Columns in current implementation | Mapping gap |
|---|---|---|
| Coating / Recent Coating Findings | ID; Pipeline / Segment; KP / Location; Finding Type; Coating Condition; Severity; Date; Action | Coating indication/finding/source linkage missing |
| Coating / Inspection History | Survey ID; Pipeline / Segment; Survey Date; Method; Length (km); Status | No survey source or Latest5 query |
| Coating / Top Deteriorated Areas | Rank; Pipeline / Segment; KP Range; Finding Count; Dominant Issue | No ranking/deduplication/scope |
| CP / Recent Under-Protection Cases | ID; Pipeline / Segment; KP / Location; CP Potential (V); Severity; Status; Date; Action | No CP record/electrode or mV→V mapping |
| CP / Segment Summary | Pipeline / Segment; Length (km); Compliant (%); Marginal (%); Under-protected (%); Status | No per-segment denominator |
| Soil / Soil Survey Points | ID; Pipeline / Segment; Location (KP); Soil Resistivity (Ω·m); pH; Moisture (%); Chloride (mg/kg); Soil Type; Status | No Sample_ID/Result_ID/method/quality/measurement timestamps |
| Soil / High-Concern Environmental Areas | ID; Pipeline / Segment; Location (KP); Issue Type; Severity; Status | No versioned interpretation/source references |
| Interference / Recent Interference Findings | ID; Pipeline / Location; Chainage (km); Interference Type; Source; Severity; Status; Date; Action | No CP_Interference_Finding_ID or derived record |
| Interference / Top Interference Sources | Rank; Interference Source; Count; Percentage | No aggregation/population |
| Field / Upcoming Surveys | Date; Pipeline / Segment; Survey; Status | No governed calendar; no active reference schedule |
| Field / Latest Field Surveys | ID; Survey Date; Pipeline / Segment; Method; Coverage (km); Findings; Status; Action | No survey/indication/document mapping or latest10 query |
| ILI / Correlation Table | ID; ILI Anomaly ID; Pipeline / Segment; KP (km); Feature Type; Matched Finding; Correlation Status; Confidence; Action | No External_Corrosion_ILI_Link_ID, ILI_Run_ID or location delta |
| Findings / Register | Selection; ID; Pipeline / Segment; KP (km); Finding Type; Severity; Confidence; Status; Created Date; Action | No findings store/query or workflow |
| Findings / Recent Activity | Date / Time; Finding ID; Activity; User | No event trail |
| Alerts / Register | Selection; Alert ID; Source; Pipeline / Segment; Alert Type; Severity; Status; Raised Time; Assignee; Action | No derived alert/source/lifecycle model |
| Trends / Recent Trend Observations | ID; Pipeline / Segment; Observation; Metric; Current Value; Previous Value; Trend; Change; Period; Comment; Action | No historical query, comparable periods or units per metric |
| Config / Mechanism Library | ID; Mechanism; Description; Active; Actions | Missing Method/Model, Required Inputs, Version, Reference, Approval Status (§29) |
| Config / Coating Condition Rules | Condition; Criteria (e.g. % coating defect); Threat Severity; Active | No saved approved thresholds |
| Config / CP Correlation Thresholds | Parameter; Good; Moderate; Poor; Units | CP Monitoring owns criteria; no criterion/version link |
| Config / Soil & Environment Categories | Category; Description; Corrosivity; Active | No approved category versions |
| Config / Interference Rules | Interference Type; Threshold; Threat Severity; Active | No approved rules/units/source criteria |
| Config / Field Survey Templates | Template Name; Version; Type; Last Updated; Active | No templates or version lifecycle |
| Config / Alert Rules | Rule Name; Condition; Severity; Channels; Active | No rules/derived-source lineage |

23 dashboard tables are inventoried above. No total row count, pagination count or sample record is evidence of actual records. Image prefixes include SEG-/PL-, ECF-, CI-, CP-, SS-, ENV-, INT-, FS-, ILI_, ALRT-, TND-, ECM-, DFT-; they are illustrative identifiers only. The original images preserve their full sample cells. Their existence does not establish valid application IDs.

### Every chart/map frame, legend and selector

| Tab | Frames / axes / visible series/categories |
|---|---|
| Coating | Coating Condition Map: Good/Fair/Poor/Not Assessed; Coating Condition by Segment: Length(km), same four conditions; Coating Condition Distribution: Assessed length(km), same four; Coating Type Mix: Total surveyed length(km), 3LPE/FBE/Coal Tar Enamel/Other |
| CP | CP Effectiveness Map: Compliant/Marginal/Under-protected/Over-protected; CP Compliance Trend: Compliance Rate, 0–100%, Last12Months, three compliance series; CP Effectiveness by Segment: four compliance categories; Coating Condition vs CP Performance: source combines CP Potential(V vs CSE)/Coating Condition Rating rather than calibrated separate axes; categories High Concern, Coating Poor/CP Inadequate, Coating Good/CP Adequate, CP Over-protection. System summary: Rectifiers Total, Online, Offline, Total Output(A), Data Uptime(last30days) |
| Soil | Soil & Environment Map: Low Resistivity(<500Ω·m), Moderate(500–1,000), High(>1,000), High Moisture, Clay Soil, Corrosive Area. Soil Resistivity Distribution: <500 High Concern, 500–1,000 Moderate, 1,000–5,000 Good, >5,000 Very Good; Soil pH Distribution: <5 Acidic, 5–6 Slightly Acidic, 6–8 Neutral, >8 Alkaline; Soil Moisture Content(%): <5 Very Low, 5–15 Low, 15–30 Moderate, >30 High; Chloride Content in Soil(mg/kg): <50 Low, 50–200 Moderate, 200–1,000 High, >1,000 Very High |
| Interference | Interference Location Map: AC Interference/DC Interference/Mitigated/Under Investigation/Low Severity; AC vs DC Interference Locations: Number of Locations; Interference Severity Distribution: High/Medium/Low/Not Assessed; Mitigation Status: Mitigated/In Progress/Planned/Not Mitigated |
| Field | Survey Route Coverage: Completed/In Progress/Overdue/Not Surveyed; Survey Schedule: Sun–Sat with unavailable month/dates, Scheduled/In Progress/Overdue; Surveys by Method: CIPS/DCVG/ACVG/Other, Last12Months; Findings by Severity: High/Medium/Low/Informational; Findings Trend: same four severity series, Last12Months |
| ILI | Pipeline ILI Correlation Map: Correlated(Match)/Unverified/Growth Case/No Match; Anomaly Correlation Status: Matched/Unverified/No ILI Match; Anomaly Feature Types: Metal Loss/Geometric/Dent/Other; Anomaly Growth Comparison: Depth(mm), Previous ILI/Latest ILI. No matched-feature x-axis or approved growth source |
| Findings | Findings by Severity: High/Medium/Low/Not Specified; Findings by Status: Open/Under Review/Action Required/Closed; Number of Findings. Missing DOCX status/severity categories discussed below |
| Alerts | Alert Trend: Number of Alerts, Critical/High/Medium/Low/Total Alerts, Last6Months; Alerts by Source: CP Monitoring/Coating Survey/Field Survey/ILI Data/Soil-Environment/Interference; Alerts by Severity: Critical/High/Medium/Low |
| Trends | Coating Deterioration Trend: % Deteriorated Segments, Percentage of Segments, High/Moderate Severity; CP Concern Trend: Number of Segments, High/Moderate/Low Concern; Interference Trend: Number of Locations, AC/DC/Other Interference; Assessment History: Number of Segments, By Assessment Result, Good/Fair/Poor/Not Assessed; CP Effectiveness vs Coating Condition(Historical Correlation): x CP ON Potential(V vs CSE), y Coating Condition Index, R/n unavailable. Other x-axes say Year, with no actual historical series |

All chart/map data paths stop at the frontend. Reference bands are static and have no criterion ID, approval, unit-normalization policy or effective revision. Exact threshold applicability is UNVERIFIED. Map zoom/minus/layers exist as disabled buttons in CP/Soil/Interference/Field/ILI; Field also has Expand. Coating has no zoom/layer controls. No GIS view, bounds, scale, overlays or popovers are implemented here.

## Controls and workflow register

Every item in a grouped row inherits its stated status. This records source behavior separately from blocked browser testing.

| Control(s) | Current behavior / source evidence | Status / required correction |
|---|---|---|
| Eleven top tabs | P:1810 sets local activeTab and renders content without popup | PARTIAL; source interaction exists, actual clicks BLOCKED; no filter/deep-link state, Overview absent |
| Global Export; New Assessment | P:1802 always disabled | FAIL; bind authorized report/export and assessment workflow |
| Every panel View All / View All Activities / View Details / View in GIS | DashboardPanel P:606 disables all actions regardless of data | FAIL; implement preserved-filter full lists, detail drawers and contextual GIS |
| Coating: Add Coating Inspection; View in GIS; Create Finding; Generate Report | Disabled P:740 | FAIL |
| CP: View CP Details; Create Field Review; Add Finding; Generate Report | Disabled P:872 | FAIL; contextual CP navigation missing |
| Soil: Add Soil Survey; View in GIS; Upload Environmental Report; Create New Finding | Disabled P:976 | FAIL; document and import ownership missing |
| Interference: Add Interference Study; Create Action; View in GIS; Generate Report | Disabled P:1093 | FAIL; central Action_ID absent |
| Field: Add Field Survey; Upload Survey File; Validate Import; Generate Report | Disabled P:1218 | FAIL; no staged import/preview/accept/quarantine |
| Field calendar Previous month / Next month; chart Last12Months | Disabled helper P:1133 / P:1108 | FAIL; no schedule/date query |
| ILI: View ILI Details; Correlate Finding; Request Excavation; Generate Report | Disabled P:1313 | FAIL; missing contextual source navigation and correlation flow |
| Findings: All Statuses; All Severities; All Finding Types; Search findings; Filter; Select all/row; previous/page/next; Findings per page(10 only) | Disabled P:1356–1393; no queries/selection/pagination | FAIL; full option sets and totals not available |
| Findings: Create New Finding; Send to Defect Manager; Assign Action; Generate Report | Disabled P:1405 | FAIL; reviewed correlation/escalation and action registration absent |
| Alerts: Last6Months; Severity/Status/Source; Date Range; Clear Filters; Apply Filters; Search alerts; selection; pagination; Alerts per page(10 only) | All disabled P:1447–1506; selects contain one default option | FAIL |
| Alerts: Acknowledge Alert; Create Action; View Source Record; Generate Report; register Export | Disabled P:1474–1523 | FAIL; no acknowledgement audit or source drawer |
| Trends: Date Range; Pipeline(All Pipelines); Segment(All Segments); Location Type(All Locations); Apply; Reset; four chart selectors | All disabled P:1570 / P:1534; no historical filter state | FAIL |
| Trends: Compare Periods; Export Trend Data; Generate Report; View in GIS | Disabled P:1584 | FAIL |
| Config: Add Mechanism; Add Rule(coating/interference); Edit Thresholds; Add Category; Add Template; Add Alert; Edit/More; activation controls | Disabled P:1598–1638; no persisted rows | FAIL; no CRUD/approval/version logic |
| Config: Email Notifications; In-App Notifications; SMS Notifications; Daily Digest; Edit Settings | Disabled/unknown P:1637 | FAIL; saved states unavailable; no delivery test performed |
| Config: Default Map View; Default Table Page Size; Threat Color Scheme; Units; Edit Preferences; Manage Access | Disabled P:1640; only Not Available options. Roles: Administrator, Integrity Manager, Corrosion Analyst, Field Engineer, Viewer | FAIL; role labels are not actual granted permissions; unknown switch is a disabled dash button, not a persisted state |
| Open Integration Hub | P:1622 href `/integration-hub` | PARTIAL: real target route exists; runtime navigation BLOCKED; no record context |
| Pipeline selector / create / edit / save / cancel | F:883,934,1145,2100; updatePipeline writes Pipeline owner API | PARTIAL: proper owner API exists, but in-module master editing contradicts read-only §5/31/44 UX; write testing not performed |
| Run External Assessment | F:1648–1746 normalizes and calculates, POST assessments then POST reports, routes `/report` | PARTIAL wiring; FAIL methodology/ownership; authenticated/write testing BLOCKED |
| Save Pipe Data | P:1770; F:1748; POST or PUT `/api/external-pipe-data` | PARTIAL wiring; mutable history and missing revision/source IDs FAIL; writes not executed |
| Pipe Data History; Search History; Reset; Open Data; Edit; Download PDF; Download Word; Close | `frontend/src/components/external-pipe-history-modal.tsx`:89–212 and rendered controls | PARTIAL API handlers; authenticated records, filtering, downloads and scroll behavior BLOCKED. Legacy centered modal is distinct from required new dashboard right-side drawers |
| Open Review & Export | F:1801,2246 routes `/report` | PARTIAL source wiring; selected-record fidelity/runtime BLOCKED |

No action is marked runtime PASS. Mutating workflows cannot be fully executed under the instruction not to modify data. They require a separately authorized disposable test target; there was no such target/session. Existing validation scripts that create/update/delete records were not run against the configured environment.

Legacy history additionally contains filters Assessment Type(All/External/Internal), Pipeline Name, Pipe ID, Location ID and Saved Date. Its table columns are Assessment Type, Pipeline Name, Pipe ID, Location ID, Saved Date & Time, Saved By and Actions. Record Preview fields are Record ID, Assessment Type, Saved At, Saved By; Key Inputs shows Pipeline Name, Pipe ID, Location ID, Pipe Material, Pipe Grade(for External), Temperature and Risk Score. They map to `record.id`, `assessmentType`, `savedAt`, `savedByName`, `assessment.pipelineName`, `pipeId`, `locationId`, `assessment.input.pipeMaterial/pipeGrade/soilTemperature*` and `assessment.riskScore`. Source: history modal:222–467. PARTIAL implementation / BLOCKED actual records; Risk Score terminology fails the same DOCX boundary. This is a twenty-fourth implemented table outside the23 dashboard tables above. Its formatTemperatureUnit source contains encoding-looking strings for degrees; actual rendered temperature glyph fidelity is UNVERIFIED until authenticated preview access.

## Frontend → API → database → source trace

| Path / records | Source evidence | Result |
|---|---|---|
| Ten dashboards → APIs | P imports only pipe-data create/update; dashboard functions take no data props, use no API hooks and render unavailable constants | FAIL: no dashboard value has a complete trace; backend record absence cannot be inferred |
| Legacy Pipeline context | F.populatePipelineFields → pipeline selector/API → `/api/pipelines` → Pipeline (DB:394), Segment(DB:463)/Asset(DB:483) exist elsewhere | PARTIAL: pipelineId foundation exists; assessment lacks governed Segment_ID/Asset_ID/KP/geometry/source revision binding |
| Legacy Run Assessment | F:1392 normalized input → calculateExternalCorrosion → createAssessmentRecord → `/api/assessments` → requireAuth / validation → S:2214 → Assessment(DB:321) | PARTIAL storage; result is client-provided, not server-engineering-authoritative; actual records BLOCKED |
| Legacy Save Pipe Data | P:1770 → apiClient:1159/1180 → `/api/external-pipe-data` POST/PUT → validation → S:2548 → ExternalPipeData(DB:369) | PARTIAL; entire input/result snapshots duplicated across storage paths without immutable revision provenance |
| Legacy history | Modal → apiClient:1090–1130 → GET `/api/external-pipe-data` / `/:id` → S:2422/2490 → ExternalPipeData + Pipeline + author | PARTIAL: owner filtering/search exists; no server pagination, inspectionDate loss, live verification BLOCKED |
| Legacy generated report | F POST `/api/reports` after assessment save → reports.ts → Report(DB:344), inspection/pipeline references | PARTIAL central report foundation. Dashboard Generate Report/Export never call it. Two requests are not atomic; report failure can leave saved assessment |
| CP authoritative data | `/api/cp-monitoring`, CpReadingHistory(DB:784), CpReadingEvaluation(DB:819), CpTestPoint(DB:675), CpMonitoringSurvey(DB:655), criteria/version models | FAIL EC consumption: existing owner models not queried/linked; client form re-enters potentials and computes compliance-like status |
| ILI authoritative data | `/api/ili`, IliInspectionRun(DB:522), IliAnomaly(DB:545), IliAssessmentResult(DB:571) | FAIL EC consumption/correlation: no link table/record/query in current EC implementation |
| Sensors/time-series | DeviceRecord, SensorAssignment, Sensor, Channel, SharedTimeSeriesReading(DB:921–1104) and owner routes exist | FAIL EC measurement consumption/quality/freshness links; no EC device duplication observed in dashboard source |
| Integration transport | `/api/integrations`, IntegrationConnector/IntegrationEvent(DB:591/620) exist | PARTIAL boundary/link; EC survey/LIMS acceptance/mapping/dedup/quarantine path absent |
| Document ownership | `/api/documents`, ManagedDocument/DocumentVersion/DocumentLink(DB:241–319) exist | FAIL EC evidence linkage; no Document_ID/version passed by legacy assessment schema or dashboard |
| ECDA downstream | `frontend/src/components/ecda-assessment-workspace.tsx`:375,396,1008,1889 consumes saved EC assessment context | PARTIAL consumer; no shared governed EC indication/finding/correlation IDs; actual values BLOCKED |
| Risk / Dashboard downstream | `backend/src/routes/dashboard.ts`:134–158,301–332 and `frontend/src/components/risk-assessment-real-view.tsx`:137–148,225–259 consume generic assessment riskLevel/riskScore | FAIL separation: EC heuristic scores propagate as assessment-level risk rather than governed EC indicators into an official PoF/CoF methodology |
| AI downstream | Existing AI readiness/corrosion growth components exist, but no EC versioned evidence contract in this page | UNVERIFIED end-to-end advisory lineage; no claim of EC forecast integration |

All 58 model names were inventoried. There are no dedicated EC coating/survey/soil/correlation/finding/alert/indicator/confidence/revision models in this schema, and the strict legacy schemas do not define the required source ID graph. JSON can technically hold arbitrary data, but the actual implemented contracts do not establish these records. This is a current contract gap, not proof of deployed schema contents and not authorization to add tables/migrations.

`backend/src/app.ts`:49–69 registers owner APIs and generic assessment/history APIs; there is no EC dashboard/read-model route. Current HTTP checks on `/api/cp-monitoring` and `/api/ili` only confirm the authentication boundary before endpoint-specific logic, not successful endpoint payloads.

### Relationship, identity, timestamps and duplication defects

| ID | Evidence and classification | Required correction |
|---|---|---|
| DATA-01 | FAIL: S:2571–2606 sets both pipeId and locationId from input.pipeLocationId. They cannot independently identify a pipe and a location. No Segment_ID/Asset_ID/KP source bindings. | Preserve existing owner identifiers and distinct meanings; do not invent missing IDs. |
| DATA-02 | FAIL: ExternalPipeData.assessmentId is unique but is not a Prisma relation to Assessment. Save Pipe Data may persist independently of Run Assessment. Mutable input/result snapshots also exist in Assessment and Report. | Define linked immutable assessment snapshot/revision semantics and canonical source ownership within authorized constraints. |
| DATA-03 | FAIL: PUT history updates input/result in place. No effectiveFrom/effectiveTo/revision/approved model version in Assessment or ExternalPipeData. updatedAt is not a historical revision. | Preserve effective-dated engineering interpretations; do not overwrite historical confidence/threat results. |
| DATA-04 | FAIL: ExternalPipeData lacks inspectionDate; history reconstruction S:2470/2518 supplies createdAt, not the original assessment inspectionDate. Modal loads assessment.inspectionDate into required Inspection Date. | Retain actual inspection date/source timestamps independently of save timestamps. |
| DATA-05 | FAIL: S:2220 returns an existing Assessment by incoming id without checking existing owner or payload equivalence in createAssessment. POST route only verifies incoming pipeline access. Source-only security/idempotency gap; not exploited. | Scope existing-ID reuse by owner and reject conflicting content; validate authoritative associations. |
| DATA-06 | PARTIAL: history unique assessmentId plus owner mismatch check reduces repeated-save duplicates; reportSubmissionKey is unique. This is request/record idempotency, not physical-location/survey-indication deduplication. | Add governed semantic correlation, reused-source links and controlled defect matching; never auto-create defects. |
| DATA-07 | FAIL: backend validates shapes, enum values and envelope/result equality, but accepts calculated fields and risk values supplied by client without recomputing/verifying methodology/source versions (`assessmentValidation.ts`:485–506,626–696; assessments.ts:54–68). | Use approved versioned engineering outputs and authoritative input provenance; agreement between two client fields is not correctness. |
| DATA-08 | FAIL: history list includes current Pipeline OD/unit while retaining historical JSON. No source revision identifies which master values were used. Owner fields/timestamps alone do not provide measurement quality/freshness. | Clearly separate current master context from immutable assessment basis and source revision. |

## Engineering, units and actual calculations

### Every legacy displayed result and its current storage mapping

All eighteen values below are calculated client-side in `frontend/src/lib/externalCorrosionCalculations.ts`, accepted as client-supplied results by the generic API and stored under `result.<key>` in Assessment, ExternalPipeData and Report JSON when the corresponding action is used. No displayed result is joined to an authoritative measurement/model revision by this module. **Persistence path: PARTIAL; authoritative engineering validity: UNVERIFIED; actual stored/displayed values: BLOCKED**, with specific FAIL findings below. The sixteen metric labels are defined at P:1649; the other two appear in the shared result header at F:2182.

| Display label | Result key / unit | Existing calculation basis |
|---|---|---|
| Predicted Soil Corrosivity | soilCorrosivityLevel / categorical | rawScore≥70 Severe, ≥40 Moderate, otherwise Mild |
| Metal Loss | corrosionDepth / mm | (pipeAge+1)×heuristic corrosionRate×0.18; not nominal-minus-measured |
| Metal Loss % | metalLossPercent / % | Nominal-minus-measured when measured>0, otherwise heuristic depth; clamped0–100 |
| Corrosion Rate | corrosionRate / mm/y | 0.08+rawScore×0.012 |
| Remaining Life / Time to Perforation | remainingLife / years | (wallThickness−heuristic depth)/max(rate,0.1), minimum0.5year |
| Failure Pressure | failurePressure / bar | Nominal burst equation with length/width/loss/coating/CP multipliers |
| Failure Pressure Ratio | failurePressureRatio / dimensionless | failurePressure/operatingPressure, rounded2digits |
| Safety Margin | safetyMargin / % | (failurePressure−operatingPressure)/failurePressure×100 |
| Recommendation | recommendation / text | Failure ratio, margin, CP/coating status and metal-loss rule |
| High-pH SCC Probability | highPhSccProbability / categorical | soilPh>8.5 and CP input threshold; Moderate or Low |
| Near-Neutral-pH SCC Probability | nearNeutralPhSccProbability / categorical | soilPh6–8 plus groundwater presence; Elevated or Low |
| MIC Possibility | micWarning / text | Moisture>55 and groundwater presence |
| Cathodic Coating Delamination | cathodicDelaminationWarning / text | CP input threshold and not Bare |
| AC Corrosion Likelihood | acCorrosionWarning / text | acInputValue>10 or strayCurrentDensity>8; no unit-specific warning threshold |
| Stray Current Corrosion Rate | strayCurrentCorrosionRate / mm/y | 0.03+strayCurrentDensity×0.11+dcCurrentDensity×0.06 |
| Mode of Failure | majorModeOfFailure / text | rawScore70/40 thresholds; localized pitting/general wall loss/coating underfilm |
| Risk Score | riskScore / score | Rounded rawScore (chemistry/environment/electrical/groundwater weights) |
| Risk category badge | riskLevel / categorical | score70/40→High/Medium/Low; violates DOCX threat/risk separation |

The raw score is capped at100 but not explicitly bounded below; input validation and domain limits therefore matter. AC warning compares the same numeric threshold against different input units. These are implementation observations, not accepted engineering thresholds.

First-use normalization **exists** in F:686–758 and F:1392: OD→mm, pressure→bar, nominal wall thickness→mm, temperature→C with display metadata. Therefore a claim that the form has no unit conversion would be incorrect. Conditional CP value units are V vs CSE for polarized potential, otherwise mV; AC value is V for voltage or A/m² for density (F:667–682), overriding static field declarations. Dropdown values reset when CP/AC input method changes (F:1114–1134). These are source foundations; authenticated conversion behavior remains BLOCKED.

| ID | Finding / evidence | Status |
|---|---|---|
| CALC-01 | `externalCorrosionCalculations.ts`:39 uses hardcoded electrode-dependent -800/-850mV and absolute ON/OFF difference≥100 to derive status independently of CP Monitoring criteria/evaluations. Empty/unrecognized electrode defaults to CSE threshold; probe returns Protected with missing electrode. | FAIL ownership/unknown handling; accepted CP engineering method UNVERIFIED |
| CALC-02 | P:1686 normalization preserves Good/Fair/Poor/etc; calculator:59,239 ignores selected coatingCondition and derives Bare/Critical/Degraded/Aged/Weathered/Good from pipeline installation age/holidays. No coating installation/rehabilitation date. Displayed interpretation can differ from calculation basis. | FAIL |
| CALC-03 | P:365 offers Manual CP Status Override and reason, but calculator ignores both. Probe changed override to Unacceptable with identical output. | FAIL control meaning |
| CALC-04 | Required previousInspectionDate/previousRemainingThickness (F:1607–1633) are unused by calculateExternalCorrosion. Probe changed both with identical output. Corrosion rate is `0.08 + rawScore*0.012`, not measured historical wall-loss growth. | FAIL historical meaning; approved model UNVERIFIED |
| CALC-05 | P:1652 labels result.corrosionDepth `Metal Loss`; calculator estimates `(pipeAge+1)*corrosionRate*0.18`, while metalLossPercent uses actual nominal-minus-measured thickness. Pure probe: nominal10mm/measured8mm gives displayed Metal Loss0.77mm but20% loss. | FAIL displayed-value consistency |
| CALC-06 | Remaining life uses nominal thickness minus heuristic depth, ignores measuredThickness and calculated minimumRequiredThickness, and floors life at0.5year. Probe changing measured8→5mm leaves23.7years unchanged. Label `Remaining Life / Time to Perforation` conflates different endpoints. | FAIL basis/label; engineering acceptance UNVERIFIED |
| CALC-07 | Failure pressure applies custom length/width/loss/coating/CP multipliers (:145–184); designFactor0.72, raw chemistry weights, SCC/MIC/AC thresholds and current-corrosion conversion lack model/version/reference/approval records. | UNVERIFIED engineering validity; FAIL versioned-model requirement |
| CALC-08 | F.prepareLoadedAssessmentInput:638 restores wall-thickness display value and temperature metadata, but not OD or operating-pressure display values. renderField:1852 displays stored normalized values with original units; subsequent normalization multiplies OD/pressure again. Example path: stored508mm plus inch display-unit can reload as508inch then normalize12903.2mm. Source-path defect, not authenticated replay. | FAIL source mapping; browser reproduction BLOCKED |
| CALC-09 | P initialValues:68 uses numeric zeros and affirmative defaults such as Good coating, No holiday, Clay, No Groundwater. Calculator on this incomplete input returns Severe/riskScore100 and0.5year life. Form validation blocks many missing geometry/CP fields, so this pure-function result is not evidence that invalid submission succeeds. Soil measurements lack full completeness/range checks. | FAIL missing-value semantics; runtime invalid submission BLOCKED |
| CALC-10 | Soil resistivity displayed ohm-m / Ω·m is equivalent. P helper says another source showed Ohm.cm, but the supplied DOCX §12 example and IMG-03 use Ω·m. Carbonate helper mentions %, but current DOCX/images do not establish carbonate basis. | No verified unit mismatch to those references; carbonate methodology/unit basis UNVERIFIED. Never relabel or convert without source basis. |
| CALC-11 | CP case tables/plots use V and configuration uses mV; legacy form stores mV ON/OFF and V polarized potential. No dashboard/source binding performs conversion or carries electrode metadata. Config CP Current Density reference is mA/m², legacy current densities A/m²; these may be distinct quantities. | FAIL missing explicit mappings; do not assert values differ by1000 without matching parameter/source |
| CALC-12 | `calculateExternalCorrosion`:344 produces riskLevel/riskScore using 70/40 heuristic thresholds; F:2184 displays Risk Score. Generic Assessment/Report and downstream views persist/consume it. No official Risk_ID or PoF/CoF method. | FAIL Threat≠Risk |
| CALC-13 | pH/soilMoisture/resistivity are finite/nonnegative in some server fields, but no0–14pH/0–100%/positive resistivity completeness policy is enforced for these fields; coatingCondition accepts arbitrary bounded text server-side while frontend has eight options. | FAIL domain validation/option parity |
| CALC-14 | `minimumRequiredThickness` is computed in the calculator but not returned or used for life; `redoxPotential`, groundwaterCondition and some captured metadata do not affect its formulas. Mandatory inputs may imply unsupported model sensitivity. | PARTIAL field persistence; FAIL basis transparency |

These probes establish implementation behavior, not scientifically validated equations. No external standard was substituted for the supplied references, and no guessed engineering coefficients or production values were introduced.

## DOCX requirements coverage, sections 1–51

Each section is a requirement group, not one atomic field. A section FAIL is source-demonstrable even when its actual database contents/runtime are BLOCKED. The final ownership prose and communication table are included in the cross-module and safeguards rows below this table.

| DOCX § | Requirement group | Status | Evidence / missing behavior |
|---:|---|---|---|
| 1 | Connected engineering domain and owner communication | PARTIAL | Generic pipeline/assessment/report foundations exist; most EC source/derived connections absent |
| 2 | Navigation, drawer, full lists, GIS, actions, source/report routing | FAIL | Workflow register: disabled controls, no contextual drawers/source links/filter preservation |
| 3 | Eleven connected tabs, one domain | PARTIAL | Eleven labels/ten bodies; Overview absent; no connected EC data graph |
| 4 | Overview six defined KPIs/click behavior | FAIL | Generic fallback P:1846 |
| 5 | Read-only master context and immutable source-revision snapshots | FAIL | In-module master edit, unversioned JSON; no coating rehabilitation source |
| 6 | Coating categories and engineering findings | PARTIAL | Some labels/options exist; no indication assessment records; category/model mismatch |
| 7 | Coating survey/indication IDs and fields, no automatic defect | FAIL | No structured records, source IDs, confidence/doc links |
| 8 | Consume CP source records, no second compliance database | FAIL | Legacy manually entered potentials and deriveCpStatus |
| 9 | CP Support Adequate/Marginal/Inadequate/Unknown linked to evaluation | FAIL | Protected/Marginal/Not Protected calculation, no source evaluation ID |
| 10 | Governed soil/environment inputs and transport | FAIL | Manual soil fields; no LIMS/source import links |
| 11 | Soil survey/result/sample/date/value/unit/method/quality/source/doc identity | FAIL | Strict legacy schema lacks these record links |
| 12 | Keep raw measurement separate from interpretation | PARTIAL | Numeric inputs and result classification separate, but no governed distinct source records |
| 13 | Reference CP interference evidence without copying measurements | FAIL | Manual AC/DC/current inputs; no CP source finding |
| 14 | EC interference assessment linked to CP/location/action | FAIL | No assessment identity/record/source/action graph |
| 15 | Plan→perform/import→validate→map→review→finding survey flow | FAIL | Survey controls disabled |
| 16 | Document→Hub import, mapping, dedup, preview, accept, quarantine | FAIL | No EC import implementation |
| 17 | ILI runs/anomalies authoritative in ILI | FAIL | No EC correlation consumption; declaration text alone insufficient |
| 18 | Correlation ID, ILI/finding IDs, KP delta, match/engineering confidence | FAIL | Empty correlation table; no contract |
| 19 | ILI-owned growth, no unapproved duplicate calculation | FAIL | Growth chart unbound; no approved consumed matched-feature growth |
| 20 | Complete EC finding fields/source graph/owner/review/action/defect link | FAIL | No finding form or persistence |
| 21 | Controlled finding statuses/severities, separate from risk | FAIL | Chart subset only; no controlled workflow; legacy Risk Score persists |
| 22 | Match existing defect or reviewed candidate after confirmed damage | FAIL | Escalation button disabled; no dedup/review logic |
| 23 | Derived EC alerts; no copied raw alarms | FAIL | No derived alert records/rules; empty source legends only |
| 24 | Persistent CP + coating interpretation with originating source refs | FAIL | No duration/combination/source rule |
| 25 | Query existing historical data, no second history database | FAIL | No historical dashboard query; mutable generic history is not this feature |
| 26 | Historical correlation result references sources | FAIL | Empty chart, no model/source sample selection |
| 27 | Owned mechanism/threat/confidence rules, no credentials/transport | PARTIAL | Correct ownership copy and Hub link; rules/library persistence absent |
| 28 | Threat Severity / Concern Level terminology | PARTIAL | Config/dashboard headings corrected, legacy risk result remains |
| 29 | Versioned mechanism library with inputs/model/reference/approval | FAIL | Empty reduced-column library |
| 30 | Evidence-derived confidence ID and rule version | FAIL | Unconditional unavailable cards, no model |
| 31 | Read-only Pipeline/Segment/Asset/location/coating/GIS context | FAIL | Pipeline foundation only; required IDs/revisions missing; master edits exposed |
| 32 | CP Point/Compliance/Survey/CIPS/Interference refs; no manual re-entry | FAIL | None bound; manual input required by form |
| 33 | Approved CP engineering design/zone/deviation references | FAIL | No EC design-basis/criterion reference |
| 34 | Consume sensor measurements, Sensors owns hardware | FAIL | No governed EC measurement link |
| 35 | Limit unrelated SCADA coupling | PASS | EC page/calculator has no pressure/flow time-series ingestion; limited pressure context is pipeline/form context. Source-boundary check only |
| 36 | ECDA reuses governed EC records through four stages | PARTIAL | Existing ECDA reads saved assessment, lacks governed finding/survey/correlation IDs |
| 37 | Consume ILI feature/growth/location/confidence by IDs | FAIL | Empty ILI dashboard, no data calls |
| 38 | Confirmed physical damage only in Defect Manager | FAIL | Required controlled confirmation workflow absent; no duplicate defect was created by audit |
| 39 | EC indicators feed official Risk methodology | FAIL | Generic heuristic risk scores used downstream; no indicator contract |
| 40 | AI advisory, versioned source histories, no overwrite | UNVERIFIED | No complete EC source/forecast lineage contract demonstrated |
| 41 | One Document_ID, shared evidence references | FAIL | No EC document/evidence IDs |
| 42 | Authoritative EC summaries to Dashboard, no recalculation | FAIL | Generic risk counts, no EC summary indicators |
| 43 | Reports read authoritative EC assessment datasets | PARTIAL | Generic central report endpoint exists; ten-dashboard report actions unbound |
| 44 | Engineering-only manual inputs, no raw/master re-entry | FAIL | Manual CP/soil fields and in-module master editing |
| 45 | Controlled dropdown values | FAIL | Required workflow dropdowns missing/disabled; coating options differ; full reference option sets below |
| 46 | EC owns twelve derived domains, owners keep sources | FAIL | No implemented twelve-domain identity/source graph |
| 47 | Required record IDs | FAIL | Per-ID matrix below |
| 48 | Source and physical-condition deduplication | FAIL | Generic idempotency exists, semantic correlation absent |
| 49 | Per-source failure isolation, stale state, confidence reduction | FAIL | Unconditional Not Available cannot distinguish missing/stale/error; no freshness logic |
| 50 | Effective-dated historical revisions | FAIL | Mutable history, no revision contract |
| 51 | Engineer-reviewed connected architecture and downstream flow | FAIL | Most source/derived/workflow contracts absent |

### DOCX final communication and failure safeguards

| Requirement | Status | Evidence |
|---|---|---|
| Pipeline/Asset ownership | FAIL | Pipeline owner API exists but EC lacks required read-only source graph and source revisions |
| CP Monitoring ownership | FAIL | Manual potentials + local status calculation in legacy form |
| ILI ownership and growth | FAIL | No consumed ILI link/growth source; no copied ILI anomaly rows observed in dashboard |
| Sensors owns physical devices/raw series | PARTIAL | No hardware duplicate introduced here, but EC consumption absent |
| Integration Hub owns transport | PARTIAL | Hub route/link exists; EC acceptance/rejection mapping absent |
| Document Management owns one file identity | FAIL | EC evidence links absent |
| EC owns interpretations/findings/indicators/confidence | FAIL | Generic heuristic assessment only |
| Finding ≠ Defect | FAIL | Required confirmed-damage escalation/correlation absent; no automatic defect creation observed in EC code |
| Threat ≠ Risk | FAIL | Legacy score persistence and downstream risk presentation |
| Formal follow-up creates one central Action_ID | FAIL | No central action call from this module |
| Source values retain timestamp/quality/freshness/lineage | FAIL | Generic savedAt/author fields cannot establish measurement lineage |
| Effective-dated assessment revisions | FAIL | DATA-03 |
| Correlation IDs throughout findings | FAIL | Required IDs absent from contracts |
| Same coating indication/location across surveys deduplicated | FAIL | No semantic correlation workflow |
| CP unavailable → stale/unavailable + reduced confidence | FAIL source / BLOCKED runtime fault test | No source read/freshness/confidence model |
| ILI unavailable → assessment accessible, correlation unavailable/stale | FAIL source / BLOCKED runtime fault test | No ILI query or independent state model |
| GIS unavailable → tables remain functional | FAIL source / BLOCKED runtime fault test | Tables and map remain unconditional placeholders |
| Documents unavailable → structured assessment remains available | PARTIAL legacy separation / BLOCKED runtime fault test | No connected evidence subsystem to fault-test |
| Failed survey import preserves existing records | UNVERIFIED / BLOCKED runtime | No import implementation or isolated test dataset |

### Required identifiers

The 23 entries below are the minimum ID list in §47. Other sections additionally require correlation and confidence IDs. A label ending `ID` in an empty table is not an implemented identity or foreign-key relationship.

| Required ID | Current EC mapping | Status |
|---|---|---|
| Pipeline_ID | Assessment.pipelineId / ExternalPipeData.pipelineId relation to Pipeline | PARTIAL; actual row integrity BLOCKED |
| Segment_ID | Segment owner model exists; EC contract does not link it | FAIL |
| Asset_ID | Asset owner model exists; EC contract does not link it | FAIL |
| External_Corrosion_Assessment_ID | Generic Assessment.id with type External; independent history assessmentId | PARTIAL; no effective revision identity |
| Coating_Survey_ID | Absent | FAIL |
| Coating_Indication_ID | Absent | FAIL |
| Soil_Survey_ID | Absent | FAIL |
| Soil_Result_ID / Lab_Result_ID reference | Absent | FAIL |
| External_Interference_Assessment_ID | Absent | FAIL |
| Field_Survey_ID | Absent | FAIL |
| Field_Survey_Indication_ID | Absent | FAIL |
| External_Corrosion_Finding_ID | Absent | FAIL |
| External_Corrosion_Indicator_ID | Absent | FAIL |
| CP_Point_ID | CpTestPoint owner exists; no EC link | FAIL |
| CP_Compliance_Result_ID | CpReadingEvaluation owner exists; no EC link | FAIL |
| CP_Survey_ID | CpMonitoringSurvey owner exists; no EC link | FAIL |
| CIPS_Run_ID | No EC reference contract | FAIL |
| CP_Interference_Finding_ID | No EC reference contract | FAIL |
| ILI_Run_ID | IliInspectionRun owner exists; no EC link | FAIL |
| ILI_Anomaly_ID | IliAnomaly owner exists; no EC link | FAIL |
| Action_ID | No central-action call/link | FAIL |
| Defect_ID | No reviewed confirmed-defect link | FAIL |
| Document_ID | Document owner models exist; no EC evidence link | FAIL |
| External_Corrosion_ILI_Link_ID (§18) | Absent | FAIL |
| External_Corrosion_Confidence_ID + rule version (§30) | Absent | FAIL |

### Controlled options: DOCX versus implementation

These are DOCX recommended categories, not invented screenshot-menu contents or proof of approved configuration. Exact UI options from existing form declarations are in the source inventory.

| Field | DOCX options | Current EC source | Status |
|---|---|---|---|
| Coating Condition | Good; Fair; Poor; Very Poor; Unknown (elsewhere Unknown / Not Assessed) | Excellent; Very Good; Good; Fair; Poor; Very Poor; Failed; Unknown. Backend arbitrary short text. Calculator uses another vocabulary | FAIL controlled mapping |
| External Corrosion Threat | Low; Moderate; High; Critical; Unknown | No selector/derived indicator; legacy risk High/Medium/Low | FAIL |
| Finding Severity | Low; Medium; High; Critical | No form/options; chart High/Medium/Low/Not Specified only | FAIL |
| Confidence | Low; Medium; High; §30 adds derived Insufficient | No model/selector; cards imply percentages, no approved percentage→category rule | FAIL |
| Survey Method | CIPS; DCVG; ACVG; Close Interval; Coating Inspection; Excavation; Other. §15 additionally Interference Survey/Other Approved | Chart CIPS/DCVG/ACVG/Other; no controlled workflow | FAIL |
| Interference Type | AC; DC Stray Current; Telluric; Foreign Structure; Other | No workflow selector, AC/DC chart only | FAIL |
| Finding Status | Open; Under Review; Monitoring; Action Required; Escalated; Closed; Deferred | Filter only All Statuses; chart subset Open/Under Review/Action Required/Closed | FAIL |
| Correlation Status | Matched; Unverified; No Match; Review Required | Static Matched/Unverified/No ILI Match; no selectable workflow; Growth Case appears as a separate reference interpretation | FAIL |

Other current form dropdowns: Holiday Found No/Yes; Cinder and Coke No/Yes; CP Method SCP/ICCP; CP Measurement Method CP Polarization/Polarized Potential(value `CP Polarized Potential`); manual override No Override/Acceptable/Marginal-Review Required/Unacceptable/Not Assessed/Insufficient Data; groundwater presence seven options, condition nine, soil type sixteen; AC Current Density/Pipe AC Voltage to Remote Earth(value `AC Voltage to Remote Earth`). Full exact values/labels are preserved with each declaration in `source-inventory.json`. Shared material/grade option source is `frontend/src/lib/pipe-material-options.ts`:22, shared coating option source `frontend/src/lib/pipe-coating-options.ts`:6. Backend enum source is `backend/src/validation/assessmentValidation.ts`:9–219. Cataloging options is not validating them against an authoritative master library.

Coating dropdown currently has Bare, Asphalt Enamel, Wrap-Tape, High-Temperature Wrap Tape, DENSO Petrolatum Tape, Heat-Shrink Sleeve, Coal-Tar, FBE/PE/PP, FBE, PE, PP, IPP, Three-Layer Polypropylene(3LPP), Other. Coating Type Mix references 3LPE and Coal Tar Enamel without a governed mapping to these values. FAIL taxonomy/source mapping; do not equate PE with 3LPE automatically.

## Executed verification and blockers

| Check | Result | Current evidence / limitation |
|---|---|---|
| Frontend typecheck | PASS | `npm.cmd --prefix frontend run typecheck`, exit0; [log](artifacts/external-corrosion-audit/frontend-typecheck.log) |
| Backend typecheck | PASS | `npm.cmd --prefix backend run typecheck`, exit0; [log](artifacts/external-corrosion-audit/backend-typecheck.log) |
| Backend build | PASS | `npm.cmd --prefix backend run build`, exit0; [log](artifacts/external-corrosion-audit/backend-build.log) |
| Frontend production build | PASS | `npm.cmd --prefix frontend run build`, exit0; [log](artifacts/external-corrosion-audit/frontend-build.log). Build success does not prove authenticated route behavior |
| API health | PASS transport only | GET localhost:4002/api/health→200 `status:ok`; health handler does not query DB |
| Auth boundary | PASS anonymous rejection only | GET auth/me, assessments, external-pipe-data, cp-monitoring, ili→401 Unauthorized; no bearer token supplied; guard rejects before user/DB lookup |
| Authorized API payloads and owner/role isolation | BLOCKED | No authorized accessible session; no credential injection or test-user creation |
| Actual database schema, rows, totals and lineage | BLOCKED | No verified isolated database identity/read-only target or authorized source access. Prisma source is not proof of applied migrations. No connection opened |
| Browser desktop1440×1000 | BLOCKED | Fresh screenshot shows `Checking your session…`; path remained protected URL; zero tab buttons, no authenticated content |
| Browser tablet768×1024 | BLOCKED | Fresh capture has zero tab buttons, no authenticated content |
| Browser mobile390×844 | BLOCKED | Redirected `/login`, password input visible, zero tab buttons |
| Existing dedicated browser session | BLOCKED | Read-only GET127.0.0.1:9334/json/list→200, zero page targets; no user profile/token read |
| All tab clicks, drawers, row menus, GIS, filter/pagination, permissions, reports/downloads | BLOCKED runtime; source gaps FAIL as inventoried | Cannot reach protected dashboard; no screenshot parity/functional PASS claimed |
| Save/update/delete/import/acknowledge/notification/escalation workflows | BLOCKED | Would require permitted mutation on an isolated disposable target; prohibited data mutation was not attempted |
| Pure calculation probes | PASS execution; findings FAIL/UNVERIFIED as above | [results](artifacts/external-corrosion-audit/calculation-results.json); deterministic implementation observations, no engineering certification |
| Existing broader test suites | UNVERIFIED, not run | No dedicated EC end-to-end suite found. CP design tests cover another module; storage/validation suites can mutate records and were not run on an unverified target |

Initial `npm` calls were blocked by PowerShell script policy; using `npm.cmd` resolved that. Sandbox Node resolution hit EPERM on the user directory; approved out-of-sandbox execution completed the checks. Neither initial tool failure is an application typecheck failure. Audit probe harness had a syntax typo, was corrected, then exited0; application source was untouched.

Screenshots: [desktop access](artifacts/external-corrosion-audit/desktop-access.png), [tablet access](artifacts/external-corrosion-audit/tablet-access.png), [mobile access](artifacts/external-corrosion-audit/mobile-access.png). They establish an access boundary only and must not be presented as inspected External Corrosion layouts.

## Required correction order — approval required before implementation

1. Resolve the known calculation/display inconsistencies (CALC-02–06/08), missing-value semantics and legacy Risk Score terminology/propagation. Use approved engineering definitions; do not guess a replacement equation or rename persisted fields without compatibility review.
2. Define the minimum canonical source-ID, snapshot/revision and confidence contracts using the existing architecture. Wire read-only owner data and explicitly distinguish unavailable, stale, unknown and failed sources. Preserve source units, timestamps, quality and versions. Schema/migration changes remain prohibited; if any requirement cannot be met within the existing schema, document it as blocked and request a separate scope change.
3. Implement Overview and actual data bindings/aggregations with documented populations, deduplication, scope and historical periods. Reconcile every visible value to its owner; do not fill dashboards with image samples.
4. Wire contextual drawers/full records/lists/GIS/source navigation, central action registration, reviewed defect escalation and centralized reports/export. Add governed survey import only through Document Management/Integration Hub; no direct spreadsheet insertion or duplicate evidence files.
5. Verify source-authorized configuration, controlled options, permissions, revisions, confidence/freshness and failure isolation; then review layout gaps while retaining the existing shell, routes, components and styling constraints.
6. With a user-completed normal login in a controllable browser and an identified authorized read-only data target, repeat all33 tab/viewport checks and trace actual records. Write workflows require separate disposable-test authorization; otherwise retain BLOCKED.

No fixes have been implemented. Approval is needed because the user explicitly requested **“AUDIT FIRST — DO NOT MODIFY CODE”** and approval before fixes. This report is the concrete gap inventory for that decision. A safe implementation approval cannot be interpreted as permission for schema/migration changes or production/staging data mutation.

## Appendix: legacy assessment field mapping

The 50 exact field declarations (labels, units, options, readOnly flags, helper text and sections) are preserved in the linked source inventory. The companion field inventory expands every field into its current storage path and owner classification. All live-value mappings remain BLOCKED; storing a scalar in JSON is not proof of source lineage.

| # / source line | Field ID / label | Unit / options / state | Current storage / owner requirement | Status |
|---|---|---|---|---|
| 1 / P:130 | `pipelineName` — Pipeline Name | — | `input.pipelineName` in Assessment/ExternalPipeData/Report JSON. Pipeline/Asset Master; current scalar snapshot lacks source revision | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 2 / P:138 | `pipeLocationId` — Pipe Location/ID | — | `input.pipeLocationId` in Assessment/ExternalPipeData/Report JSON. Pipeline/Asset Master; current scalar snapshot lacks source revision | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 3 / P:146 | `pipeMaterial` — Pipe Material | —; Shared material catalog (material-grade-options.json) | `input.pipeMaterial` in Assessment/ExternalPipeData/Report JSON. Pipeline/Asset Master; current scalar snapshot lacks source revision | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 4 / P:153 | `pipeGrade` — Pipe Grade | —; Material-dependent shared grade catalog (material-grade-options.json) | `input.pipeGrade` in Assessment/ExternalPipeData/Report JSON. Pipeline/Asset Master; current scalar snapshot lacks source revision | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 5 / P:160 | `pipeAge` — Pipe Age | years | `input.pipeAge` in Assessment/ExternalPipeData/Report JSON. Pipeline/Asset Master; current scalar snapshot lacks source revision | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 6 / P:161 | `pipeLength` — Pipe Length | km | `input.pipeLength` in Assessment/ExternalPipeData/Report JSON. Pipeline/Asset Master; current scalar snapshot lacks source revision | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 7 / P:170 | `pipeIdDiameter` — Pipeline Outside Diameter (OD) | mm/cm/m/inch/ft | `input.pipeIdDiameter` in Assessment/ExternalPipeData/Report JSON. Pipeline/Asset Master; current scalar snapshot lacks source revision | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 8 / P:180 | `smys` — SMYS | MPa | `input.smys` in Assessment/ExternalPipeData/Report JSON. Pipeline/Asset Master; current scalar snapshot lacks source revision | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 9 / P:189 | `maop` — MAOP | bar | `input.maop` in Assessment/ExternalPipeData/Report JSON. Pipeline/Asset Master; current scalar snapshot lacks source revision | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 10 / P:198 | `operatingPressure` — Operating Pressure | bar/MPa/kPa/psi | `input.operatingPressure` in Assessment/ExternalPipeData/Report JSON. Pipeline/Asset Master; current scalar snapshot lacks source revision | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 11 / P:207 | `installationYear` — Installation Year | year | `input.installationYear` in Assessment/ExternalPipeData/Report JSON. Pipeline/Asset Master; current scalar snapshot lacks source revision | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 12 / P:215 | `inspectionYear` — Inspection Year | year | `input.inspectionYear` in Assessment/ExternalPipeData/Report JSON. Inspection context/source evidence | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 13 / P:223 | `wallThickness` — Wall Thickness | mm/in | `input.wallThickness` in Assessment/ExternalPipeData/Report JSON. Pipeline/Asset Master; current scalar snapshot lacks source revision | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 14 / P:232 | `coatingType` — Coating Type | —; Shared coating catalog (dropdown-source-catalog.json) | `input.coatingType` in Assessment/ExternalPipeData/Report JSON. Pipeline/Asset Master; current scalar snapshot lacks source revision | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 15 / P:239 | `coatingAge` — Coating Age | years; read-only | `input.coatingAge` in Assessment/ExternalPipeData/Report JSON. EC interpretation; CP criterion source remains CP Monitoring | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 16 / P:249 | `holidayFound` — Holiday Found | —; No; Yes | `input.holidayFound` in Assessment/ExternalPipeData/Report JSON. Inspection context/source evidence | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 17 / P:259 | `holidaySize` — Holiday Size | mm | `input.holidaySize` in Assessment/ExternalPipeData/Report JSON. Inspection context/source evidence | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 18 / P:268 | `coatingCondition` — Coating Condition | —; Excellent; Very Good; Good; Fair; Poor; Very Poor; Failed; Unknown | `input.coatingCondition` in Assessment/ExternalPipeData/Report JSON. EC interpretation; CP criterion source remains CP Monitoring | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 19 / P:284 | `cpSystemType` — CP Method | —; Sacrificial Cathodic Protection (SCP); Impressed Current Cathodic Protection (ICCP) | `input.cpSystemType` in Assessment/ExternalPipeData/Report JSON. CP Monitoring/source survey; current manual scalar has no source ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 20 / P:301 | `cpInputType` — CP Measurement Method | —; CP Polarization; Polarized Potential [CP Polarized Potential] | `input.cpInputType` in Assessment/ExternalPipeData/Report JSON. CP Monitoring/source survey; current manual scalar has no source ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 21 / P:312 | `cpInputValue` — CP Input Value | mV polarization / V vs CSE polarized potential (dynamic) | `input.cpInputValue` in Assessment/ExternalPipeData/Report JSON. CP Monitoring/source survey; current manual scalar has no source ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 22 / P:320 | `onPotential` — ON Potential | mV | `input.onPotential` in Assessment/ExternalPipeData/Report JSON. CP Monitoring/source survey; current manual scalar has no source ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 23 / P:328 | `offPotential` — OFF Potential | mV | `input.offPotential` in Assessment/ExternalPipeData/Report JSON. CP Monitoring/source survey; current manual scalar has no source ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 24 / P:336 | `referenceElectrode` — Reference Electrode | — | `input.referenceElectrode` in Assessment/ExternalPipeData/Report JSON. CP Monitoring/source survey; current manual scalar has no source ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 25 / P:343 | `cpStatus` — CP Status | —; read-only | `input.cpStatus` in Assessment/ExternalPipeData/Report JSON. EC interpretation; CP criterion source remains CP Monitoring | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 26 / P:351 | `manualCpStatusOverride` — Manual CP Status Override | —; No Override; Acceptable; Marginal / Review Required; Unacceptable; Not Assessed; Insufficient Data | `input.manualCpStatusOverride` in Assessment/ExternalPipeData/Report JSON. EC interpretation; CP criterion source remains CP Monitoring | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 27 / P:366 | `cpStatusOverrideReason` — Override Reason | — | `input.cpStatusOverrideReason` in Assessment/ExternalPipeData/Report JSON. EC interpretation; CP criterion source remains CP Monitoring | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 28 / P:374 | `soilPh` — Soil pH | pH | `input.soilPh` in Assessment/ExternalPipeData/Report JSON. Governed lab/field/Sensors result via Hub; current scalar lacks Result_ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 29 / P:382 | `soilType` — Soil Type | —; Clay; Silt; Sand; Loam; Gravel; Peat / Organic Soil; Calcareous Soil; Saline Soil; Gatch Soil; Excavated Soil / Backfill Material; Made Ground / Fill; Waterlogged Soil; Soft Rock; Hard Rock; Unknown; Other | `input.soilType` in Assessment/ExternalPipeData/Report JSON. Governed lab/field/Sensors result via Hub; current scalar lacks Result_ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 30 / P:407 | `soilMoisture` — Soil Moisture | % | `input.soilMoisture` in Assessment/ExternalPipeData/Report JSON. Governed lab/field/Sensors result via Hub; current scalar lacks Result_ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 31 / P:408 | `soilResistivity` — Soil Resistivity | ohm-m | `input.soilResistivity` in Assessment/ExternalPipeData/Report JSON. Governed lab/field/Sensors result via Hub; current scalar lacks Result_ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 32 / P:418 | `soilTemperature` — Soil Temperature | C/F/K | `input.soilTemperature` in Assessment/ExternalPipeData/Report JSON. Governed lab/field/Sensors result via Hub; current scalar lacks Result_ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 33 / P:427 | `chloride` — Chloride | mg/kg | `input.chloride` in Assessment/ExternalPipeData/Report JSON. Governed lab/field/Sensors result via Hub; current scalar lacks Result_ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 34 / P:428 | `sulphate` — Sulphate | mg/kg | `input.sulphate` in Assessment/ExternalPipeData/Report JSON. Governed lab/field/Sensors result via Hub; current scalar lacks Result_ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 35 / P:429 | `sulphideH2S` — Sulphide/H2S | mg/kg | `input.sulphideH2S` in Assessment/ExternalPipeData/Report JSON. Governed lab/field/Sensors result via Hub; current scalar lacks Result_ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 36 / P:430 | `cinderAndCoke` — Cinder and Coke | —; No; Yes | `input.cinderAndCoke` in Assessment/ExternalPipeData/Report JSON. Governed lab/field/Sensors result via Hub; current scalar lacks Result_ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 37 / P:441 | `soilCarbonateContent` — Soil Carbonate Content | mg/kg | `input.soilCarbonateContent` in Assessment/ExternalPipeData/Report JSON. Governed lab/field/Sensors result via Hub; current scalar lacks Result_ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 38 / P:451 | `redoxPotential` — Redox Potential | mV | `input.redoxPotential` in Assessment/ExternalPipeData/Report JSON. Governed lab/field/Sensors result via Hub; current scalar lacks Result_ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 39 / P:452 | `groundwaterPresence` — Groundwater Presence | —; No Groundwater; Seasonal Groundwater; Seepage Water; Permanent Groundwater; Mineral-Rich Groundwater; Waterlogged Area; Unknown | `input.groundwaterPresence` in Assessment/ExternalPipeData/Report JSON. Governed lab/field/Sensors result via Hub; current scalar lacks Result_ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 40 / P:467 | `groundwaterCondition` — Groundwater Condition | —; Not Applicable; Fresh Water; Mineral-Rich Water; Brackish Water; Saline Water; Contaminated Water; Stagnant Water; Flowing Water; Unknown / Not Tested | `input.groundwaterCondition` in Assessment/ExternalPipeData/Report JSON. Governed lab/field/Sensors result via Hub; current scalar lacks Result_ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 41 / P:485 | `measuredThickness` — Measured Thickness | mm | `input.measuredThickness` in Assessment/ExternalPipeData/Report JSON. Survey/NDT/ILI evidence source, with lineage; current manual scalar | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 42 / P:493 | `corrosionLength` — Corrosion Length | mm | `input.corrosionLength` in Assessment/ExternalPipeData/Report JSON. Survey/NDT/ILI evidence source, with lineage; current manual scalar | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 43 / P:501 | `corrosionWidth` — Corrosion Width | mm | `input.corrosionWidth` in Assessment/ExternalPipeData/Report JSON. Survey/NDT/ILI evidence source, with lineage; current manual scalar | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 44 / P:509 | `previousInspectionDate` — Previous Inspection Date | — | `input.previousInspectionDate` in Assessment/ExternalPipeData/Report JSON. Survey/NDT/ILI evidence source, with lineage; current manual scalar | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 45 / P:515 | `previousRemainingThickness` — Previous Remaining Thickness | mm | `input.previousRemainingThickness` in Assessment/ExternalPipeData/Report JSON. Survey/NDT/ILI evidence source, with lineage; current manual scalar | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 46 / P:523 | `minimumRequiredThickness` — Minimum Required Thickness | mm; read-only | `input.minimumRequiredThickness` in Assessment/ExternalPipeData/Report JSON. EC interpretation; CP criterion source remains CP Monitoring | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 47 / P:533 | `dcCurrentDensity` — DC Current Density | A/m^2 | `input.dcCurrentDensity` in Assessment/ExternalPipeData/Report JSON. CP Monitoring/source survey; current manual scalar has no source ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 48 / P:542 | `acInputType` — AC Input Type | —; AC Current Density; Pipe AC Voltage to Remote Earth [AC Voltage to Remote Earth] | `input.acInputType` in Assessment/ExternalPipeData/Report JSON. CP Monitoring/source survey; current manual scalar has no source ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 49 / P:554 | `acInputValue` — AC Input Value | A/m² density / V voltage (dynamic) | `input.acInputValue` in Assessment/ExternalPipeData/Report JSON. CP Monitoring/source survey; current manual scalar has no source ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |
| 50 / P:562 | `strayCurrentDensity` — Stray Current Density | A/m^2 | `input.strayCurrentDensity` in Assessment/ExternalPipeData/Report JSON. CP Monitoring/source survey; current manual scalar has no source ID | PARTIAL scalar storage; FAIL lineage; BLOCKED live value |

Additional shared form fields: Inspection Date (`inspectionDate`, envelope, not in the50 declarations); selected `pipelineId`; conditional Specify Pipe Material (`pipeMaterialOther`), Specify Pipe Grade (`pipeGradeOther`), Specify External Coating (`coatingTypeOther`). Current source/default-only `calculatedCpStatus`, OD/pressure/wall-thickness display metadata and temperature input metadata are in the initial/type/schema contracts. They are not additional verified measurements. Inspection Date is lost through the history reconstruction described in DATA-04.

DOCX section-group classification totals: PARTIAL 8/51 (15.69%); FAIL 41/51 (80.39%); PASS 1/51 (1.96%); UNVERIFIED 1/51 (1.96%). These percentages describe the section-group verdicts above, not atomic coverage or end-to-end completion.
