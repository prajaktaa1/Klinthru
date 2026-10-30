import assert from "node:assert/strict";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";

import { validateNewAssessmentSubmission } from "./assessmentValidation";
import { validateDeviceRecordList } from "./deviceValidation";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
process.env.JWT_SECRET = "validation-test-secret";
process.env.SEED_ADMIN_PASSWORD = "validation-admin-password";
process.env.SEED_ENGINEER_PASSWORD = "validation-engineer-password";
process.env.SEED_VIEWER_PASSWORD = "validation-viewer-password";

let createApp: typeof import("../app").createApp;
let env: typeof import("../config/env").env;
let store: typeof import("../data/store").store;

type LoginResponse = {
  token: string;
};

const permittedInternalCoatings = [
  "Bare / Uncoated",
  "Liquid Epoxy",
  "Fusion-Bonded Epoxy (FBE)",
  "Phenolic Epoxy",
  "Polyurethane",
  "Polyethylene (PE) Lining",
  "Cement Mortar Lining",
  "Glass-Flake Epoxy",
  "Rubber Lining",
  "Fiberglass-Reinforced Plastic (FRP/GRP) Lining",
  "Corrosion-Resistant Alloy (CRA) Cladding",
  "Other",
  "Unknown"
] as const;

let testPipelineId: string | undefined;

