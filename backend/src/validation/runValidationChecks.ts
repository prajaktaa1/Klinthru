import assert from "node:assert/strict";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";

import { createApp } from "../app";
import { env } from "../config/env";
import { store } from "../data/store";
import { validateNewAssessmentSubmission } from "./assessmentValidation";
import { validateDeviceRecordList } from "./deviceValidation";

type LoginResponse = {
  token: string;
};

function createValidExternalAssessment() {
  return {
    id: "external-123",
    type: "External",
    pipelineName: "Line 12",
    createdAt: new Date().toISOString(),
    riskLevel: "Medium",
    riskScore: 42,
    input: {
      pipeLocationId: "SEG-A",
      pipeMaterial: "Carbon Steel",
      pipeMaterialOther: "",
      pipeGrade: "API 5L X52",
      pipeGradeOther: "",
      pipeAge: 12,
      pipeLength: 10,
      pipeIdDiameter: 500,
      pipeIdDiameterDisplayValue: 500,
      pipeIdDiameterUnit: "mm",
      wallThickness: 8,
      coatingType: "FBE/PE/PP",
      coatingTypeOther: "",
      soilPh: 7,
      soilType: "Clay",
      soilMoisture: 20,
      soilResistivity: 100,
      soilTemperature: 22,
      chloride: 5,
      sulphate: 4,
      sulphideH2S: 0,
      cinderAndCoke: "No",
      soilCarbonateContent: 0,
      redoxPotential: -120,
      groundwaterPresence: "Seasonal Groundwater",
      groundwaterCondition: "Fresh Water",
      cpSystemType: "Sacrificial Cathodic Protection (SCP)",
      cpInputType: "CP Polarization",
      cpInputValue: 100,
      dcCurrentDensity: 0,
      acInputType: "AC Current Density",
      acInputValue: 2,
      strayCurrentDensity: 0
    },
    result: {
      soilCorrosivityLevel: "Moderate",
      corrosionRate: 0.58,
      corrosionDepth: 1.52,
      remainingLife: 11.2,
      highPhSccProbability: "Low",
      nearNeutralPhSccProbability: "Elevated",
      micWarning: "Low indication",
      cathodicDelaminationWarning: "No immediate cathodic delamination warning",
      acCorrosionWarning: "No immediate AC warning",
      strayCurrentCorrosionRate: 0.03,
      majorModeOfFailure: "General wall loss",
      riskLevel: "Medium",
      riskScore: 42
    }
  };
}

function createValidInternalAssessment() {
  return {
    id: "internal-123",
    type: "Internal",
    pipelineName: "Water Line 4",
    createdAt: new Date().toISOString(),
    riskLevel: "Low",
    riskScore: 21,
    input: {
      pipeLocationId: "",
      pipeMaterial: "Ductile Iron",
      pipeMaterialOther: "",
      pipeGrade: "K9",
      pipeGradeOther: "",
      pipeAge: 5,
      pipeIdDiameter: 350,
      pipeIdDiameterDisplayValue: 350,
      pipeIdDiameterUnit: "mm",
      wallThickness: 7,
      designLife: 30,
      internalCoating: "Epoxy",
      internalCoatingOther: "",
      waterPh: 7.2,
      temperature: 25,
      dissolvedOxygen: 6,
      waterVelocity: 1,
      pipelinePressure: 3
    },
    result: {
      corrosionRate: 0.26,
      corrosionDepth: 0.25,
      remainingLife: 24,
      highPhSccProbability: "Low",
      nearNeutralPhSccProbability: "Screening watch",
      micWarning: "Low MIC indication",
      cathodicDelaminationWarning: "Check lining adhesion during inspection",
      acCorrosionWarning: "Low warning",
      strayCurrentCorrosionRate: 0.01,
      majorModeOfFailure: "Early surface corrosion",
      riskLevel: "Low",
      riskScore: 21
    }
  };
}

async function startServer() {
  const app = createApp();

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  return {
    app,
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

async function stopServer(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function login(baseUrl: string) {
  if (!env.seedEngineerPassword) {
    throw new Error("SEED_ENGINEER_PASSWORD must be set to run backend validation checks.");
  }

  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "engineer@klinthru.local",
      password: env.seedEngineerPassword
    })
  });

  assert.equal(response.status, 200);
  return (await response.json()) as LoginResponse;
}

