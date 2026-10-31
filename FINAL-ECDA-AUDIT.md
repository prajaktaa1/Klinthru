# Final ECDA audit

Scope: IMG-05–10 frontend implementation; IMG-01–04 retained; IMG-11 comparison only. Screenshot values below are reference transcriptions, never application records. No ECDA backend/schema changes are authorized. Status definitions: NEW = new local view; UPDATE = existing view binding; UNCHANGED = preserved; CONFLICT = reference contradicts ownership/another reference; UNVERIFIED = no validated semantics; MISSING FIELD — APPROVAL NEEDED = authoritative persistence/link absent. Pending verification is not PASS.

## Ownership and inspected source map

Read ECDA.docx sections 1–52, both closing architecture summaries, and the final communication/ID/safeguard lists. Document prose is requirements input, not authority to create the proposed tables. Four lifecycle stages only. CP/External/ILI retain source data; findings are not defects; ECDA concern is not official risk. Central Action_ID and Document_ID only. No correlations without approved rules and source links. Stage gates, immutable approved ECDA revisions, and exact approved evidence snapshots are absent and must not be implied by a read-only UI.

| Key | Backend / schema / API / frontend mapping | Classification |
|---|---|---|
| P | backend/src/routes/pipelines.ts; Prisma Pipeline.id, pipelineCode, pipelineName; GET /api/pipelines → fetchPipelines; existing selectedPipelineId/pipelines | UNCHANGED |
| S | backend/src/routes/assetMaster.ts; Segment.id, pipelineId, segmentId, startKp, endKp; GET /api/asset-master/segments?pipelineId → fetchMasterSegments; existing segmentContext | UNCHANGED |
| C | backend/src/routes/cpMonitoring.ts, backend/src/cpMonitoring; CpMonitoringSurvey, CpTestPoint, CpReadingHistory, CpReadingEvaluation, CpCriteriaVersion; GET /api/cp-monitoring/:pipelineId and /api/cp-monitoring/test-points via existing clients. IDs remain CP-owned; ON/OFF, units, electrodes and versions retain source meanings. | UNCHANGED source context; ECDA evidence membership UNVERIFIED |
| E | backend/src/routes/assessments.ts; Assessment.id, pipelineId, type, input, result, inspectionDate; GET /api/assessments → fetchAssessments. Only Internal/External types, not ECDA. | UNCHANGED source context; not an ECDA finding, approval or history |
| I | backend/src/routes/ili.ts, backend/src/ili; IliInspectionRun.id, IliAnomaly.id, pipelineId, runId; existing readiness/runs/anomalies GETs and useIndirectSources. | UNCHANGED source context; ECDA correlation UNVERIFIED |
| D | backend/src/routes/documents.ts; Managed_Document.Document_ID/Title/Document_Type/Document_Category/Description/Owner_ID; Document_Version.Document_Version_ID/Document_Revision/File_Name/MIME_Type/File_Size_Bytes/Approval_Status/Uploaded_By_ID/Uploaded_At; Document_Link.Document_Link_ID/Document_ID/Document_Version_ID/Pipeline_ID/Segment_ID/Asset_ID. GET /api/documents?pipelineId&segmentId&q&approvalStatus&page&pageSize → fetchDocuments; GET /api/documents/:documentId/versions/:versionId/download → downloadDocumentVersion. Existing /document-upload owns repository. | UPDATE real source references only; ECDA_Assessment_ID/stage link missing |
| X | No ECDA models in backend/prisma/schema.prisma or ECDA router in backend/src/app.ts. No canonical ECDA assessment, stage, finding, reassessment, correlation, methodology, gate, revision or snapshot API. No central Action or Defect schema/API. backend/src/routes/reports.ts explicitly marks canonical_action_register_not_implemented. | MISSING FIELD — APPROVAL NEEDED; UI renders Not Available, mutation/export/approval disabled |

All UI references below are local functions in frontend/src/components/ecda-assessment-workspace.tsx. Shared components, shell/sidebar, other modules, API clients and routes stay unchanged. Each grouped item in a reference table maps to the source key stated; all values in an X row map individually to Not Available, never to screenshot constants.

## Common screenshot chrome (IMG-05–10)

Verbatim: KLINTHRU; PIPELINE INTEGRITY PLATFORM / Pipeline Integrity Platform / PIPELINE INTEGRITY; Integrity Assessment > ECDA Assessment; ECDA Assessment; Execute the External Corrosion Direct Assessment (ECDA) lifecycle from pre-assessment to post-assessment, integrating CP, external corrosion, ILI and inspection data.; Export; + New ECDA Assessment; PL-001; Main Pipeline; Pipeline; SEG-03; KP 48.220 - 96.780; Segment; Onshore; Environment; 15 Mar 2026; Target Completion; In Progress; Overall Status; 68%; Assessment Progress. Tabs: Overview, Pre-Assessment, Indirect Inspection, Direct Examination, Post-Assessment, Findings, Actions, Documents, Trends & Historical, Configuration. Bell badge 3 where shown; JD; John Doe / John Davis; KLINTHRU / Integrity Engineer; Collapse; Help & Support where shown. Search KLINTHRU... appears IMG-07/10.

P/S map pipeline, segment and KP to actual existing IDs/values. Assessment environment, date, status and progress are X. Export/new assessment unsupported. Screenshot sidebar, branding, user names/notifications are not ECDA data: UNCHANGED existing shell; differing source sidebars CONFLICT and not copied. Tab order and four stages UNCHANGED.

## IMG-05 — extraction and mapping (before implementation)

| Visible reference content, verbatim | Binding / local view | Classification |
|---|---|---|
| Validated Findings; 27; From 34 initial indications; ↓ 21%; vs. pre-assessment | X; RealPostAssessment KPI | UPDATE; MISSING FIELD — APPROVAL NEEDED |
| Reassessment Interval; 5 years; Recommended interval; Approved | X; ECDA_Reassessment_ID, recommended interval, basis, effective/next date, approver/date absent | MISSING FIELD — APPROVAL NEEDED |
| Coverage Evaluation; 92%; Effective coverage; Comprehensive; Confidence Score; 87%; Assessment confidence; High | X; approved scope/coverage/confidence result absent | MISSING FIELD — APPROVAL NEEDED |
| Final Assessment Outcome; Acceptable; No immediate integrity threat. Manage and monitor. | X; final approved ECDA conclusion absent | MISSING FIELD — APPROVAL NEEDED |
| Findings Summary; axis 0, 5, 10, 15, 20; External Corrosion 14; Coating Damage 6; CP Related 4; Mechanical Damage 2; Other 1; Total 27 | X; categories retained, chart unavailable without findings | NEW UI; MISSING FIELD — APPROVAL NEEDED |
| Remaining Threat Matrix; Consequence (High, Medium, Low); Likelihood (Low, Medium, High); cells top-to-bottom: 0/1/0; 3/4/1; 12/6/0 | X; display Residual ECDA Concern Matrix, Indication Severity / Evidence / Confidence; no cells plotted | CONFLICT: official likelihood/consequence semantics; approved concern matrix rules absent |
| Coverage & Confidence; 92% Inspection Coverage; Assessed 92%; Not Assessed 8%; 87% Assessment Confidence; High 87%; Medium 11%; Low 2% | X; no rings, percentages or computed scores without approved result | MISSING FIELD — APPROVAL NEEDED |
| Remediation Recommendations; View All (6); High: Excavate and repair coating defect at KP 52.340 / External corrosion feature with active coating breakdown; Medium: Improve CP levels between KP 60.200 – 61.000 / Low CP potential and coating holidays; Medium: Monitor and trend corrosion growth at KP 71.560 / Stable feature, no immediate action; Low: Repair minor coating damage at KP 89.120 / Isolated feature, low risk; row chevrons | X; recommendation/priority/source/action link table; no generic External recommendation relabelled as approved ECDA output | MISSING FIELD — APPROVAL NEEDED |
| Closure Criteria; All significant indications assessed; Findings validated with field data; Remediation actions defined; Risk within acceptable limits; Management review completed; Final approval obtained; first five check marks, final empty circle | X; no checked/completed states; risk criterion needs Risk_ID or approved ECDA concern criterion | CONFLICT / MISSING FIELD — APPROVAL NEEDED |
| Management Review Status; Completed; Technical Review ✓ 12 Mar 2026 A. Williams; Risk Review ✓ 13 Mar 2026 S. Patel; Integrity Manager ✓ 14 Mar 2026 R. Chen; HSE Review ✓ 14 Mar 2026 L. Martinez | X; review/role/date/owner/status table; risk review distinguished from ECDA concern | MISSING FIELD — APPROVAL NEEDED |
| Approval Workflow; Assessment Complete / 14 Mar 2026 / A. Williams; Management Review / 14 Mar 2026 / R. Chen; Final Approval / Pending / M. Thompson; Assessment Closed / Not Started / - | X; status list without asserted gates or success markers | MISSING FIELD — APPROVAL NEEDED |
| Linked Report Generation; Generate and download the final ECDA assessment report and supporting documents.; ECDA Final Report / PDF · 4.2 MB; Findings Register / XLSX · 1.1 MB; Risk Assessment Summary / PDF · 1.8 MB; Management Summary / PDF · 0.9 MB; Generate (four buttons) | X + D only after approved Report_Run_ID/Document_ID membership; no private PDFs or invented files; disabled Generate | MISSING FIELD — APPROVAL NEEDED |

