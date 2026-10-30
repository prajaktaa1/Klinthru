import assert from "node:assert/strict";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";

import { createValidExternalAssessment, createValidInternalAssessment } from "./testPayloads";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
process.env.SEED_ADMIN_PASSWORD = "admin-test-password";
process.env.SEED_ENGINEER_PASSWORD = "engineer-test-password";
process.env.SEED_VIEWER_PASSWORD = "viewer-test-password";

type LoginResponse = { token: string };
type PipelineResponse = {
  id: string;
  pipelineCode: string;
  pipelineName: string;
  pipeLocationId?: string;
  pipeAgeYears?: number;
  pipeLengthKm?: number;
  pipeOutsideDiameter?: number;
  diameterUnit?: string;
  smysMpa?: number;
  maopBar?: number;
  operatingPressure?: number;
  operatingPressureInputValue?: number;
  operatingPressureUnit?: string;
  installationYear?: number;
  inspectionYear?: number;
  nominalWallThickness?: number;
  wallThicknessInputValue?: number;
  wallThicknessUnit?: string;
  pipeInsideDiameter?: number;
  designLife?: number;
  status: string;
};
type ReportResponse = { id: string; assessmentId: string; pipelineId?: string };

async function startServer() {
  const { createApp } = await import("../app");
  const { initializeStorage } = await import("../data/store");
  const mode = await initializeStorage();
  assert.equal(mode, "memory");
  const app = createApp();
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function stopServer(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function login(baseUrl: string, email: string, password: string) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  assert.equal(response.status, 200);
  return (await response.json()) as LoginResponse;
}

function headers(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function postJson(baseUrl: string, path: string, token: string, body: unknown) {
  return fetch(`${baseUrl}${path}`, { method: "POST", headers: headers(token), body: JSON.stringify(body) });
}

async function getJson(baseUrl: string, path: string, token: string) {
  return fetch(`${baseUrl}${path}`, { method: "GET", headers: headers(token) });
}

async function run() {
  const { server, baseUrl } = await startServer();
  try {
    const admin = await login(baseUrl, "admin@klinthru.local", "admin-test-password");
    const engineer = await login(baseUrl, "engineer@klinthru.local", "engineer-test-password");
    const viewer = await login(baseUrl, "viewer@klinthru.local", "viewer-test-password");

    const pipelineBody = {
      pipelineCode: " PIPE-001 ",
      pipelineName: "Common Name",
      location: "North Block",
      pipeLocationId: "SEG-A",
      pipeMaterial: "Carbon Steel",
      pipeGrade: "API 5L X52",
      pipeAgeYears: 12,
      pipeLengthKm: 10,
      pipeOutsideDiameter: 500,
      diameterUnit: "mm",
      smysMpa: 358,
      maopBar: 50,
      nominalWallThickness: 8,
      wallThicknessInputValue: 8,
      wallThicknessUnit: "mm",
      operatingPressureInputValue: 3.2,
      operatingPressureUnit: "MPa",
      installationYear: 2012,
      inspectionYear: 2024,
      status: "Active"
    };

    const createPipelineResponse = await postJson(baseUrl, "/api/pipelines", engineer.token, pipelineBody);
    assert.equal(createPipelineResponse.status, 201);
    const pipeline = (await createPipelineResponse.json()) as PipelineResponse;
    assert.equal(pipeline.pipelineCode, "PIPE-001", "Create should save the explicit Pipeline Code");
    assert.equal(pipeline.status, "Active", "Create should save the explicit Pipeline Status");
    assert.equal(pipeline.pipeLocationId, "SEG-A");
    assert.equal(pipeline.pipeAgeYears, 12);
    assert.equal(pipeline.pipeLengthKm, 10);
    assert.equal(pipeline.pipeOutsideDiameter, 500);
    assert.equal(pipeline.smysMpa, 358);
    assert.equal(pipeline.maopBar, 50);
    assert.equal(pipeline.operatingPressure, 32);
    assert.equal(pipeline.operatingPressureInputValue, 3.2);
    assert.equal(pipeline.operatingPressureUnit, "MPa");
    assert.equal(pipeline.installationYear, 2012);
    assert.equal(pipeline.inspectionYear, 2024);
    assert.equal(pipeline.nominalWallThickness, 8);
    assert.equal(pipeline.wallThicknessInputValue, 8);
    assert.equal(pipeline.wallThicknessUnit, "mm");

    const inchPipelineResponse = await postJson(baseUrl, "/api/pipelines", engineer.token, {
      ...pipelineBody,
      pipelineCode: "PIPE-INCH",
      pipelineName: "Wall Unit Line",
      nominalWallThickness: undefined,
      wallThicknessInputValue: 0.5,
      wallThicknessUnit: "in"
    });
    assert.equal(inchPipelineResponse.status, 201);
    const inchPipeline = (await inchPipelineResponse.json()) as PipelineResponse;
    assert.equal(inchPipeline.nominalWallThickness, 12.7, "Inch wall thickness should be stored in mm");
    assert.equal(inchPipeline.wallThicknessInputValue, 0.5, "Original inch input should be preserved");
    assert.equal(inchPipeline.wallThicknessUnit, "in");

    const legacyWallThicknessResponse = await postJson(baseUrl, "/api/pipelines", engineer.token, {
      ...pipelineBody,
      pipelineCode: "PIPE-LEGACY",
      nominalWallThickness: 9,
      wallThicknessInputValue: undefined,
      wallThicknessUnit: undefined
    });
    assert.equal(legacyWallThicknessResponse.status, 201);
    const legacyWallThicknessPipeline = (await legacyWallThicknessResponse.json()) as PipelineResponse;
    assert.equal(legacyWallThicknessPipeline.nominalWallThickness, 9);
    assert.equal(legacyWallThicknessPipeline.wallThicknessInputValue, 9);
    assert.equal(legacyWallThicknessPipeline.wallThicknessUnit, "mm");

    const zeroWallThicknessResponse = await postJson(baseUrl, "/api/pipelines", engineer.token, {
      ...pipelineBody,
      pipelineCode: "PIPE-ZERO-WALL",
      wallThicknessInputValue: 0
    });
    assert.equal(zeroWallThicknessResponse.status, 400, "Zero wall thickness should be rejected");

    const pressureValidationResponse = await postJson(baseUrl, "/api/pipelines", engineer.token, {
      ...pipelineBody,
      pipelineCode: "PIPE-PRESSURE",
      operatingPressureInputValue: 6
    });
    assert.equal(pressureValidationResponse.status, 400, "Operating pressure above MAOP should be rejected");

    const duplicateResponse = await postJson(baseUrl, "/api/pipelines", engineer.token, {
      ...pipelineBody,
      pipelineCode: "pipe-001"
    });
    assert.equal(duplicateResponse.status, 409, "Normalized duplicate code should be rejected for same owner");

    const sameNameDifferentCodeResponse = await postJson(baseUrl, "/api/pipelines", engineer.token, {
      ...pipelineBody,
      pipelineCode: "PIPE-002"
    });
    assert.equal(sameNameDifferentCodeResponse.status, 201, "Same name is allowed with different code");

    const sameCodeDifferentOwnerResponse = await postJson(baseUrl, "/api/pipelines", viewer.token, pipelineBody);
    assert.equal(sameCodeDifferentOwnerResponse.status, 201, "Same code is allowed for different owners");

    const editResponse = await fetch(`${baseUrl}/api/pipelines/${pipeline.id}`, {
      method: "PUT",
      headers: headers(engineer.token),
      body: JSON.stringify({
        ...pipelineBody,
        pipelineCode: "PIPE-001-EDITED",
        pipelineName: "Common Name Edited",
        status: "Inactive",
        wallThicknessInputValue: 6.35,
        wallThicknessUnit: "mm"
      })
    });
    assert.equal(editResponse.status, 200);
    const editedPipeline = (await editResponse.json()) as PipelineResponse;
    assert.equal(editedPipeline.id, pipeline.id, "Edit should update the same Pipeline record");
    assert.equal(editedPipeline.pipelineCode, "PIPE-001-EDITED", "Edit should save Pipeline Code changes");
    assert.equal(editedPipeline.status, "Inactive", "Edit should save Pipeline Status changes");
    assert.equal(editedPipeline.pipelineName, "Common Name Edited", "Edit should save pipeline master fields");
    assert.equal(editedPipeline.nominalWallThickness, 6.35, "Edited mm wall thickness should remain normalized in mm");
    assert.equal(editedPipeline.wallThicknessInputValue, 6.35, "Edited wall thickness input should reopen as entered");
    assert.equal(editedPipeline.wallThicknessUnit, "mm");

    const viewerCannotAccessEngineerPipeline = await getJson(baseUrl, `/api/pipelines/${pipeline.id}`, viewer.token);
    assert.equal(viewerCannotAccessEngineerPipeline.status, 404);

    const adminCanAccessEngineerPipeline = await getJson(baseUrl, `/api/pipelines/${pipeline.id}`, admin.token);
    assert.equal(adminCanAccessEngineerPipeline.status, 200);

    const unlinkedAssessment = createValidExternalAssessment("missing-pipeline-1", "Common Name");
    assert.equal((await postJson(baseUrl, "/api/assessments", engineer.token, unlinkedAssessment)).status, 400);

    const assessment = createValidExternalAssessment("pipeline-assessment-1", "Common Name", pipeline.id);
    const assessmentInputWithUnits = assessment.input as typeof assessment.input & {
      wallThicknessDisplayValue?: number;
      wallThicknessUnit?: string;
      operatingPressureDisplayValue?: number;
      operatingPressureUnit?: string;
      soilTemperatureInputValue?: number;
      soilTemperatureUnit?: string;
    };
    assessmentInputWithUnits.wallThickness = 12.7;
    assessmentInputWithUnits.wallThicknessDisplayValue = 0.5;
    assessmentInputWithUnits.wallThicknessUnit = "in";
    assessmentInputWithUnits.soilTemperature = 25;
    assessmentInputWithUnits.soilTemperatureInputValue = 77;
    assessmentInputWithUnits.soilTemperatureUnit = "F";
    assessmentInputWithUnits.pipeAge = 18;
    assessmentInputWithUnits.pipeLength = 22;
    assessmentInputWithUnits.pipeIdDiameter = 609.6;
    assessmentInputWithUnits.pipeIdDiameterDisplayValue = 24;
    assessmentInputWithUnits.pipeIdDiameterUnit = "inch";
    assessmentInputWithUnits.smys = 415;
    assessmentInputWithUnits.maop = 64;
    assessmentInputWithUnits.operatingPressure = 20;
    assessmentInputWithUnits.operatingPressureDisplayValue = 2;
    assessmentInputWithUnits.operatingPressureUnit = "MPa";
    const assessmentResponse = await postJson(baseUrl, "/api/assessments", engineer.token, assessment);
    assert.equal(assessmentResponse.status, 201);
    assert.equal(((await assessmentResponse.json()) as { pipelineId?: string }).pipelineId, pipeline.id);

    const pipelineAfterExternalAssessment = (await (await getJson(baseUrl, `/api/pipelines/${pipeline.id}`, engineer.token)).json()) as PipelineResponse;
    assert.equal(pipelineAfterExternalAssessment.pipelineName, "Common Name Edited", "External assessment save must not overwrite Pipeline master name");
    assert.equal(pipelineAfterExternalAssessment.pipelineCode, "PIPE-001-EDITED", "External assessment save should preserve Pipeline Code");
    assert.equal(pipelineAfterExternalAssessment.status, "Inactive", "External assessment save should preserve Pipeline Status");
    assert.equal(pipelineAfterExternalAssessment.pipeAgeYears, 12, "External assessment pipe age must remain a historical snapshot only");
    assert.equal(pipelineAfterExternalAssessment.pipeLengthKm, 10, "External assessment pipe length must not overwrite Pipeline master");
    assert.equal(pipelineAfterExternalAssessment.pipeOutsideDiameter, 500, "External assessment OD must not overwrite Pipeline master");
    assert.equal(pipelineAfterExternalAssessment.diameterUnit, "mm", "External assessment diameter unit must not overwrite Pipeline master");
    assert.equal(pipelineAfterExternalAssessment.smysMpa, 358, "External assessment SMYS must not overwrite Pipeline master");
    assert.equal(pipelineAfterExternalAssessment.maopBar, 50, "External assessment MAOP must not overwrite Pipeline master");
    assert.equal(pipelineAfterExternalAssessment.operatingPressure, 32, "External assessment operating pressure must not overwrite Pipeline master");
    assert.equal(pipelineAfterExternalAssessment.operatingPressureInputValue, 3.2, "External assessment pressure input must not overwrite Pipeline master");
    assert.equal(pipelineAfterExternalAssessment.operatingPressureUnit, "MPa", "External assessment pressure unit must preserve Pipeline master");
    assert.equal(pipelineAfterExternalAssessment.nominalWallThickness, 6.35, "External assessment wall thickness must not overwrite Pipeline master");
    assert.equal(pipelineAfterExternalAssessment.wallThicknessInputValue, 6.35, "External assessment wall thickness input must not overwrite Pipeline master");
    assert.equal(pipelineAfterExternalAssessment.wallThicknessUnit, "mm", "External assessment wall thickness unit must preserve Pipeline master");

    const internalAssessment = createValidInternalAssessment("pipeline-internal-assessment-1", "Common Name", pipeline.id);
    const internalInputWithUnits = internalAssessment.input as typeof internalAssessment.input & {
      wallThicknessDisplayValue?: number;
      wallThicknessUnit?: string;
      pipelinePressureDisplayValue?: number;
      pipelinePressureUnit?: string;
    };
    internalInputWithUnits.pipeAge = 21;
    internalInputWithUnits.pipeIdDiameter = 304.8;
    internalInputWithUnits.pipeIdDiameterDisplayValue = 12;
    internalInputWithUnits.pipeIdDiameterUnit = "inch";
    internalInputWithUnits.wallThickness = 6.35;
    internalInputWithUnits.wallThicknessDisplayValue = 0.25;
    internalInputWithUnits.wallThicknessUnit = "in";
    internalInputWithUnits.designLife = 35;
    internalInputWithUnits.pipelinePressure = 30;
    internalInputWithUnits.pipelinePressureDisplayValue = 3;
    internalInputWithUnits.pipelinePressureUnit = "MPa";
    internalInputWithUnits.internalCoating = "Epoxy";
    const internalAssessmentResponse = await postJson(baseUrl, "/api/assessments", engineer.token, internalAssessment);
    assert.equal(internalAssessmentResponse.status, 201);

    const pipelineAfterInternalAssessment = (await (await getJson(baseUrl, `/api/pipelines/${pipeline.id}`, engineer.token)).json()) as PipelineResponse;
    assert.equal(pipelineAfterInternalAssessment.pipelineCode, "PIPE-001-EDITED", "Internal assessment save should preserve Pipeline Code");
    assert.equal(pipelineAfterInternalAssessment.status, "Inactive", "Internal assessment save should preserve Pipeline Status");
    assert.equal(pipelineAfterInternalAssessment.pipelineName, "Common Name Edited", "Internal assessment save must not overwrite Pipeline master name");
    assert.equal(pipelineAfterInternalAssessment.pipeInsideDiameter, undefined, "Internal assessment diameter must remain a historical snapshot only");
    assert.equal(pipelineAfterInternalAssessment.pipeOutsideDiameter, 500, "Internal assessment must not overwrite Pipeline master OD");
    assert.equal(pipelineAfterInternalAssessment.pipeLengthKm, 10, "Internal assessment must not overwrite Pipeline master length");
    assert.equal(pipelineAfterInternalAssessment.designLife, undefined, "Internal design life must remain a historical snapshot only");
    assert.equal(pipelineAfterInternalAssessment.operatingPressure, 32, "Internal pressure must not overwrite Pipeline master");
    assert.equal(pipelineAfterInternalAssessment.operatingPressureInputValue, 3.2, "Internal pressure input must not overwrite Pipeline master");
    assert.equal(pipelineAfterInternalAssessment.operatingPressureUnit, "MPa", "Internal pressure unit must preserve Pipeline master");
    assert.equal("internalCoating" in pipelineAfterInternalAssessment, false, "Assessment-specific coating data must not be copied to Pipeline master");

    const documentExtractedAssessment = createValidExternalAssessment("document-extracted-pipe-data-1", "Document Extracted Name", pipeline.id);
    const documentExtractedInput = documentExtractedAssessment.input as typeof documentExtractedAssessment.input & {
      operatingPressureDisplayValue?: number;
      operatingPressureUnit?: string;
    };
    documentExtractedInput.pipeAge = 99;
    documentExtractedInput.pipeLength = 99;
    documentExtractedInput.pipeIdDiameter = 99;
    documentExtractedInput.smys = 99;
    documentExtractedInput.maop = 99;
    documentExtractedInput.operatingPressure = 99;
    documentExtractedInput.operatingPressureDisplayValue = 9.9;
    documentExtractedInput.operatingPressureUnit = "MPa";
    const unconfirmedDocumentResponse = await postJson(baseUrl, "/api/external-pipe-data", engineer.token, {
      assessment: documentExtractedAssessment,
      source: "Document",
      pipelineMasterDataUpdateConfirmed: false
    });
    assert.equal(unconfirmedDocumentResponse.status, 400, "Document-extracted pipe data should require explicit confirmation");

    const confirmedDocumentResponse = await postJson(baseUrl, "/api/external-pipe-data", engineer.token, {
      assessment: documentExtractedAssessment,
      source: "Document",
      pipelineMasterDataUpdateConfirmed: true
    });
    assert.equal(confirmedDocumentResponse.status, 201);
    const confirmedDocumentRecord = (await confirmedDocumentResponse.json()) as {
      id: string;
      pipelineId?: string;
      assessment: { input: { pipeLength?: number; pipeAge?: number } };
    };
    assert.equal(confirmedDocumentRecord.pipelineId, pipeline.id, "External pipe data should preserve the selected Pipeline link");
    assert.equal(confirmedDocumentRecord.assessment.input.pipeLength, 99, "External pipe data should preserve document pipe length as a historical snapshot");
    assert.equal(confirmedDocumentRecord.assessment.input.pipeAge, 99, "External pipe data should preserve document pipe age as a historical snapshot");
    const pipelineAfterConfirmedDocument = (await (await getJson(baseUrl, `/api/pipelines/${pipeline.id}`, engineer.token)).json()) as PipelineResponse;
    assert.equal(pipelineAfterConfirmedDocument.pipelineName, "Common Name Edited", "External pipe data must not overwrite Pipeline master name");
    assert.equal(pipelineAfterConfirmedDocument.pipeAgeYears, 12, "External pipe data must not overwrite Pipeline master pipe age");
    assert.equal(pipelineAfterConfirmedDocument.pipeLengthKm, 10, "External pipe data must not overwrite Pipeline master pipe length");
    assert.equal(pipelineAfterConfirmedDocument.pipeOutsideDiameter, 500, "External pipe data must not overwrite Pipeline master OD");
    assert.equal(pipelineAfterConfirmedDocument.operatingPressureInputValue, 3.2, "External pipe data must not overwrite Pipeline master pressure input");

    const documentUpdateAssessment = createValidExternalAssessment("document-extracted-pipe-data-1", "Document Updated Name", pipeline.id);
    const documentUpdateInput = documentUpdateAssessment.input as typeof documentUpdateAssessment.input & {
      operatingPressureDisplayValue?: number;
      operatingPressureUnit?: string;
    };
    documentUpdateInput.pipeAge = 77;
    documentUpdateInput.pipeLength = 77;
    documentUpdateInput.pipeIdDiameter = 77;
    documentUpdateInput.smys = 77;
    documentUpdateInput.maop = 77;
    documentUpdateInput.operatingPressure = 77;
    documentUpdateInput.operatingPressureDisplayValue = 7.7;
    documentUpdateInput.operatingPressureUnit = "MPa";
    const updatedDocumentResponse = await fetch(`${baseUrl}/api/external-pipe-data/${confirmedDocumentRecord.id}`, {
      method: "PUT",
      headers: headers(engineer.token),
      body: JSON.stringify({
        assessment: documentUpdateAssessment,
        source: "Document",
        pipelineMasterDataUpdateConfirmed: true
      })
    });
    assert.equal(updatedDocumentResponse.status, 200);
    const updatedDocumentRecord = (await updatedDocumentResponse.json()) as {
      pipelineName?: string;
      assessment: { input: { pipeLength?: number; pipeAge?: number } };
    };
    assert.equal(updatedDocumentRecord.pipelineName, "Document Updated Name", "Updated external pipe data should preserve edited snapshot name");
    assert.equal(updatedDocumentRecord.assessment.input.pipeLength, 77, "Updated external pipe data should preserve edited snapshot length");
    assert.equal(updatedDocumentRecord.assessment.input.pipeAge, 77, "Updated external pipe data should preserve edited snapshot age");
    const pipelineAfterDocumentUpdate = (await (await getJson(baseUrl, `/api/pipelines/${pipeline.id}`, engineer.token)).json()) as PipelineResponse;
    assert.equal(pipelineAfterDocumentUpdate.pipelineName, "Common Name Edited", "PUT external pipe data must not overwrite Pipeline master name");
    assert.equal(pipelineAfterDocumentUpdate.pipeAgeYears, 12, "PUT external pipe data must not overwrite Pipeline master pipe age");
    assert.equal(pipelineAfterDocumentUpdate.pipeLengthKm, 10, "PUT external pipe data must not overwrite Pipeline master pipe length");
    assert.equal(pipelineAfterDocumentUpdate.pipeOutsideDiameter, 500, "PUT external pipe data must not overwrite Pipeline master OD");
    assert.equal(pipelineAfterDocumentUpdate.operatingPressureInputValue, 3.2, "PUT external pipe data must not overwrite Pipeline master pressure input");

    const reportResponse = await postJson(baseUrl, "/api/reports", engineer.token, {
      assessmentId: assessment.id,
      assessment
    });
    assert.equal(reportResponse.status, 201);
    const report = (await reportResponse.json()) as ReportResponse;
    assert.equal(report.pipelineId, pipeline.id);

    assert.equal((await getJson(baseUrl, `/api/reports/${report.id}/download/pdf`, viewer.token)).status, 404);
    const pdfDownloadResponse = await getJson(baseUrl, `/api/reports/${report.id}/download/pdf`, admin.token);
    assert.equal(pdfDownloadResponse.status, 200);
    const pdfDownloadText = Buffer.from(await pdfDownloadResponse.arrayBuffer()).toString("utf8");
    assert.match(pdfDownloadText, /77 °F/, "PDF export should display original temperature value and unit");
    assert.doesNotMatch(pdfDownloadText, /Soil Temperature Input Value/, "PDF export should not duplicate temperature helper fields");
    const wordDownloadResponse = await getJson(baseUrl, `/api/reports/${report.id}/download/word`, admin.token);
    assert.equal(wordDownloadResponse.status, 200);
    const wordDownloadText = await wordDownloadResponse.text();
    assert.match(wordDownloadText, /0\.5 in/, "Word export should display original wall thickness value and unit");
    assert.match(wordDownloadText, /77 °F/, "Word export should display original temperature value and unit");
    assert.doesNotMatch(wordDownloadText, /Wall Thickness Display Value/, "Word export should not duplicate wall thickness helper fields");
    assert.doesNotMatch(wordDownloadText, /Soil Temperature Input Value/, "Word export should not duplicate temperature helper fields");

    const cpResponse = await postJson(baseUrl, "/api/cp-calculations", engineer.token, {
      pipelineId: pipeline.id,
      calculationType: "SACP",
      input: { diameterValue: "500" },
      result: { totalCurrentDemandA: 2.5 }
    });
    assert.equal(cpResponse.status, 201);

    const historyResponse = await getJson(baseUrl, `/api/pipelines/${pipeline.id}/history`, engineer.token);
    assert.equal(historyResponse.status, 200);
    const history = (await historyResponse.json()) as { timeline: unknown[]; pipeline: PipelineResponse };
    assert.equal(history.timeline.length >= 3, true, "History should include assessment, report, and CP calculation");
    assert.equal(history.pipeline.pipelineName, "Common Name Edited", "History should include the explicit Pipeline master data");
    assert.equal(history.pipeline.pipeInsideDiameter, undefined, "History should not expose assessment-only internal diameter as Pipeline master data");
    assert.equal(history.pipeline.pipeOutsideDiameter, 500, "History should preserve explicit Pipeline master OD");

    console.log("Pipeline master checks passed.");
  } finally {
    await stopServer(server);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
