export type CpCoatingSystem = "FBE" | "3LPP" | "Custom";
export type DiameterInputUnit = "mm" | "cm" | "m" | "inch" | "ft";
export type LengthInputUnit = "m" | "km" | "ft";
export type CurrentDensityInputUnit = "A/m2" | "mA/m2";

export type CommonCpInputs = {
  diameterValue: number;
  diameterUnit: DiameterInputUnit;
  lengthValue: number;
  lengthUnit: LengthInputUnit;
  coatingSystem: CpCoatingSystem;
  coatingBreakdownPercent: number;
  designCurrentDensityValue: number;
  designCurrentDensityUnit: CurrentDensityInputUnit;
};

export type CurrentDemandResult = {
  normalizedDiameterM: number;
  normalizedLengthM: number;
  surfaceAreaM2: number;
  exposedAreaM2: number;
  designCurrentDensityApm2: number;
  currentDemandA: number;
};

const DIAMETER_TO_METERS: Record<DiameterInputUnit, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  inch: 0.0254,
  ft: 0.3048
};

const LENGTH_TO_METERS: Record<LengthInputUnit, number> = {
  m: 1,
  km: 1000,
  ft: 0.3048
};

export function assertPositiveFinite(value: number, fieldName: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be greater than 0.`);
  }
}

export function assertNonNegativeFinite(value: number, fieldName: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be 0 or greater.`);
  }
}

export function toMetersFromDiameter(value: number, unit: DiameterInputUnit) {
  assertPositiveFinite(value, "Diameter");
  return value * DIAMETER_TO_METERS[unit];
}

export function toMetersFromLength(value: number, unit: LengthInputUnit) {
  assertPositiveFinite(value, "Length");
  return value * LENGTH_TO_METERS[unit];
}

export function toCurrentDensityApm2(value: number, unit: CurrentDensityInputUnit) {
  assertPositiveFinite(value, "Design current density");
  return unit === "A/m2" ? value : value / 1000;
}

export function toFractionFromPercent(value: number, fieldName: string) {
  assertPositiveFinite(value, fieldName);
  return value / 100;
}

export function round(value: number, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function nextStandardRating(value: number, standards: readonly number[]) {
  return standards.find((candidate) => candidate >= value) ?? standards[standards.length - 1];
}

export function calculatePipelineSurfaceArea(
  diameterValue: number,
  diameterUnit: DiameterInputUnit,
  lengthValue: number,
  lengthUnit: LengthInputUnit
) {
  const normalizedDiameterM = toMetersFromDiameter(diameterValue, diameterUnit);
  const normalizedLengthM = toMetersFromLength(lengthValue, lengthUnit);
  const surfaceAreaM2 = Math.PI * normalizedDiameterM * normalizedLengthM;

  return {
    normalizedDiameterM,
    normalizedLengthM,
    surfaceAreaM2
  };
}

export function calculateCurrentDemand(inputs: CommonCpInputs): CurrentDemandResult {
  const { normalizedDiameterM, normalizedLengthM, surfaceAreaM2 } = calculatePipelineSurfaceArea(
    inputs.diameterValue,
    inputs.diameterUnit,
    inputs.lengthValue,
    inputs.lengthUnit
  );
  const coatingBreakdownFactor = toFractionFromPercent(
    inputs.coatingBreakdownPercent,
    "Coating breakdown factor"
  );
  const designCurrentDensityApm2 = toCurrentDensityApm2(
    inputs.designCurrentDensityValue,
    inputs.designCurrentDensityUnit
  );
  const exposedAreaM2 = surfaceAreaM2 * coatingBreakdownFactor;
  const currentDemandA = exposedAreaM2 * designCurrentDensityApm2;

  return {
    normalizedDiameterM,
    normalizedLengthM,
    surfaceAreaM2,
    exposedAreaM2,
    designCurrentDensityApm2,
    currentDemandA
  };
}