Conflict: screenshot has approved reassessment, acceptable outcome and completed management review while final approval is pending and common header stays In Progress/68%. These are distinct attributes; no inferred approval. Existing PostAssessmentDemo remains intact. Existing REAL generic External evidence remains separately labelled historical context, never confirmed ECDA findings or official risk.

Implementation and verification results will be appended after each image.

IMG-05 implementation: UPDATE RealPostAssessment using existing Frame/OverviewPanel/KpiCard/PreAssessmentFields/OverviewTable. All requested sections covered, plus explicit reassessment basis. Historical External recommendation preserved as separate source context. DEMO untouched. Approved ECDA outcomes/revisions/gates remain unavailable, not simulated.

## IMG-06 — extraction and mapping (before implementation)

All following entries map individually to X unless explicitly P/S; target RealEcdaFindings. No generic Assessment or ILI anomaly is converted into an ECDA finding. Classification NEW UI / MISSING FIELD — APPROVAL NEEDED for finding fields, counts, filters, evidence membership, links and drawer; UNVERIFIED for reconciliation; CONFLICT for official risk terminology and source stage.

- KPI cards: Total Findings 42 / +6 since last update; Critical 5 / 12%; High 11 / 26%; Medium 18 / 43%; Low 8 / 19%; Closed 24 / 57%.
- Findings by Severity: y-axis 0, 5, 10, 15, 20; Critical 5, High 11, Medium 18, Low 8. Findings by Status: center 42 Findings; Open 14 (33%); In Progress 8 (19%); Closed 18 (43%); Deferred 2 (5%). CONFLICT: Closed card 24 versus chart 18.
- Filters: Pipeline / PL-001 - Main Pipeline (P); Segment / SEG-03 (KP 48.220 - 96.780) (S); Source Stage / All Stages; Severity / All Severities; Status / All Statuses; Clear Filters; Search findings... . X filters disabled; actual P/S selectors retained.
- Register headers: checkbox; ID; KP / Location; Source Stage; Description; Severity; Confidence; Status; Linked Action; Linked Defect; ILI/CP Evidence; Responsible Engineer; vertical ellipsis; each row checkbox and ellipsis.

| ID | KP / Location | Source Stage | Description | Severity | Confidence | Status | Linked Action | Linked Defect | ILI/CP Evidence | Responsible Engineer |
|---|---|---|---|---|---|---|---|---|---|---|
| FND-001 | KP 52.340 | ILI Analysis | External corrosion anomaly with metal loss indication. | Critical | High | Open | ACT-012 | DEF-0045 | ILI-2024-137 | Sarah Mitchell |
| FND-002 | KP 55.120 | CP Assessment | Low CP protection levels detected. | High | Medium | In Progress | ACT-018 | - | CP-2024-018 | James Wilson |
| FND-003 | KP 61.875 | Indirect Inspection | Coating disbondment suspected from DCVG. | High | High | Open | ACT-020 | DEF-0048 | DCVG-2024-07 | Priya Shah |
| FND-004 | KP 67.210 | Direct Examination | Coating holiday confirmed. | Medium | Medium | Closed | ACT-008 | DEF-0039 | VIS-2024-112 | Michael Tan |
| FND-005 | KP 72.455 | ILI Analysis | MFL anomaly, depth < 10% WT. | Medium | Low | Open | - | DEF-0046 | ILI-2024-201 | Laura Chen |
| FND-006 | KP 78.300 | CP Assessment | Intermittent CP readings below criteria. | Low | Medium | In Progress | ACT-021 | - | CP-2024-021 | Daniel Roberts |
| FND-007 | KP 83.910 | Indirect Inspection | Anomalous coating signal in high consequence area. | Critical | High | Open | ACT-027 | DEF-0051 | CIPS-2024-14 | Sarah Mitchell |
| FND-008 | KP 90.125 | Post-Assessment | Residual anomaly - monitoring recommended. | Low | Low | Deferred | - | - | - | John Perez |

Footer: Showing 1 to 8 of 42 findings; Rows per page 8; previous; pages 1, 2, 3, 4, 5; next. No real page totals without X.

Finding Details panel: close ×; FND-001; Critical; Open; External corrosion anomaly with metal loss indication.; tabs Summary, Evidence (3), Actions (1), History. Summary: Pipeline PL-001 - Main Pipeline; Segment SEG-03 (KP 48.220 - 96.780); KP / Location KP 52.340; Source Stage ILI Analysis; Confidence High; Responsible Engineer Sarah Mitchell; Created 12 Feb 2026 10:24; Last Updated 14 Feb 2026 16:11. Description: MFL anomaly indicating external corrosion with estimated metal loss. Location coincides with low CP readings and coating disbondment area. Risk Implication: Potential for future leak if not mitigated. Located in medium consequence area. Related Items: Linked Action ACT-012 Open; Linked Defect DEF-0045 Confirmed; ILI Evidence ILI-2024-137 View Data; CP Evidence CP-2024-017 View Data. Buttons View Details →; Send to Defect Manager; Export. X; use ECDA Concern Implication in UI, no official risk assertion. Evidence_IDs, Action_ID, Defect_ID, physical confirmation and engineer approval missing; buttons disabled. Do not invent a selected finding or evidence count.

CONFLICT: ECDA source stage must be one of the four stages; ILI Analysis and CP Assessment are evidence source types. Critical/High severity cannot establish a confirmed physical defect. Same FND-001 in IMG-11 denotes Coating Damage, while IMG-06 denotes metal loss; no cross-screenshot ID join. Counts differ from IMG-01/05/11; no shared campaign ID/revision verifies these populations.

IMG-06 implementation: NEW local RealEcdaFindings; six KPIs, severity/status chart placeholders, filters, register, pagination, detail panel, evidence/action/history controls and defect warning. No fabricated selected record; all source-dependent controls disabled. Pipeline/segment context reused.

## IMG-07 — extraction and mapping (before implementation)

Every item below maps to X / missing Central Integrity Action Register, ECDA_Finding_ID and Action_ID membership; target RealEcdaActions. Classification NEW UI / MISSING FIELD — APPROVAL NEEDED. No canonical Action table/router exists; Defect/CP DEMO action arrays are not a substitute.

- KPIs: Total Actions 23 / ↑ +5 vs last period; Overdue 5 / ↑ +2 vs last period; Open 12 / ↓ -3 vs last period; Completed 6 / ↑ +4 vs last period.
- Action Status: 23 Total Actions; Open 12 (52%); Overdue 5 (22%); Completed 6 (26%). Actions by Priority: y 0, 5, 10, 15; High 8, Medium 9, Low 4, Info 2. Actions by Module: 23 Total Actions; ECDA 12 (52%), ILI 4 (17%), CP 3 (13%), Inspection 3 (13%), Other 1 (4%). These are not ECDA findings/risk counts.
- Action Workflow; Uses the central integrity action register; Identify 23 → Assess 12 → Plan 10 → Implement 8 → Verify 6 → Close 6. Display steps only with Not Available states, no enabled transition.
- Filter Actions; Status All; Priority All; Owner All; Module All; Search actions...; Clear Filters. Action Register (23); Actions are managed through the central integrity action register; Export; + New Action. Header checkbox; Action ID; Action Title; Linked Finding; Priority; Owner; Due Date; Status; Progress; Linked Module; … . Each row checkbox and … .

| Action ID | Action Title | Linked Finding | Priority | Owner | Due Date | Status | Progress | Linked Module |
|---|---|---|---|---|---|---|---|---|
| ACT-0012 | Repair coating anomaly at KP 52.3 | FND-0045 | High | Sarah Ahmed | 12 Mar 2025 | Overdue | 20% | ECDA |
| ACT-0013 | Verify CP repair effectiveness | FND-0038 | High | James Walker | 08 Mar 2025 | Overdue | 40% | CP |
| ACT-0015 | Install additional CP test post | FND-0061 | Medium | Priya Shah | 18 Mar 2025 | Open | 10% | CP |
| ACT-0017 | Review coating condition at site | FND-0045 | High | Michael Tan | 22 Mar 2025 | Open | 0% | Inspection |
| ACT-0018 | Update corrosion growth model | FND-0052 | Medium | Laura Chen | 25 Mar 2025 | Open | 30% | ECDA |
| ACT-0019 | Close out inspection recommendation | FND-0041 | Medium | Daniel Brooks | 03 Mar 2025 | Overdue | 60% | Inspection |

Upcoming Actions / View All: 18 Mar Install additional CP test post / PL-001 | SEG-03 / Medium / Due in 3 days; 22 Mar Review coating condition at site / PL-001 | SEG-03 / High / Due in 7 days; 25 Mar Update corrosion growth model / PL-001 | SEG-03 / Medium / Due in 10 days. Overdue Actions / View All: 12 Mar Repair coating anomaly at KP 52.3 / PL-001 | SEG-03 / High / 6 days overdue; 08 Mar Verify CP repair effectiveness / PL-001 | SEG-03 / High / 10 days overdue; 03 Mar Close out inspection recommendation / PL-001 | SEG-03 / Medium / 15 days overdue. Footer Showing 1–6 of 23 actions; previous/next; pages 1 2 3 4; 10 / page.

CONFLICT: header completion is 2026 but table dates are 2025 and relative due dates have no as-of date; ACT-0012 versus IMG-06 ACT-012 are not verified aliases. Totals include other modules; cannot infer ECDA membership. No local action database, inferred due calculations, cloned action rows or automatic defect escalation.

