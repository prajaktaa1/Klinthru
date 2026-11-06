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
assert.equal(validatePipelineInput(metadata).installationYear, 2015);
assert.equal(validatePipelineInput(metadata).installationDate, undefined, "Installation year must not synthesize an installation or commissioning date");
const commissioned = validatePipelineInput({ ...metadata, commissioningDate: "2014-06-15" });
assert.equal(commissioned.commissioningDate, "2014-06-15");
assert.equal(commissioned.installationYear, 2015);
assert.equal(commissioned.installationDate, undefined);
assert.equal(validatePipelineInput({ ...metadata, commissioningDate: null }).commissioningDate, null);
assert.throws(() => validatePipelineInput({ ...metadata, commissioningDate: "2014-02-30" }), (error: any) => Boolean(error.fields?.commissioningDate));
assert.throws(
  () => validatePipelineInput({ ...metadata, routeGeometry: savedInvalidRoute })
);

console.log("Pipeline metadata save checks passed.");
