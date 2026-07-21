import {
  CommonCpInputs,
  assertPositiveFinite,
  calculateCurrentDemand,
  round,
  toFractionFromPercent
} from "@/lib/cpCalculationCommon";

export type SacpInputs = CommonCpInputs & {
  designLifeYears: number;
  designFactor: number;
  anodeNetWeightKg: number;
  electrochemicalCapacityAhPerKg: number;
  utilizationFactorPercent: number;
  drivingVoltageV: number;
  anodeResistanceOhm: number;
  connectionResistanceOhm: number;
};

export type SacpCalculationResult = {
  normalizedDiameterM: number;
  normalizedLengthM: number;
  surfaceAreaM2: number;
  exposedAreaM2: number;
  designCurrentDensityApm2: number;
  currentDemandA: number;
  requiredAmpereHours: number;
  usableAnodeCapacityAh: number;
  capacityBasedAnodesRaw: number;
  capacityBasedAnodesRounded: number;
  oneAnodeOutputCurrentA: number;
  outputBasedAnodesRaw: number;
  outputBasedAnodesRounded: number;
  governingAnodeRequirement: number;
};

export function calculateSacp(inputs: SacpInputs): SacpCalculationResult {
  const common = calculateCurrentDemand(inputs);
  assertPositiveFinite(inputs.designLifeYears, "Design life");
  assertPositiveFinite(inputs.designFactor, "Design factor");
  assertPositiveFinite(inputs.anodeNetWeightKg, "Anode net weight");
  assertPositiveFinite(inputs.electrochemicalCapacityAhPerKg, "Electrochemical capacity");
  const utilizationFactor = toFractionFromPercent(
    inputs.utilizationFactorPercent,
    "Utilization factor"
  );
  assertPositiveFinite(inputs.drivingVoltageV, "Driving voltage");
  assertPositiveFinite(inputs.anodeResistanceOhm, "Anode resistance");
  assertPositiveFinite(inputs.connectionResistanceOhm, "Connection resistance");

  const requiredAmpereHours =
    common.currentDemandA * 8760 * inputs.designLifeYears * inputs.designFactor;
  const usableAnodeCapacityAh =
    inputs.anodeNetWeightKg * inputs.electrochemicalCapacityAhPerKg * utilizationFactor;
  const capacityBasedAnodesRaw = requiredAmpereHours / usableAnodeCapacityAh;
  const oneAnodeOutputCurrentA =
    inputs.drivingVoltageV / (inputs.anodeResistanceOhm + inputs.connectionResistanceOhm);
  const outputBasedAnodesRaw = common.currentDemandA / oneAnodeOutputCurrentA;
  const capacityBasedAnodesRounded = Math.ceil(capacityBasedAnodesRaw);
  const outputBasedAnodesRounded = Math.ceil(outputBasedAnodesRaw);

  return {
    normalizedDiameterM: round(common.normalizedDiameterM, 6),
    normalizedLengthM: round(common.normalizedLengthM, 3),
    surfaceAreaM2: round(common.surfaceAreaM2, 3),
    exposedAreaM2: round(common.exposedAreaM2, 3),
    designCurrentDensityApm2: round(common.designCurrentDensityApm2, 6),
    currentDemandA: round(common.currentDemandA, 4),
    requiredAmpereHours: round(requiredAmpereHours, 2),
    usableAnodeCapacityAh: round(usableAnodeCapacityAh, 2),
    capacityBasedAnodesRaw: round(capacityBasedAnodesRaw, 3),
    capacityBasedAnodesRounded,
    oneAnodeOutputCurrentA: round(oneAnodeOutputCurrentA, 4),
    outputBasedAnodesRaw: round(outputBasedAnodesRaw, 3),
    outputBasedAnodesRounded,
    governingAnodeRequirement: Math.max(capacityBasedAnodesRounded, outputBasedAnodesRounded)
  };
}