IMG-07 implementation: NEW RealEcdaActions; four KPIs, three chart/legend placeholders, filter controls, central register, workflow, upcoming/overdue tables and disabled pagination/create/export. No central records fabricated.

## IMG-08 — extraction and mapping (before implementation)

Target RealEcdaDocuments. D maps actual Document_ID / version metadata, authenticated read/download, pipeline/segment/asset links; X maps missing ECDA membership, stage, tags and source-module association. NEW UI / UPDATE verified repository bindings. Existing /document-upload link opens owning module, not a new route. Pipeline-linked documents are explicitly source context; cannot be labelled assessment-linked or counted as approved ECDA evidence.

Heading Documents; Manage all documents related to this ECDA assessment. Store, organise and link evidence across the assessment lifecycle.; Upload Link; Generate Report; Open in Document Management. KPIs Total Documents 48; Survey Reports 12; CP Evidence 10; Excavation Reports 8; Photos 14; Approvals 3; Final Reports 1. Folder cards All Documents 48 documents; Survey Reports 12 documents; CP Evidence 10 documents; Excavation Reports 8 documents; Photos 14 documents; Approvals 3 documents. X: taxonomy/counts not persisted for ECDA; no counting filename guesses. Real repository result total displayed separately with source scope. Upload/link/report actions disabled without ECDA relationship/snapshot; owner repository navigation remains available.

Document Register (48); Search documents... (D q searches title/documentNumber/category, not file bytes); All Stages (X); All Status (D approvalStatus); Date (Newest) (X screenshot date ordering not equated to repository updatedAt ordering); download icon (requires exact selected D version). Header checkbox; Document ID; File Name; Linked Stage; Revision; Status; Uploaded By; Date; Linked Record.

| Document ID | File Name | Linked Stage | Revision | Status | Uploaded By | Date | Linked Record |
|---|---|---|---|---|---|---|---|
| DOC-00048 | ECDA_Survey_Report_PL001.pdf | Pre-Assessment | A | Approved | Sarah Mitchell | 12 Mar 2025 | SEG-03 |
| DOC-00047 | CP_Potential_Survey_Q1_2025.xlsx | Indirect Inspection | B | Approved | James Carter | 10 Mar 2025 | SEG-03 |
| DOC-00046 | Excavation_Report_EX-014.pdf | Direct Examination | A | Under Review | Priya Nair | 08 Mar 2025 | EX-014 |
| DOC-00045 | Photo_Log_EX-014.zip | Direct Examination | A | Approved | Priya Nair | 08 Mar 2025 | EX-014 |
| DOC-00044 | CP_Resurvey_Evidence.pdf | Post-Assessment | A | Approved | Michael Lee | 05 Mar 2025 | SEG-03 |
| DOC-00043 | Management_Approval.docx | Post-Assessment | A | Approved | David Wilson | 03 Mar 2025 | PL-001 |
| DOC-00042 | Final_ECDA_Report_PL001.pdf | Post-Assessment | 0 | Draft | Sarah Mitchell | 01 Mar 2025 | PL-001 |
| DOC-00041 | ILI_Correlation_Notes.pdf | Pre-Assessment | A | Approved | James Carter | 27 Feb 2025 | SEG-03 |
| DOC-00040 | Coating_Assessment_Summary.pdf | Indirect Inspection | A | Approved | Priya Nair | 25 Feb 2025 | SEG-03 |
| DOC-00039 | Excavation_Permit_EX-014.pdf | Direct Examination | A | Approved | David Wilson | 20 Feb 2025 | EX-014 |

Footer 1 of 48 selected; previous/next; pages 1 2 3 4 5; 10 per page. D pagination reflects actual server pageSize/page/total; no fabricated page counts/selected document. X: excavation relationship is not a DocumentLink target in current schema.

Document Preview; ×; ECDA_Survey_Report_PL001.pdf; DOC-00048; Revision A; 12 Mar 2025; View Document. PDF toolbar: 1 / 24; −; 100%; +; fit/page; rotate; download; … . PDF cover KLINTHRU / PIPELINE INTEGRITY PLATFORM; External Corrosion Direct Assessment (ECDA); Survey Report; Pipeline: PL-001; Segment: SEG-03 (KP 48.220 - 96.780); Environment: Onshore; Date: 12 March 2025. These are file contents, not static UI to recreate: only actual selected source PDF/image may preview through exact Document_ID + Document_Version_ID authenticated GET. Arbitrary cover, image, page count, zoom and file size not invented. Other MIME types offer actual file download, no invented preview.

Detail tabs Details; Tags (4); Linked Records (2); Source Modules (3). Details Document ID DOC-00048; File Name ECDA_Survey_Report_PL001.pdf; File Type PDF (2.4 MB); Linked Stage Pre-Assessment; Status Approved; Uploaded By Sarah Mitchell; Date Uploaded 12 Mar 2025 10:24; Description ECDA survey report including DCVG and close interval survey results for SEG-03. Tags Survey / DCVG / Onshore / SEG-03. Source Modules Inspection Data / CP / ECDA. Linked Record SEG-03. D maps metadata and links; uploadedById is an ID, not owner.name. X maps display uploader name, tags, source modules, stage and ECDA exact snapshot. Existing source revisions may be viewed, never silently asserted as the revision used by an approved ECDA stage. No source duplication.

IMG-08 implementation: NEW RealEcdaDocuments. UPDATE source-only repository search, verified approval-status filter, pagination, explicit revision selection, metadata/details/links, authenticated exact-version preview/download and owner-module navigation. ECDA totals/folder counts, stage/category filters, upload/link and report creation remain disabled/unavailable. No automatically selected document, fake preview or copied file. A source version's approval is not an ECDA approval.

## IMG-09 — extraction and mapping (before implementation)

Target RealEcdaTrends; every historical metric/chart/table/relative comparison maps to X (no historical ECDA records or approved location tolerance). NEW UI / MISSING FIELD — APPROVAL NEEDED. Pipeline P and segment S reuse authoritative context. Generic Internal/External Assessment or CP point history is not historical ECDA and must not populate these charts.

- Filters Pipeline PL-001 - Main Pipeline; Segment SEG-03 (KP 48.220 - 96.780); Date Range Jan 2018 - Dec 2025; Metric All Metrics; Apply; Reset.
- Total Assessments 26 / ▲ +24% / vs previous period (17); Total Findings 142 / ▲ +18% / vs previous period (120); Recurring Locations 12 / ▼ -29% / vs previous period (17); Avg. Stage Duration 28 days / ▼ -22% / vs previous period (36 days); Reassessments 6 / ▲ +50% / vs previous period (4); Surveys Completed 19 / ▲ +36% / vs previous period (14).
- Year-over-Year Assessment Counts / …; Assessments axis 0,2,4,6,8,10; years 2018,2019,2020,2021,2022,2023,2024,2025; labelled bars 3,4,5,6,7,8,8,9. CONFLICT: sum 50 differs from Total Assessments 26; 26 versus 17 is not +24%. No inferred deduplication/population.
- Finding Trends / …; Number of Findings; ticks 0,10,20,30,40,50; same years; legend High (red), Medium (orange), Low (blue). Each line has eight markers; individual marker values have no printed labels, so exact samples UNVERIFIED, not estimated from pixels.
- Recurring Locations (Top 10) / …; x ticks 0,2,4,6,8; KP 52.340 6; KP 67.120 5; KP 71.890 5; KP 88.450 4; KP 63.210 4; KP 75.660 3; KP 82.340 3; KP 55.780 3; KP 90.120 2; KP 60.450 2. ECDA_Correlation_Group_ID and Location_Correlation_Group_ID missing; no matching by rounded KP.
- Stage Durations (Historical Average) / …; Duration (Days); ticks 0,20,40,60,80; Pre-Assessment 18; Indirect Inspection 26; Direct Examination 52; Post-Assessment 16. Average 28 days plausible but cohort/method unavailable; do not infer from source creation timestamps.
- Reassessment History / …; headers #, Assessment ID, Original Date, Reassessment Date, Trigger, Findings Δ.

| # | Assessment ID | Original Date | Reassessment Date | Trigger | Findings Δ |
|---|---|---|---|---|---|
| 1 | ECDA-2019-003 | 12 Feb 2019 | 18 Aug 2020 | New Indication | +3 |
| 2 | ECDA-2020-007 | 10 Nov 2020 | 14 Mar 2022 | CP Issue | +5 |
| 3 | ECDA-2021-004 | 22 Jun 2021 | 19 Jan 2023 | Repeat Location | +2 |
| 4 | ECDA-2022-006 | 03 Oct 2022 | 11 Sep 2023 | High Growth | -1 |
| 5 | ECDA-2023-002 | 16 Mar 2023 | 20 Feb 2024 | Verification | 0 |
| 6 | ECDA-2024-001 | 29 Jan 2024 | 08 Nov 2024 | Mechanical Damage | +4 |

Survey History / …; headers #, Survey ID, Survey Date, Type, Coverage (km), Findings.

