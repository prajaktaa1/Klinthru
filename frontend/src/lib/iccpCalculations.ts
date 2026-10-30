import {
  CableAreaInputUnit,
  CommonCpInputs,
  LengthInputUnit,
  assertNegativeFinite,
  assertNonNegativeFinite,
  assertPositiveFinite,
  assertPositiveInteger,
  calculateCurrentDemand,
  round,
  toFractionFromPercent,
  toMetersFromLength,
  toSquareMillimeters
} from "./cpCalculationCommon";

export type IccpInputs = CommonCpInputs & {
  designLifeYears: number;
  currentDemandMarginPercent: number;
  rectifierSpareCapacityPercent: number;
  groundbedResistanceOhm: number;
  positiveCableLengthValue: number;
  positiveCableLengthUnit: LengthInputUnit;
  negativeCableLengthValue: number;
  negativeCableLengthUnit: LengthInputUnit;
  cableCrossSectionValue: number;
  cableCrossSectionUnit: CableAreaInputUnit;
  copperResistivityOhmMm2PerM: number;
  junctionBondResistanceOhm: number;
  backVoltageV: number;
  rectifierVoltageMarginPercent: number;
  rectifierEfficiencyPercent: number;
  totalMmoAnodes: number;
  minimumOperatingMmoAnodes: number;
  individualAnodeContinuousRatingA: number;
  numberOfNegativeCircuits: number;
  measuredNegativeCircuitShuntMv: number;
  negativeCircuitShuntRatedCurrentA: number;
  negativeCircuitShuntRatedVoltageMv: number;
  nativePotentialMvCse: number;
  onPotentialMvCse: number;
  instantOffPotentialMvCse: number;
  controlSetpointMvCse: number;
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
  positiveCableLengthM: number;
  negativeCableLengthM: number;
  totalCableLengthM: number;
  cableCrossSectionMm2: number;
  positiveCableResistanceOhm: number;
  negativeCableResistanceOhm: number;
  totalCableResistanceOhm: number;
  totalCircuitResistanceOhm: number;
  operatingRectifierVoltageV: number;
  minimumRectifierVoltageV: number;
  operatingDcPowerW: number;
  estimatedAcInputPowerW: number;
  fiveYearDcChargeAh: number;
  fiveYearDcEnergyKwh: number;
  currentPerMmoAnodeA: number;
  currentPerOperatingMmoAnodeA: number;
  groundbedLoadingWithinContinuousRating: boolean;
  measuredNegativeCircuitCurrentA: number;
  designCurrentPerNegativeCircuitA: number;
  measuredNegativeCircuitCurrentWithinShuntRating: boolean;
  nativePotentialMvCse: number;
  onPotentialMvCse: number;
  instantOffPotentialMvCse: number;
  controlSetpointMvCse: number;
  instantOffMeetsProtectionCriterion: boolean;
  controlSetpointWithinDocumentWindow: boolean;
  polarizationShiftMv: number;
  documentBackedMinimumPracticalRectifierCurrentA: number;
  documentBackedEnhancedRectifierCurrentA: number;
  documentBackedPreliminaryRectifierVoltageV: number;
  documentBackedGroundbedResistanceTargetMaxOhm: number;
};

function calculateCableResistanceOhm(
  lengthValue: number,
  lengthUnit: LengthInputUnit,
  cableCrossSectionValue: number,
  cableCrossSectionUnit: CableAreaInputUnit,
  copperResistivityOhmMm2PerM: number
) {
  const lengthM = toMetersFromLength(lengthValue, lengthUnit);
  const cableCrossSectionMm2 = toSquareMillimeters(
    cableCrossSectionValue,
    cableCrossSectionUnit
  );
  const resistanceOhm = (copperResistivityOhmMm2PerM * lengthM) / cableCrossSectionMm2;

  return {
    lengthM,
    cableCrossSectionMm2,
    resistanceOhm
  };
}

