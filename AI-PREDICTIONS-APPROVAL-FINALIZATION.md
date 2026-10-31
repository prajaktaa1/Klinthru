# Klinthru AI Predictions — development approval finalization

Status: development-only approval preparation. No UI, route, schema, permission, model, database, or deployment change is authorized by this file.

## Approved seven-to-six report mapping

The existing six Report UI cards retain their identities:

1. AI Prediction Summary → AI Prediction Summary.
2. Deterioration Forecast → Deterioration Forecast.
3. Inspection Prioritization → Inspection Prioritization.
4. Scenario Analysis → Scenario Analysis.
5. Model Performance → Model Performance.
6. Model Governance → Model Governance.

AI Prediction Audit remains an independently traceable report identity and is exposed as an audit variant/lineage view under the existing Reports card. It is not renamed, merged into governance evidence, or added as a seventh UI card. Final approved output remains one Document_ID/version owned by Document Management.

## Exact remaining inputs

- Model: approved artifact/document version and SHA-256 hash; model family/provider; input/output schemas; feature-set version; supported horizons/time basis; missing-input behavior; training/evaluation dataset and cohort IDs; benchmark, calibration, drift, confidence, and outcome definitions.
- Engineering: approved failure-criterion type, threshold, unit, methodology/version/source; outlook classes/aggregation; inspection priority, method, window, and life-unit rules.
- Sources: authoritative read adapters for ILI, CP, SCADA, ECDA, Defect, Risk, and GIS with module/type/record ID, revision, owner ACL, observed/available timestamps, cutoff behavior, quality, units, geometry, and source hash.
- Execution: approved engine/provider, worker identity/runtime, immutable run/result DTOs, scenario clone/bounds/comparison contract, outcome-link adjudication, retry/rerun policy, and publication boundary.
- RBAC/RLS: named read, worker, review, approver, configuration, and administration roles; role grants; policy version/effective dates; independent approver identities; separation-of-duties/delegation; retention/erasure rules. No existing application role automatically receives AI access.
- Reporting: template catalogue/version, Document_ID/version linkage, allowed formats, preview/download rules, schedule timezone, recipients, consent, notification provider, and regulatory provenance.

## Safe development defaults (not engineering approval)

Fail closed; N/A rather than zero; private/no-store; UTC timestamps; read-only source adapters; no client-supplied results/approvals; Approved/Production lifecycle required before execution; no automatic upstream writes; hypothetical scenarios only; no report generation or dispatch; no database role/policy activation.

## Offline migration/RLS validation plan

Use a separately approved isolated development database only. Before application, compare schema and migration checksums; verify exactly 18 additive AI tables, scoped composite foreign keys, append-only/history triggers, cutoff and scenario guards, forced RLS, revoked PUBLIC privileges, and only explicitly approved policies/roles. Run positive scope reads plus negative cross-owner/cross-pipeline reads, denied writes/deletes/truncates, immutable-history checks, retry-key conflicts, serialized concurrency/retry checks, and upstream-failure isolation. Compare pre/post source table counts, hashes, and migration history. Preserve data; no destructive down migration.

Until the inputs above are supplied and approved, existing contracts remain fail-closed: no model execution, saved result, simulation, report, RLS activation, or mutation.