| # | Survey ID | Survey Date | Type | Coverage (km) | Findings |
|---|---|---|---|---|---|
| 1 | SURV-2025-001 | 12 Mar 2025 | CIPS | 48.6 | 18 |
| 2 | SURV-2024-002 | 08 Nov 2024 | DCVG | 48.6 | 22 |
| 3 | SURV-2023-001 | 17 Mar 2023 | CIPS | 48.6 | 15 |
| 4 | SURV-2022-001 | 10 Oct 2022 | ACVG | 48.6 | 12 |
| 5 | SURV-2021-001 | 22 Jun 2021 | CIPS | 48.6 | 10 |
| 6 | SURV-2020-001 | 14 Feb 2020 | DCVG | 48.6 | 8 |

Historical Condition Changes by Segment; Condition Index y 0,20,40,60,80,100; years 2018–2025; legend Overall Condition (green), External Corrosion (blue), Coating Condition (orange); three series with eight unlabelled points, exact samples UNVERIFIED. Condition Index (By Year) / … table headers Year, Overall, External Corrosion, Coating. Visible rows: 2018/82/65/18; 2018/80/66/22; 2019/62/60/15; 2019/55/57/47; 2023/55/46/47; 2023/70/52/38; 2024/68/50/35; 2025/66/48/32. CONFLICT: duplicate years and table values do not reconcile with plotted yearly monotonic series. Do not manufacture a condition-index formula or correct years by assumption.

IMG-09 implementation: NEW RealEcdaTrends; filters, six KPIs, four historical plot placeholders, recurrence list placeholder, reassessment/survey tables and condition-index table. No generic assessment counts substituted. Recurrence remains unavailable without real correlation groups/rules.

## IMG-10 — extraction and mapping (before implementation)

Configuration; Manage ECDA methodology, templates, rules, data sources and workflows for this assessment.; Reset to Default; Save Configuration. Target RealEcdaConfiguration, all eleven numbered panels. All configured values/IDs/weights/toggles/permissions below map to X → Not Available; controls disabled. NEW UI / MISSING FIELD — APPROVAL NEEDED. Logical source paths map to P/S/C/E/I/D read-only descriptions, not connection credentials or assumed Connected status.

| Section and verbatim labels/values | Mapping and conflict treatment |
|---|---|
| 1. Methodology Settings; Define the ECDA methodology and general settings.; Methodology Standard ISO 15589-1 (Latest); Assessment Level Fitness-for-Service (FFS); Enable Risk-Based Prioritisation ON; Include Historical Findings ON; Use Segment Grouping OFF; help icons | X Methodology_ID/Version, assessment level, flags; no standard selected from screenshot. CONFLICT: ECDA doc requires controlled methodology versions and concern prioritisation; CP standard/FFS not established as ECDA methodology. UI Enable ECDA Indication Prioritisation. |
| 2. Stage Templates; Configure templates for each ECDA stage.; Stage / Template; Pre-Assessment ECDA-PA-001; Indirect Inspection ECDA-II-001; Direct Examination ECDA-DE-001; Post-Assessment ECDA-PO-001; four dropdowns; Manage Templates → | X controlled template IDs/version. Four stage labels retained; IDs unavailable, disabled controls. |
| 3. Assessment Criteria; Define criteria used to evaluate external corrosion.; ID / Criterion / Weighting; C01 Coating Condition 25%; C02 CP Effectiveness 25%; C03 Environment Severity 15%; C04 Historical Corrosion 15%; C05 Inspection Evidence 20%; Manage Criteria → | X criterion IDs/weights/versions; descriptive criterion names retained, no invented weighting. |
| 4. Threshold Rules; Configure condition and risk thresholds.; Condition / Low / Medium / High; Coating Condition > 3.0 / 2.0 - 3.0 / < 2.0; CP Level (mV) > -850 / -950 to -850 / < -950; Corrosion Rate (mm/yr) < 0.02 / 0.02 - 0.05 / > 0.05; Feature Density < 1/km / 1 - 5/km / > 5/km; Edit Threshold Rules → | X rules; CONFLICT: CP threshold lacks ON/OFF/electrode/version and reverses expected protection meaning; no comparisons performed. Concern thresholds, not official Risk. |
| 5. Survey-Type Library; Manage inspection and survey types used in ECDA.; Code / Survey Type / Active; DCVG Direct Current Voltage Gradient ON; CIPS Close Interval Potential Survey ON; PCM Pipeline Current Mapper ON; ILI-EC ILI External Corrosion ON; VIS Visual Inspection ON; Manage Survey Types → | X controlled survey references/active flags. Labels are reference categories, not active surveys. ACVG omitted despite IMG-03; UNVERIFIED approved library. |
| 6. Confidence Rules; Define confidence scoring rules and evidence weightings.; Evidence Type / Weighting / Active; Direct Examination 0.40 ON; ILI Data 0.30 ON; CP Data 0.15 ON; Historical Records 0.10 ON; Third Party Reports 0.05 ON; Configure Confidence Rules → | X confidence model/version, evidence weights and enabled flags. No default scores/100% sums used. |
| 7. Notification Settings; Configure automated notifications and alerts.; Event / Notify / Channels; Stage Completion ON Email, In-App; High Risk Finding ON Email, SMS; Assessment Overdue ON Email; Approval Required ON Email, In-App; Configuration Changes OFF In-App; Manage Notifications → | X rules/channels; UI High ECDA Priority Finding. No emails/SMS sent or implied operational notifications. |
| 8. Data-Source Mapping; View and configure data source mappings.; Data Source / Mapping / Status; CP System → CP Readings (by KP) Connected; ILI System → Metal Loss Features Connected; Inspection DB → Direct Exam Records Connected; GIS / PIMS → Pipeline & Segment Data Connected; Historical ECM → Corrosion Findings Partial; Manual Uploads → Supporting Documents Enabled; Configure Data Sources → | C/I/P/S/E/D logical reference paths only; X ECDA source mapping version and connector status. Inspection DB direct examination path absent, cannot claim connected. Open Integration Hub uses existing /integration-hub; connector settings not owned by ECDA. |
| 9. Dropdown Dictionaries; Manage lookup values used in forms and assessments.; Dictionary / Values / Last Updated; Coating Type 8 12 Jan 2026; Soil Type 12 05 Jan 2026; Environment Type 6 14 Jan 2026; Corrosion Mechanism 10 10 Jan 2026; Manage Dictionaries → | X controlled ECDA dictionaries/counts/timestamps; no guessed options or copied master data. |
| 10. Workflow Approvals; Configure approval workflow for ECDA deliverables.; Stage / Approver Role / Required; Pre-Assessment Integrity Engineer ON; Direct Examination Inspection Manager ON; Post-Assessment Senior Integrity Engineer ON; Final Assessment Integrity Lead ON; Configure Workflow → | X gate/prerequisite/approver/override persistence. CONFLICT: Indirect Inspection absent in screenshot and Final Assessment must be approval step, never fifth lifecycle stage. UI lists four real stages plus final approval requirement as metadata. |
| 11. Permissions References; View permission settings for ECDA configuration.; Role / Can View / Can Edit / Can Approve; Viewer ✓ / - / -; Integrity Engineer ✓ / ✓ / -; Inspection Manager ✓ / ✓ / ✓; Senior Integrity Engineer ✓ / ✓ / ✓; Administrator ✓ / ✓ / ✓; Manage Permissions → | X ECDA permission matrix; actual User roles cannot be inferred from screenshot. Disabled ECDA controls do not substitute for backend authorization. |

Shared shell preserved: IMG-05 Home/Integrity Assessment/ECDA Assessment/ILI Management/Corrosion Management/Risk Management/Data & Documents/Reports/Administration; IMG-06 Home/Assets/ECDA Assessment/ILI Management/CP Management/Inspection Data/Defect Manager/Risk & Integrity/Reports/Administration; IMG-07 Home/Assets/ECDA Assessment/ILI & Inspection/Risk & Integrity/Action Register/Documents/Analytics/Administration; IMG-08 Dashboard/Assets/Integrity Assessments/ECDA Assessment/Inspection Data/Corrosion & CP/Excavations/Risk & Compliance/Documents/Reports/Configuration; IMG-09 Dashboard/Pipeline Assets/ECDA Assessment/Integrity Management/Inspection Data/Risk & Analytics/Reports/Configuration; IMG-10 Home/Integrity Assessment/ECDA Assessment/ICDA Assessment/RBI Assessment/Inspection Management/Data Hub/Analytics & Reports/Action Tracking/Configuration. Icons, chevrons, branding and sidebar hierarchies vary: CONFLICT, existing shell UNCHANGED.

IMG-10 implementation: NEW RealEcdaConfiguration; all eleven panels with unavailable controlled values, disabled writes and reference-only logical ownership map. Existing Integration Hub navigation available. No connection credentials, adopted screenshot standard, weights, thresholds, toggled permissions or claimed backend safeguards. Indirect Inspection approval reference included; Final Approval is metadata, not a fifth lifecycle stage.

## IMG-11 audit against IMG-01 (comparison only)

No Overview redesign or new data population from IMG-11. Existing EcdaOverview remains unchanged. Both have the same ten top tabs and shared PL-001 / SEG-03 / KP 48.220–96.780 / Onshore / 15 Mar 2026 / In Progress / 68% header; these sample identifiers/values are not real data.

