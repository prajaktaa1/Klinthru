# AI Predictions IMG-10 — Configuration

21 October 2026. **DONE: safe local Configuration UI. BLOCKED: approved settings/model/permission/persistence contracts. STOP after IMG-10.**

References: supplied `ChatGPT Image Oct 7, 2026, 03_31_57 AM-9.png`, viewed at original resolution; `../All-doc/new/AI prediction.docx` P0383–0431; existing inventory/IMG-01–09 reports; current source. Screenshot settings are examples, not approved defaults or operational records.

## Implemented

- Ninth in-place tab. All nine reference tabs have local UI; operational workflows remain independently blocked. Prior views/readers, shared shell/KPIs/styles/routes/schema/dependencies and other modules preserved.
- All eight configuration sections and their dropdowns, tracks, options, notification labels and footer buttons. Missing values show N/A; controls cannot save/reset or change settings.
- Four unknown threshold tracks have no numeric defaults/bounds/thumbs; five unknown feature toggles have no inferred on/off state. Thirteen disabled checkbox states are N/A and marked mixed/indeterminate.
- Include/Exclude switches local view only. No source inclusion, training dataset, schedule, notification, approver, model or draft configuration created.
- Existing authenticated readiness supplies only `capabilities.retraining.reason`, withheld during loading/failure. Availability is not an approved setting, model selection or feature-enable flag.
- New data may enter a candidate dataset only through approved intake/quality rules. Candidate retraining must pass benchmark validation and explicit human approval before production promotion. No training/promotion occurs here.
- Approved configuration is prospective to a later run; old source/model/run/snapshot/configuration history remains immutable. Connections stay Integration Hub-owned. No source engineering records changed.

## Reference controls and unapproved values

| Section | Screenshot values / controls | Implementation |
|---|---|---|
| AI Model Settings | Model Type Gradient Boosted Trees(Recommended); Model Version v2.3(Latest)/Recommended; Confidence Threshold87%,range50–100% | N/A. No recommended model/version/default/range adopted. Threshold ≠ validation score or individual prediction confidence. |
| Retraining Schedule | Frequency Monthly; Next Scheduled Run May15,2025; Training Data Window Last5years; Automatically include new inspection data checked | N/A; candidate-only intake clarification. No automatic training/promotion or scheduler. IMG-07 dates do not establish this schedule. |
| Alert Thresholds | High-Risk Probability Threshold70%; Predicted Life Reduction Threshold30%; Minimum Confidence for Alerts60%;0–100% sliders | N/A. Approved model-specific meanings, units/bounds/populations and delivery policies absent. No official Risk or engineering alarms changed. |
| Prediction Horizon | Prediction Timeframe12months(Default); Granularity Monthly; longer horizons/confidence helper | N/A. Approved model-supported horizon/buckets/confidence behavior required; no extrapolation. |
| Feature Toggles | Deterioration Rate Prediction/New Defect Likelihood/Remaining Life Estimation/Inspection Prioritization on; Scenario Analysis off | All N/A. Local tab availability does not establish enabled prediction features. |
| Data Source Inclusion / Exclusion | Include(6)/Exclude(2); Inspection Data2018–Present,Historical Defects2015–Present,Operational Data(Pressure,Temperature)2018–Present,Environmental Data(Soil,Climate)2018–Present,GIS and Location Data2010–Present checked; Maintenance Records unchecked/Not included | Unknown states/counts/windows N/A. Six rows/five checks do not verify counters; hidden exclusions not invented. |
| Governance & Approval | Configuration Changes Require approval for all changes; Approvers Integrity Manager/AI Governance Team chips; Log all configuration changes checked | N/A policy/identities/audit/config version. Screenshot roles are not grants in User.role. Human production-promotion approval remains mandatory from DOCX. |
| User Notifications | Email/In-app/Weekly summary/High-risk predictions/Retraining-completion notifications checked; Additional Recipients Select users or groups... | N/A; no recipient/options/delivery/consent/event rules invented or messages sent. Completion never approves promotion. |

Reference header: Configuration; Configure AI model settings, data sources, alerts and governance for pipeline integrity predictions.; next-run notice. Shared KPI36/28/14/18/87% examples remain N/A; existing Klinthru shell retained instead of PipeGuard/example identity.

