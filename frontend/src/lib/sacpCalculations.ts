import {
  CommonCpInputs,
  assertNegativeFinite,
  assertNonNegativeFinite,
  assertPositiveFinite,
  calculateCurrentDemand,
  round,
  toFractionFromPercent
} from "./cpCalculationCommon";

export type SacpInputs = Omit<CommonCpInputs, "coatingBreakdownPercent"> & {
  initialCoatingBreakdownPercent: number;
  finalCoatingBreakdownPercent: number;
  designLifeYears: number;
  designContingencyFactor: number;
  anodeNetWeightKg: number;
  electrochemicalCapacityAhPerKg: number;
  utilizationFactorPercent: number;
  postSelectionRedundancyPercent: number;
  drivingVoltageV: number;
  anodeToEarthResistanceOhm: number;
  cableResistanceOhm: number;
  bondResistanceOhm: number;
  soilResistivityValue: number;
  anodeSpacingM: number;
  distanceFromPipelineM: number;
  cableLengthM: number;
  naturalPotentialMvCse: number;
  anodeOpenCircuitPotentialMvCse: number;
  energizedPotentialMvCse: number;
  shuntVoltageMv: number;
  shuntResistanceOhm: number;
  continuityConfirmed: boolean;
  isolationConfirmed: boolean;
};

export type SacpCalculationResult = {
  normalizedDiameterM: number;
  normalizedLengthM: number;
  surfaceAreaM2: number;
  initialExposedAreaM2: number;
  finalExposedAreaM2: number;
  designCurrentDensityApm2: number;
  initialCurrentDemandA: number;
  finalCurrentDemandA: number;
  finalCurrentDemandWithDesignFactorA: number;
  requiredAmpereHours: number;
  usableAnodeCapacityAh: number;
  capacityBasedAnodesRaw: number;
  capacityBasedAnodesRounded: number;
  totalConnectionResistanceOhm: number;
  totalCircuitResistanceOhm: number;
  oneAnodeOutputCurrentA: number;
  outputBasedAnodesRaw: number;
  outputBasedAnodesRounded: number;
  governingAnodeRequirement: number;
  finalRequirementBeforeRounding: number;
  finalAnodeRequirement: number;
  shuntCurrentA: number;
  shuntCurrentMa: number;
  naturalPotentialMvCse: number;
  anodeOpenCircuitPotentialMvCse: number;
  energizedPotentialMvCse: number;
  potentialShiftMv: number;
  meetsProtectionCriterion: boolean;
  anodeOpenCircuitPotentialWithinExpectedRange: boolean;
  continuityConfirmed: boolean;
  isolationConfirmed: boolean;
  soilResistivityValue: number;
  anodeSpacingM: number;
  distanceFromPipelineM: number;
  cableLengthM: number;
};

