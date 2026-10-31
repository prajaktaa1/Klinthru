# AI Predictions — IMG-01 implementation report

20 October 2026. **PARTIAL — safe data updates PASS; complete reference Overview remains BLOCKED.**

Scope: approved IMG-01 data-only work against `AI-PREDICTIONS-IMG-01-DATA-MAPPING.md`, `AI-PREDICTIONS-STEP-0-INVENTORY.md` and `../All-doc/new/AI prediction.docx`. Existing API paths, response shapes, schema, component layout, styles and source-module ownership are preserved. No IMG-02 work was started.

## Implemented data updates

| Item | Result | Actual change |
|---|---|---|
| Real-source readiness collection | PASS | Uses read-only Prisma source counts directly. Removes the AI readiness collector's dependency on `store` list functions, avoiding their storage initialization/memory fallback path. No database/client connection was made during this task. |
| Unavailable versus empty sources | PASS | Missing/unconfigured storage is tracked internally and described as unavailable, rather than advertised as a verified empty source population. Invalid/missing count results and query failures fail the read; no fabricated successful count is substituted. Existing public response keys/types are unchanged. |
| Source identity and units | PASS | Candidate ILI histories group by pipeline plus feature identity; CP history groups include pipeline, test point, measurement type and reference electrode. Existing author/Admin filters are preserved; device inventory excludes `isDemoData=true`. These are candidate-history diagnostics, not approved model eligibility rules or forecasts. |
| Readiness truthfulness | PASS | Native SCADA history availability is distinguished from absent AI model/run integration. Candidate ILI/CP groups do not claim validated engineering compatibility, confidence, training approval or prediction readiness. All unimplemented prediction/model capabilities remain blocked. |
| Private authenticated responses | PASS locally | Existing AI router applies `Cache-Control: private, no-store`, including authentication failures. Existing authentication and the two GET endpoints remain; no new route, role or permission is introduced. |
| Frontend subject binding | PASS locally | Existing growth/CP DTOs must match the selected pipeline, including their nested subject IDs. Mismatches fail the read. Changing selection suppresses stale prior-pipeline values before effects run; failed readiness hides cached source data. Native reads wait for successful authenticated readiness. |
| Unresolved aggregate KPIs | PASS safe blocking; definitions still BLOCKED | Existing average-RUL and maximum-corrosion cards no longer publish a selected feature's result as a portfolio statistic. They retain their existing components/labels/styles and show unavailable with approval-needed explanations. No averaging, maximum population or engineering formula was invented. Existing historical ILI chart context remains separate from AI predictions. |

The existing `/ai-predictions` route mounts real mode. Legacy demo helpers/files remain preserved and are not used as real-mode values or fallbacks. No screenshot KPI, date, confidence, prediction row, model approval, map location or schedule was introduced as operational data.

## IMG-01 coverage and unresolved items

Every unresolved contract remains **MISSING FIELD — APPROVAL NEEDED**. Approval to implement IMG-01 did not supply the missing engineering/security values or authorize API/schema/layout expansion.

| Reference items | Status | Exact remaining blocker |
|---|---|---|
| Existing shell/title/routes | UNCHANGED | Preserved. Reference nine-tab navigation and Overview layout are not added under the instruction to preserve components/structure/styles. Current page remains the existing readiness workspace. |
| K01: elevated-risk location count / delta | BLOCKED | Approved advisory name/scale, location grouping, eligible saved prediction population, horizon and comparable prior run. No value36 or12% adopted. |
| K02: likely new defects / delta | BLOCKED | Saved AI_Prediction_ID/type/output population, expected-count versus concern-count meaning,12-month horizon and prior-run comparison. No value28 or8% adopted. |
| K03: early-inspection assets / delta | BLOCKED | Recommendation identity, distinct assets/locations, early window, priority/coverage and human planning contract. No value14 or40% adopted. |
| K04: life-reduction segments | BLOCKED | Affected-segment policy, advisory life estimate/base/threshold, units and aggregate scope. Count18 is not18% or18years. Selected deterministic feature RUL cannot substitute. |
| K05: model confidence / delta | BLOCKED | Portfolio confidence versus model validation score, individual-confidence separation, model/evaluation versions, calibration, weighting and delta units. No value87% or3% adopted. |
| Hotspot map | BLOCKED | Saved advisory outlook classifications, geometry/CRS/KP datum, exact source/model/snapshot versions and approved GIS destination/filter/access contract. Asset coordinates alone do not supply the forecast map. |
| Five-year defect-count bars | BLOCKED | Persisted forecast/run, yearly versus cumulative population, output type, buckets and uncertainty. No annual series generated from source counts. |
| Remaining-life donut | BLOCKED | Governed per-segment AI estimates, approved failure/method basis, bin boundaries, missing-input policy and rounding. No428-segment distribution inferred. |
| Deterioration trend | PARTIAL historical context only; AI forecast BLOCKED | Existing deterministic ILI reader remains. Forecast points, wall-thickness normalization, source metric/unit, prediction start date, interval level/bounds and exact model/run/snapshot are missing. Source measurements are not merged with predicted values. |
| Top-five / recent-prediction tables | BLOCKED | Saved outputs with stable native subject links, typed outcome/horizon/confidence, ranking, review state, as-of timestamps and model/run/feature/config/snapshot lineage. Screenshot Open statuses are not adopted as AI review transitions. |
| Five insight statements | BLOCKED | Persisted explanations linked to exact predictions and evidence; approved CP benefit/life-reduction/pressure-cycle interpretation, population and baseline. No natural-language engineering claim was synthesized. |
| Four quick actions | BLOCKED | Authorized run orchestration/idempotency, exact-context results navigation, sandboxed scenario contract and central export/report dataset/access. Existing scan/retrain controls stay disabled. |
| Upcoming analyses | BLOCKED | Actual schedule/job identities, owner, approved eligible model/version, scope, recurrence/timezone/state and result/run linkage. Screenshot dates are not current jobs. |
| Source/model/permission dependencies | BLOCKED | Governed AI snapshots and read contracts; approved model/feature/config versions; model-specific missing-input/expiry rules; field/native-source ACLs; review/acceptance/promotion authority; central Action/Risk/inspection/report handoffs. |
| Existing CP historical chart conflict | Approval blocker retained | Current chart's universal electrode/criterion projection and comparable-history semantics were not adopted as IMG-01 engineering rules. Native CP source ownership is unchanged. Approved projection/criteria and source ACL contracts are still needed. |

