import assert from "node:assert/strict";

import {
  calculateCurrentDemand,
  calculatePipelineSurfaceArea,
  toCurrentDensityApm2,
  toMetersFromDiameter,
  toMetersFromLength
} from "@/lib/cpCalculationCommon";
import { calculateIccp } from "@/lib/iccpCalculations";
import { calculateSacp } from "@/lib/sacpCalculations";

function assertClose(actual: number, expected: number, tolerance: number, message: string) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, got ${actual}`);
}

function run() {
  assertClose(toMetersFromDiameter(10, "inch"), 0.254, 0.000001, "10 inch to meters");
  assertClose(toMetersFromLength(6.673, "km"), 6673, 0.000001, "6.673 km to meters");
  assertClose(toCurrentDensityApm2(20, "mA/m2"), 0.02, 0.000001, "20 mA/m2 to A/m2");

  const surfaceArea = calculatePipelineSurfaceArea(10, "inch", 6.673, "km");
  assertClose(surfaceArea.surfaceAreaM2, 5324.817335460791, 0.0001, "Surface area formula");

  const currentDemand = calculateCurrentDemand({
    diameterValue: 10,
    diameterUnit: "inch",
    lengthValue: 6673,
    lengthUnit: "m",
    coatingSystem: "FBE",
    coatingBreakdownPercent: 3,
    designCurrentDensityValue: 20,
    designCurrentDensityUnit: "mA/m2"
  });
  const expectedExposedArea = surfaceArea.surfaceAreaM2 * 0.03;
  const expectedCurrentDemand = expectedExposedArea * 0.02;
  assertClose(currentDemand.exposedAreaM2, expectedExposedArea, 0.0001, "Exposed area formula");
  assertClose(currentDemand.currentDemandA, expectedCurrentDemand, 0.0001, "Current demand formula");

  const sacp = calculateSacp({
    diameterValue: 10,
    diameterUnit: "inch",
    lengthValue: 6673,
    lengthUnit: "m",
    coatingSystem: "FBE",
    coatingBreakdownPercent: 3,
    designCurrentDensityValue: 20,
    designCurrentDensityUnit: "mA/m2",
    designLifeYears: 5,
    designFactor: 1.25,
    anodeNetWeightKg: 4.1,
    electrochemicalCapacityAhPerKg: 1100,
    utilizationFactorPercent: 85,
    drivingVoltageV: 0.3,
    anodeResistanceOhm: 1.2,
    connectionResistanceOhm: 0.1
  });
  const expectedRequiredAmpereHours = expectedCurrentDemand * 8760 * 5 * 1.25;
  const expectedUsableAnodeCapacity = 4.1 * 1100 * 0.85;
  const expectedCapacityBasedAnodes = expectedRequiredAmpereHours / expectedUsableAnodeCapacity;
  const expectedOneAnodeOutput = 0.3 / (1.2 + 0.1);
  assertClose(sacp.requiredAmpereHours, expectedRequiredAmpereHours, 0.05, "SACP ampere-hour formula");
  assertClose(sacp.usableAnodeCapacityAh, expectedUsableAnodeCapacity, 0.001, "SACP usable anode capacity");
  assertClose(sacp.capacityBasedAnodesRaw, expectedCapacityBasedAnodes, 0.001, "SACP capacity-based anodes");
  assertClose(sacp.oneAnodeOutputCurrentA, expectedOneAnodeOutput, 0.0001, "SACP one-anode output formula");
  assert.equal(sacp.outputBasedAnodesRounded, Math.ceil(expectedCurrentDemand / expectedOneAnodeOutput), "SACP output-based rounded anodes");
  assert.equal(sacp.governingAnodeRequirement, Math.max(Math.ceil(expectedCapacityBasedAnodes), Math.ceil(expectedCurrentDemand / expectedOneAnodeOutput)), "SACP governing requirement");

  const iccp = calculateIccp({
    diameterValue: 10,
    diameterUnit: "inch",
    lengthValue: 6673,
    lengthUnit: "m",
    coatingSystem: "FBE",
    coatingBreakdownPercent: 3,
    designCurrentDensityValue: 20,
    designCurrentDensityUnit: "mA/m2",
    currentDemandMarginPercent: 25,
    rectifierSpareCapacityPercent: 50,
    circuitResistanceOhm: 5,
    backVoltageV: 2,
    rectifierVoltageMarginPercent: 50,
    rectifierEfficiencyPercent: 70
  });
  const expectedIccpDesignCurrent = expectedCurrentDemand * 1.25;
  const expectedIccpMinCurrent = expectedIccpDesignCurrent * 1.5;
  const expectedIccpOperatingVoltage = expectedIccpDesignCurrent * 5 + 2;
  const expectedIccpMinimumVoltage = expectedIccpOperatingVoltage * 1.5;
  const expectedIccpDcPower = expectedIccpOperatingVoltage * expectedIccpDesignCurrent;
  const expectedIccpAcPower = expectedIccpDcPower / 0.7;
  assertClose(iccp.designCurrentWithMarginA, expectedIccpDesignCurrent, 0.0001, "ICCP design current with margin");
  assertClose(iccp.minimumRectifierCurrentA, expectedIccpMinCurrent, 0.01, "ICCP minimum rectifier current");
  assert.equal(iccp.recommendedRectifierCurrentA, 10, "ICCP standard rectifier current");
  assertClose(iccp.operatingRectifierVoltageV, expectedIccpOperatingVoltage, 0.001, "ICCP rectifier voltage");
  assertClose(iccp.minimumRectifierVoltageV, expectedIccpMinimumVoltage, 0.001, "ICCP rectifier voltage with margin");
  assert.equal(iccp.recommendedRectifierVoltageV, 50, "ICCP standard rectifier voltage");
  assertClose(iccp.operatingDcPowerW, expectedIccpDcPower, 0.02, "ICCP DC power");
  assertClose(iccp.estimatedAcInputPowerW, expectedIccpAcPower, 0.02, "ICCP AC input power");

  assert.throws(
    () =>
      calculatePipelineSurfaceArea(0, "inch", 10, "m"),
    /Diameter must be greater than 0/,
    "Zero diameter should fail validation"
  );
}

run();
console.log("CP calculation tests passed.");
