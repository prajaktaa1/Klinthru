# AI Predictions — A1–A6 development implementation

21 October 2026. User approval applies to development foundations and preparation of additive migrations only. **DONE locally; operational AI remains BLOCKED.** Earlier approval-review/audit reports are historical evidence and remain unchanged. Template-count conflict remains pending as requested.

## Implemented

| Decision | Development work / operational limit |
|---|---|
| A1 | 18 additive Prisma models for model/config versions, immutable snapshots and source manifests, requests/runs/results/forecasts/recommendations/scenarios, validation/outcomes, governance/outbox/delivery and retry-key aliases. Prepared SQL has append-only UPDATE/DELETE/TRUNCATE protection, restrictive composite scope FKs, cutoff/late-source guards, scenario comparison checks and forced default-deny RLS. No migration applied. |
| A2 | New authenticated scoped development API contracts mounted after the unchanged readiness/measured-growth routes. Explicit pipeline scope, strict request parsing, private/no-store, no accepted client result/approval fields; execution requires Idempotency-Key. SELECT-only result repository requires owner/pipeline identity and fresh source authorization. Canonical finite-JSON SHA-256 manifests and versioned run fingerprints; atomic serializable reservation adapter and durable aliases. Worker/model execution and output publication remain disabled. |
| A3 | Run preflight requires exact model/config/snapshot lineage, verified approved artifact/document, eligible Approved/Production lifecycle, approved methodology/input/request validators and native/source permissions. Missing criterion/horizon/feature contract blocks before reservation. No model, threshold, probability, forecast or metric invented. |
| A4 | Explicit scoped, time-valid, non-revoked server-side action grants; no automatic Admin/Engineer/Viewer AI permission. Independent grant approval; promotion rejects candidate producer/validator self-promotion, wrong version/artifact/evidence, failed quality/benchmark and stale sequence. Named provider defaults to no grants. Promotion requires a separate human decision; candidate retraining purpose cannot promote. |
| A5 | Read-only source-adapter contract validates exact module/type/ID/revision, native pipeline/ACL, observation and availability cutoff, source hash and duplicate references; freezes copied model inputs rather than source masters. Hypothetical scenario preparation clones a frozen base with explicit approved parameter units/bounds and reports `simulated:false`. No native source writer or simulation engine is available. Native adapters without proven historical revisions remain blocked. |
| A6 | Reports, Documents and Integration Hub owner destinations retained. No AI file/credential store, report generation, notification dispatch or template selection created. Final document/report/configuration lineage fields prepared. Six-versus-seven template mapping remains pending. |

All nine tabs, frontend markup/styles, existing endpoints/DTOs, engineering calculations, official Risk/Defect/source ownership and prior completed work are preserved. Frontend bindings are unchanged; they do not claim new saved AI results. No UI controls were enabled based solely on prepared schema.

## Runtime gates

The mounted development router has no configured DB/policy/engine provider: authenticated requests without an explicit current grant return 403. Injected authorized development reads without verified storage return 503. Valid authorized mutation requests remain 423 with `items:null`; no request persists a record, executes a model, changes source data or promotes a model. Existing readiness/history routes continue their existing read-only behavior unchanged.

The atomic reservation adapter is implemented against a typed transactional port but deliberately not connected to a database. Same semantic manifest under different keys resolves one request and records each key alias; reusing any key for changed input conflicts. Concurrency behavior was exercised through a serialized fixture port, **not a live PostgreSQL concurrency test**. No completed model run/result is fabricated from a reservation.

Canonical hashing uses `klinthru-ai-canonical-json-v1` plus SHA-256; keys sort deterministically, nonfinite/undefined/non-JSON/cyclic/sparse inputs are rejected. Run fingerprints include owner/pipeline, snapshot/artifact hashes, model/feature/config versions, purpose/type/horizon/parameters/execution/scenario manifests. These are technical integrity rules, not engineering scoring definitions.

## Prepared migration and database limits

`backend/prisma/migrations/20261021180000_ai_predictions_development/migration.sql` is additive, transactional and **UNAPPLIED**. [Migration review](backend/prisma/migrations/20261021180000_ai_predictions_development/REVIEW.md) specifies dependency checks, preservation, development validation and non-destructive rollback requirements. Existing models/enums/physical source fields and old migration checksums were checked locally. Native User/Pipeline/Segment/Asset/DocumentVersion additions are inverse relation metadata only.

RLS is forced with no policies and PUBLIC privileges revoked. Named database roles, policy/grant mapping and operational activation require review; no role is guessed. The SQL cannot establish independent business approvals or authoritative model criteria without their server-side evidence/providers. Privileged database administration controls and retention/erasure policy still require a concrete deployment review.

Prisma validation and migration generation used local schema files only with an unreachable loopback URL. An isolated, engine-free Prisma Client was generated and its 18 AI model descriptors verified without constructing a client. Engine/runtime readiness and actual deployed table state are **not** certified. Initial generation outside the backend unexpectedly invoked package resolution and added root Prisma dependencies. That attempt was cancelled; root `package.json` and `package-lock.json` were restored byte-for-byte against the pre-existing `tmp/risk-remaining-review/baseline.json` hashes. The 33 verified newly installed package directories and generated command shims were moved to reversible `tmp/ai-approved-development/installer-quarantine/`; the original hidden dependency graph was restored. Backend/frontend manifests and installed backend client were unchanged. Successful generation used the backend dependency context with automatic installation disabled. Isolated client metadata and safeguard/API tests passed again after dependency restoration. No database access occurred.