Footer reference Configuration Valid/All settings valid and ready to use, Reset to Defaults, Discard Changes, Save Configuration, Last updated Apr28,2025 10:24AM/by John Doe. Implementation is **Configuration:N/A**, all three buttons disabled and author/time N/A. No green valid/ready state or approved defaults inferred.

## Data contracts and blockers

- Reused `routes/aiPredictions.ts` → `aiPredictions/readinessData.ts`/`readiness.ts` → authenticated private/no-store GET `/api/ai-predictions/readiness` → existing frontend API/workspace → native retraining-availability reason only.
- No approved AI configuration/read/save/default/history/scheduler/model-catalogue API or persistence contract found in inspected AI router/schema. No backend runtime/response change justified. Native SCADA/Risk/connector configuration belongs to those modules and is not reused as AI settings.
- Source ILI/CP/SCADA/Risk/Defect/ECDA/document histories do not approve inclusion windows, feature mappings or model eligibility. API/database/SFTP credentials remain in Integration Hub; existing route link reused.
- Missing approvals: exact model/version/lifecycle eligibility; threshold meanings/units/ranges/defaults; data/feature/window policy; configuration version/audit/retention/idempotency; candidate scheduler/dataset/quality/benchmark gates; approver identities/permissions/separation of duties; notification recipients/consent/delivery/timezone/templates/events. Only Approved/Production models may produce governed AI recommendations.
- Model/run/input-snapshot/config version and approval slots remain N/A. No fake draft, role grant, configuration record, training job or approved snapshot invented. Local declarations do not establish live DB state; no live settings evidence claimed.

## Exact maintained files changed

1. `frontend/src/components/ai-configuration.tsx` — eight-section unavailable-state UI and source-tab navigation.
2. `frontend/src/components/ai-predictions-workspace.tsx` — ninth tab and existing readiness propagation.
3. `frontend/scripts/run-ai-img10-tests.cjs` — configuration/governance/unknown-state/nine-tab regressions.
4. `frontend/scripts/run-ai-img03-tests.cjs` — authorized Configuration navigation expectation.
5. `frontend/scripts/run-ai-img05-tests.cjs` — same.
6. `frontend/scripts/run-ai-img06-tests.cjs` — same.
7. `frontend/scripts/run-ai-img07-tests.cjs` — same.
8. `frontend/scripts/run-ai-img08-tests.cjs` — same.
9. `frontend/scripts/run-ai-img09-tests.cjs` — same.
10. `AI-PREDICTIONS-IMG-10-IMPLEMENTATION-REPORT.md` — this report.

Artifacts: `tmp/ai-img10-review/`. No backend runtime, schema/migration, dependency or shared-style changes. No Neon, seeds, DB writes, training/promotion, notifications or deployment.

## Verification

- Frontend/backend typechecks and isolated backend emitted build: PASS.
- Optimized frontend production build: PASS, exit0; compilation/type validation, all32 static pages and existing dynamic route. Isolated copy excludes environment files, disables telemetry and uses unreachable loopback API; working build outputs untouched.
- IMG-10 regression: PASS after correcting test-only shared hook-state simulation across tab components. Production code did not require a fix. Eight sections, unknown checkbox states, no numeric/default settings, disabled writes, Include/Exclude view, native readiness loading/failure suppression and nine-tab navigation verified.
- IMG-01–09 regressions: PASS; prior source scope/401/native units/history, reporting GET identity/cancellation/401 clearing, advisory/sandbox/model/source ownership and no fabricated values preserved.
- Backend injected GET checks: PASS for authentication/owner scope/unavailable404/readiness-only AI block/private-no-store. No storage initialization, database access, generation or writer requests.
- Responsive checks: PASS at 1672px desktop, 820px tablet and 390px mobile; no document horizontal overflow. Desktop and mobile screenshots inspected using isolated static rendering with production CSS. These checks do not establish live authenticated or hydrated operational behavior.
- Preservation: 359 existing files compared against the task baseline; 352 unchanged, with only the workspace and six prior regression scripts changed. New component, IMG-10 test and this report are additions. Final component sources match the isolated production build; its compiled UI includes Configuration. Backend runtime, routes, Prisma/schema/migrations, shared styles, dependencies, other modules and previous reports are preserved.
- Live settings/model/snapshot/schedule/notification workflows remain BLOCKED pending verified approved contracts. No live-data verification is claimed.