export function calculateSacp(inputs: SacpInputs): SacpCalculationResult {
  const initialDemand = calculateCurrentDemand({
    diameterValue: inputs.diameterValue,
    diameterUnit: inputs.diameterUnit,
    lengthValue: inputs.lengthValue,
    lengthUnit: inputs.lengthUnit,
    coatingSystem: inputs.coatingSystem,
    coatingBreakdownPercent: inputs.initialCoatingBreakdownPercent,
    designCurrentDensityValue: inputs.designCurrentDensityValue,
    designCurrentDensityUnit: inputs.designCurrentDensityUnit
  });
  const finalDemand = calculateCurrentDemand({
    diameterValue: inputs.diameterValue,
    diameterUnit: inputs.diameterUnit,
    lengthValue: inputs.lengthValue,
    lengthUnit: inputs.lengthUnit,
    coatingSystem: inputs.coatingSystem,
    coatingBreakdownPercent: inputs.finalCoatingBreakdownPercent,
    designCurrentDensityValue: inputs.designCurrentDensityValue,
    designCurrentDensityUnit: inputs.designCurrentDensityUnit
  });

  assertPositiveFinite(inputs.designLifeYears, "Design life");
  assertPositiveFinite(inputs.designContingencyFactor, "Design contingency factor");
  assertPositiveFinite(inputs.anodeNetWeightKg, "Anode net weight");
  assertPositiveFinite(inputs.electrochemicalCapacityAhPerKg, "Electrochemical capacity");
  const utilizationFactor = toFractionFromPercent(
    inputs.utilizationFactorPercent,
    "Utilization factor",
    { max: 100 }
  );
  const postSelectionRedundancyFactor =
    1 +
    toFractionFromPercent(inputs.postSelectionRedundancyPercent, "Post-selection redundancy", {
      allowZero: true
    });
  assertPositiveFinite(inputs.drivingVoltageV, "Driving voltage");
  assertPositiveFinite(inputs.anodeToEarthResistanceOhm, "Anode-to-earth resistance");
  assertNonNegativeFinite(inputs.cableResistanceOhm, "Cable resistance");
  assertNonNegativeFinite(inputs.bondResistanceOhm, "Bond resistance");
  assertPositiveFinite(inputs.soilResistivityValue, "Soil resistivity");
  assertPositiveFinite(inputs.anodeSpacingM, "Anode spacing");
  assertPositiveFinite(inputs.distanceFromPipelineM, "Distance from pipeline");
  assertPositiveFinite(inputs.cableLengthM, "Cable length");
  assertNegativeFinite(inputs.naturalPotentialMvCse, "Natural potential");
  assertNegativeFinite(inputs.anodeOpenCircuitPotentialMvCse, "Anode open-circuit potential");
  assertNegativeFinite(inputs.energizedPotentialMvCse, "Energized potential");
  assertNonNegativeFinite(inputs.shuntVoltageMv, "Shunt voltage");
  assertPositiveFinite(inputs.shuntResistanceOhm, "Shunt resistance");

  const finalCurrentDemandWithDesignFactorA =
    finalDemand.currentDemandA * inputs.designContingencyFactor;
  const requiredAmpereHours =
    finalCurrentDemandWithDesignFactorA * 8760 * inputs.designLifeYears;
  const usableAnodeCapacityAh =
    inputs.anodeNetWeightKg * inputs.electrochemicalCapacityAhPerKg * utilizationFactor;
  const capacityBasedAnodesRaw = requiredAmpereHours / usableAnodeCapacityAh;
  const totalConnectionResistanceOhm = inputs.cableResistanceOhm + inputs.bondResistanceOhm;
  const totalCircuitResistanceOhm =
    inputs.anodeToEarthResistanceOhm + totalConnectionResistanceOhm;
  const oneAnodeOutputCurrentA = inputs.drivingVoltageV / totalCircuitResistanceOhm;
  const outputBasedAnodesRaw = finalCurrentDemandWithDesignFactorA / oneAnodeOutputCurrentA;
  const capacityBasedAnodesRounded = Math.ceil(capacityBasedAnodesRaw);
  const outputBasedAnodesRounded = Math.ceil(outputBasedAnodesRaw);
  const governingAnodeRequirement = Math.max(
    capacityBasedAnodesRounded,
    outputBasedAnodesRounded
  );
  const finalRequirementBeforeRounding =
    governingAnodeRequirement * postSelectionRedundancyFactor;
  const finalAnodeRequirement = Math.ceil(finalRequirementBeforeRounding);
  const shuntCurrentA = inputs.shuntVoltageMv / 1000 / inputs.shuntResistanceOhm;
  const potentialShiftMv = inputs.naturalPotentialMvCse - inputs.energizedPotentialMvCse;

  return {
    normalizedDiameterM: round(initialDemand.normalizedDiameterM, 6),
    normalizedLengthM: round(initialDemand.normalizedLengthM, 3),
    surfaceAreaM2: round(initialDemand.surfaceAreaM2, 3),
    initialExposedAreaM2: round(initialDemand.exposedAreaM2, 3),
    finalExposedAreaM2: round(finalDemand.exposedAreaM2, 3),
    designCurrentDensityApm2: round(initialDemand.designCurrentDensityApm2, 6),
    initialCurrentDemandA: round(initialDemand.currentDemandA, 4),
    finalCurrentDemandA: round(finalDemand.currentDemandA, 4),
    finalCurrentDemandWithDesignFactorA: round(finalCurrentDemandWithDesignFactorA, 4),
    requiredAmpereHours: round(requiredAmpereHours, 2),
    usableAnodeCapacityAh: round(usableAnodeCapacityAh, 2),
    capacityBasedAnodesRaw: round(capacityBasedAnodesRaw, 3),
    capacityBasedAnodesRounded,
    totalConnectionResistanceOhm: round(totalConnectionResistanceOhm, 4),
    totalCircuitResistanceOhm: round(totalCircuitResistanceOhm, 4),
    oneAnodeOutputCurrentA: round(oneAnodeOutputCurrentA, 4),
    outputBasedAnodesRaw: round(outputBasedAnodesRaw, 3),
    outputBasedAnodesRounded,
    governingAnodeRequirement,
    finalRequirementBeforeRounding: round(finalRequirementBeforeRounding, 3),
    finalAnodeRequirement,
    shuntCurrentA: round(shuntCurrentA, 4),
    shuntCurrentMa: round(shuntCurrentA * 1000, 2),
    naturalPotentialMvCse: round(inputs.naturalPotentialMvCse, 1),
    anodeOpenCircuitPotentialMvCse: round(inputs.anodeOpenCircuitPotentialMvCse, 1),
    energizedPotentialMvCse: round(inputs.energizedPotentialMvCse, 1),
    potentialShiftMv: round(potentialShiftMv, 1),
    meetsProtectionCriterion: inputs.energizedPotentialMvCse <= -950,
    anodeOpenCircuitPotentialWithinExpectedRange:
      inputs.anodeOpenCircuitPotentialMvCse <= -1600 &&
      inputs.anodeOpenCircuitPotentialMvCse >= -1770,
    continuityConfirmed: inputs.continuityConfirmed,
    isolationConfirmed: inputs.isolationConfirmed,
    soilResistivityValue: round(inputs.soilResistivityValue, 3),
    anodeSpacingM: round(inputs.anodeSpacingM, 3),
    distanceFromPipelineM: round(inputs.distanceFromPipelineM, 3),
    cableLengthM: round(inputs.cableLengthM, 3)
  };
}