export function calculateIccp(inputs: IccpInputs): IccpCalculationResult {
  const common = calculateCurrentDemand(inputs);
  assertPositiveFinite(inputs.designLifeYears, "Design life");
  assertNonNegativeFinite(inputs.currentDemandMarginPercent, "Current-demand margin");
  assertNonNegativeFinite(inputs.rectifierSpareCapacityPercent, "Rectifier spare capacity");
  assertPositiveFinite(inputs.groundbedResistanceOhm, "Groundbed resistance");
  assertPositiveFinite(
    inputs.copperResistivityOhmMm2PerM,
    "Copper resistivity basis"
  );
  assertNonNegativeFinite(inputs.junctionBondResistanceOhm, "Junction and bond resistance");
  assertNonNegativeFinite(inputs.backVoltageV, "Back voltage");
  assertNonNegativeFinite(inputs.rectifierVoltageMarginPercent, "Rectifier voltage margin");
  const efficiencyFactor = toFractionFromPercent(
    inputs.rectifierEfficiencyPercent,
    "Rectifier efficiency",
    { max: 100 }
  );
  assertPositiveInteger(inputs.totalMmoAnodes, "Total MMO anodes");
  assertPositiveInteger(inputs.minimumOperatingMmoAnodes, "Minimum operating MMO anodes");
  if (inputs.minimumOperatingMmoAnodes > inputs.totalMmoAnodes) {
    throw new Error("Minimum operating MMO anodes cannot exceed total MMO anodes.");
  }
  assertPositiveFinite(
    inputs.individualAnodeContinuousRatingA,
    "Individual anode continuous rating"
  );
  assertPositiveInteger(inputs.numberOfNegativeCircuits, "Number of negative circuits");
  assertNonNegativeFinite(inputs.measuredNegativeCircuitShuntMv, "Measured shunt voltage");
  assertPositiveFinite(
    inputs.negativeCircuitShuntRatedCurrentA,
    "Negative-circuit shunt rated current"
  );
  assertPositiveFinite(
    inputs.negativeCircuitShuntRatedVoltageMv,
    "Negative-circuit shunt rated voltage"
  );
  assertNegativeFinite(inputs.nativePotentialMvCse, "Native potential");
  assertNegativeFinite(inputs.onPotentialMvCse, "ON potential");
  assertNegativeFinite(inputs.instantOffPotentialMvCse, "Instant-OFF potential");
  assertNegativeFinite(inputs.controlSetpointMvCse, "Control setpoint");

  const positiveCable = calculateCableResistanceOhm(
    inputs.positiveCableLengthValue,
    inputs.positiveCableLengthUnit,
    inputs.cableCrossSectionValue,
    inputs.cableCrossSectionUnit,
    inputs.copperResistivityOhmMm2PerM
  );
  const negativeCable = calculateCableResistanceOhm(
    inputs.negativeCableLengthValue,
    inputs.negativeCableLengthUnit,
    inputs.cableCrossSectionValue,
    inputs.cableCrossSectionUnit,
    inputs.copperResistivityOhmMm2PerM
  );

  const currentDemandMarginFactor = 1 + inputs.currentDemandMarginPercent / 100;
  const rectifierSpareFactor = 1 + inputs.rectifierSpareCapacityPercent / 100;
  const rectifierVoltageMarginFactor = 1 + inputs.rectifierVoltageMarginPercent / 100;
  const designCurrentWithMarginA = common.currentDemandA * currentDemandMarginFactor;
  const minimumRectifierCurrentA = designCurrentWithMarginA * rectifierSpareFactor;
  const totalCableResistanceOhm =
    positiveCable.resistanceOhm + negativeCable.resistanceOhm;
  const totalCircuitResistanceOhm =
    inputs.groundbedResistanceOhm +
    totalCableResistanceOhm +
    inputs.junctionBondResistanceOhm;
  const operatingRectifierVoltageV =
    designCurrentWithMarginA * totalCircuitResistanceOhm + inputs.backVoltageV;
  const minimumRectifierVoltageV =
    operatingRectifierVoltageV * rectifierVoltageMarginFactor;
  const operatingDcPowerW = operatingRectifierVoltageV * designCurrentWithMarginA;
  const estimatedAcInputPowerW = operatingDcPowerW / efficiencyFactor;
  const totalOperatingHours = 8760 * inputs.designLifeYears;
  const fiveYearDcChargeAh = designCurrentWithMarginA * totalOperatingHours;
  const fiveYearDcEnergyKwh = (operatingDcPowerW * totalOperatingHours) / 1000;
  const currentPerMmoAnodeA = designCurrentWithMarginA / inputs.totalMmoAnodes;
  const currentPerOperatingMmoAnodeA =
    designCurrentWithMarginA / inputs.minimumOperatingMmoAnodes;
  const measuredNegativeCircuitCurrentA =
    (inputs.negativeCircuitShuntRatedCurrentA * inputs.measuredNegativeCircuitShuntMv) /
    inputs.negativeCircuitShuntRatedVoltageMv;
  const designCurrentPerNegativeCircuitA =
    designCurrentWithMarginA / inputs.numberOfNegativeCircuits;

  return {
    normalizedDiameterM: round(common.normalizedDiameterM, 6),
    normalizedLengthM: round(common.normalizedLengthM, 3),
    surfaceAreaM2: round(common.surfaceAreaM2, 3),
    exposedAreaM2: round(common.exposedAreaM2, 3),
    designCurrentDensityApm2: round(common.designCurrentDensityApm2, 6),
    currentDemandA: round(common.currentDemandA, 4),
    designCurrentWithMarginA: round(designCurrentWithMarginA, 4),
    minimumRectifierCurrentA: round(minimumRectifierCurrentA, 3),
    positiveCableLengthM: round(positiveCable.lengthM, 3),
    negativeCableLengthM: round(negativeCable.lengthM, 3),
    totalCableLengthM: round(positiveCable.lengthM + negativeCable.lengthM, 3),
    cableCrossSectionMm2: round(positiveCable.cableCrossSectionMm2, 3),
    positiveCableResistanceOhm: round(positiveCable.resistanceOhm, 4),
    negativeCableResistanceOhm: round(negativeCable.resistanceOhm, 4),
    totalCableResistanceOhm: round(totalCableResistanceOhm, 4),
    totalCircuitResistanceOhm: round(totalCircuitResistanceOhm, 4),
    operatingRectifierVoltageV: round(operatingRectifierVoltageV, 3),
    minimumRectifierVoltageV: round(minimumRectifierVoltageV, 3),
    operatingDcPowerW: round(operatingDcPowerW, 2),
    estimatedAcInputPowerW: round(estimatedAcInputPowerW, 2),
    fiveYearDcChargeAh: round(fiveYearDcChargeAh, 2),
    fiveYearDcEnergyKwh: round(fiveYearDcEnergyKwh, 2),
    currentPerMmoAnodeA: round(currentPerMmoAnodeA, 3),
    currentPerOperatingMmoAnodeA: round(currentPerOperatingMmoAnodeA, 3),
    groundbedLoadingWithinContinuousRating:
      currentPerOperatingMmoAnodeA <= inputs.individualAnodeContinuousRatingA,
    measuredNegativeCircuitCurrentA: round(measuredNegativeCircuitCurrentA, 4),
    designCurrentPerNegativeCircuitA: round(designCurrentPerNegativeCircuitA, 4),
    measuredNegativeCircuitCurrentWithinShuntRating:
      measuredNegativeCircuitCurrentA <= inputs.negativeCircuitShuntRatedCurrentA,
    nativePotentialMvCse: round(inputs.nativePotentialMvCse, 1),
    onPotentialMvCse: round(inputs.onPotentialMvCse, 1),
    instantOffPotentialMvCse: round(inputs.instantOffPotentialMvCse, 1),
    controlSetpointMvCse: round(inputs.controlSetpointMvCse, 1),
    instantOffMeetsProtectionCriterion: inputs.instantOffPotentialMvCse <= -950,
    controlSetpointWithinDocumentWindow:
      inputs.controlSetpointMvCse <= -950 && inputs.controlSetpointMvCse >= -1200,
    polarizationShiftMv: round(
      inputs.nativePotentialMvCse - inputs.instantOffPotentialMvCse,
      1
    ),
    documentBackedMinimumPracticalRectifierCurrentA: 10,
    documentBackedEnhancedRectifierCurrentA: 15,
    documentBackedPreliminaryRectifierVoltageV: 100,
    documentBackedGroundbedResistanceTargetMaxOhm: 3
  };
}
