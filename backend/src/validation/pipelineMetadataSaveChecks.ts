import assert from "node:assert/strict";

import { routeGeometryMatchesSaved, validatePipelineInput } from "./pipelineValidation";

const savedInvalidRoute = {
  type: "LineString" as const,
  coordinates: [[52.7382345, 24.1457581], [53.478834, 23.8115092]] as [number, number][]
};

const metadata = {
  pipelineCode: "PL-001",
  pipelineName: "Abu Dhabi Crude Export Pipeline",
  serviceOrProduct: "Crude Oil",
  pipeMaterial: "Carbon Steel",
  pipeGrade: "X65",
  pipeLengthKm: 248,
  pipeOutsideDiameter: 24,
  diameterUnit: "inch" as const,
  wallThicknessInputValue: 12.7,
  nominalWallThickness: 12.7,
  wallThicknessUnit: "mm" as const,
  maopBar: 80,
  designPressure: 100,
  designPressureUnit: "bar" as const,
  coatingType: "3LPE" as const,
  installationYear: 2015,
  status: "Active"
};

assert.equal(routeGeometryMatchesSaved(savedInvalidRoute, savedInvalidRoute), true);
assert.equal(routeGeometryMatchesSaved(savedInvalidRoute, { ...savedInvalidRoute, coordinates: [...savedInvalidRoute.coordinates].reverse() }), false);
assert.doesNotThrow(() => validatePipelineInput({ ...metadata, routeGeometry: undefined }));
assert.throws(
  () => validatePipelineInput({ ...metadata, routeGeometry: savedInvalidRoute })
);

console.log("Pipeline metadata save checks passed.");