function createValidExternalAssessment() {
  return {
    id: "external-123",
    type: "External",
    pipelineId: testPipelineId,
    pipelineName: "Line 12",
    createdAt: new Date().toISOString(),
    riskLevel: "Medium",
    riskScore: 42,
    input: {
      pipelineId: testPipelineId,
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
      soilTemperatureInputValue: 22,
      soilTemperatureUnit: "C",
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
    pipelineId: testPipelineId,
    pipelineName: "Water Line 4",
    createdAt: new Date().toISOString(),
    riskLevel: "Low",
    riskScore: 21,
    input: {
      pipelineId: testPipelineId,
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
      internalCoating: "Liquid Epoxy",
      internalCoatingOther: "",
      waterPh: 7.2,
      temperature: 25,
      temperatureInputValue: 25,
      temperatureUnit: "C",
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

async function createTestPipeline(baseUrl: string, token: string) {
  const response = await postJson(baseUrl, "/api/pipelines", token, {
    pipelineCode: "VALIDATION-LINE-12",
    pipelineName: "Line 12",
    pipeMaterial: "Carbon Steel",
    pipeGrade: "API 5L X52",
    nominalWallThickness: 8,
    status: "Active"
  });
  assert.equal(response.status, 201, "Validation checks should create a test pipeline");
  return (await response.json()) as { id: string };
}

async function run() {
  ({ createApp } = await import("../app"));
  ({ env } = await import("../config/env"));
  ({ store } = await import("../data/store"));
  const { server, baseUrl } = await startServer();

  try {
    const { token } = await login(baseUrl);
    testPipelineId = (await createTestPipeline(baseUrl, token)).id;

    const devicesResponse = await getJson(baseUrl, "/api/devices", token);
    assert.equal(devicesResponse.status, 200, "Device listing should succeed for authenticated users");
    const devicesPayload = await devicesResponse.json();
    const devices = validateDeviceRecordList(devicesPayload);
    assert.equal(devices.length, 0, "Device listing should start empty when no real records exist");

    const validExternal = createValidExternalAssessment();
    const validInternal = createValidInternalAssessment();

    const validExternalResponse = await postJson(baseUrl, "/api/assessments", token, validExternal);
    assert.equal(validExternalResponse.status, 201, "Valid External payload should succeed");

    const validInternalResponse = await postJson(baseUrl, "/api/assessments", token, validInternal);
    assert.equal(validInternalResponse.status, 201, "Valid Internal payload should succeed");

    const celsiusTemperatureExternal = createValidExternalAssessment();
    celsiusTemperatureExternal.id = "external-temperature-celsius";
    celsiusTemperatureExternal.input.soilTemperature = 25;
    celsiusTemperatureExternal.input.soilTemperatureInputValue = 25;
    celsiusTemperatureExternal.input.soilTemperatureUnit = "C";
    const celsiusTemperatureResponse = await postJson(baseUrl, "/api/assessments", token, celsiusTemperatureExternal);
    assert.equal(celsiusTemperatureResponse.status, 201, "25 C should be accepted as 25 C");

    const fahrenheitTemperatureExternal = createValidExternalAssessment();
    fahrenheitTemperatureExternal.id = "external-temperature-fahrenheit";
    fahrenheitTemperatureExternal.input.soilTemperature = 25;
    fahrenheitTemperatureExternal.input.soilTemperatureInputValue = 77;
    fahrenheitTemperatureExternal.input.soilTemperatureUnit = "F";
    const fahrenheitTemperatureResponse = await postJson(baseUrl, "/api/assessments", token, fahrenheitTemperatureExternal);
    assert.equal(fahrenheitTemperatureResponse.status, 201, "77 F should be accepted when normalized to 25 C");

    const kelvinTemperatureInternal = createValidInternalAssessment();
    kelvinTemperatureInternal.id = "internal-temperature-kelvin";
    kelvinTemperatureInternal.input.temperature = 25;
    kelvinTemperatureInternal.input.temperatureInputValue = 298.15;
    kelvinTemperatureInternal.input.temperatureUnit = "K";
    const kelvinTemperatureResponse = await postJson(baseUrl, "/api/assessments", token, kelvinTemperatureInternal);
    assert.equal(kelvinTemperatureResponse.status, 201, "298.15 K should be accepted when normalized to 25 C");

    const legacyTemperatureExternal = createValidExternalAssessment();
    legacyTemperatureExternal.id = "external-temperature-legacy-celsius";
    delete (legacyTemperatureExternal.input as Record<string, unknown>).soilTemperatureInputValue;
    delete (legacyTemperatureExternal.input as Record<string, unknown>).soilTemperatureUnit;
    const legacyTemperatureResponse = await postJson(baseUrl, "/api/assessments", token, legacyTemperatureExternal);
    assert.equal(legacyTemperatureResponse.status, 201, "Legacy temperature records without unit metadata should be treated as Celsius");

    const manipulatedTemperature = createValidInternalAssessment();
    manipulatedTemperature.id = "internal-temperature-manipulated";
    manipulatedTemperature.input.temperature = 30;
    manipulatedTemperature.input.temperatureInputValue = 77;
    manipulatedTemperature.input.temperatureUnit = "F";
    const manipulatedTemperatureResponse = await postJson(baseUrl, "/api/assessments", token, manipulatedTemperature);
    assert.equal(manipulatedTemperatureResponse.status, 400, "API payloads cannot mismatch display temperature and normalized C");

    const belowAbsoluteZeroCelsius = createValidExternalAssessment();
    belowAbsoluteZeroCelsius.id = "external-temperature-below-c";
    belowAbsoluteZeroCelsius.input.soilTemperature = -273.16;
    belowAbsoluteZeroCelsius.input.soilTemperatureInputValue = -273.16;
    belowAbsoluteZeroCelsius.input.soilTemperatureUnit = "C";
    const belowAbsoluteZeroCelsiusResponse = await postJson(baseUrl, "/api/assessments", token, belowAbsoluteZeroCelsius);
    assert.equal(belowAbsoluteZeroCelsiusResponse.status, 400, "Temperatures below -273.15 C should be rejected");

    const belowAbsoluteZeroFahrenheit = createValidExternalAssessment();
    belowAbsoluteZeroFahrenheit.id = "external-temperature-below-f";
    belowAbsoluteZeroFahrenheit.input.soilTemperature = -273.16;
    belowAbsoluteZeroFahrenheit.input.soilTemperatureInputValue = -459.68;
    belowAbsoluteZeroFahrenheit.input.soilTemperatureUnit = "F";
    const belowAbsoluteZeroFahrenheitResponse = await postJson(baseUrl, "/api/assessments", token, belowAbsoluteZeroFahrenheit);
    assert.equal(belowAbsoluteZeroFahrenheitResponse.status, 400, "Temperatures below -459.67 F should be rejected");

    const belowAbsoluteZeroKelvin = createValidInternalAssessment();
    belowAbsoluteZeroKelvin.id = "internal-temperature-below-k";
    belowAbsoluteZeroKelvin.input.temperature = -273.16;
    belowAbsoluteZeroKelvin.input.temperatureInputValue = -0.01;
    belowAbsoluteZeroKelvin.input.temperatureUnit = "K";
    const belowAbsoluteZeroKelvinResponse = await postJson(baseUrl, "/api/assessments", token, belowAbsoluteZeroKelvin);
    assert.equal(belowAbsoluteZeroKelvinResponse.status, 400, "Temperatures below 0 K should be rejected");

    const missingTemperature = createValidInternalAssessment();
    missingTemperature.id = "internal-temperature-missing";
    delete (missingTemperature.input as Record<string, unknown>).temperature;
    const missingTemperatureResponse = await postJson(baseUrl, "/api/assessments", token, missingTemperature);
    assert.equal(missingTemperatureResponse.status, 400, "Missing temperature values should be rejected");

    const nanTemperature = createValidExternalAssessment();
    nanTemperature.input.soilTemperature = Number.NaN;
    assert.throws(
      () => validateNewAssessmentSubmission(nanTemperature),
      "NaN temperature values should be rejected by backend validation"
    );

    const infiniteTemperature = createValidInternalAssessment();
    infiniteTemperature.input.temperature = Number.POSITIVE_INFINITY;
    assert.throws(
      () => validateNewAssessmentSubmission(infiniteTemperature),
      "Infinite temperature values should be rejected by backend validation"
    );

    const inchWallThicknessExternal = createValidExternalAssessment();
    inchWallThicknessExternal.id = "external-inch-wall";
    const inchWallThicknessInput = inchWallThicknessExternal.input as typeof inchWallThicknessExternal.input & {
      wallThicknessDisplayValue?: number;
      wallThicknessUnit?: string;
    };
    inchWallThicknessInput.wallThickness = 12.7;
    inchWallThicknessInput.wallThicknessDisplayValue = 0.5;
    inchWallThicknessInput.wallThicknessUnit = "in";
    const inchWallThicknessResponse = await postJson(baseUrl, "/api/assessments", token, inchWallThicknessExternal);
    assert.equal(inchWallThicknessResponse.status, 201, "Assessment should accept normalized mm wall thickness with original inch display fields");

    for (const coating of permittedInternalCoatings) {
      const assessment = createValidInternalAssessment();
      assessment.id = `internal-coating-${coating.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
      assessment.input.internalCoating = coating;
      assessment.input.internalCoatingOther = coating === "Other" ? "Field-applied specialty lining" : "";

      const response = await postJson(baseUrl, "/api/assessments", token, assessment);
      assert.equal(response.status, 201, `Internal coating value should be accepted: ${coating}`);
    }

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
    legacyInternalReport.id = "legacy-internal-report-assessment";
    const savedLegacyInternal = {
      ...legacyInternalReport,
      type: "Internal"
    };
    const savedLegacyInternalResponse = await postJson(baseUrl, "/api/assessments", token, savedLegacyInternal);
    assert.equal(savedLegacyInternalResponse.status, 201, "Legacy report compatibility check should use a saved assessment");
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

    const zeroStructural = createValidInternalAssessment();
    zeroStructural.id = "internal-zero-wall";
    zeroStructural.input.wallThickness = 0;
    const zeroStructuralResponse = await postJson(baseUrl, "/api/assessments", token, zeroStructural);
    assert.equal(zeroStructuralResponse.status, 400);

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
