import {
  CommonCpInputs,
  assertNonNegativeFinite,
  assertPositiveFinite,
  calculateCurrentDemand,
  nextStandardRating,
  round,
  toFractionFromPercent
} from "@/lib/cpCalculationCommon";

export type IccpInputs = CommonCpInputs & {
  currentDemandMarginPercent: number;
  rectifierSpareCapacityPercent: number;
  circuitResistanceOhm: number;
  backVoltageV: number;
  rectifierVoltageMarginPercent: number;
  rectifierEfficiencyPercent: number;
};

export type IccpCalculationResult = {
  normalizedDiameterM: number;
  normalizedLengthM: number;
  surfaceAreaM2: number;
  exposedAreaM2: number;
  designCurrentDensityApm2: number;
  currentDemandA: number;
  designCurrentWithMarginA: number;
  minimumRectifierCurrentA: number;
  recommendedRectifierCurrentA: number;
  operatingRectifierVoltageV: number;
  minimumRectifierVoltageV: number;
  recommendedRectifierVoltageV: number;
  operatingDcPowerW: number;
  estimatedAcInputPowerW: number;
};

const STANDARD_RECTIFIER_CURRENT_RATINGS = [5, 10, 15, 20, 25, 30, 50, 75, 100] as const;
const STANDARD_RECTIFIER_VOLTAGE_RATINGS = [12, 24, 25, 50, 75, 100, 150, 200] as const;

export function calculateIccp(inputs: IccpInputs): IccpCalculationResult {
  const common = calculateCurrentDemand(inputs);
  assertNonNegativeFinite(inputs.currentDemandMarginPercent, "Current-demand margin");
  assertNonNegativeFinite(inputs.rectifierSpareCapacityPercent, "Rectifier spare capacity");
  assertPositiveFinite(inputs.circuitResistanceOhm, "Circuit resistance");
  assertNonNegativeFinite(inputs.backVoltageV, "Back voltage");
  assertNonNegativeFinite(inputs.rectifierVoltageMarginPercent, "Rectifier voltage margin");
  const efficiencyFactor = toFractionFromPercent(
    inputs.rectifierEfficiencyPercent,
    "Rectifier efficiency"
  );

  const currentDemandMarginFactor = 1 + inputs.currentDemandMarginPercent / 100;
  const rectifierSpareFactor = 1 + inputs.rectifierSpareCapacityPercent / 100;
  const rectifierVoltageMarginFactor = 1 + inputs.rectifierVoltageMarginPercent / 100;

  const designCurrentWithMarginA = common.currentDemandA * currentDemandMarginFactor;
  const minimumRectifierCurrentA = designCurrentWithMarginA * rectifierSpareFactor;
  const operatingRectifierVoltageV =
    designCurrentWithMarginA * inputs.circuitResistanceOhm + inputs.backVoltageV;
  const minimumRectifierVoltageV =
    operatingRectifierVoltageV * rectifierVoltageMarginFactor;
  const operatingDcPowerW = operatingRectifierVoltageV * designCurrentWithMarginA;
  const estimatedAcInputPowerW = operatingDcPowerW / efficiencyFactor;

  return {
    normalizedDiameterM: round(common.normalizedDiameterM, 6),
    normalizedLengthM: round(common.normalizedLengthM, 3),
    surfaceAreaM2: round(common.surfaceAreaM2, 3),
    exposedAreaM2: round(common.exposedAreaM2, 3),
    designCurrentDensityApm2: round(common.designCurrentDensityApm2, 6),
    currentDemandA: round(common.currentDemandA, 4),
    designCurrentWithMarginA: round(designCurrentWithMarginA, 4),
    minimumRectifierCurrentA: round(minimumRectifierCurrentA, 3),
    recommendedRectifierCurrentA: nextStandardRating(
      minimumRectifierCurrentA,
      STANDARD_RECTIFIER_CURRENT_RATINGS
    ),
    operatingRectifierVoltageV: round(operatingRectifierVoltageV, 3),
    minimumRectifierVoltageV: round(minimumRectifierVoltageV, 3),
    recommendedRectifierVoltageV: nextStandardRating(
      minimumRectifierVoltageV,
      STANDARD_RECTIFIER_VOLTAGE_RATINGS
    ),
    operatingDcPowerW: round(operatingDcPowerW, 2),
    estimatedAcInputPowerW: round(estimatedAcInputPowerW, 2)
  };
}
