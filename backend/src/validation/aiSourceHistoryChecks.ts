/** Pure history validation regression. No storage, database, model or seed imports. */
import assert from "node:assert/strict";
import { selectCorrosionGrowthSeries, type IliDepthObservation } from "../aiPredictions/corrosionGrowth";

const row = (date: string, depth: number): IliDepthObservation => ({
  pipelineId: "isolated-subject", featureId: "isolated-feature", anomalyType: "Metal Loss",
  orientation: "External", inspectionDate: date, depth, depthUnit: "mm"
});
const history = [row("2022-01-01", 3), row("2020-01-01", 1), row("2021-01-01", 2)];
const before = JSON.stringify(history);
const selected = selectCorrosionGrowthSeries(history);
assert.ok("earlier" in selected);
assert.equal(selected.earlier, history[1]); assert.equal(selected.later, history[0]);
assert.equal(JSON.stringify(history), before, "Selection preserves input history");
function blocked(patch: Partial<IliDepthObservation>, status: string) {
  const result = selectCorrosionGrowthSeries([history[0], history[1], { ...history[2], ...patch }]);
  assert.ok("status" in result); assert.equal(result.status, status); assert.equal(result.growthRate, null);
}
blocked({ inspectionDate: "invalid" }, "invalid_inspection_dates");
blocked({ inspectionDate: history[1].inspectionDate }, "ambiguous_feature_identity");
blocked({ pipelineId: "different-subject" }, "ambiguous_feature_identity");
blocked({ featureId: "different-feature" }, "ambiguous_feature_identity");
blocked({ depth: NaN }, "invalid_depth_values");
blocked({ depth: -1 }, "invalid_depth_values");
blocked({ depthUnit: "%" }, "incompatible_measurement_units");
blocked({ orientation: "Unknown" }, "incompatible_feature_metadata");
blocked({ anomalyType: "Different" }, "incompatible_feature_metadata");
assert.ok("status" in selectCorrosionGrowthSeries([history[0]]));
console.log("AI source history PASS: complete-history identity/date/depth/unit/metadata validation, duplicate ambiguity blocked, endpoints unchanged and inputs preserved. Pure fixtures only; no database or model execution.");