No AI-owned snapshot/model/run persistence contract exists in the current schema/API for this Overview. No schema or API extension was inferred from the DOCX's logical object names. Consequently, this task does **not** claim the complete screenshot Overview is operational or visually implemented.

## Verification

| Check | Result / limits |
|---|---|
| Backend typecheck | PASS — `tsc --noEmit --incremental false`, repeated for final source. |
| Frontend typecheck | PASS — `tsc --noEmit --incremental false`, repeated after final scope/null guards. |
| Backend build | PASS — `tsc -p tsconfig.json --outDir <isolated>/backend-build`; final source compiled. Application was not started. |
| Frontend production build | PASS — standard `next build` in an isolated source/config copy, using existing node_modules through a junction. Final copy matched all frontend source hashes;32 static pages generated and existing dynamic route built. No live `.next`, `.next-dev`, config or running assets replaced. |
| New backend data/auth regression | PASS — DB-only reads, no initialization/fallback, unavailable versus verified empty, parameterized owner/Admin filters, candidate grouping, demo exclusion, invalid counts/outages, unchanged public keys,401/200 and private/no-store on both existing endpoints. Injected DB responses are inspected, never executed as SQL. |
| New frontend regression | PASS — exact/nested pipeline binding, input preservation, stale-selection/failed-readiness isolation, no selected-feature aggregate KPI, no screenshot/demo values in real render and disabled unsupported operations. SSR/state checks are not full live hydration evidence. |
| Existing AI readiness and corrosion-growth regressions | PASS. Existing tests use isolated in-memory fixtures with DATABASE_URL empty; no operational records or database seeds. No engineering calculation was changed. |
| Existing Dashboard / Reports regressions | PASS — shared readiness consumer compatibility, including existing response contracts. Their source files were unchanged. |
| Existing Risk regressions | PASS — foundation, treatment, related data, detail, matrix, configuration and remaining-tab suites. Artifact-generation flags disabled. |
| Existing CP / Integration Hub regressions | PASS — isolated calculation/integration checks. |
| Live authenticated operational evidence | UNVERIFIED — no Neon or real engineering/model records were accessed. Test tokens/lookups/DTOs are isolated fixtures and are not operational evidence. |

All test processes used empty DATABASE_URL and test mode. Tests that simulate storage use their existing process-local in-memory fixtures; the production AI readiness collector no longer calls that path. The isolated frontend production build omitted environment files, disabled telemetry and used an unreachable loopback API base. No application source data was fetched during build.

Build evidence: `tmp/ai-img01-implementation-8b2797713b784d41b52629562ec013fc/` contains the frontend build copy/output and backend emitted output. These are local verification artifacts, not a deployment.

## Exact files changed

Existing files updated:

1. `backend/src/aiPredictions/readinessData.ts` — read-only DB collector, source availability/count validation, native grouping, demo exclusion and isolated reader injection.
2. `backend/src/aiPredictions/readiness.ts` — internal availability metadata and accurate blocked/candidate-history disclosures; public DTO shape retained.
3. `backend/src/routes/aiPredictions.ts` — private/no-store middleware; endpoint definitions/authentication retained.
4. `frontend/src/components/ai-predictions-workspace.tsx` — data scope/failure guards and blocked aggregate values; existing markup/components/classes retained.

New files:

5. `frontend/src/lib/ai-predictions-bindings.ts` — existing-source DTO subject guards; no request or calculation engine.
6. `backend/src/validation/aiOverviewDataChecks.ts` — isolated backend read/auth regression.
7. `frontend/scripts/run-ai-overview-data-tests.cjs` — isolated frontend binding/render regression.
8. `AI-PREDICTIONS-IMG-01-IMPLEMENTATION-REPORT.md` — this report.

Preservation: SHA-256 comparison of331 task-start source/schema/migration/script/package/config/prior-report files found exactly the four intended existing-file updates above, **327 unchanged and zero deletions**. Shared styles, schema/migrations, packages/locks, API client/type files, application route files, other-module source and previous audit/mapping reports match baseline. Source preservation plus the named regressions does not prove exhaustive unrelated-module runtime behavior.

## Final disposition

**Safe IMG-01 data updates: PASS. Full reference Overview: PARTIAL / operationally BLOCKED.** Advisory-only behavior, source ownership and existing histories are preserved. No upstream engineering record, model version, production promotion or snapshot was created/updated. Immutable AI snapshot/run enforcement itself still requires an approved persistence/lifecycle design; it is not claimed as implemented.

No Neon access, database write/migration application, operational seed, dependency change, deployment or production change occurred. **STOP after IMG-01. IMG-02 remains unapproved and was not started.**
