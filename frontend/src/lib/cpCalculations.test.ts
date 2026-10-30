import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  calculateCurrentDemand,
  calculatePipelineSurfaceArea,
  toCurrentDensityApm2,
  toMetersFromDiameter,
  toMetersFromLength
} from "./cpCalculationCommon";
import { calculateIccp } from "./iccpCalculations";
import { calculateSacp } from "./sacpCalculations";

function assertClose(actual: number, expected: number, tolerance: number, message: string) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected}, got ${actual}`
  );
}

function run() {
  assertClose(toMetersFromDiameter(10, "inch"), 0.254, 0.000001, "10 inch to meters");
  assertClose(toMetersFromLength(6.673, "km"), 6673, 0.000001, "6.673 km to meters");
  assertClose(toCurrentDensityApm2(20, "mA/m2"), 0.02, 0.000001, "20 mA/m2 to A/m2");

  const surfaceArea = calculatePipelineSurfaceArea(10, "inch", 6.673, "km");
  assertClose(surfaceArea.surfaceAreaM2, 5324.817335460791, 0.0001, "Surface area formula");

  const zeroBreakdownDemand = calculateCurrentDemand({
    diameterValue: 10,
    diameterUnit: "inch",
    lengthValue: 6673,
    lengthUnit: "m",
    coatingSystem: "FBE",
    coatingBreakdownPercent: 0,
    designCurrentDensityValue: 20,
    designCurrentDensityUnit: "mA/m2"
  });
  assert.equal(zeroBreakdownDemand.currentDemandA, 0, "Zero coating breakdown should be allowed");

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
    initialCoatingBreakdownPercent: 1,
    finalCoatingBreakdownPercent: 3,
    designCurrentDensityValue: 20,
    designCurrentDensityUnit: "mA/m2",
    designLifeYears: 5,
    designContingencyFactor: 1.25,
    anodeNetWeightKg: 4.1,
    electrochemicalCapacityAhPerKg: 1100,
    utilizationFactorPercent: 85,
    postSelectionRedundancyPercent: 10,
    drivingVoltageV: 0.3,
    anodeToEarthResistanceOhm: 1.2,
    cableResistanceOhm: 0.05,
    bondResistanceOhm: 0.05,
    soilResistivityValue: 1500,
    anodeSpacingM: 10,
    distanceFromPipelineM: 2,
    cableLengthM: 12,
    naturalPotentialMvCse: -820,
    anodeOpenCircuitPotentialMvCse: -1650,
    energizedPotentialMvCse: -980,
    shuntVoltageMv: 50,
    shuntResistanceOhm: 0.01,
    continuityConfirmed: true,
    isolationConfirmed: true
  });

  const expectedInitialCurrentDemand = surfaceArea.surfaceAreaM2 * 0.01 * 0.02;
  const expectedFinalCurrentDemand = surfaceArea.surfaceAreaM2 * 0.03 * 0.02;
  const expectedFinalWithDesignFactor = expectedFinalCurrentDemand * 1.25;
  const expectedRequiredAmpereHours = expectedFinalWithDesignFactor * 8760 * 5;
  const expectedUsableAnodeCapacity = 4.1 * 1100 * 0.85;
  const expectedCapacityBasedAnodes = expectedRequiredAmpereHours / expectedUsableAnodeCapacity;
  const expectedOneAnodeOutput = 0.3 / (1.2 + 0.05 + 0.05);
  const expectedOutputBasedRaw = expectedFinalWithDesignFactor / expectedOneAnodeOutput;
  const expectedGoverningBase = Math.max(
    Math.ceil(expectedCapacityBasedAnodes),
    Math.ceil(expectedOutputBasedRaw)
  );
  const expectedFinalRequirementBeforeRounding = expectedGoverningBase * 1.1;

  assertClose(
    sacp.initialCurrentDemandA,
    expectedInitialCurrentDemand,
    0.0001,
    "SACP initial current demand"
  );
  assertClose(
    sacp.finalCurrentDemandA,
    expectedFinalCurrentDemand,
    0.0001,
    "SACP final current demand"
  );
  assertClose(
    sacp.requiredAmpereHours,
    expectedRequiredAmpereHours,
    0.05,
    "SACP ampere-hour formula"
  );
  assertClose(
    sacp.usableAnodeCapacityAh,
    expectedUsableAnodeCapacity,
    0.001,
    "SACP usable anode capacity"
  );
  assertClose(
    sacp.oneAnodeOutputCurrentA,
    expectedOneAnodeOutput,
    0.0001,
    "SACP one-anode output formula"
  );
  assert.equal(
    sacp.governingAnodeRequirement,
    expectedGoverningBase,
    "SACP governing base quantity"
  );
  assertClose(
    sacp.finalRequirementBeforeRounding,
    expectedFinalRequirementBeforeRounding,
    0.001,
    "SACP post-selection redundancy before rounding"
  );
  assert.equal(
    sacp.finalAnodeRequirement,
    Math.ceil(expectedFinalRequirementBeforeRounding),
    "SACP final anode rounding order"
  );
  assert.equal(sacp.meetsProtectionCriterion, true, "SACP energized potential check");
  assert.equal(
    sacp.anodeOpenCircuitPotentialWithinExpectedRange,
    true,
    "SACP OCP range check"
  );
  assertClose(sacp.shuntCurrentA, 5, 0.0001, "SACP shunt current formula");

  const iccp = calculateIccp({
    diameterValue: 10,
    diameterUnit: "inch",
    lengthValue: 6673,
    lengthUnit: "m",
    coatingSystem: "FBE",
    coatingBreakdownPercent: 3,
    designCurrentDensityValue: 20,
    designCurrentDensityUnit: "mA/m2",
    designLifeYears: 5,
    currentDemandMarginPercent: 25,
    rectifierSpareCapacityPercent: 50,
    groundbedResistanceOhm: 3.5,
    positiveCableLengthValue: 200,
    positiveCableLengthUnit: "m",
    negativeCableLengthValue: 100,
    negativeCableLengthUnit: "m",
    cableCrossSectionValue: 35,
    cableCrossSectionUnit: "mm2",
    copperResistivityOhmMm2PerM: 0.0175,
    junctionBondResistanceOhm: 0.3,
    backVoltageV: 0,
    rectifierVoltageMarginPercent: 0,
    rectifierEfficiencyPercent: 70,
    totalMmoAnodes: 3,
    minimumOperatingMmoAnodes: 2,
    individualAnodeContinuousRatingA: 5,
    numberOfNegativeCircuits: 7,
    measuredNegativeCircuitShuntMv: 20,
    negativeCircuitShuntRatedCurrentA: 10,
    negativeCircuitShuntRatedVoltageMv: 50,
    nativePotentialMvCse: -850,
    onPotentialMvCse: -1100,
    instantOffPotentialMvCse: -980,
    controlSetpointMvCse: -1200
  });

  const expectedIccpDesignCurrent = expectedCurrentDemand * 1.25;
  const expectedIccpMinCurrent = expectedIccpDesignCurrent * 1.5;
  const expectedPositiveCableResistance = (0.0175 * 200) / 35;
  const expectedNegativeCableResistance = (0.0175 * 100) / 35;
  const expectedTotalCircuitResistance =
    3.5 + expectedPositiveCableResistance + expectedNegativeCableResistance + 0.3;
  const expectedIccpOperatingVoltage = expectedIccpDesignCurrent * expectedTotalCircuitResistance;
  const expectedIccpDcPower = expectedIccpOperatingVoltage * expectedIccpDesignCurrent;
  const expectedIccpAcPower = expectedIccpDcPower / 0.7;
  const expectedFiveYearCharge = expectedIccpDesignCurrent * 8760 * 5;
  const expectedFiveYearEnergy = (expectedIccpDcPower * 8760 * 5) / 1000;

  assertClose(
    iccp.designCurrentWithMarginA,
    expectedIccpDesignCurrent,
    0.0001,
    "ICCP design current with margin"
  );
  assertClose(
    iccp.minimumRectifierCurrentA,
    expectedIccpMinCurrent,
    0.01,
    "ICCP minimum rectifier current"
  );
  assertClose(
    iccp.positiveCableResistanceOhm,
    expectedPositiveCableResistance,
    0.0001,
    "ICCP positive cable resistance"
  );
  assertClose(
    iccp.negativeCableResistanceOhm,
    expectedNegativeCableResistance,
    0.0001,
    "ICCP negative cable resistance"
  );
  assertClose(
    iccp.operatingRectifierVoltageV,
    expectedIccpOperatingVoltage,
    0.001,
    "ICCP operating voltage"
  );
  assertClose(iccp.operatingDcPowerW, expectedIccpDcPower, 0.02, "ICCP DC power");
  assertClose(iccp.estimatedAcInputPowerW, expectedIccpAcPower, 0.02, "ICCP AC input power");
  assertClose(iccp.fiveYearDcChargeAh, expectedFiveYearCharge, 0.05, "ICCP five-year DC charge");
  assertClose(iccp.fiveYearDcEnergyKwh, expectedFiveYearEnergy, 0.05, "ICCP five-year DC energy");
  assertClose(
    iccp.currentPerMmoAnodeA,
    expectedIccpDesignCurrent / 3,
    0.001,
    "ICCP MMO loading per anode"
  );
  assertClose(
    iccp.currentPerOperatingMmoAnodeA,
    expectedIccpDesignCurrent / 2,
    0.001,
    "ICCP MMO loading per operating anode"
  );
  assertClose(
    iccp.measuredNegativeCircuitCurrentA,
    4,
    0.0001,
    "ICCP shunt current from rating"
  );
  assertClose(
    iccp.designCurrentPerNegativeCircuitA,
    expectedIccpDesignCurrent / 7,
    0.0001,
    "ICCP per-circuit design current"
  );
  assert.equal(iccp.instantOffMeetsProtectionCriterion, true, "ICCP instant-OFF criterion");
  assert.equal(iccp.controlSetpointWithinDocumentWindow, true, "ICCP control setpoint window");
  assert.equal(
    iccp.documentBackedMinimumPracticalRectifierCurrentA,
    10,
    "ICCP document-backed minimum practical current"
  );
  assert.equal(
    iccp.documentBackedPreliminaryRectifierVoltageV,
    100,
    "ICCP document-backed preliminary voltage"
  );

  assert.throws(
    () =>
      calculateCurrentDemand({
        diameterValue: 10,
        diameterUnit: "inch",
        lengthValue: 10,
        lengthUnit: "m",
        coatingSystem: "FBE",
        coatingBreakdownPercent: 101,
        designCurrentDensityValue: 20,
        designCurrentDensityUnit: "mA/m2"
      }),
    /must be 100 or less/,
    "Coating breakdown above 100% should fail"
  );

  assert.throws(
    () =>
      calculateSacp({
        diameterValue: 10,
        diameterUnit: "inch",
        lengthValue: 10,
        lengthUnit: "m",
        coatingSystem: "FBE",
        initialCoatingBreakdownPercent: 1,
        finalCoatingBreakdownPercent: 2,
        designCurrentDensityValue: 20,
        designCurrentDensityUnit: "mA/m2",
        designLifeYears: 5,
        designContingencyFactor: 1.1,
        anodeNetWeightKg: 4.1,
        electrochemicalCapacityAhPerKg: 1100,
        utilizationFactorPercent: 101,
        postSelectionRedundancyPercent: 0,
        drivingVoltageV: 0.3,
        anodeToEarthResistanceOhm: 1,
        cableResistanceOhm: 0,
        bondResistanceOhm: 0,
        soilResistivityValue: 1000,
        anodeSpacingM: 10,
        distanceFromPipelineM: 2,
        cableLengthM: 10,
        naturalPotentialMvCse: -800,
        anodeOpenCircuitPotentialMvCse: -1650,
        energizedPotentialMvCse: -980,
        shuntVoltageMv: 10,
        shuntResistanceOhm: 0.01,
        continuityConfirmed: true,
        isolationConfirmed: true
      }),
    /must be 100 or less/,
    "Utilization factor above 100% should fail"
  );

  assert.throws(
    () =>
      calculateIccp({
        diameterValue: 10,
        diameterUnit: "inch",
        lengthValue: 10,
        lengthUnit: "m",
        coatingSystem: "FBE",
        coatingBreakdownPercent: 3,
        designCurrentDensityValue: 20,
        designCurrentDensityUnit: "mA/m2",
        designLifeYears: 5,
        currentDemandMarginPercent: 0,
        rectifierSpareCapacityPercent: 0,
        groundbedResistanceOhm: 1,
        positiveCableLengthValue: 10,
        positiveCableLengthUnit: "m",
        negativeCableLengthValue: 10,
        negativeCableLengthUnit: "m",
        cableCrossSectionValue: 35,
        cableCrossSectionUnit: "mm2",
        copperResistivityOhmMm2PerM: 0.0175,
        junctionBondResistanceOhm: 0,
        backVoltageV: 0,
        rectifierVoltageMarginPercent: 0,
        rectifierEfficiencyPercent: 101,
        totalMmoAnodes: 3,
        minimumOperatingMmoAnodes: 2,
        individualAnodeContinuousRatingA: 5,
        numberOfNegativeCircuits: 7,
        measuredNegativeCircuitShuntMv: 0,
        negativeCircuitShuntRatedCurrentA: 10,
        negativeCircuitShuntRatedVoltageMv: 50,
        nativePotentialMvCse: -850,
        onPotentialMvCse: -950,
        instantOffPotentialMvCse: -960,
        controlSetpointMvCse: -1100
      }),
    /must be 100 or less/,
    "Rectifier efficiency above 100% should fail"
  );

  assert.throws(
    () =>
      calculateIccp({
        diameterValue: 10,
        diameterUnit: "inch",
        lengthValue: 10,
        lengthUnit: "m",
        coatingSystem: "FBE",
        coatingBreakdownPercent: 3,
        designCurrentDensityValue: 20,
        designCurrentDensityUnit: "mA/m2",
        designLifeYears: 5,
        currentDemandMarginPercent: 0,
        rectifierSpareCapacityPercent: 0,
        groundbedResistanceOhm: 1,
        positiveCableLengthValue: 10,
        positiveCableLengthUnit: "m",
        negativeCableLengthValue: 10,
        negativeCableLengthUnit: "m",
        cableCrossSectionValue: 35,
        cableCrossSectionUnit: "mm2",
        copperResistivityOhmMm2PerM: 0.0175,
        junctionBondResistanceOhm: 0,
        backVoltageV: 0,
        rectifierVoltageMarginPercent: 0,
        rectifierEfficiencyPercent: 70,
        totalMmoAnodes: 3.5,
        minimumOperatingMmoAnodes: 2,
        individualAnodeContinuousRatingA: 5,
        numberOfNegativeCircuits: 7,
        measuredNegativeCircuitShuntMv: 0,
        negativeCircuitShuntRatedCurrentA: 10,
        negativeCircuitShuntRatedVoltageMv: 50,
        nativePotentialMvCse: -850,
        onPotentialMvCse: -950,
        instantOffPotentialMvCse: -960,
        controlSetpointMvCse: -1100
      }),
    /must be a whole number/,
    "MMO anode counts should be whole numbers"
  );

  const dashboardSource = fs.readFileSync(
    path.resolve(__dirname, "../components/cp-dashboard-view.tsx"),
    "utf8"
  );
  assert.ok(
    dashboardSource.includes("Preliminary CP calculation — engineering verification required."),
    "Dashboard warning text should use the exact em dash wording"
  );
  assert.ok(
    !dashboardSource.includes("Preliminary CP calculation - engineering verification required."),
    "Old hyphenated warning text should be removed"
  );

  const iccpSource = fs.readFileSync(path.resolve(__dirname, "./iccpCalculations.ts"), "utf8");
  assert.ok(
    !iccpSource.includes("STANDARD_RECTIFIER_CURRENT_RATINGS"),
    "Old hardcoded standard current arrays should be removed"
  );
  assert.ok(
    !iccpSource.includes("STANDARD_RECTIFIER_VOLTAGE_RATINGS"),
    "Old hardcoded standard voltage arrays should be removed"
  );

  assert.throws(
    () => calculatePipelineSurfaceArea(0, "inch", 10, "m"),
    /Diameter must be greater than 0/,
    "Zero diameter should fail validation"
  );
}

run();
console.log("CP calculation tests passed.");

