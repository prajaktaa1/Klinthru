import assert from "node:assert/strict";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
process.env.SEED_ADMIN_PASSWORD = "admin-test-password";
process.env.SEED_ENGINEER_PASSWORD = "engineer-test-password";
process.env.SEED_VIEWER_PASSWORD = "viewer-test-password";

import { calculateMeasuredCorrosionGrowth, IliDepthObservation, selectCorrosionGrowthSeries } from "../aiPredictions/corrosionGrowth";
import { resolveFailureCriterion } from "../aiPredictions/failureCriterion";

const earlier: IliDepthObservation = { pipelineId: "pipeline-1", featureId: "feature-1", anomalyType: "Metal loss", orientation: "External", inspectionDate: "2024-01-01T00:00:00.000Z", depth: 1, depthUnit: "mm" };
const later: IliDepthObservation = { ...earlier, inspectionDate: "2025-01-01T00:00:00.000Z", depth: 2 };

async function run() {
  const calculated = calculateMeasuredCorrosionGrowth(earlier, later, { name: "Approved maximum depth", threshold: 5, unit: "mm" });
  assert.equal(calculated.status, "calculated"); assert.ok(calculated.growthRate && calculated.growthRate > 0); assert.ok(calculated.rul && calculated.rul > 0);
  assert.equal(calculateMeasuredCorrosionGrowth(earlier, later, { name: "Percent criterion", threshold: 50, unit: "%" }).status, "incompatible_measurement_units");
  assert.equal(calculateMeasuredCorrosionGrowth(earlier, { ...later, featureId: "feature-2" }).status, "ambiguous_feature_identity");
  assert.equal(calculateMeasuredCorrosionGrowth(later, earlier).status, "invalid_inspection_dates");
  assert.equal(calculateMeasuredCorrosionGrowth(earlier, { ...later, inspectionDate: earlier.inspectionDate }).status, "zero_elapsed_time");
  assert.equal(calculateMeasuredCorrosionGrowth(earlier, { ...later, depthUnit: "%" }).status, "incompatible_measurement_units");
  assert.equal(calculateMeasuredCorrosionGrowth(earlier, later).status, "failure_criterion_not_configured");
  assert.equal(calculateMeasuredCorrosionGrowth(earlier, { ...later, depth: 1 }).status, "non_positive_growth_rate");
  assert.equal(calculateMeasuredCorrosionGrowth(earlier, later, { name: "Maximum depth", threshold: 2, unit: "mm" }).status, "failure_threshold_reached");
  const missing = selectCorrosionGrowthSeries([earlier]); assert.ok("status" in missing && missing.status === "insufficient_history");
  assert.equal(resolveFailureCriterion().status, "failure_criterion_not_configured");
  const configuredCriterion = resolveFailureCriterion({ approved: true, criterionType: "Maximum approved depth", threshold: 5, unit: "mm", methodology: "Validated method", methodologyVersion: "1.0", source: "Controlled engineering configuration" });
  assert.equal(configuredCriterion.status, "resolved");
  assert.equal(resolveFailureCriterion({ approved: true, criterionType: "Maximum approved depth", threshold: 5, unit: "mm", methodology: "", methodologyVersion: "1.0", source: "Controlled engineering configuration" }).status, "invalid_failure_criterion");
  assert.equal(resolveFailureCriterion({ approved: true, criterionType: "Maximum approved depth", threshold: 5, unit: "mm", methodology: "Validated method", methodologyVersion: "1.0", source: "" }).status, "invalid_failure_criterion");
  assert.equal(resolveFailureCriterion({ approved: true, criterionType: "Maximum approved depth", threshold: -1, unit: "mm", methodology: "Validated method", methodologyVersion: "1.0", source: "Controlled engineering configuration" }).status, "invalid_failure_criterion");
  const { getCorrosionGrowthForPipeline, splitGrowthAndRul } = await import("../aiPredictions/corrosionGrowthData");
  const { createApp } = await import("../app"); const { initializeStorage } = await import("../data/store"); await initializeStorage();
  const unavailable = await getCorrosionGrowthForPipeline("pipeline-1", undefined, { id: "engineer-1", email: "engineer@klinthru.local", name: "Engineer", role: "Engineer" });
  assert.equal(unavailable.growth.status, "ili_data_unavailable");
  assert.equal(unavailable.rul.criterion.status, "failure_criterion_not_configured");
  const unavailableWithCriterion = splitGrowthAndRul(unavailable.growth, configuredCriterion);
  assert.equal(unavailableWithCriterion.growth.status, "ili_data_unavailable");
  assert.equal(unavailableWithCriterion.rul.criterion.status, "resolved");
  const separated = splitGrowthAndRul(calculated, configuredCriterion);
  assert.equal(separated.growth.status, "calculated");
  assert.equal(separated.rul.status, "calculated");
  const server = createServer(createApp()); await new Promise<void>((resolve) => server.listen(0, resolve)); const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try { const response = await fetch(`${baseUrl}/api/ai-predictions/corrosion-growth/pipeline-1`); assert.equal(response.status, 401); } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
  console.log("Corrosion growth checks passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
