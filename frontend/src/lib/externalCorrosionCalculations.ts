import { scoreToRiskLevel } from "@/lib/riskScoring";
import { ExternalCorrosionInput, ExternalCorrosionResult } from "@/lib/types";

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
  const corrosionDepth = Number(
    ((input.pipeAge + 1) * corrosionRate * 0.18).toFixed(2)
  );
  const remainingLife = Number(
    Math.max(
      0.5,
      (input.wallThickness - corrosionDepth) / Math.max(corrosionRate, 0.1)
    ).toFixed(1)
  );
  const strayCurrentCorrosionRate = Number(
    (0.03 + input.strayCurrentDensity * 0.11 + input.dcCurrentDensity * 0.06).toFixed(2)
  );

  const riskLevel = scoreToRiskLevel(rawScore);

  return {
    soilCorrosivityLevel:
      rawScore >= 70 ? "Severe" : rawScore >= 40 ? "Moderate" : "Mild",
    corrosionRate,
    corrosionDepth,
    remainingLife,
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