| Area | IMG-01 reference | IMG-11 reference | Finding |
|---|---|---|---|
| Shell | John Davis, KLINTHRU; Integrity Assessment submenu; Home; blue logo/sidebar | John Doe, Integrity Manager; DATA TODAY. SAFER TOMORROW.; search; grouped foundation/operations/assessment/management/reporting/settings sidebar; footer Version 1.0.0, Confidential, © 2026 KLINTHRU. All rights reserved. | CONFLICT; keep existing application shell, no duplicate navigation |
| KPI row | Total Length Assessed 48.6 km / of 48.6 km (100%); Assessment Units 24 / Total segments; Direct Examinations 12 / Completed (of 18 planned); Findings 37 / 4 High 15 Medium 18 Low; Open Actions 21 / 5 Overdue; Next Milestone 12 Jan 2026 / Direct Examination Campaign | 8 Assessments / ↑ +2 vs. last year; 3 Completed / 38% of total; 3 In Progress / 38% of total; 2 Overdue / 25% of total; 12 Total Findings / 5 High / 3 Medium; 86% Data Confidence / Good quality | CONFLICT: different metrics/populations; all canonical ECDA values X; no replacement with screenshot numbers |
| Lifecycle | Pre-Assessment 100% Completed; Indirect Inspection 90% In Progress (green check); Direct Examination 56% In Progress; Post-Assessment 0% Not Started; Finalisation 0% Not Started | Pre-Assessment 100% Complete; Indirect Inspection In Progress 60%; Direct Examination Pending 0%; Post-Assessment Pending 0% | CONFLICT: fifth stage forbidden; keep four stages; no inferred progress |
| Findings by Severity | 37 Findings; High 4 (11%), Medium 15 (41%), Low 18 (49%) | 12 Total Findings; High 5 (42%), Medium 3 (25%), Low 4 (33%) | CONFLICT: population/revision missing; percentages are rounded reference labels only |
| Assessment Status by Segment | Stacked SEG-01 12, SEG-02 10, SEG-03 10, SEG-04 8; y Segments 0/5/10/15; Completed/In Progress/Not Started | SEG-01 3, SEG-02 2, SEG-03 2, SEG-04 1; y 0–5; Completed/In Progress/Overdue | CONFLICT: different totals, chart structure and status meaning; no invented series |
| Recent ECDA Assessments | Headers ID/Pipeline/Segment/Environment/Assessment Date/Status/Progress. ECDA-2025-004 PL-001 SEG-03 Onshore 12 Dec 2025 In Progress 68%; ECDA-2025-003 PL-001 SEG-02 Onshore 21 Nov 2025 Completed 100%; ECDA-2025-002 PL-001 SEG-01 Onshore 03 Oct 2025 Completed 100%; ECDA-2025-001 PL-001 SEG-04 Onshore 14 Aug 2025 Completed 100%; View All | Recent ECDA Assessments (5); ECDA ID/Pipeline / Segment/Assessment Year/Current Stage/Status/Target Date/Action. ECDA-2026-001 PL-001/SEG-03 2026 Indirect Inspection In Progress 15 Mar 2026 View; ECDA-2026-002 PL-002/SEG-01 2026 Pre-Assessment Completed 28 Feb 2026 View; ECDA-2025-004 PL-002/SEG-02 2025 Direct Examination Overdue 10 Jan 2026 View; ECDA-2025-003 PL-003/SEG-01 2025 Post-Assessment In Progress 30 Jan 2026 View; ECDA-2024-005 PL-001/SEG-04 2024 Completed Completed 12 Dec 2024 View | CONFLICT: same assessment IDs denote different pipeline/segment/status; cannot join by screenshot ID. Current Stage Completed is not a fifth lifecycle stage. Dates have different meanings |
| Coverage | 100%; 48.6 km / 48.6 km; Assessment Coverage; Full pipeline coverage achieved; All segments in PL-001 have been included in this ECDA assessment.; View Details | Assessment Coverage 75% Route Coverage; Assessed 150.2 km; Not Assessed 49.8 km; Total Length 200.0 km | CONFLICT: scope/denominator and precision differ; no coverage calculation without approved scope |
| Sources | Cathodic Protection (CP) latest survey 12 Dec 2025; ILI Data latest run 03 Oct 2025; External Corrosion Records 248; Historical Inspection Data 186; Geospatial & Pipeline Data version 3.2.1; all Available; View Details | CP Monitoring Connected Last Sync 12 Jan 2026; External Corrosion Connected Last Sync 12 Jan 2026; ILI Analysis Connected Last Sync 10 Jan 2026; Field Surveys Connected Last Sync 11 Jan 2026; Document Management Connected Last Sync 12 Jan 2026; View Details | UNVERIFIED: survey date and sync date are different attributes, not aliases; source connectivity does not establish ECDA evidence approval |
| Upcoming Activities | Date/Activity/Segment/Owner/Status; 12 Jan 2026 Direct Examination Campaign SEG-03 Field Team Planned; 02 Feb 2026 Coating Condition Survey SEG-03 Inspection Planned; 16 Feb 2026 CP Survey SEG-03 CP Team Planned; 02 Mar 2026 Assessment Review Workshop PL-001 Integrity Team Planned; View All | Upcoming Activities (5); Date/Activity/Pipeline / Segment/Responsible/Status; 18 Jan 2026 Field Survey (DCVG) PL-001/SEG-03 Ahmed Raza Planned; 22 Jan 2026 Direct Examination PL-002/SEG-02 Sarah Khan Scheduled; 05 Feb 2026 Post-Assessment Review PL-003/SEG-01 Michael Lee Planned; 12 Feb 2026 Data Validation PL-001/SEG-04 Priya Nair Scheduled; 25 Feb 2026 ECDA Report Finalization PL-002/SEG-01 James Smith Planned | CONFLICT / UNVERIFIED population and central action linkage |
| Open Findings | ID/Description/Segment/Severity/Status; FND-2025-008 Coating disbondment at weld SEG-03 High Open; FND-2025-007 External corrosion feature SEG-03 High Open; FND-2025-006 Coating damage (mechanical) SEG-02 Medium In Progress; FND-2025-005 Low CP potential SEG-03 Medium Open; FND-2025-004 Historical anomaly SEG-01 Low Open | Open Findings (12); ID/KP / Location/Finding Type/Severity/Status; FND-001 KP 52.340 Coating Damage High Open; FND-002 KP 61.220 CP Under-protection High Under Review; FND-003 KP 74.800 External Metal Loss Medium Open; FND-004 KP 81.120 AC Interference Medium Action Required; FND-005 KP 93.450 Coating Holiday Low Monitoring | UNVERIFIED different populations; IDs/descriptions cannot supply missing canonical finding records |
| Quick Actions | New ECDA Assessment/Create a new assessment; Upload Inspection Data/Import ILI or inspection data; View Findings/Explore all findings; Manage Actions/Track and assign actions; View Trends/Analyse historical data; Assessment Configuration/Manage settings and templates | Create New Assessment; Add Field Survey; View in GIS; Generate Report | UNCHANGED existing Overview; only supported tab navigation enabled |

## Retained IMG-01–04 comparison and preservation

All eleven supplied screenshot files were visually read from their original paths. ECDA.docx was read as WordprocessingML text without running embedded instructions. IMG-01–04 components and their existing unavailable states are preserved, not replaced with IMG-11 values. Nineteen function bodies (Overview; REAL Pre/Indirect/Direct; DEMO Pre/Direct/Post; CIS chart/legend/table; calculators; soil/anomaly views; StageTabs; KpiCard; Frame; OverviewPanel/OverviewTable; useIndirectSources) compare unchanged against this task's starting snapshot.

| Tab | Screenshot comparison / data limitation | Status |
|---|---|---|
| Overview IMG-01 | Existing KPI/lifecycle/source/recent/activity/finding/quick-action sections retained; four stages override reference fifth stage. Real ECDA summary missing. IMG-11 audit only. | PASS preservation; PARTIAL data/UI |
| Pre-Assessment IMG-02 | All 12 existing sections retained. Source-ID metadata remains distinct from approved scope/checklist/applicability. Reference has 8/10 complete despite 7 checked and 11 entries; approval Applicable conflicts with Pending. | PASS preservation; PARTIAL data/UI |
| Indirect Inspection IMG-03 | Six KPIs, maps, survey/CP plots, interference, imported files, ranking and sources retained; missing samples/geometry/correlation/ranking unavailable. Survey distances 1,253/1,248 km differ from selected 48.56 km; CP plot is ON, never substituted by OFF. | PASS preservation; PARTIAL data/UI |
| Direct Examination IMG-04 | All 11 sections retained: excavation, verification, schedule, map, NDT/WT, coating, photos, soil, confirmation, tracker, links. No historical External record becomes confirmed ECDA damage. Schedule 01 Mar–30 Apr exceeds 15 Mar header; duplicated EX-01 map marker, omitted map IDs and reference coating/anomaly descriptions remain UNVERIFIED. | PASS preservation; PARTIAL data/UI |
| Post-Assessment IMG-05 | All requested KPI/summary/concern/coverage/recommendation/closure/review/approval/report views implemented. No source approval or physical examination inferred. | PARTIAL: canonical records absent |
| Findings IMG-06 | Six KPIs, two chart placeholders, source context, filters, register and detail panel covered. No actionable real finding/drawer selection exists. | PARTIAL: canonical records absent |
| Actions IMG-07 | KPI/charts/filter/workflow/central register/upcoming/overdue sections covered. No independent ECDA actions. | PARTIAL: central register absent |
| Documents IMG-08 | Requested sections covered. Actual repository source search/status/pagination/revision metadata and exact-version read wired. Tags, category counts, stage, ECDA membership and ECDA snapshot unavailable. | PARTIAL: source API contract verified; authenticated data/UI test blocked |
| Trends & Historical IMG-09 | Filter/KPI/yearly/finding/recurrence/stage-duration/reassessment/survey/condition sections covered. No guessed history or plotted points. | PARTIAL: ECDA history absent |
| Configuration IMG-10 | All 11 panels present, read-only; logical source references only, no false Connected status or fabricated permission matrix. | PARTIAL: controlled configuration absent |