async function postJson(baseUrl: string, path: string, token: string, body: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
}

async function getJson(baseUrl: string, path: string, token: string) {
  return fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

async function run() {
  const { server, baseUrl } = await startServer();

  try {
    const { token } = await login(baseUrl);

    const devicesResponse = await getJson(baseUrl, "/api/devices", token);
    assert.equal(devicesResponse.status, 200, "Device listing should succeed for authenticated users");
    const devicesPayload = await devicesResponse.json();
    const devices = validateDeviceRecordList(devicesPayload);
    assert.equal(devices.length, 8, "Seeded demonstration device records should be returned");
    assert.equal(
      devices.some((device) => device.deviceType === "Pressure Relief Valve (PRV)" && device.isDemoData),
      true,
      "Seeded device list should include demonstration PRV data"
    );

    const validExternal = createValidExternalAssessment();
    const validInternal = createValidInternalAssessment();

    const validExternalResponse = await postJson(baseUrl, "/api/assessments", token, validExternal);
    assert.equal(validExternalResponse.status, 201, "Valid External payload should succeed");

    const validInternalResponse = await postJson(baseUrl, "/api/assessments", token, validInternal);
    assert.equal(validInternalResponse.status, 201, "Valid Internal payload should succeed");

    const absentOptionalExternalBase = createValidExternalAssessment();
    const {
      pipeLocationId: _pipeLocationId,
      groundwaterCondition: _groundwaterCondition,
      cpSystemType: _cpSystemType,
      ...absentOptionalInput
    } =
      absentOptionalExternalBase.input;
    const absentOptionalExternal = {
      ...absentOptionalExternalBase,
      input: absentOptionalInput
    };
    const absentOptionalResponse = await postJson(baseUrl, "/api/assessments", token, absentOptionalExternal);
    assert.equal(absentOptionalResponse.status, 201, "Optional Stage 1 fields may be absent");

    const legacyEnumExternal = createValidExternalAssessment();
    legacyEnumExternal.input.coatingType = "FBE / PE / PP";
    legacyEnumExternal.input.cpInputType = "Polarized Potential";
    legacyEnumExternal.input.acInputType = "Pipe AC Voltage to Remote Earth";
    const legacyEnumResponse = await postJson(baseUrl, "/api/assessments", token, legacyEnumExternal);
    assert.equal(legacyEnumResponse.status, 201, "Legacy External enum aliases should be accepted");

    const updatedSoilTypeExternal = createValidExternalAssessment();
    updatedSoilTypeExternal.input.soilType = "Peat / Organic Soil";
    const updatedSoilTypeResponse = await postJson(baseUrl, "/api/assessments", token, updatedSoilTypeExternal);
    assert.equal(updatedSoilTypeResponse.status, 201, "Updated External soil type values should be accepted");

    const legacyInternalReport = createValidInternalAssessment();
    legacyInternalReport.type = "internal" as never;
    legacyInternalReport.input.internalCoating = "Epoxy/Others";
    const legacyReportResponse = await postJson(baseUrl, "/api/reports", token, {
      assessmentId: legacyInternalReport.id,
      assessment: legacyInternalReport
    });
    assert.equal(legacyReportResponse.status, 201, "Compatibility report schema should accept legacy Internal payloads");

    const missingField = createValidExternalAssessment();
    missingField.pipelineName = "   ";
    const missingFieldResponse = await postJson(baseUrl, "/api/assessments", token, missingField);
    assert.equal(missingFieldResponse.status, 400);
    assert.deepEqual(await missingFieldResponse.json(), {
      error: "Validation failed",
      fields: {
        pipelineName: "Pipeline name is required"
      }
    });

    const numericStringPayload = createValidExternalAssessment();
    numericStringPayload.input.pipeAge = "12" as never;
    const numericStringResponse = await postJson(baseUrl, "/api/assessments", token, numericStringPayload);
    assert.equal(numericStringResponse.status, 400);

    assert.throws(() => {
      const nanPayload = createValidExternalAssessment();
      nanPayload.input.pipeAge = Number.NaN;
      validateNewAssessmentSubmission(nanPayload);
    });

    assert.throws(() => {
      const infinityPayload = createValidExternalAssessment();
      infinityPayload.result.corrosionRate = Number.POSITIVE_INFINITY;
      validateNewAssessmentSubmission(infinityPayload);
    });

    const negativeStructural = createValidInternalAssessment();
    negativeStructural.input.wallThickness = -1;
    const negativeStructuralResponse = await postJson(baseUrl, "/api/assessments", token, negativeStructural);
    assert.equal(negativeStructuralResponse.status, 400);

    const negativeRedox = createValidExternalAssessment();
    negativeRedox.input.redoxPotential = -250;
    const negativeRedoxResponse = await postJson(baseUrl, "/api/assessments", token, negativeRedox);
    assert.equal(negativeRedoxResponse.status, 201, "Negative redox potential should remain valid");

    const invalidOther = createValidInternalAssessment();
    invalidOther.input.internalCoating = "Other";
    invalidOther.input.internalCoatingOther = "";
    const invalidOtherResponse = await postJson(baseUrl, "/api/assessments", token, invalidOther);
    assert.equal(invalidOtherResponse.status, 400);

    const groundwaterCompatibilityBase = createValidExternalAssessment();
    const { groundwaterCondition: _legacyGroundwaterCondition, ...groundwaterCompatibilityInput } =
      groundwaterCompatibilityBase.input;
    const groundwaterCompatibility = {
      ...groundwaterCompatibilityBase,
      input: {
        ...groundwaterCompatibilityInput,
        groundwaterPresence: "Seasonal Groundwater"
      }
    };
    const groundwaterCompatibilityResponse = await postJson(baseUrl, "/api/assessments", token, groundwaterCompatibility);
    assert.equal(
      groundwaterCompatibilityResponse.status,
      201,
      "Legacy submissions without groundwaterCondition should remain valid"
    );

    const unknownKeyPayload = createValidExternalAssessment() as Record<string, unknown>;
    unknownKeyPayload.rogue = true;
    const unknownKeyResponse = await postJson(baseUrl, "/api/assessments", token, unknownKeyPayload);
    assert.equal(unknownKeyResponse.status, 400);

    const dangerousKeyResponse = await fetch(`${baseUrl}/api/assessments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: '{"id":"danger-1","type":"External","pipelineName":"Line 12","riskLevel":"Medium","riskScore":42,"input":{"__proto__":{}},"result":{}}'
    });
    assert.equal(dangerousKeyResponse.status, 400);

    const excessiveStringPayload = createValidExternalAssessment();
    excessiveStringPayload.pipelineName = "A".repeat(201);
    const excessiveStringResponse = await postJson(baseUrl, "/api/assessments", token, excessiveStringPayload);
    assert.equal(excessiveStringResponse.status, 400);

    const mismatchedRiskPayload = createValidExternalAssessment();
    mismatchedRiskPayload.result.riskLevel = "Low";
    const mismatchedRiskResponse = await postJson(baseUrl, "/api/assessments", token, mismatchedRiskPayload);
    assert.equal(mismatchedRiskResponse.status, 400);

    const mismatchedAssessmentIdResponse = await postJson(baseUrl, "/api/reports", token, {
      assessmentId: "report-a",
      assessment: {
        ...createValidExternalAssessment(),
        id: "report-b"
      }
    });
    assert.equal(mismatchedAssessmentIdResponse.status, 400);

    const arrayPayloadResponse = await fetch(`${baseUrl}/api/assessments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify([])
    });
    assert.equal(arrayPayloadResponse.status, 400);

    const oversizedResponse = await fetch(`${baseUrl}/api/assessments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ payload: "x".repeat(110_000) })
    });
    assert.equal(oversizedResponse.status, 413);
    assert.deepEqual(await oversizedResponse.json(), { error: "Payload too large" });

    const originalCreateAssessment = store.createAssessment;
    store.createAssessment = async () => {
      throw new Error("boom");
    };

    try {
      const internalErrorResponse = await postJson(baseUrl, "/api/assessments", token, createValidExternalAssessment());
      assert.equal(internalErrorResponse.status, 500);
      assert.deepEqual(await internalErrorResponse.json(), { message: "Internal server error" });
    } finally {
      store.createAssessment = originalCreateAssessment;
    }

    console.log("Validation checks passed.");
  } finally {
    await stopServer(server);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
