import { scoreToRiskLevel } from "@/lib/riskScoring";
import { InternalCorrosionInput, InternalCorrosionResult } from "@/lib/types";

export function calculateInternalCorrosion(
  input: InternalCorrosionInput
): InternalCorrosionResult {
  const chemistryFactor =
    Math.max(0, 8 - input.waterPh) * 5 +
    input.dissolvedOxygen * 3.2;

  const processFactor =
    input.temperature * 0.8 +
    input.waterVelocity * 8 +
    input.pipelinePressure * 0.14;

  const internalCoating =
    input.internalCoating === "Epoxy/Others" ? "Epoxy" : input.internalCoating;

  const coatingFactor =
    internalCoating === "Bare"
      ? 12
      : internalCoating === "Cement Lining"
        ? 7
        : 4;

  const rawScore = Math.min(100, chemistryFactor + processFactor + coatingFactor);
  const corrosionRate = Number((0.05 + rawScore * 0.01).toFixed(2));
  const corrosionDepth = Number(
    ((input.pipeAge + 1) * corrosionRate * 0.16).toFixed(2)
  );
  const remainingLife = Number(
    Math.max(
      0.5,
      (input.wallThickness - corrosionDepth) / Math.max(corrosionRate, 0.08)
    ).toFixed(1)
  );

  const riskLevel = scoreToRiskLevel(rawScore);
  const strayCurrentCorrosionRate = Number((0.01 + input.pipelinePressure * 0.002).toFixed(2));

  return {
    corrosionRate,
    corrosionDepth,
    remainingLife,
    highPhSccProbability: input.waterPh > 8.8 ? "Moderate" : "Low",
    nearNeutralPhSccProbability:
      input.waterPh >= 6.4 && input.waterPh <= 7.8 ? "Screening watch" : "Low",
    micWarning:
      input.temperature > 35 && input.waterVelocity < 1.2
        ? "Review stagnant zones for MIC"
        : "Low MIC indication",
    cathodicDelaminationWarning:
      internalCoating === "Epoxy"
        ? "Check lining adhesion during inspection"
        : "Not a leading concern for this setup",
    acCorrosionWarning:
      input.pipelinePressure > 90 ? "Review for electrical interference coupling" : "Low warning",
    strayCurrentCorrosionRate,
    majorModeOfFailure:
      rawScore >= 70
        ? "Pitting and under-deposit attack"
        : rawScore >= 40
          ? "General internal thinning"
          : "Early surface corrosion",
    riskLevel,
    riskScore: Math.round(rawScore)
  };
}