These are source/component comparisons, not authenticated pixel-level PASS results. Existing Klinthru light/dark classes, Frame/OverviewPanel/KpiCard/OverviewTable/PreAssessmentFields, responsive grids, local overflow tables and one horizontally scrollable ten-tab navigation are reused. Empty charts/maps have no fabricated geometry, rings, trends or backgrounds. Unsupported controls show disabled states and explanatory titles. Existing shared components/sidebar/layout are not edited.

## Remaining fields and approvals

All rows in this table are **MISSING FIELD — APPROVAL NEEDED**. No backend/schema changes are made or implicitly approved by this audit. Existing views show `Not Available`; approving UI layout does not establish missing engineering evidence.

| Missing record/link | Blocked functionality |
|---|---|
| ECDA_Assessment_ID, revision, year, assessment owner, scope Segment_ID(s), From_KP/To_KP, environment, target completion, overall/stage status | Assessment creation/context, canonical summary counts/progress, historical campaign queries |
| ECDA_Pre_Assessment_ID / applicability decision / engineer/reviewer/approval / selected methods / source qualifications | Approved scope, completeness, applicability and method selection |
| ECDA_Indirect_Inspection_ID, ECDA_Indirect_Indication_ID, Field_Survey_ID/CIPS_Run_ID links, ECDA_Correlation_Group_ID and approved tolerance/ranking rules | Survey qualification, same-KP correlation, indication ranking/prioritisation |
| ECDA_Direct_Examination_ID, Excavation_ID, NDT_Result_ID, inspector/date/unit provenance, physical confirmation, approved source links | Actual excavations, NDT/WT, photographs, soil/coating verification and confirmations |
| ECDA_Post_Assessment_ID / validated ECDA_Finding_ID links / effectiveness, coverage and ECDA_Confidence_Result | Findings summary, residual concern matrix, coverage/confidence, final outcome |
| ECDA_Reassessment_ID / interval unit/basis/effective date/next due date/justification/approver/date | Reassessment recommendation, approval, scheduling and historical reassessment analytics |
| ECDA_Finding_ID / Source_Stage / Source_Record_ID / severity/confidence/owner/status/timestamps / evidence and Document_ID relationships | Real findings register, filters/detail/evidence/actions/history, count charts |
| Central Action_ID / source ECDA relationship / due date / owner / priority / status / progress | Central register, upcoming/overdue actions, workflow transitions and action analytics |
| Controlled Defect_ID linkage after physical damage confirmation, duplicate check and engineer approval | Send to Defect Manager; automatic creation remains forbidden |
| DocumentLink ECDA_Assessment_ID / stage / approved exact Document_Version_ID snapshot; category mapping; tags/source-module relationships; uploader display name | Actual ECDA document counts, folders/stage filters/evidence membership and stage approval snapshots. Source Document_ID/Document_Version_ID downloads remain supported |
| Report_Run_ID / approved assessment revision / linked final Document_ID | Generate/export final ECDA reports or register exports |
| Historical ECDA revisions, approved Location_Correlation_Group_ID / recurring-location tolerance, stage timestamps and condition-index definition | Yearly/finding/recurrence/duration/condition series and period comparisons |
| ECDA_Methodology_ID/Version, templates, criteria/threshold versions, confidence model, notification/reassessment rules, dictionaries, workflow/roles/permissions | Configuration save/reset/manage controls and governed scoring |
| Persisted stage gates, authorized overrides with reason/user/date/approval, immutable ECDA revisions and exact evidence snapshots | Approval/advance/close operations. Disabled frontend controls are not evidence of these backend safeguards |

**UNVERIFIED:** same-KP matching, imported survey qualification, chart samples, condition index, matrix methodology, actual CP/ILI/External evidence membership, document stage/source-module assignments, screenshot population/revision reconciliation and reviewer/owner assignments. No correlations or source records are invented.

**CONFLICT:** IMG-01 fifth Finalisation stage; IMG-05 likelihood/consequence matrix and pending final approval versus accepted conclusion; IMG-06 Closed card 24 versus chart 18 and evidence source types used as stages; IMG-07 2025 dates versus 2026 header and inconsistent action-ID padding; IMG-09 count/growth/year/condition-series conflicts; IMG-10 unspecified methodology, ON/OFF/electrode-free CP thresholds and missing Indirect approval step. All numerical screenshot content remains documentation only. Existing DEMO functions/data are preserved and not used by the new REAL/source views.

## Verification results

| Check | Result | Evidence / limitation |
|---|---|---|
| Frontend typecheck | PASS | `npm.cmd run typecheck`; initial sandbox invocation encountered Node EPERM at C:\\Users\\Lenovo; authorized execution outside sandbox passed |
| Production build | PASS | Final `npm.cmd run build` passed after all source-segment/pagination/card adjustments: compiled, validated types and generated 32/32 static pages; /ecda-assessment 37.4 kB / first load 128 kB |
| All ten tabs: component render | PASS | In-memory React server render checked section labels and Not Available states for each tab; asserted ten tabs in screenshot order and exactly four stages. No application records/test files created |
| Empty REAL safety | PASS | Render checks reject screenshot IDs/values and invented svg/canvas/image charts in new empty Post/Findings/Actions/Trends/Configuration views; unsupported action buttons disabled |
| IMG-01–04 and DEMO preservation | PASS | Nineteen existing function bodies compared unchanged against start-of-task snapshot; root dispatch changed only to wire remaining views/shared context |
| Scope of source changes | PASS | SHA-256 comparison of 251 source/schema/test files: only frontend/src/components/ecda-assessment-workspace.tsx changed; no new application files |
| CP calculation tests | PASS | `npm.cmd run test:cp` |
| Storage safety tests | PASS | `npm.cmd run test:storage` |
| Save diagnostics tests | PASS | `npm.cmd run test:save-diagnostics` |
| Pipeline master regression suite | FAIL — unrelated existing code | `npm.cmd run test:pipeline-master`: frontend/scripts/run-pipeline-master-tests.cjs:99 expects `pipeline.pipeOutsideDiameter ?? pipeline.pipeInsideDiameter ?? initialValues.pipeIdDiameter` in untouched assessment-form.tsx. Both test and target file unchanged by this task; no ECDA dependency |
| Pipeline history actions regression suite | FAIL — unrelated existing code | `npm.cmd run test:pipeline-history-actions`: frontend/scripts/run-pipeline-history-actions-tests.cjs:19 expects `Select Pipeline` in untouched dashboard.tsx. Both test and target file unchanged by this task; no ECDA dependency |
| Authenticated real-record Document/CP/ILI/External checks | BLOCKED | Existing Chrome DevTools connection cannot attach; API contracts verified in source, actual current records not inspected through an authenticated session |
| Desktop / tablet / mobile screenshot comparison | BLOCKED | chrome-devtools-mcp --autoConnect list_pages returned `Could not find DevToolsActivePort for chrome at C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\User Data\\DevToolsActivePort`. No new browser profile, authentication bypass or login loop. No new authenticated screenshots captured; earlier login images are not verification evidence |

Responsive source layout uses one column on small screens, sm/md two-column grids, lg/xl section grids and minmax(0,…) detail layouts; new KPI wrappers wrap unavailable text, tables scroll within their cards and tabs scroll horizontally. This is implementation evidence only, not a measured desktop/tablet/mobile visual PASS. Proposed viewport verification remains desktop 1672×941, tablet 768×1024 and mobile 390×844 after the existing Chrome session becomes accessible.

## Exact files changed by this task

1. `frontend/src/components/ecda-assessment-workspace.tsx` — UPDATE REAL Post-Assessment, NEW local Findings/Actions/Documents/Trends/Configuration views; reuse existing UI primitives and Pipeline/Segment selection; GET-only document source bindings and exact-version reads; safe root dispatch/source-loading integration. No shared component, route or other module edit.
2. `FINAL-ECDA-AUDIT.md` — NEW extraction/mapping inventory, ownership/source-ID matrix, conflicts, screenshot comparisons, remaining fields and verification evidence.

The working tree already contained other changes before this task; they were not reverted, adopted as this task's changes or modified. No backend/schema/migration/dependency/authentication/data writes. Overall result: **PARTIAL** — requested frontend views implemented; canonical ECDA/central action fields and safeguards remain unavailable, and authenticated responsive verification is blocked.

Final source hash check after build: 251 existing source/schema/test files checked; only the ECDA workspace changed and no application file was added. Final component render checks passed for all ten tabs after the last code adjustment. No backend or source-data approval is requested or assumed in this frontend task. Authenticated pixel comparison and actual repository preview/download require an accessible existing Chrome session before they can receive PASS.

## Final verification recovery — 2026-10-18

This section records the latest recovery pass. Earlier implementation results above remain historical evidence; the results below describe this pass specifically. No fixture records, screenshot constants, credentials, authentication changes or data writes were introduced.

### The two existing failing suites

