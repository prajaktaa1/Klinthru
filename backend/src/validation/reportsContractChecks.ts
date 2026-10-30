import assert from "node:assert/strict";

import {
  assertImmutableRecordTransition,
  assertNoIntegrationSecrets,
  exportJobSchema,
  reportApiPaths,
  reportInputSnapshotSchema,
  reportRunSchema,
  reportTemplateVersionSchema
} from "../reports/contracts";

function assertRejects(fn: () => unknown, message: string) {
  assert.throws(fn, /./, message);
}

function run() {
  assert.equal(reportApiPaths.definitions, "GET /api/reports/definitions");
  assert.equal(reportApiPaths.runs, "GET /api/reports/runs");
  assert.equal(reportApiPaths.configuration, "GET /api/reports/configuration");

  const timestamp = "2026-10-21T00:00:00.000Z";
  const snapshot = reportInputSnapshotSchema.parse({
    reportInputSnapshotId: "snapshot-contract-test",
    reportRunId: "run-contract-test",
    dataCutoffTimestamp: timestamp,
    filterDefinition: {},
    parameterSet: {},
    sourceManifest: [{ sourceModule: "Pipeline", sourceRecordId: "pipeline-contract-test", sourceRevision: "current" }],
    snapshotHash: "hash-contract-test",
    createdAt: timestamp,
    createdById: "user-contract-test",
    immutableAt: timestamp
  });
  assert.equal(snapshot.reportRunId, "run-contract-test");

  const runRecord = reportRunSchema.parse({
    reportRunId: "run-contract-test",
    reportDefinitionId: "definition-contract-test",
    reportDefinitionVersionId: "definition-version-contract-test",
    templateVersionId: null,
    requestedById: "user-contract-test",
    requestedAt: timestamp,
    pipelineId: "pipeline-contract-test",
    segmentId: null,
    assetId: null,
    dateRange: {},
    parameterSet: {},
    filterDefinition: {},
    reportInputSnapshotId: snapshot.reportInputSnapshotId,
    outputFormat: "PDF",
    status: "Queued",
    startedAt: null,
    completedAt: null,
    approvalStatus: "Draft",
    documentId: null,
    failureCode: null,
    failureMessage: null,
    createdAt: timestamp
  });
  assert.equal(runRecord.status, "Queued");

  reportTemplateVersionSchema.parse({
    reportTemplateVersionId: "template-version-contract-test",
    reportTemplateId: "template-contract-test",
    version: "draft-1",
    layoutDefinition: {},
    sectionDefinition: {},
    fieldBindings: [],
    chartDefinition: {},
    brandingProfileId: null,
    watermarkRule: {},
    requiredSourceDatasets: ["Pipeline"],
    approvalStatus: "Draft",
    approvedById: null,
    approvedAt: null,
    supersedesVersionId: null,
    createdAt: timestamp,
    createdById: "user-contract-test"
  });

  exportJobSchema.parse({
    exportJobId: "export-contract-test",
    sourceModule: "Asset Master",
    datasetId: "dataset-contract-test",
    selectedFieldIds: ["field-contract-test"],
    filterDefinition: {},
    dateRange: {},
    outputFormat: "CSV",
    requestedById: "user-contract-test",
    requestedAt: timestamp,
    status: "Requested",
    recordCount: null,
    dataSnapshotId: null,
    documentId: null,
    failureCode: null,
    failureMessage: null,
    completedAt: null
  });

  assertImmutableRecordTransition({ id: "immutable", status: "Completed" }, { id: "immutable", status: "Completed" });
  assertRejects(() => assertImmutableRecordTransition({ id: "immutable", status: "Completed" }, { id: "immutable", status: "Failed" }), "Changed immutable history must be rejected");
  assertNoIntegrationSecrets({ connectorId: "connector-contract-test", destinationId: "destination-contract-test" });
  assertRejects(() => assertNoIntegrationSecrets({ connectorId: "connector-contract-test", smtpPassword: "not-permitted" }), "Credentials must not cross into Reports contracts");

  console.log("Reports backend contract checks passed (offline; no database access).");
}

run();