## Remaining policy / methodology / integration blockers

1. **Named permissions and DB activation:** real principals/action grants, independent approvers, policy version/effective dates, source ACL provider, runtime/worker DB roles and RLS policies, retention/erasure controls. A4 design approval does not assign users or grant database access.
2. **Approved model and engineering evidence:** artifact/document version/hash, targets/features, training/evaluation dataset/cohort, benchmark/calibration/drift/confidence definitions, supported horizons/time basis, approved failure criteria and outlook/priority methods/units. Production lifecycle transition policy beyond the implemented promotion guard still needs exact evidence/decisions.
3. **Authoritative source revisions:** native read adapters proving historical revision and availability-as-of, exact source permissions/quality/unit mapping, ILI feature correlation, Defect/ECDA/Action owner contracts and GIS destination/geometry. Generic read-only capture validation is implemented; authoritative adapters cannot fabricate missing version fields.
4. **Execution/simulation/output publication:** actual approved engine/artifact, worker runtime, scenario schema/bounds/comparison definitions, candidate dataset/quality/benchmark and independent review workflow. Preflight/clone preparation is not inference, simulation, training or promotion. Complete saved-result filter/pagination/status vocabularies and owner-file field redaction still require their concrete contracts.
5. **Owner integrations:** central report dataset/run → one Document_ID/version, schedule/recipient/timezone/consent/notification provider and the explicitly pending six-vs-seven template catalogue mapping. No generated report, schedule or exported file is available.
6. **Separately authorized database verification/application:** existing development project/branch/endpoint, actual schema/history/checksums/backups, runtime FK/trigger/RLS tests and concurrent retry verification. No Neon access or SQL execution occurred; production is outside scope.

## Exact maintained files changed

Existing files:
- `backend/prisma/schema.prisma` — additive AI models and inverse relations.
- `backend/src/routes/aiPredictions.ts` — mount additive development contracts after existing routes.

New foundation files under `backend/src/aiPredictions/`:
- `contracts.ts`, `integrity.ts`, `permissions.ts`, `snapshotService.ts`, `idempotency.ts`, `runService.ts`, `runRepository.ts`, `scenarioService.ts`, `modelGovernance.ts`, `resultsRepository.ts`, `developmentRoutes.ts`.

New tests/report/migration:
- `backend/src/validation/aiDevelopmentChecks.ts`.
- `backend/prisma/migrations/20261021180000_ai_predictions_development/migration.sql` and `REVIEW.md`.
- `AI-PREDICTIONS-A1-A6-DEVELOPMENT-REPORT.md`.

Local artifacts: `tmp/ai-approved-development/` contains baseline/schema copies, generation/check evidence, isolated client and emitted backend build. Temporary schema beside backend dependencies was removed; existing frontend/source/regression reports remain intact.

## Validation

| Check | Result / limit |
|---|---|
| Backend/frontend typechecks | **PASS**, exit 0; final backend guard changes rechecked. |
| Backend emitted build | **PASS**, exit 0, isolated output only; no application startup. |
| New `aiDevelopmentChecks.ts` | **PASS**: finite/canonical/frozen JSON and tamper detection; cutoff/availability/revision/duplicate rejection; no automatic Admin grants; expired/revoked/self-approved grants denied; candidate/validator cannot self-promote; version/evidence/sequence/quality guards; hypothetical-only clone and bounds/unit validation; same-run aliases and changed-payload conflict; scoped SELECT/native-source access; unauthenticated401, explicit-grant403, unavailable-storage503, strict-input400 and locked-mutation423. All fixtures isolated, no database or actual model. |
| Existing backend regressions | **PASS**: source-history validation, AI readiness/privacy/source availability and reporting GET ownership/identity checks. No database/storage initialization. |
| Existing frontend regressions | **PASS**: source scope/401/native CP units and all IMG-02–10 nine-tab/unavailable-state tests. Frontend files unchanged. |
| Prisma validation / isolated generated Client | **PASS**, 18 AI model descriptors; local engine-free type generation, no client construction or connection. Installed application client preserved. |
| Additive migration review | **PASS static**: schema-to-schema generation; only new AI tables targeted; existing models/enums retained except inverse relations; no source ALTER/DROP/data operations; restrictive FKs, 18 forced-RLS tables and append-only triggers present. SQL behavior/application remains **UNVERIFIED**, not executed. |
| Preservation | **PASS**: 355 baseline files, 353 unchanged; only existing AI router and Prisma schema changed. Root package/lock additionally restored to verified prior SHA-256 values; backend/frontend dependency manifests match earlier baseline hashes. Prior migrations/reports, all frontend files/styles/tabs/routes and other modules preserved. New foundation/test/migration/report files are additions. |

No populated/live-data, database migration, SQL trigger/RLS execution, engine runtime, true PostgreSQL concurrency or production verification is claimed. Frontend build/visual checks were not repeated because frontend source was unchanged; earlier final-audit evidence remains historical. Database verification/application and production actions require separate authorization.