Both suites were rerun and reproduce the same assertions. These scripts read source text and assert regular-expression matches; neither imports/renders the ECDA workspace or reads ECDA source. The failed matches therefore do not establish an ECDA runtime regression.

| Suite | Reproduced failure | Actual existing implementation | Classification / action |
|---|---|---|---|
| `npm.cmd run test:pipeline-master` | `frontend/scripts/run-pipeline-master-tests.cjs:99`: External assessment should populate diameter from the selected Pipeline and clear stale values; regex expects `pipeline.pipeOutsideDiameter ?? pipeline.pipeInsideDiameter ?? initialValues.pipeIdDiameter` | `assessment-form.tsx:1186` uses `pipeline.pipeOutsideDiameter ?? initialValues.pipeIdDiameter ?? 0` for External; Internal still has its separate inside/outside fallback. The External branch also retains diameter display/unit metadata. | FAIL — pre-existing test/implementation contract mismatch, not ECDA regression. Whether External should accept inside diameter is a separate owning-module decision. Do not modify unrelated form or weaken test. |
| `npm.cmd run test:pipeline-history-actions` | `frontend/scripts/run-pipeline-history-actions-tests.cjs:19`: Dashboard Pipeline History should show one Select Pipeline control; regex expects literal `Select Pipeline` in dashboard.tsx | `dashboard.tsx:812` uses `PipelineSelector hidePicker`; the history area at `dashboard.tsx:843` uses Search Pipeline History and existing per-pipeline history actions, not the old expected searchable Select Pipeline dropdown. | FAIL — pre-existing source-test expectation mismatch, not ECDA regression. Do not restore an obsolete selector or edit dashboard/tests in this task. |

SHA-256 evidence: the following hashes match the stored snapshot taken **before IMG-05–10 implementation**, and were unchanged at the start of recovery. Thus the failing target files and tests predate both ECDA passes:

| File | SHA-256 |
|---|---|
| frontend/scripts/run-pipeline-master-tests.cjs | `1693af4e0f6efe3d9f845afe4b95d96a500a406990fa1200e4d4b804350ef9fa` |
| frontend/scripts/run-pipeline-history-actions-tests.cjs | `0bf87a97910df133b1a120fe1c4337f5fcf7e8a0ec1886f1b42c314b0bfffbfd` |
| frontend/src/components/dashboard.tsx | `3566a3a7fa7335c1a4f8ce2c1c55e799a532a49252fd17559399452585194a0a` |
| frontend/src/components/assessment-form.tsx | `7604861469e9c082bf02bd70c0295c45fb226c4f3e74eb04636194bda4cef87b` |

### Confirmed ECDA defect and limited fix

**Fixed: repeated View Document click did not retry a failed preview read.** The original handler stored the same primitive `previewKey` on every click. After a rejected file request, a second click produced no state change and the effect did not rerun. REAL document source reads could therefore remain failed until the user changed selection or refreshed metadata.

The ECDA-local fix stores a fresh `{ key: previewKey }` request object on each click. The existing effect depends on that request, checks its key against the current scope/document/version, and continues to call only `downloadDocumentVersion(document.documentId, version.documentVersionId)`. Selection, revision change, close and scope changes clear the request to null; pending reads still use the existing loading guard and stale-response cleanup. API routes, authentication, file contents and record identity are unchanged.

Focused regression evidence: an in-memory check evaluated the actual JSX onClick handler and React-style Object.is state equality. The old handler produces one changed request for two clicks on the same key; the fixed handler produces two. Assertions also confirm effect dependency/selection guard and exact Document_ID/Document_Version_ID download arguments. This check creates no document records and is a handler-level test, not a substitute for authenticated file preview testing.

### Chrome and local service diagnosis

| Check | Evidence | Result |
|---|---|---|
| Frontend | GET http://localhost:4000/ecda-assessment → HTTP 200 | PASS availability only; protected shell still needs its authenticated browser state |
| Backend | GET http://localhost:4002/api/health → HTTP 200 | PASS availability |
| Authentication without bearer token | GET http://localhost:4002/api/auth/me → HTTP 401 | PASS expected protection; this probe does not inspect or invalidate the signed-in Chrome tab |
| Registered MCP server | `codex mcp get chrome-devtools`: enabled, npx.cmd, chrome-devtools-mcp@latest, --autoConnect, --no-usage-statistics, --no-performance-crux | PASS configuration present; registered configuration alone does not attach Chrome |
| Existing regular Chrome process | PID 7420, C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe; no alternate user-data-dir or debugging-port arguments | Existing regular Chrome identified; no new profile launched |
| Separate earlier automation browser | PID 10548, Playwright Chromium, temporary user-data directory, --remote-debugging-port=9227 | Distinct browser/profile. Not used as a substitute for the user's authenticated Chrome |
| Regular Chrome profile directories | Local State reports last-used Profile 6, active Profile 6 and Profile 1 | Which holds the Klinthru tab is UNVERIFIED; do not assume an authenticated profile from last-used metadata |
| Regular Chrome debugging endpoint | C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\User Data\\DevToolsActivePort is absent | BLOCKED attachment; no default Chrome debugging endpoint available |
| Actual chrome-devtools-mcp list_pages retry | `Could not connect to Chrome. Check if Chrome is running. Cause: Could not find DevToolsActivePort for chrome at C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\User Data\\DevToolsActivePort` | BLOCKED; exact connection error reproduced despite regular Chrome running |

No cookies/tokens/passwords were copied or printed. No user was created, password reset, login bypassed, Chrome restarted, profile cloned, authenticated tab redirected, or another browser profile opened. The absent endpoint establishes the connection blocker; it does not establish a lost or invalid application session. No debugging preference was edited behind the user's Chrome consent UI.

To unblock the existing session, use the **same Chrome window/profile containing the signed-in Klinthru tab**: open `chrome://inspect/#remote-debugging`, enable remote debugging, leave that window open, and allow the Chrome connection prompt when attachment is requested. No application sign-in or new profile is required by these instructions. Enabling debugging alone is not evidence that attachment succeeded; a subsequent successful list_pages and authenticated page inspection are required before UI PASS.

### Source-ID, units and ownership recheck

| Area | Confirmed in frontend/backend source | Remaining limitation |
|---|---|---|
| Pipeline/Segment/KP | Existing fetchPipelines/fetchMasterSegments; Segment.id + pipelineId relationship, segmentId label and startKp/endKp strings. Selected segment is validated against selected pipeline; no screenshot IDs or KP inference. | Canonical approved ECDA scope and route geometry remain missing. KP source strings are not reinterpreted into an unverified unit. |
| CP | Existing GET /api/cp-monitoring/:pipelineId and /api/cp-monitoring/test-points?pipelineId. Indirect/Direct source rows retain CP point/reading IDs, distinct onPotential/offPotential source records, source mV and V fields, electrode and reading timestamp. Criteria source table retains returned criteria-set/version IDs, reading type, electrode and unit. | No ON-for-OFF substitution, fabricated pairing or reading-to-evaluation/correlation link. Selected ECDA evidence membership remains unavailable. |
| External Corrosion | Existing /api/assessments; only matching Pipeline_ID and External type form source history. Direct source tables preserve valid inspection date separately from Created At, normalized thickness/length/width mm, source-entered wall-thickness metadata, derived mm/year/percent/years/bar outputs per existing source contract. | Historical source context is not a confirmed ECDA examination. Holiday-size source unit is unavailable and labelled as such; no conversion, ranking or confirmation is inferred. Approved ECDA source revision/snapshot remains missing. |
| ILI | Existing /api/ili/runs/:pipelineId and /api/ili/anomalies/:pipelineId match readIndirectIli paths; response pipelineId is verified and source rows use run.id/anomaly.id/inspectionRunId/featureId/kpKm. | No invented indication, defect, ECDA_Correlation_Group_ID or same-KP join. |
| Documents | Existing GET /api/documents pipeline/segment/search/status/page filters; Document_ID, Document_Version_ID and Document_Link_ID retained. Backend download authorizes document access and requires both exact document/version IDs. Metadata shows bytes/MIME/actual uploader ID/date; revision selection remains explicit. | Stage/category totals, tags, source modules, ECDA membership and immutable approval snapshot unavailable. Real file content/preview still requires authenticated verification. |
| Actions/Findings/Concern | ECDA finding and official Defect/Risk remain distinct; all missing register/action/approval controls disabled with reasons; central Action_ID not fabricated. | Canonical ECDA/central action records, physical-confirmation links and official Risk_ID links missing. |
| Safeguards | Configuration displays source snapshots, approved-revision immutability and stage gates as Not Available; no mutation path or fabricated completion state added. | Disabled controls are not proof of backend enforcement. These remain MISSING FIELD — APPROVAL NEEDED. |

This recheck verifies source contracts and empty-state behavior, not the current authenticated record population. API-backed values cannot receive end-to-end PASS without the existing Chrome connection.

### Ten-tab verification matrix

Desktop target: 1672×941; tablet: 768×1024; mobile: 390×844. No target viewport was measured or captured in the signed-in application because Chrome attachment failed before any page could be selected. No old login screenshots are relabelled as ECDA evidence.

