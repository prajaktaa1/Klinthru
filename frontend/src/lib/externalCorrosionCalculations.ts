import { scoreToRiskLevel } from "@/lib/riskScoring";
import { ExternalCorrosionInput, ExternalCorrosionResult } from "@/lib/types";

// Saved assessment scalars use canonical units; the form uses the recorded display units.
// Restore display values before deriving or normalizing again, including older records
// without display metadata. This does not change any stored record.
export function restoreAssessmentDisplayInput<T extends Record<string, string | number | undefined>>(input: T): T {
  const next = { ...input } as Record<string, string | number | undefined>;
  const diameterFactors: Record<string, number> = { mm: 1, cm: 10, m: 1000, inch: 25.4, ft: 304.8 };
  const pressureFactors: Record<string, number> = { bar: 1, MPa: 10, kPa: 0.01, psi: 0.0689476 };
  const restore = (key: string, metadata: string, factor: number | undefined) => {
    if (typeof input[metadata] === "number" && Number.isFinite(input[metadata])) next[key] = input[metadata];
    else if (typeof input[key] === "number" && Number.isFinite(input[key]) && factor) next[key] = input[key] / factor;
  };
  restore("pipeIdDiameter", "pipeIdDiameterDisplayValue", diameterFactors[String(input.pipeIdDiameterUnit ?? "mm")]);
  restore("wallThickness", "wallThicknessDisplayValue", input.wallThicknessUnit === "in" ? 25.4 : 1);
  for (const key of ["operatingPressure", "pipelinePressure"]) {
    restore(key, `${key}DisplayValue`, pressureFactors[String(input[`${key}Unit`] ?? "bar")]);
  }
  for (const key of ["soilTemperature", "temperature"]) {
    if (typeof input[key] !== "number" || !Number.isFinite(input[key])) continue;
    const unit = input[`${key}Unit`] ?? "C";
    const display = unit === "F" ? input[key] * 9 / 5 + 32 : unit === "K" ? input[key] + 273.15 : input[key];
    next[`${key}InputValue`] = typeof input[`${key}InputValue`] === "number" ? input[`${key}InputValue`] : display;
  }
  return next as T;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function safeNumber(value: unknown, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function pipeDiameterToMm(diameter: number, unit: string) {
  const factor =
    unit === "cm"
      ? 10
      : unit === "m"
        ? 1000
        : unit === "inch"
          ? 25.4
          : unit === "ft"
            ? 304.8
            : 1;

  return diameter * factor;
}

export function calculateCoatingAge(installationYear: number, inspectionYear: number) {
  if (!(installationYear > 0) || !(inspectionYear > 0)) {
    return 0;
  }

  return Math.max(0, inspectionYear - installationYear);
}

export function deriveCpStatus(onPotentialMv: number, offPotentialMv: number, referenceElectrode: string) {
  if (!Number.isFinite(onPotentialMv) || !Number.isFinite(offPotentialMv) || !onPotentialMv || !offPotentialMv || !referenceElectrode.trim()) {
    return "Not Determined";
  }

  const polarizationShift = Math.abs(offPotentialMv - onPotentialMv);
  const electrode = referenceElectrode.trim().toLowerCase();
  if (electrode !== "cse" && electrode !== "ag/agcl") return "Not Determined";
  const protectedThreshold = electrode === "ag/agcl" ? -800 : -850;

  if (offPotentialMv <= protectedThreshold && polarizationShift >= 100) {
    return "Protected";
  }

  if (offPotentialMv <= protectedThreshold + 75) {
    return "Marginal";
  }

  return "Not Protected";
}

export function deriveCoatingCondition({
  coatingType,
  coatingAge,
  holidayFound,
  holidaySize
}: {
  coatingType: string;
  coatingAge: number;
  holidayFound: string;
  holidaySize: number;
}) {
  if (coatingType === "Bare") {
    return "Bare";
  }

  if (holidayFound === "Yes" && holidaySize >= 50) {
    return "Critical";
  }

  if (holidayFound === "Yes") {
    return "Degraded";
  }

  if (coatingAge >= 20) {
    return "Aged";
  }

  if (coatingAge >= 10) {
    return "Weathered";
  }

  return "Good";
}

export function calculateMinimumRequiredThickness({
  pipelineOdMm,
  smysMpa,
  pressureBar,
  designFactor = 0.72
}: {
  pipelineOdMm: number;
  smysMpa: number;
  pressureBar: number;
  designFactor?: number;
}) {
  if (!(pipelineOdMm > 0) || !(smysMpa > 0) || !(pressureBar > 0)) {
    return 0;
  }

  const designPressureMpa = (pressureBar / 10) / designFactor;
  return round((designPressureMpa * pipelineOdMm) / (2 * smysMpa), 2);
}

export function calculateRemainingThickness({
  wallThickness,
  corrosionDepth,
  measuredThickness
}: {
  wallThickness: number;
  corrosionDepth: number;
  measuredThickness: number;
}) {
  if (measuredThickness > 0) {
    return measuredThickness;
  }

  return Math.max(0.1, wallThickness - corrosionDepth);
}

export function calculateMetalLossPercent({
  wallThickness,
  corrosionDepth,
  measuredThickness
}: {
  wallThickness: number;
  corrosionDepth: number;
  measuredThickness: number;
}) {
  if (!(wallThickness > 0)) {
    return 0;
  }

  const lossMm = measuredThickness > 0 ? Math.max(0, wallThickness - measuredThickness) : corrosionDepth;
  return clamp((lossMm / wallThickness) * 100, 0, 100);
}

export function calculateFailurePressure({
  pipelineOdMm,
  smysMpa,
  remainingThicknessMm,
  metalLossPercent,
  corrosionLengthMm,
  corrosionWidthMm,
  coatingCondition,
  cpStatus
}: {
  pipelineOdMm: number;
  smysMpa: number;
  remainingThicknessMm: number;
  metalLossPercent: number;
  corrosionLengthMm: number;
  corrosionWidthMm: number;
  coatingCondition: string;
  cpStatus: string;
}) {
  if (!(pipelineOdMm > 0) || !(smysMpa > 0) || !(remainingThicknessMm > 0)) {
    return 0;
  }

  const baseBurstPressureBar = ((2 * smysMpa * remainingThicknessMm) / pipelineOdMm) * 10;
  const lengthFactor = clamp(1 - corrosionLengthMm / Math.max(pipelineOdMm * 4, 1), 0.45, 1);
  const widthFactor = clamp(1 - corrosionWidthMm / Math.max(remainingThicknessMm * 20, 1), 0.55, 1);
  const lossFactor = clamp(1 - metalLossPercent / 140, 0.3, 1);
  const coatingFactor =
    coatingCondition === "Critical"
      ? 0.72
      : coatingCondition === "Degraded"
        ? 0.84
        : coatingCondition === "Aged"
          ? 0.9
          : coatingCondition === "Bare"
            ? 0.7
            : 1;
  const cpFactor = cpStatus === "Protected" ? 1 : cpStatus === "Marginal" ? 0.93 : 0.86;

  return round(baseBurstPressureBar * lengthFactor * widthFactor * lossFactor * coatingFactor * cpFactor, 2);
}

export function calculateSafetyMargin(failurePressureBar: number, operatingPressureBar: number) {
  if (!(failurePressureBar > 0) || !(operatingPressureBar > 0)) {
    return 0;
  }

  return round(((failurePressureBar - operatingPressureBar) / failurePressureBar) * 100, 1);
}

export function buildRecommendation({
  failurePressureRatio,
  safetyMargin,
  cpStatus,
  coatingCondition,
  metalLossPercent
}: {
  failurePressureRatio: number;
  safetyMargin: number;
  cpStatus: string;
  coatingCondition: string;
  metalLossPercent: number;
}) {
  if (failurePressureRatio < 1 || safetyMargin < 5 || metalLossPercent >= 50) {
    return "Immediate repair and re-evaluation required";
  }

  if (failurePressureRatio < 1.25 || cpStatus !== "Protected" || coatingCondition === "Degraded" || coatingCondition === "Critical") {
    return "Mitigate defect, verify CP, and re-inspect soon";
  }

  return "Continue monitoring at routine interval";
}

function hasGroundwaterPresence(value: string) {
  return value !== "No" && value !== "No Groundwater" && value.length > 0;
}

function getCpReductionFactorInput(input: ExternalCorrosionInput) {
  if (input.cpInputType === "CP Polarization") {
    return input.cpInputValue;
  }

  return Math.abs(input.cpInputValue);
}

export function calculateExternalCorrosion(
  input: ExternalCorrosionInput
): ExternalCorrosionResult {
  const pipelineOdMm = safeNumber(input.pipeIdDiameter);
  const installationYear = safeNumber(input.installationYear);
  const inspectionYear = safeNumber(input.inspectionYear);
  const coatingAge = calculateCoatingAge(installationYear, inspectionYear);
  const cpStatus = deriveCpStatus(safeNumber(input.onPotential), safeNumber(input.offPotential), String(input.referenceElectrode ?? ""));
  const coatingCondition = deriveCoatingCondition({
    coatingType: String(input.coatingType ?? ""),
    coatingAge,
    holidayFound: String(input.holidayFound ?? ""),
    holidaySize: safeNumber(input.holidaySize)
  });

  const cpReductionFactorInput = getCpReductionFactorInput(input);
  const cpPenalty =
    input.cpInputType === "CP Polarization"
      ? Math.max(0, 100 - cpReductionFactorInput) * 0.16
      : Math.max(0, 0.9 - cpReductionFactorInput) * 18;

  const acExposure =
    input.acInputType === "AC Current Density"
      ? input.acInputValue * 2.6
      : input.acInputValue * 1.9;

  const chemistryFactor =
    input.soilMoisture * 0.16 +
    input.chloride * 0.02 +
    input.sulphate * 0.015 +
    input.sulphideH2S * 0.05 +
    input.soilCarbonateContent * 0.04;

  const soilTypeFactor =
    input.soilType === "Clay"
      ? 8
      : input.soilType === "Peat" || input.soilType === "Peat / Organic Soil"
        ? 10
        : 4;

  const environmentFactor =
    Math.max(0, 8 - input.soilPh) * 3 +
    Math.max(0, 60 - input.soilResistivity / 10) +
    input.soilTemperature * 0.4 +
    soilTypeFactor +
    (input.cinderAndCoke === "Yes" ? 11 : 0);

  const electricalFactor =
    acExposure +
    input.dcCurrentDensity * 2.2 +
    input.strayCurrentDensity * 4.8 +
    cpPenalty;

  const groundwaterFactor =
    hasGroundwaterPresence(input.groundwaterPresence) ? 12 : 4;

  const rawScore = Math.min(
    100,
    chemistryFactor + environmentFactor + electricalFactor + groundwaterFactor
  );

  const corrosionRate = Number((0.08 + rawScore * 0.012).toFixed(2));
  const corrosionDepth = safeNumber(input.measuredThickness) > 0
    ? round(Math.max(0, safeNumber(input.wallThickness) - input.measuredThickness), 2)
    : Number(((input.pipeAge + 1) * corrosionRate * 0.18).toFixed(2));
  const metalLossPercent = round(
    calculateMetalLossPercent({
      wallThickness: safeNumber(input.wallThickness),
      corrosionDepth,
      measuredThickness: safeNumber(input.measuredThickness)
    }),
    1
  );
  const remainingThickness = calculateRemainingThickness({
    wallThickness: safeNumber(input.wallThickness),
    corrosionDepth,
    measuredThickness: safeNumber(input.measuredThickness)
  });
  const minimumRequiredThickness = calculateMinimumRequiredThickness({
    pipelineOdMm,
    smysMpa: safeNumber(input.smys),
    pressureBar: Math.max(safeNumber(input.maop), safeNumber(input.operatingPressure))
  });
  const failurePressure = calculateFailurePressure({
    pipelineOdMm,
    smysMpa: safeNumber(input.smys),
    remainingThicknessMm: remainingThickness,
    metalLossPercent,
    corrosionLengthMm: safeNumber(input.corrosionLength),
    corrosionWidthMm: safeNumber(input.corrosionWidth),
    coatingCondition,
    cpStatus
  });
  const operatingPressure = Math.max(safeNumber(input.operatingPressure), 0);
  const failurePressureRatio = operatingPressure > 0 ? round(failurePressure / operatingPressure, 2) : 0;
  const safetyMargin = calculateSafetyMargin(failurePressure, operatingPressure);
  const remainingLife = Number(
    Math.max(
      0.5,
      (input.wallThickness - corrosionDepth) / Math.max(corrosionRate, 0.1)
    ).toFixed(1)
  );
  const strayCurrentCorrosionRate = Number(
    (0.03 + input.strayCurrentDensity * 0.11 + input.dcCurrentDensity * 0.06).toFixed(2)
  );
  const recommendation = buildRecommendation({
    failurePressureRatio,
    safetyMargin,
    cpStatus,
    coatingCondition,
    metalLossPercent
  });

  const riskLevel = scoreToRiskLevel(rawScore);

  return {
    soilCorrosivityLevel:
      rawScore >= 70 ? "Severe" : rawScore >= 40 ? "Moderate" : "Mild",
    corrosionRate,
    corrosionDepth,
    metalLossPercent,
    remainingLife,
    failurePressure,
    failurePressureRatio,
    safetyMargin,
    recommendation,
    highPhSccProbability:
      input.soilPh > 8.5 &&
      (input.cpInputType === "CP Polarization"
        ? cpReductionFactorInput > 85
        : cpReductionFactorInput >= 0.85)
        ? "Moderate"
        : "Low",
    nearNeutralPhSccProbability:
      input.soilPh >= 6 && input.soilPh <= 8 && hasGroundwaterPresence(input.groundwaterPresence)
        ? "Elevated"
        : "Low",
    micWarning:
      input.soilMoisture > 55 && hasGroundwaterPresence(input.groundwaterPresence)
        ? "Monitor for MIC"
        : "Low indication",
    cathodicDelaminationWarning:
      (input.cpInputType === "CP Polarization"
        ? cpReductionFactorInput > 95
        : cpReductionFactorInput >= 0.95) && input.coatingType !== "Bare"
        ? "Review coating for cathodic disbondment"
        : "No immediate cathodic delamination warning",
    acCorrosionWarning:
      input.acInputValue > 10 || input.strayCurrentDensity > 8
        ? "Inspect for AC interference"
        : "No immediate AC warning",
    strayCurrentCorrosionRate,
    majorModeOfFailure:
      rawScore >= 70
        ? "Localized pitting"
        : rawScore >= 40
          ? "General wall loss"
          : "Coating underfilm corrosion",
    riskLevel,
    riskScore: Math.round(rawScore)
  };
}