| Tab / primary reference | Component sections and empty-state check | Desktop visual | Tablet visual | Mobile visual |
|---|---|---|---|---|
| Overview / IMG-01 | PASS | BLOCKED | BLOCKED | BLOCKED |
| Pre-Assessment / IMG-02 | PASS | BLOCKED | BLOCKED | BLOCKED |
| Indirect Inspection / IMG-03 | PASS | BLOCKED | BLOCKED | BLOCKED |
| Direct Examination / IMG-04 | PASS; all 11 sections | BLOCKED | BLOCKED | BLOCKED |
| Post-Assessment / IMG-05 | PASS | BLOCKED | BLOCKED | BLOCKED |
| Findings / IMG-06 | PASS | BLOCKED | BLOCKED | BLOCKED |
| Actions / IMG-07 | PASS | BLOCKED | BLOCKED | BLOCKED |
| Documents / IMG-08 | PASS empty state; preview retry handler PASS | BLOCKED | BLOCKED | BLOCKED |
| Trends & Historical / IMG-09 | PASS | BLOCKED | BLOCKED | BLOCKED |
| Configuration / IMG-10 | PASS; all 11 panels | BLOCKED | BLOCKED | BLOCKED |

In-memory React render checks were rerun after the retry fix and confirm all ten tab section labels, Not Available states, exactly four lifecycle stages, screenshot tab order, no screenshot IDs/numbers as real values and disabled unsupported mutation controls in new empty views. The checks do not execute authenticated API requests, click through the application shell or measure CSS at those viewport sizes.

IMG-11 was visually re-audited against IMG-01. The earlier difference table remains valid: different KPI populations, 37 versus 12 findings, 100% versus 75% coverage, 90% versus 60% indirect progress, altered recent-assessment identities, different source/sync semantics and sidebar/quick-action designs. EcdaOverview's function body remains identical to the pre-IMG-05–10 snapshot; none of IMG-11 replaces IMG-01. Four lifecycle stages override IMG-01's fifth Finalisation marker. REAL Pre/Indirect/Direct, DEMO Pre/Direct/Post and StageTabs also compare unchanged to that snapshot.

### Recovery result and exact scope

- PASS: preview retry handler regression check; ten-tab empty-state render checks; standalone frontend typecheck.
- PASS: final retry-fix production build (`npm.cmd run build`), including compilation, type validation and 32/32 static pages; /ecda-assessment 37.4 kB / first load 128 kB.
- FAIL, pre-existing/non-ECDA: the two source-regex suites above; not modified or weakened.
- BLOCKED: authenticated real-record checks, all 30 tab/viewport visual comparisons and new screenshot captures.
- PARTIAL: overall ECDA readiness. All missing fields, ownership conflicts and absent backend safeguards listed earlier remain unresolved; frontend placeholders do not satisfy those engineering requirements.

Exact files changed in this recovery pass:

1. `frontend/src/components/ecda-assessment-workspace.tsx` — only the local document-preview request state, guard, request click and reset paths; fresh read attempt per click after a failure.
2. `FINAL-ECDA-AUDIT.md` — this dated recovery evidence and limitations.

No unrelated form/dashboard/test, shared component, route, styling, backend, schema, migration, dependency, authentication or stored record change is authorized or made. No new application/test file is created. Stop after this final audit; authenticated visual verification remains an explicit external connection gap.

Final recovery scope check: SHA-256 comparison of 251 source/schema/test files against the recovery-start snapshot identifies only frontend/src/components/ecda-assessment-workspace.tsx as changed, with no new application files. Audit document updated separately. Final status: **PARTIAL / authenticated visual verification BLOCKED**. The two unrelated suites remain FAIL and the ECDA retry fix/typecheck/build/render checks are PASS. No desktop/tablet/mobile screenshot or live source-record verification is represented as completed.

### Repeat recovery check — 2026-10-18

The repeated recovery request was checked against the completed recovery above. No new application-code defect was confirmed and no additional code fix was made. This repeat changes **FINAL-ECDA-AUDIT.md only**.

| Recheck | Latest evidence | Result |
|---|---|---|
| Pipeline master suite | Same assertion at run-pipeline-master-tests.cjs:99 concerning the External diameter fallback | FAIL — pre-existing/non-ECDA; form/test untouched |
| Pipeline history actions suite | Same assertion at run-pipeline-history-actions-tests.cjs:19 expecting Select Pipeline | FAIL — pre-existing/non-ECDA; dashboard/test untouched |
| Source scope | 251 source/schema/test hashes compared with the prior recovery-start snapshot; only the previously fixed ECDA workspace differs | PASS — no new module/schema/test changes |
| Existing retry fix | ECDA workspace SHA-256 `130027adf41992fb8c25d2052f8007602881b0eaac71409ae6b2d4bb1aadf292`. Reversing only the prior request-object/key/reset changes in memory reproduces the exact prior recovery-start file hash. No file is rewritten for this check | PASS — only the documented previous fix is present |
| Ten tab render/empty-state checks | All ten component checks rerun successfully; ten tabs, four stages, missing states and disabled unsupported mutation controls retained | PASS — component checks only |
| Typecheck/build | Previous final recovery results remain applicable to the unchanged source; not rerun merely to reproduce an already passing build | PASS retained, not a new execution |
| Frontend/backend | /ecda-assessment HTTP 200; /api/health HTTP 200 | PASS availability, not authenticated access |
| Auth protection | /api/auth/me HTTP 401 without a bearer token | PASS expected protection; no conclusion about the existing signed-in tab |
| Chrome configuration | chrome-devtools remains enabled with --autoConnect. Direct cached Chrome DevTools MCP invocation avoids package-download uncertainty | PASS server startup/configuration |
| Chrome attachment | list_pages again reports missing Chrome User Data/DevToolsActivePort; this file is still absent | BLOCKED — existing session cannot be inspected |
| Live source records / exact file preview / screenshots | No accessible authenticated page; no source IDs, document bytes, readings or screenshot numbers invented | BLOCKED — all ten tabs at desktop/tablet/mobile remain unverified |

The missing connection setup was presented while independent checks continued: enable remote debugging through chrome://inspect/#remote-debugging in the already signed-in Chrome window/profile and allow its connection prompt. This is a browser connection prerequisite, not an application login/reset request. No new profile, browser restart, authentication change or preference-file modification was performed. A successful attachment must precede any live UI PASS; registration and server startup are insufficient.

IMG-11 comparison and all ownership/unit/source-ID qualifications remain as documented above. Overview remains based on IMG-01; no fifth stage, source duplication, inferred ECDA evidence membership, official risk calculation, automatic defect creation or safeguard assertion was introduced. All earlier MISSING FIELD — APPROVAL NEEDED entries remain unresolved. The previous preview-retry fix is preserved.

Repeat-check outcome: **PARTIAL overall; authenticated visual verification BLOCKED**. Updated file in this repeat: `FINAL-ECDA-AUDIT.md`. Earlier recovery application change remains limited to `frontend/src/components/ecda-assessment-workspace.tsx`. Stop after this audit unless the existing Chrome connection becomes available.

### Reconnect after user reported remote debugging enabled — 2026-10-18

The user explicitly reported remote debugging enabled and requested authenticated screenshot verification only. No application code, database, schema, styling, authentication or other module was changed during this reconnect attempt.

Observed evidence:

- The cached Chrome DevTools MCP server started with --autoConnect and returned the same missing DevToolsActivePort error from list_pages. This was an actual new attachment attempt, not an inference from the earlier audit.
- Regular Google Chrome is running as PID 7420, Chrome 155.0.8059.80, with no alternate user-data-dir or debugging-port/pipe command-line option. Absence of command-line flags alone does not prove the Chrome UI debugging toggle is off.
- The default regular-Chrome user-data directory still has no DevToolsActivePort file; no such file was found immediately inside its profile directories either. The confirmed technical blocker is that the MCP discovery endpoint is absent, despite the reported enabled setting. The exact UI control enabled is not yet verified.
- The only listener in local debugging ports 9222–9235 is 127.0.0.1:9227, belonging to the earlier Playwright Chromium process PID 10548 (Chrome 156.0.8078.4). Its /json/list returns an empty list. It contains no tab to inspect and cannot stand in for the regular Chrome authenticated session.
- Local cached BrowserManager.js confirms autoConnect uses Chrome's existing channel/user-data debugging endpoint. It does not gain access merely because an agent MCP server was registered. Official Chrome instructions distinguish enabling chrome://inspect/#remote-debugging from accepting the later connection permission: https://developer.chrome.com/docs/devtools/agents/use-cases/auto-connect .

A targeted clarification was presented about the exact setting: chrome://inspect/#remote-debugging (browser-instance debugging) versus chrome://inspect/#devices (USB/network discovery). These are distinct controls; this audit does not assume the user enabled the wrong one. No profile was opened or restarted, no existing tab navigated to login, no credentials or tokens copied, and no debugging preference edited.

**Visual result: BLOCKED for every tab at desktop 1672×941, tablet 768×1024 and mobile 390×844.** The existing thirty-cell verification matrix remains BLOCKED. No page could be selected, no signed-in ECDA UI inspected, and no screenshot captured in this attempt. Component-level PASS results from earlier checks are not visual PASS results. IMG-01 remains the Overview reference and IMG-11 is comparison-only.

This attempt changes only `FINAL-ECDA-AUDIT.md`. Application/source/schema/test hashes were checked against the preceding audit state; no application-source change was found. A successful existing-Chrome attachment and authenticated ECDA page inspection remain required before screenshot-based PASS/FAIL can be assigned. No failed layout is inferred from a connection failure.
