"use client";

import { useEffect, useMemo, useState } from "react";

import { Panel, StatCard } from "@/components/ui";
import { createCpCalculation, fetchCpCalculations, fetchPipelineById } from "@/lib/apiClient";
import {
  CableAreaInputUnit,
  CpCoatingSystem,
  CurrentDensityInputUnit,
  DiameterInputUnit,
  LengthInputUnit
} from "@/lib/cpCalculationCommon";
import { IccpCalculationResult, calculateIccp } from "@/lib/iccpCalculations";
import { SacpCalculationResult, calculateSacp } from "@/lib/sacpCalculations";
import { CpCalculationRecord, PipelineRecord } from "@/lib/types";

type CalculatorMode = "SACP" | "ICCP";
type YesNoValue = "yes" | "no" | "";

type SacpFormState = {
  diameterValue: string;
  diameterUnit: DiameterInputUnit;
  lengthValue: string;
  lengthUnit: LengthInputUnit;
  coatingSystem: CpCoatingSystem | "";
  initialCoatingBreakdownPercent: string;
  finalCoatingBreakdownPercent: string;
  designCurrentDensityValue: string;
  designCurrentDensityUnit: CurrentDensityInputUnit;
  designLifeYears: string;
  designContingencyFactor: string;
  anodeNetWeightKg: string;
  electrochemicalCapacityAhPerKg: string;
  utilizationFactorPercent: string;
  postSelectionRedundancyPercent: string;
  drivingVoltageV: string;
  anodeToEarthResistanceOhm: string;
  cableResistanceOhm: string;
  bondResistanceOhm: string;
  soilResistivityValue: string;
  anodeSpacingM: string;
  distanceFromPipelineM: string;
  cableLengthM: string;
  naturalPotentialMvCse: string;
  anodeOpenCircuitPotentialMvCse: string;
  energizedPotentialMvCse: string;
  shuntVoltageMv: string;
  shuntResistanceOhm: string;
  continuityConfirmed: YesNoValue;
  isolationConfirmed: YesNoValue;
};

type IccpFormState = {
  diameterValue: string;
  diameterUnit: DiameterInputUnit;
  lengthValue: string;
  lengthUnit: LengthInputUnit;
  coatingSystem: CpCoatingSystem | "";
  coatingBreakdownPercent: string;
  designCurrentDensityValue: string;
  designCurrentDensityUnit: CurrentDensityInputUnit;
  designLifeYears: string;
  currentDemandMarginPercent: string;
  rectifierSpareCapacityPercent: string;
  groundbedResistanceOhm: string;
  positiveCableLengthValue: string;
  positiveCableLengthUnit: LengthInputUnit;
  negativeCableLengthValue: string;
  negativeCableLengthUnit: LengthInputUnit;
  cableCrossSectionValue: string;
  cableCrossSectionUnit: CableAreaInputUnit;
  copperResistivityOhmMm2PerM: string;
  junctionBondResistanceOhm: string;
  backVoltageV: string;
  rectifierVoltageMarginPercent: string;
  rectifierEfficiencyPercent: string;
  totalMmoAnodes: string;
  minimumOperatingMmoAnodes: string;
  individualAnodeContinuousRatingA: string;
  numberOfNegativeCircuits: string;
  measuredNegativeCircuitShuntMv: string;
  negativeCircuitShuntRatedCurrentA: string;
  negativeCircuitShuntRatedVoltageMv: string;
  nativePotentialMvCse: string;
  onPotentialMvCse: string;
  instantOffPotentialMvCse: string;
  controlSetpointMvCse: string;
};

const INPUT_CLASSES =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100";
const LABEL_CLASSES = "mb-2 flex items-center justify-between gap-3 text-xs font-medium text-slate-700";
const HELP_CLASSES = "mt-2 text-xs leading-5 text-slate-500";
const ERROR_CLASSES = "mt-2 text-xs font-medium leading-5 text-red-600";
const SECTION_PANEL_CLASSES = "rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6";
const MUTED_PANEL_CLASSES = "rounded-[28px] border border-slate-200 bg-slate-50 p-5 sm:p-6";
const UNIT_BADGE_CLASSES =
  "inline-flex shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500";

const initialSacpState: SacpFormState = {
  diameterValue: "",
  diameterUnit: "inch",
  lengthValue: "",
  lengthUnit: "m",
  coatingSystem: "",
  initialCoatingBreakdownPercent: "",
  finalCoatingBreakdownPercent: "",
  designCurrentDensityValue: "",
  designCurrentDensityUnit: "mA/m2",
  designLifeYears: "5",
  designContingencyFactor: "",
  anodeNetWeightKg: "4.1",
  electrochemicalCapacityAhPerKg: "",
  utilizationFactorPercent: "",
  postSelectionRedundancyPercent: "",
  drivingVoltageV: "",
  anodeToEarthResistanceOhm: "",
  cableResistanceOhm: "",
  bondResistanceOhm: "",
  soilResistivityValue: "",
  anodeSpacingM: "",
  distanceFromPipelineM: "",
  cableLengthM: "",
  naturalPotentialMvCse: "",
  anodeOpenCircuitPotentialMvCse: "",
  energizedPotentialMvCse: "",
  shuntVoltageMv: "",
  shuntResistanceOhm: "",
  continuityConfirmed: "",
  isolationConfirmed: ""
};

const initialIccpState: IccpFormState = {
  diameterValue: "",
  diameterUnit: "inch",
  lengthValue: "",
  lengthUnit: "m",
  coatingSystem: "",
  coatingBreakdownPercent: "",
  designCurrentDensityValue: "20",
  designCurrentDensityUnit: "mA/m2",
  designLifeYears: "5",
  currentDemandMarginPercent: "25",
  rectifierSpareCapacityPercent: "50",
  groundbedResistanceOhm: "",
  positiveCableLengthValue: "200",
  positiveCableLengthUnit: "m",
  negativeCableLengthValue: "100",
  negativeCableLengthUnit: "m",
  cableCrossSectionValue: "35",
  cableCrossSectionUnit: "mm2",
  copperResistivityOhmMm2PerM: "",
  junctionBondResistanceOhm: "",
  backVoltageV: "2",
  rectifierVoltageMarginPercent: "50",
  rectifierEfficiencyPercent: "70",
  totalMmoAnodes: "3",
  minimumOperatingMmoAnodes: "2",
  individualAnodeContinuousRatingA: "5",
  numberOfNegativeCircuits: "7",
  measuredNegativeCircuitShuntMv: "",
  negativeCircuitShuntRatedCurrentA: "10",
  negativeCircuitShuntRatedVoltageMv: "50",
  nativePotentialMvCse: "",
  onPotentialMvCse: "",
  instantOffPotentialMvCse: "",
  controlSetpointMvCse: "-1200"
};

type NumberFieldOptions = {
  allowZero?: boolean;
  allowNegative?: boolean;
  max?: number;
};

function renderFieldError(errors: Record<string, string>, key: string) {
  return errors[key] ? <p className={ERROR_CLASSES}>{errors[key]}</p> : null;
}

function parseNumberInput(
  rawValue: string,
  label: string,
  fieldName: string,
  errors: Record<string, string>,
  options: NumberFieldOptions = {}
) {
  const { allowZero = false, allowNegative = false, max } = options;
  const value = Number(rawValue);

  if (!rawValue.trim()) {
    errors[fieldName] = `${label} is required.`;
    return null;
  }

  if (!Number.isFinite(value)) {
    errors[fieldName] = `${label} must be a valid number.`;
    return null;
  }

  if (allowNegative) {
    if (value >= 0) {
      errors[fieldName] = `${label} must be less than 0.`;
      return null;
    }
  } else if (allowZero ? value < 0 : value <= 0) {
    errors[fieldName] = `${label} must be ${allowZero ? "0 or greater" : "greater than 0"}.`;
    return null;
  }

  if (max !== undefined && value > max) {
    errors[fieldName] = `${label} must be ${max} or less.`;
    return null;
  }

  return value;
}

function parseWholeNumberInput(
  rawValue: string,
  label: string,
  fieldName: string,
  errors: Record<string, string>,
  options: NumberFieldOptions = {}
) {
  const value = parseNumberInput(rawValue, label, fieldName, errors, options);
  if (value === null) {
    return null;
  }

  if (!Number.isInteger(value)) {
    errors[fieldName] = `${label} must be a whole number.`;
    return null;
  }

  return value;
}

function parseSelectedCoating(
  coatingSystem: CpCoatingSystem | "",
  errors: Record<string, string>,
  fieldName: string
) {
  if (!coatingSystem) {
    errors[fieldName] = "Coating system is required.";
    return null;
  }

  return coatingSystem;
}

function parseYesNoSelection(value: YesNoValue, label: string, fieldName: string, errors: Record<string, string>) {
  if (!value) {
    errors[fieldName] = `${label} is required.`;
    return null;
  }

  return value === "yes";
}

function SectionHeading({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h4 className="text-lg font-semibold text-slate-900">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
function NumberField({
  label,
  unit,
  value,
  onChange,
  error,
  help
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  help?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className={LABEL_CLASSES}>
        <span>{label}</span>
        <span className={UNIT_BADGE_CLASSES}>{unit}</span>
      </span>
      <input
        className={INPUT_CLASSES}
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {help ? <p className={HELP_CLASSES}>{help}</p> : null}
      {error ? <p className={ERROR_CLASSES}>{error}</p> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  help,
  error
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  help?: string;
  error?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className={LABEL_CLASSES}>
        <span>{label}</span>
      </span>
      <select className={INPUT_CLASSES} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {help ? <p className={HELP_CLASSES}>{help}</p> : null}
      {error ? <p className={ERROR_CLASSES}>{error}</p> : null}
    </label>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="min-w-0 text-sm text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-left text-sm font-semibold text-slate-900 sm:max-w-[58%] sm:text-right">
        {value}
      </span>
    </div>
  );
}

function formatNumber(value: number, fractionDigits = 3) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits
  });
}

export function CpDashboardView({ initialPipelineId }: { initialPipelineId?: string }) {
  const [mode, setMode] = useState<CalculatorMode>("SACP");
  const [sacpForm, setSacpForm] = useState(initialSacpState);
  const [iccpForm, setIccpForm] = useState(initialIccpState);
  const [sacpErrors, setSacpErrors] = useState<Record<string, string>>({});
  const [iccpErrors, setIccpErrors] = useState<Record<string, string>>({});
  const [sacpResult, setSacpResult] = useState<SacpCalculationResult | null>(null);
  const [iccpResult, setIccpResult] = useState<IccpCalculationResult | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineRecord | null>(null);
  const [cpHistory, setCpHistory] = useState<CpCalculationRecord[]>([]);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const headerCards = useMemo(
    () => [
      {
        label: "Document-Supported Modes",
        value: "2",
        tone: "blue" as const
      },
      {
        label: "SACP Output Basis",
        value: "Initial + Final + Checks",
        tone: "green" as const
      },
      {
        label: "ICCP Output Basis",
        value: "Current / Voltage / Charge",
        tone: "amber" as const
      }
    ],
    []
  );

  function updateSacpField<Key extends keyof SacpFormState>(key: Key, value: SacpFormState[Key]) {
    setSacpForm((current) => ({ ...current, [key]: value }));
    setSacpErrors((current) => {
      const next = { ...current };
      delete next[String(key)];
      return next;
    });
  }

  function updateIccpField<Key extends keyof IccpFormState>(key: Key, value: IccpFormState[Key]) {
    setIccpForm((current) => ({ ...current, [key]: value }));
    setIccpErrors((current) => {
      const next = { ...current };
      delete next[String(key)];
      return next;
    });
  }

  async function loadCpHistory(pipelineId: string) {
    try {
      setCpHistory(await fetchCpCalculations(pipelineId));
    } catch {
      setCpHistory([]);
    }
  }

  function populatePipelineFields(pipeline: PipelineRecord) {
    const diameterValue = pipeline.pipeOutsideDiameter ?? pipeline.pipeInsideDiameter;
    const diameterUnit = pipeline.diameterUnit ?? "mm";
    setSacpForm((current) => ({
      ...current,
      diameterValue: diameterValue ? String(diameterValue) : current.diameterValue,
      diameterUnit,
      designLifeYears: pipeline.designLife ? String(pipeline.designLife) : current.designLifeYears
    }));
    setIccpForm((current) => ({
      ...current,
      diameterValue: diameterValue ? String(diameterValue) : current.diameterValue,
      diameterUnit,
      designLifeYears: pipeline.designLife ? String(pipeline.designLife) : current.designLifeYears
    }));
    void loadCpHistory(pipeline.id);
  }

  useEffect(() => {
    if (!initialPipelineId) return;
    let active = true;
    fetchPipelineById(initialPipelineId)
      .then((pipeline) => {
        if (!active) return;
        setSelectedPipeline(pipeline);
        populatePipelineFields(pipeline);
        setSaveNotice(`Pipeline ${pipeline.pipelineCode} loaded from CP Monitoring.`);
      })
      .catch(() => {
        if (active) setSaveNotice("The pipeline selected in CP Monitoring could not be loaded.");
      });
    return () => { active = false; };
  }, [initialPipelineId]);

  function flattenRecord(value: unknown): Record<string, string | number | boolean> {
    if (!value || typeof value !== "object") {
      return {};
    }

    return Object.entries(value as Record<string, unknown>).reduce<Record<string, string | number | boolean>>(
      (accumulator, [key, item]) => {
        if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
          accumulator[key] = item;
        }
        return accumulator;
      },
      {}
    );
  }

  async function saveCurrentCalculation() {
    setSaveNotice(null);
    if (!selectedPipeline) {
      setSaveNotice("Select or create a pipeline before saving a CP calculation.");
      return;
    }

    const result = mode === "SACP" ? sacpResult : iccpResult;
    const input = mode === "SACP" ? sacpForm : iccpForm;
    if (!result) {
      setSaveNotice("Run the calculation before saving it.");
      return;
    }

    try {
      await createCpCalculation({
        pipelineId: selectedPipeline.id,
        calculationType: mode,
        input: flattenRecord(input),
        result: flattenRecord(result)
      });
      await loadCpHistory(selectedPipeline.id);
      setSaveNotice("CP calculation saved.");
    } catch (error) {
      setSaveNotice(error instanceof Error ? error.message : "CP calculation could not be saved.");
    }
  }

  function handleSacpCalculate() {
    const errors: Record<string, string> = {};
    const coatingSystem = parseSelectedCoating(sacpForm.coatingSystem, errors, "coatingSystem");
    const diameterValue = parseNumberInput(sacpForm.diameterValue, "Diameter", "diameterValue", errors);
    const lengthValue = parseNumberInput(sacpForm.lengthValue, "Length", "lengthValue", errors);
    const initialCoatingBreakdownPercent = parseNumberInput(
      sacpForm.initialCoatingBreakdownPercent,
      "Initial coating breakdown factor",
      "initialCoatingBreakdownPercent",
      errors,
      { allowZero: true, max: 100 }
    );
    const finalCoatingBreakdownPercent = parseNumberInput(
      sacpForm.finalCoatingBreakdownPercent,
      "Final coating breakdown factor",
      "finalCoatingBreakdownPercent",
      errors,
      { allowZero: true, max: 100 }
    );
    const designCurrentDensityValue = parseNumberInput(
      sacpForm.designCurrentDensityValue,
      "Design current density",
      "designCurrentDensityValue",
      errors
    );
    const designLifeYears = parseNumberInput(
      sacpForm.designLifeYears,
      "Design life",
      "designLifeYears",
      errors
    );
    const designContingencyFactor = parseNumberInput(
      sacpForm.designContingencyFactor,
      "Design contingency factor",
      "designContingencyFactor",
      errors
    );
    const anodeNetWeightKg = parseNumberInput(
      sacpForm.anodeNetWeightKg,
      "Anode net weight",
      "anodeNetWeightKg",
      errors
    );
    const electrochemicalCapacityAhPerKg = parseNumberInput(
      sacpForm.electrochemicalCapacityAhPerKg,
      "Electrochemical capacity",
      "electrochemicalCapacityAhPerKg",
      errors
    );
    const utilizationFactorPercent = parseNumberInput(
      sacpForm.utilizationFactorPercent,
      "Utilization factor",
      "utilizationFactorPercent",
      errors,
      { max: 100 }
    );
    const postSelectionRedundancyPercent = parseNumberInput(
      sacpForm.postSelectionRedundancyPercent,
      "Post-selection redundancy",
      "postSelectionRedundancyPercent",
      errors,
      { allowZero: true }
    );
    const drivingVoltageV = parseNumberInput(
      sacpForm.drivingVoltageV,
      "Driving voltage",
      "drivingVoltageV",
      errors
    );
    const anodeToEarthResistanceOhm = parseNumberInput(
      sacpForm.anodeToEarthResistanceOhm,
      "Anode-to-earth resistance",
      "anodeToEarthResistanceOhm",
      errors
    );
    const cableResistanceOhm = parseNumberInput(
      sacpForm.cableResistanceOhm,
      "Cable resistance",
      "cableResistanceOhm",
      errors,
      { allowZero: true }
    );
    const bondResistanceOhm = parseNumberInput(
      sacpForm.bondResistanceOhm,
      "Bond resistance",
      "bondResistanceOhm",
      errors,
      { allowZero: true }
    );
    const soilResistivityValue = parseNumberInput(
      sacpForm.soilResistivityValue,
      "Soil resistivity",
      "soilResistivityValue",
      errors
    );
    const anodeSpacingM = parseNumberInput(
      sacpForm.anodeSpacingM,
      "Anode spacing",
      "anodeSpacingM",
      errors
    );
    const distanceFromPipelineM = parseNumberInput(
      sacpForm.distanceFromPipelineM,
      "Distance from pipeline",
      "distanceFromPipelineM",
      errors
    );
    const cableLengthM = parseNumberInput(
      sacpForm.cableLengthM,
      "Cable length",
      "cableLengthM",
      errors
    );
    const naturalPotentialMvCse = parseNumberInput(
      sacpForm.naturalPotentialMvCse,
      "Natural potential",
      "naturalPotentialMvCse",
      errors,
      { allowNegative: true }
    );
    const anodeOpenCircuitPotentialMvCse = parseNumberInput(
      sacpForm.anodeOpenCircuitPotentialMvCse,
      "Anode open-circuit potential",
      "anodeOpenCircuitPotentialMvCse",
      errors,
      { allowNegative: true }
    );
    const energizedPotentialMvCse = parseNumberInput(
      sacpForm.energizedPotentialMvCse,
      "Energized potential",
      "energizedPotentialMvCse",
      errors,
      { allowNegative: true }
    );
    const shuntVoltageMv = parseNumberInput(
      sacpForm.shuntVoltageMv,
      "Shunt voltage",
      "shuntVoltageMv",
      errors,
      { allowZero: true }
    );
    const shuntResistanceOhm = parseNumberInput(
      sacpForm.shuntResistanceOhm,
      "Shunt resistance",
      "shuntResistanceOhm",
      errors
    );
    const continuityConfirmed = parseYesNoSelection(
      sacpForm.continuityConfirmed,
      "Continuity check",
      "continuityConfirmed",
      errors
    );
    const isolationConfirmed = parseYesNoSelection(
      sacpForm.isolationConfirmed,
      "Isolation check",
      "isolationConfirmed",
      errors
    );

    setSacpErrors(errors);
    if (Object.keys(errors).length > 0 || !coatingSystem) {
      setSacpResult(null);
      return;
    }

    try {
      setSacpResult(
        calculateSacp({
          diameterValue: diameterValue!,
          diameterUnit: sacpForm.diameterUnit,
          lengthValue: lengthValue!,
          lengthUnit: sacpForm.lengthUnit,
          coatingSystem,
          initialCoatingBreakdownPercent: initialCoatingBreakdownPercent!,
          finalCoatingBreakdownPercent: finalCoatingBreakdownPercent!,
          designCurrentDensityValue: designCurrentDensityValue!,
          designCurrentDensityUnit: sacpForm.designCurrentDensityUnit,
          designLifeYears: designLifeYears!,
          designContingencyFactor: designContingencyFactor!,
          anodeNetWeightKg: anodeNetWeightKg!,
          electrochemicalCapacityAhPerKg: electrochemicalCapacityAhPerKg!,
          utilizationFactorPercent: utilizationFactorPercent!,
          postSelectionRedundancyPercent: postSelectionRedundancyPercent!,
          drivingVoltageV: drivingVoltageV!,
          anodeToEarthResistanceOhm: anodeToEarthResistanceOhm!,
          cableResistanceOhm: cableResistanceOhm!,
          bondResistanceOhm: bondResistanceOhm!,
          soilResistivityValue: soilResistivityValue!,
          anodeSpacingM: anodeSpacingM!,
          distanceFromPipelineM: distanceFromPipelineM!,
          cableLengthM: cableLengthM!,
          naturalPotentialMvCse: naturalPotentialMvCse!,
          anodeOpenCircuitPotentialMvCse: anodeOpenCircuitPotentialMvCse!,
          energizedPotentialMvCse: energizedPotentialMvCse!,
          shuntVoltageMv: shuntVoltageMv!,
          shuntResistanceOhm: shuntResistanceOhm!,
          continuityConfirmed: continuityConfirmed!,
          isolationConfirmed: isolationConfirmed!
        })
      );
    } catch (error) {
      setSacpErrors({
        form: error instanceof Error ? error.message : "Unable to calculate the SACP result."
      });
      setSacpResult(null);
    }
  }

  function handleIccpCalculate() {
    const errors: Record<string, string> = {};
    const coatingSystem = parseSelectedCoating(iccpForm.coatingSystem, errors, "coatingSystem");
    const diameterValue = parseNumberInput(iccpForm.diameterValue, "Diameter", "diameterValue", errors);
    const lengthValue = parseNumberInput(iccpForm.lengthValue, "Length", "lengthValue", errors);
    const coatingBreakdownPercent = parseNumberInput(
      iccpForm.coatingBreakdownPercent,
      "Coating breakdown factor",
      "coatingBreakdownPercent",
      errors,
      { allowZero: true, max: 100 }
    );
    const designCurrentDensityValue = parseNumberInput(
      iccpForm.designCurrentDensityValue,
      "Design current density",
      "designCurrentDensityValue",
      errors
    );
    const designLifeYears = parseNumberInput(
      iccpForm.designLifeYears,
      "Design life",
      "designLifeYears",
      errors
    );
    const currentDemandMarginPercent = parseNumberInput(
      iccpForm.currentDemandMarginPercent,
      "Current-demand margin",
      "currentDemandMarginPercent",
      errors,
      { allowZero: true }
    );
    const rectifierSpareCapacityPercent = parseNumberInput(
      iccpForm.rectifierSpareCapacityPercent,
      "Rectifier spare capacity",
      "rectifierSpareCapacityPercent",
      errors,
      { allowZero: true }
    );
    const groundbedResistanceOhm = parseNumberInput(
      iccpForm.groundbedResistanceOhm,
      "Groundbed resistance",
      "groundbedResistanceOhm",
      errors
    );
    const positiveCableLengthValue = parseNumberInput(
      iccpForm.positiveCableLengthValue,
      "Positive cable length",
      "positiveCableLengthValue",
      errors
    );
    const negativeCableLengthValue = parseNumberInput(
      iccpForm.negativeCableLengthValue,
      "Negative cable length",
      "negativeCableLengthValue",
      errors
    );
    const cableCrossSectionValue = parseNumberInput(
      iccpForm.cableCrossSectionValue,
      "Cable cross-section",
      "cableCrossSectionValue",
      errors
    );
    const copperResistivityOhmMm2PerM = parseNumberInput(
      iccpForm.copperResistivityOhmMm2PerM,
      "Copper resistivity basis",
      "copperResistivityOhmMm2PerM",
      errors
    );
    const junctionBondResistanceOhm = parseNumberInput(
      iccpForm.junctionBondResistanceOhm,
      "Junction and bond resistance",
      "junctionBondResistanceOhm",
      errors,
      { allowZero: true }
    );
    const backVoltageV = parseNumberInput(
      iccpForm.backVoltageV,
      "Back voltage",
      "backVoltageV",
      errors,
      { allowZero: true }
    );
    const rectifierVoltageMarginPercent = parseNumberInput(
      iccpForm.rectifierVoltageMarginPercent,
      "Rectifier voltage margin",
      "rectifierVoltageMarginPercent",
      errors,
      { allowZero: true }
    );
    const rectifierEfficiencyPercent = parseNumberInput(
      iccpForm.rectifierEfficiencyPercent,
      "Rectifier efficiency",
      "rectifierEfficiencyPercent",
      errors,
      { max: 100 }
    );
    const totalMmoAnodes = parseWholeNumberInput(
      iccpForm.totalMmoAnodes,
      "Total MMO anodes",
      "totalMmoAnodes",
      errors
    );
    const minimumOperatingMmoAnodes = parseWholeNumberInput(
      iccpForm.minimumOperatingMmoAnodes,
      "Minimum operating MMO anodes",
      "minimumOperatingMmoAnodes",
      errors
    );
    const individualAnodeContinuousRatingA = parseNumberInput(
      iccpForm.individualAnodeContinuousRatingA,
      "Individual anode continuous rating",
      "individualAnodeContinuousRatingA",
      errors
    );
    const numberOfNegativeCircuits = parseWholeNumberInput(
      iccpForm.numberOfNegativeCircuits,
      "Number of negative circuits",
      "numberOfNegativeCircuits",
      errors
    );
    const measuredNegativeCircuitShuntMv = parseNumberInput(
      iccpForm.measuredNegativeCircuitShuntMv,
      "Measured negative-circuit shunt voltage",
      "measuredNegativeCircuitShuntMv",
      errors,
      { allowZero: true }
    );
    const negativeCircuitShuntRatedCurrentA = parseNumberInput(
      iccpForm.negativeCircuitShuntRatedCurrentA,
      "Shunt rated current",
      "negativeCircuitShuntRatedCurrentA",
      errors
    );
    const negativeCircuitShuntRatedVoltageMv = parseNumberInput(
      iccpForm.negativeCircuitShuntRatedVoltageMv,
      "Shunt rated voltage",
      "negativeCircuitShuntRatedVoltageMv",
      errors
    );
    const nativePotentialMvCse = parseNumberInput(
      iccpForm.nativePotentialMvCse,
      "Native potential",
      "nativePotentialMvCse",
      errors,
      { allowNegative: true }
    );
    const onPotentialMvCse = parseNumberInput(
      iccpForm.onPotentialMvCse,
      "ON potential",
      "onPotentialMvCse",
      errors,
      { allowNegative: true }
    );
    const instantOffPotentialMvCse = parseNumberInput(
      iccpForm.instantOffPotentialMvCse,
      "Instant-OFF potential",
      "instantOffPotentialMvCse",
      errors,
      { allowNegative: true }
    );
    const controlSetpointMvCse = parseNumberInput(
      iccpForm.controlSetpointMvCse,
      "Control setpoint",
      "controlSetpointMvCse",
      errors,
      { allowNegative: true }
    );

    if (
      totalMmoAnodes !== null &&
      minimumOperatingMmoAnodes !== null &&
      minimumOperatingMmoAnodes > totalMmoAnodes
    ) {
      errors.minimumOperatingMmoAnodes =
        "Minimum operating MMO anodes cannot exceed total MMO anodes.";
    }

    setIccpErrors(errors);
    if (Object.keys(errors).length > 0 || !coatingSystem) {
      setIccpResult(null);
      return;
    }

    try {
      setIccpResult(
        calculateIccp({
          diameterValue: diameterValue!,
          diameterUnit: iccpForm.diameterUnit,
          lengthValue: lengthValue!,
          lengthUnit: iccpForm.lengthUnit,
          coatingSystem,
          coatingBreakdownPercent: coatingBreakdownPercent!,
          designCurrentDensityValue: designCurrentDensityValue!,
          designCurrentDensityUnit: iccpForm.designCurrentDensityUnit,
          designLifeYears: designLifeYears!,
          currentDemandMarginPercent: currentDemandMarginPercent!,
          rectifierSpareCapacityPercent: rectifierSpareCapacityPercent!,
          groundbedResistanceOhm: groundbedResistanceOhm!,
          positiveCableLengthValue: positiveCableLengthValue!,
          positiveCableLengthUnit: iccpForm.positiveCableLengthUnit,
          negativeCableLengthValue: negativeCableLengthValue!,
          negativeCableLengthUnit: iccpForm.negativeCableLengthUnit,
          cableCrossSectionValue: cableCrossSectionValue!,
          cableCrossSectionUnit: iccpForm.cableCrossSectionUnit,
          copperResistivityOhmMm2PerM: copperResistivityOhmMm2PerM!,
          junctionBondResistanceOhm: junctionBondResistanceOhm!,
          backVoltageV: backVoltageV!,
          rectifierVoltageMarginPercent: rectifierVoltageMarginPercent!,
          rectifierEfficiencyPercent: rectifierEfficiencyPercent!,
          totalMmoAnodes: totalMmoAnodes!,
          minimumOperatingMmoAnodes: minimumOperatingMmoAnodes!,
          individualAnodeContinuousRatingA: individualAnodeContinuousRatingA!,
          numberOfNegativeCircuits: numberOfNegativeCircuits!,
          measuredNegativeCircuitShuntMv: measuredNegativeCircuitShuntMv!,
          negativeCircuitShuntRatedCurrentA: negativeCircuitShuntRatedCurrentA!,
          negativeCircuitShuntRatedVoltageMv: negativeCircuitShuntRatedVoltageMv!,
          nativePotentialMvCse: nativePotentialMvCse!,
          onPotentialMvCse: onPotentialMvCse!,
          instantOffPotentialMvCse: instantOffPotentialMvCse!,
          controlSetpointMvCse: controlSetpointMvCse!
        })
      );
    } catch (error) {
      setIccpErrors({
        form: error instanceof Error ? error.message : "Unable to calculate the ICCP result."
      });
      setIccpResult(null);
    }
  }

  const modeSelector = (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <button
          className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
            mode === "SACP"
              ? "bg-slateblue-600 text-white shadow-sm"
              : "border border-slate-300 bg-white text-slate-700 hover:border-slateblue-200 hover:bg-slateblue-50"
          }`}
          onClick={() => setMode("SACP")}
          type="button"
        >
          Sacrificial Anode CP (SACP)
        </button>
        <button
          className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
            mode === "ICCP"
              ? "bg-slateblue-600 text-white shadow-sm"
              : "border border-slate-300 bg-white text-slate-700 hover:border-slateblue-200 hover:bg-slateblue-50"
          }`}
          onClick={() => setMode("ICCP")}
          type="button"
        >
          Impressed Current CP (ICCP)
        </button>
      </div>
    </div>
  );

  const sacpHasResult = sacpResult !== null;
  const sacpContent = (
    <div
      className={`mt-6 grid gap-6 ${
        sacpHasResult ? "xl:grid-cols-[minmax(0,1.95fr)_minmax(320px,1fr)] xl:items-start" : ""
      }`}
    >
      <div className="min-w-0 space-y-6">
        <div className={MUTED_PANEL_CLASSES}>
          <SectionHeading
            title="SACP Inputs"
            description="Separate measured inputs, editable assumptions, and commissioning checks follow the SACP sequence described in 1CP.docx."
          />

          <div className="mt-6 space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <SectionHeading
                title="Pipeline Inputs"
                description="Used directly in the surface-area and current-demand calculations."
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <NumberField
                label="Diameter"
                unit={sacpForm.diameterUnit}
                value={sacpForm.diameterValue}
                onChange={(value) => updateSacpField("diameterValue", value)}
                error={sacpErrors.diameterValue}
              />
              <SelectField
                label="Diameter Unit"
                value={sacpForm.diameterUnit}
                onChange={(value) => updateSacpField("diameterUnit", value as DiameterInputUnit)}
                options={[
                  { label: "inch", value: "inch" },
                  { label: "mm", value: "mm" },
                  { label: "cm", value: "cm" },
                  { label: "m", value: "m" },
                  { label: "ft", value: "ft" }
                ]}
              />
              <NumberField
                label="Length"
                unit={sacpForm.lengthUnit}
                value={sacpForm.lengthValue}
                onChange={(value) => updateSacpField("lengthValue", value)}
                error={sacpErrors.lengthValue}
              />
              <SelectField
                label="Length Unit"
                value={sacpForm.lengthUnit}
                onChange={(value) => updateSacpField("lengthUnit", value as LengthInputUnit)}
                options={[
                  { label: "m", value: "m" },
                  { label: "km", value: "km" },
                  { label: "ft", value: "ft" }
                ]}
              />
              <SelectField
                label="Coating System"
                value={sacpForm.coatingSystem}
                onChange={(value) => updateSacpField("coatingSystem", value as CpCoatingSystem | "")}
                options={[
                  { label: "Select coating", value: "" },
                  { label: "FBE", value: "FBE" },
                  { label: "3LPP", value: "3LPP" },
                  { label: "Custom", value: "Custom" }
                ]}
                error={sacpErrors.coatingSystem}
              />
              <NumberField
                label="Design Life"
                unit="years"
                value={sacpForm.designLifeYears}
                onChange={(value) => updateSacpField("designLifeYears", value)}
                error={sacpErrors.designLifeYears}
                help="1CP.docx states a 5-year design life."
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <SectionHeading
                title="Editable Assumptions"
                description="These values are required by the document workflow but not fully fixed by 1CP.docx. They must remain engineering-approved."
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <NumberField
                label="Initial Coating Breakdown Factor (Assumption)"
                unit="%"
                value={sacpForm.initialCoatingBreakdownPercent}
                onChange={(value) => updateSacpField("initialCoatingBreakdownPercent", value)}
                error={sacpErrors.initialCoatingBreakdownPercent}
              />
              <NumberField
                label="Final Coating Breakdown Factor (Assumption)"
                unit="%"
                value={sacpForm.finalCoatingBreakdownPercent}
                onChange={(value) => updateSacpField("finalCoatingBreakdownPercent", value)}
                error={sacpErrors.finalCoatingBreakdownPercent}
              />
              <NumberField
                label="Design Current Density (Assumption)"
                unit={sacpForm.designCurrentDensityUnit}
                value={sacpForm.designCurrentDensityValue}
                onChange={(value) => updateSacpField("designCurrentDensityValue", value)}
                error={sacpErrors.designCurrentDensityValue}
              />
              <SelectField
                label="Current Density Unit"
                value={sacpForm.designCurrentDensityUnit}
                onChange={(value) => updateSacpField("designCurrentDensityUnit", value as CurrentDensityInputUnit)}
                options={[
                  { label: "mA/m2", value: "mA/m2" },
                  { label: "A/m2", value: "A/m2" }
                ]}
              />
              <NumberField
                label="Design Contingency Factor (Assumption)"
                unit="factor"
                value={sacpForm.designContingencyFactor}
                onChange={(value) => updateSacpField("designContingencyFactor", value)}
                error={sacpErrors.designContingencyFactor}
              />
              <NumberField
                label="Post-Selection Redundancy (Assumption)"
                unit="%"
                value={sacpForm.postSelectionRedundancyPercent}
                onChange={(value) => updateSacpField("postSelectionRedundancyPercent", value)}
                error={sacpErrors.postSelectionRedundancyPercent}
              />
              <NumberField
                label="Anode Net Weight"
                unit="kg"
                value={sacpForm.anodeNetWeightKg}
                onChange={(value) => updateSacpField("anodeNetWeightKg", value)}
                error={sacpErrors.anodeNetWeightKg}
                help="1CP.docx references a 4.1 kg pre-packaged magnesium anode."
              />
              <NumberField
                label="Electrochemical Capacity (Assumption)"
                unit="Ah/kg"
                value={sacpForm.electrochemicalCapacityAhPerKg}
                onChange={(value) => updateSacpField("electrochemicalCapacityAhPerKg", value)}
                error={sacpErrors.electrochemicalCapacityAhPerKg}
              />
              <NumberField
                label="Utilization Factor (Assumption)"
                unit="%"
                value={sacpForm.utilizationFactorPercent}
                onChange={(value) => updateSacpField("utilizationFactorPercent", value)}
                error={sacpErrors.utilizationFactorPercent}
              />
              <NumberField
                label="Driving Voltage (Assumption)"
                unit="V"
                value={sacpForm.drivingVoltageV}
                onChange={(value) => updateSacpField("drivingVoltageV", value)}
                error={sacpErrors.drivingVoltageV}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <SectionHeading
                title="Resistance Basis And Installation Checks"
                description="1CP.docx requires these subfactors and layout checks, but it does not provide a complete standalone resistance formula for every geometry term."
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <NumberField
                label="Anode-to-Earth Resistance"
                unit="ohm"
                value={sacpForm.anodeToEarthResistanceOhm}
                onChange={(value) => updateSacpField("anodeToEarthResistanceOhm", value)}
                error={sacpErrors.anodeToEarthResistanceOhm}
              />
              <NumberField
                label="Cable Resistance"
                unit="ohm"
                value={sacpForm.cableResistanceOhm}
                onChange={(value) => updateSacpField("cableResistanceOhm", value)}
                error={sacpErrors.cableResistanceOhm}
              />
              <NumberField
                label="Bond Resistance"
                unit="ohm"
                value={sacpForm.bondResistanceOhm}
                onChange={(value) => updateSacpField("bondResistanceOhm", value)}
                error={sacpErrors.bondResistanceOhm}
              />
              <NumberField
                label="Soil Resistivity"
                unit="engineering"
                value={sacpForm.soilResistivityValue}
                onChange={(value) => updateSacpField("soilResistivityValue", value)}
                error={sacpErrors.soilResistivityValue}
                help="Engineering definition required: enter the measured project basis value and use the project-approved resistivity unit consistently."
              />
              <NumberField
                label="Anode Spacing"
                unit="m"
                value={sacpForm.anodeSpacingM}
                onChange={(value) => updateSacpField("anodeSpacingM", value)}
                error={sacpErrors.anodeSpacingM}
              />
              <NumberField
                label="Distance From Pipeline"
                unit="m"
                value={sacpForm.distanceFromPipelineM}
                onChange={(value) => updateSacpField("distanceFromPipelineM", value)}
                error={sacpErrors.distanceFromPipelineM}
              />
              <NumberField
                label="Cable Length"
                unit="m"
                value={sacpForm.cableLengthM}
                onChange={(value) => updateSacpField("cableLengthM", value)}
                error={sacpErrors.cableLengthM}
              />
              <div className="grid gap-5 sm:grid-cols-2 md:col-span-2">
                <SelectField
                  label="Continuity Check"
                  value={sacpForm.continuityConfirmed}
                  onChange={(value) => updateSacpField("continuityConfirmed", value as YesNoValue)}
                  options={[
                    { label: "Select result", value: "" },
                    { label: "Pass", value: "yes" },
                    { label: "Fail", value: "no" }
                  ]}
                  error={sacpErrors.continuityConfirmed}
                />
                <SelectField
                  label="Isolation Check"
                  value={sacpForm.isolationConfirmed}
                  onChange={(value) => updateSacpField("isolationConfirmed", value as YesNoValue)}
                  options={[
                    { label: "Select result", value: "" },
                    { label: "Pass", value: "yes" },
                    { label: "Fail", value: "no" }
                  ]}
                  error={sacpErrors.isolationConfirmed}
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <SectionHeading
                title="Measured Commissioning Inputs"
                description="These values support the page-19 workflow for natural potential, anode OCP, energized potential, and shunt current."
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <NumberField
                label="Natural Potential"
                unit="mV CSE"
                value={sacpForm.naturalPotentialMvCse}
                onChange={(value) => updateSacpField("naturalPotentialMvCse", value)}
                error={sacpErrors.naturalPotentialMvCse}
              />
              <NumberField
                label="Anode Open-Circuit Potential"
                unit="mV CSE"
                value={sacpForm.anodeOpenCircuitPotentialMvCse}
                onChange={(value) => updateSacpField("anodeOpenCircuitPotentialMvCse", value)}
                error={sacpErrors.anodeOpenCircuitPotentialMvCse}
                help="1CP.docx cites an expected magnesium OCP of about -1600 to -1770 mV CSE after soaking."
              />
              <NumberField
                label="Energized Potential"
                unit="mV CSE"
                value={sacpForm.energizedPotentialMvCse}
                onChange={(value) => updateSacpField("energizedPotentialMvCse", value)}
                error={sacpErrors.energizedPotentialMvCse}
              />
              <NumberField
                label="Shunt Voltage"
                unit="mV"
                value={sacpForm.shuntVoltageMv}
                onChange={(value) => updateSacpField("shuntVoltageMv", value)}
                error={sacpErrors.shuntVoltageMv}
              />
              <NumberField
                label="Shunt Resistance"
                unit="ohm"
                value={sacpForm.shuntResistanceOhm}
                onChange={(value) => updateSacpField("shuntResistanceOhm", value)}
                error={sacpErrors.shuntResistanceOhm}
              />
            </div>
          </div>

          {renderFieldError(sacpErrors, "form")}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button className="rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white" onClick={handleSacpCalculate} type="button">
              Run SACP Calculation
            </button>
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        <div className={SECTION_PANEL_CLASSES}>
          <SectionHeading
            title="SACP Results"
            description="Outputs are split into calculated sizing values and commissioning checks."
          />
          {sacpResult ? (
            <div className="mt-5 space-y-6">
              <div className="space-y-3">
                <ResultRow label="Surface Area" value={`${formatNumber(sacpResult.surfaceAreaM2)} m2`} />
                <ResultRow label="Initial Exposed Area" value={`${formatNumber(sacpResult.initialExposedAreaM2)} m2`} />
                <ResultRow label="Final Exposed Area" value={`${formatNumber(sacpResult.finalExposedAreaM2)} m2`} />
                <ResultRow label="Initial Current Demand" value={`${formatNumber(sacpResult.initialCurrentDemandA, 4)} A`} />
                <ResultRow label="Final Current Demand" value={`${formatNumber(sacpResult.finalCurrentDemandA, 4)} A`} />
                <ResultRow label="Final Demand With Design Factor" value={`${formatNumber(sacpResult.finalCurrentDemandWithDesignFactorA, 4)} A`} />
                <ResultRow label="Required Ampere-Hours" value={`${formatNumber(sacpResult.requiredAmpereHours, 2)} Ah`} />
                <ResultRow label="Usable Capacity Per Anode" value={`${formatNumber(sacpResult.usableAnodeCapacityAh, 2)} Ah`} />
                <ResultRow label="Total Connection Resistance" value={`${formatNumber(sacpResult.totalConnectionResistanceOhm, 4)} ohm`} />
                <ResultRow label="Total Circuit Resistance" value={`${formatNumber(sacpResult.totalCircuitResistanceOhm, 4)} ohm`} />
                <ResultRow label="One-Anode Output Current" value={`${formatNumber(sacpResult.oneAnodeOutputCurrentA, 4)} A`} />
                <ResultRow label="Anodes By Capacity" value={`${formatNumber(sacpResult.capacityBasedAnodesRaw, 3)} -> ${sacpResult.capacityBasedAnodesRounded}`} />
                <ResultRow label="Anodes By Output" value={`${formatNumber(sacpResult.outputBasedAnodesRaw, 3)} -> ${sacpResult.outputBasedAnodesRounded}`} />
                <ResultRow label="Governing Base Quantity" value={`${sacpResult.governingAnodeRequirement} anodes`} />
                <ResultRow label="Quantity After Post-Selection Margin" value={`${formatNumber(sacpResult.finalRequirementBeforeRounding, 3)} -> ${sacpResult.finalAnodeRequirement} anodes`} />
              </div>

              <div className="space-y-3">
                <ResultRow label="Natural Potential" value={`${formatNumber(sacpResult.naturalPotentialMvCse, 1)} mV CSE`} />
                <ResultRow label="Anode Open-Circuit Potential" value={`${formatNumber(sacpResult.anodeOpenCircuitPotentialMvCse, 1)} mV CSE`} />
                <ResultRow label="Energized Potential" value={`${formatNumber(sacpResult.energizedPotentialMvCse, 1)} mV CSE`} />
                <ResultRow label="Potential Shift" value={`${formatNumber(sacpResult.potentialShiftMv, 1)} mV`} />
                <ResultRow label="Shunt Current" value={`${formatNumber(sacpResult.shuntCurrentA, 4)} A / ${formatNumber(sacpResult.shuntCurrentMa, 2)} mA`} />
                <ResultRow label="Protection Criterion" value={sacpResult.meetsProtectionCriterion ? "Pass: energized potential is at or more negative than -950 mV CSE." : "Check required: energized potential is not yet at -950 mV CSE."} />
                <ResultRow label="Anode OCP Range Check" value={sacpResult.anodeOpenCircuitPotentialWithinExpectedRange ? "Within the document's cited magnesium range." : "Outside the document's cited magnesium OCP range."} />
                <ResultRow label="Continuity Check" value={sacpResult.continuityConfirmed ? "Pass" : "Fail"} />
                <ResultRow label="Isolation Check" value={sacpResult.isolationConfirmed ? "Pass" : "Fail"} />
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm leading-6 text-slate-500">
              Enter the required inputs and run the SACP calculation.
            </div>
          )}
        </div>

        <div className={MUTED_PANEL_CLASSES}>
          <SectionHeading
            title="Document Limits"
            description="1CP.docx requires soil resistivity, spacing, distance, cable length, continuity, isolation, and measured commissioning values, but it does not give every geometry-specific resistance formula. Those entries remain engineering-defined checks, not hidden calculations."
          />
        </div>
      </div>
    </div>
  );

  const iccpHasResult = iccpResult !== null;
  const iccpContent = (
    <div
      className={`mt-6 grid gap-6 ${
        iccpHasResult ? "xl:grid-cols-[minmax(0,1.95fr)_minmax(320px,1fr)] xl:items-start" : ""
      }`}
    >
      <div className="min-w-0 space-y-6">
        <div className={MUTED_PANEL_CLASSES}>
          <SectionHeading
            title="ICCP Inputs"
            description="Separate current-demand assumptions, cable-drop inputs, groundbed sizing inputs, and potential-control checks follow ICCP.docx."
          />

          <div className="mt-6 space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <SectionHeading
                title="Pipeline And Current-Demand Inputs"
                description="Used directly in the exposed-area and design-current calculations."
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <NumberField
                label="Diameter"
                unit={iccpForm.diameterUnit}
                value={iccpForm.diameterValue}
                onChange={(value) => updateIccpField("diameterValue", value)}
                error={iccpErrors.diameterValue}
              />
              <SelectField
                label="Diameter Unit"
                value={iccpForm.diameterUnit}
                onChange={(value) => updateIccpField("diameterUnit", value as DiameterInputUnit)}
                options={[
                  { label: "inch", value: "inch" },
                  { label: "mm", value: "mm" },
                  { label: "cm", value: "cm" },
                  { label: "m", value: "m" },
                  { label: "ft", value: "ft" }
                ]}
              />
              <NumberField
                label="Length"
                unit={iccpForm.lengthUnit}
                value={iccpForm.lengthValue}
                onChange={(value) => updateIccpField("lengthValue", value)}
                error={iccpErrors.lengthValue}
              />
              <SelectField
                label="Length Unit"
                value={iccpForm.lengthUnit}
                onChange={(value) => updateIccpField("lengthUnit", value as LengthInputUnit)}
                options={[
                  { label: "m", value: "m" },
                  { label: "km", value: "km" },
                  { label: "ft", value: "ft" }
                ]}
              />
              <SelectField
                label="Coating System"
                value={iccpForm.coatingSystem}
                onChange={(value) => {
                  const next = value as CpCoatingSystem | "";
                  updateIccpField("coatingSystem", next);
                  if (!iccpForm.coatingBreakdownPercent) {
                    if (next === "FBE") {
                      updateIccpField("coatingBreakdownPercent", "3");
                    }

                    if (next === "3LPP") {
                      updateIccpField("coatingBreakdownPercent", "1.5");
                    }
                  }
                }}
                options={[
                  { label: "Select coating", value: "" },
                  { label: "FBE", value: "FBE" },
                  { label: "3LPP", value: "3LPP" },
                  { label: "Custom", value: "Custom" }
                ]}
                error={iccpErrors.coatingSystem}
              />
              <NumberField
                label="Design Life"
                unit="years"
                value={iccpForm.designLifeYears}
                onChange={(value) => updateIccpField("designLifeYears", value)}
                error={iccpErrors.designLifeYears}
                help="ICCP.docx states a 5-year preliminary design life."
              />
              <NumberField
                label="Coating Breakdown Factor (Assumption)"
                unit="%"
                value={iccpForm.coatingBreakdownPercent}
                onChange={(value) => updateIccpField("coatingBreakdownPercent", value)}
                error={iccpErrors.coatingBreakdownPercent}
                help="Document preliminary values: FBE 3%, 3LPP 1.5%."
              />
              <NumberField
                label="Design Current Density (Assumption)"
                unit={iccpForm.designCurrentDensityUnit}
                value={iccpForm.designCurrentDensityValue}
                onChange={(value) => updateIccpField("designCurrentDensityValue", value)}
                error={iccpErrors.designCurrentDensityValue}
                help="ICCP.docx gives a 20 mA/m2 preliminary basis."
              />
              <SelectField
                label="Current Density Unit"
                value={iccpForm.designCurrentDensityUnit}
                onChange={(value) => updateIccpField("designCurrentDensityUnit", value as CurrentDensityInputUnit)}
                options={[
                  { label: "mA/m2", value: "mA/m2" },
                  { label: "A/m2", value: "A/m2" }
                ]}
              />
              <NumberField
                label="Current-Demand Margin (Assumption)"
                unit="%"
                value={iccpForm.currentDemandMarginPercent}
                onChange={(value) => updateIccpField("currentDemandMarginPercent", value)}
                error={iccpErrors.currentDemandMarginPercent}
              />
              <NumberField
                label="Rectifier Spare Capacity (Assumption)"
                unit="%"
                value={iccpForm.rectifierSpareCapacityPercent}
                onChange={(value) => updateIccpField("rectifierSpareCapacityPercent", value)}
                error={iccpErrors.rectifierSpareCapacityPercent}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <SectionHeading
                title="Cable And Rectifier Inputs"
                description="These values support the cable-drop, rectifier voltage, power, and five-year charge calculations."
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <NumberField
                label="Groundbed Resistance"
                unit="ohm"
                value={iccpForm.groundbedResistanceOhm}
                onChange={(value) => updateIccpField("groundbedResistanceOhm", value)}
                error={iccpErrors.groundbedResistanceOhm}
              />
              <NumberField
                label="Junction And Bond Resistance"
                unit="ohm"
                value={iccpForm.junctionBondResistanceOhm}
                onChange={(value) => updateIccpField("junctionBondResistanceOhm", value)}
                error={iccpErrors.junctionBondResistanceOhm}
              />
              <NumberField
                label="Positive Cable Length"
                unit={iccpForm.positiveCableLengthUnit}
                value={iccpForm.positiveCableLengthValue}
                onChange={(value) => updateIccpField("positiveCableLengthValue", value)}
                error={iccpErrors.positiveCableLengthValue}
              />
              <SelectField
                label="Positive Cable Unit"
                value={iccpForm.positiveCableLengthUnit}
                onChange={(value) => updateIccpField("positiveCableLengthUnit", value as LengthInputUnit)}
                options={[
                  { label: "m", value: "m" },
                  { label: "km", value: "km" },
                  { label: "ft", value: "ft" }
                ]}
              />
              <NumberField
                label="Negative Cable Length"
                unit={iccpForm.negativeCableLengthUnit}
                value={iccpForm.negativeCableLengthValue}
                onChange={(value) => updateIccpField("negativeCableLengthValue", value)}
                error={iccpErrors.negativeCableLengthValue}
              />
              <SelectField
                label="Negative Cable Unit"
                value={iccpForm.negativeCableLengthUnit}
                onChange={(value) => updateIccpField("negativeCableLengthUnit", value as LengthInputUnit)}
                options={[
                  { label: "m", value: "m" },
                  { label: "km", value: "km" },
                  { label: "ft", value: "ft" }
                ]}
              />
              <NumberField
                label="Cable Cross-Section"
                unit={iccpForm.cableCrossSectionUnit}
                value={iccpForm.cableCrossSectionValue}
                onChange={(value) => updateIccpField("cableCrossSectionValue", value)}
                error={iccpErrors.cableCrossSectionValue}
              />
              <SelectField
                label="Cable Cross-Section Unit"
                value={iccpForm.cableCrossSectionUnit}
                onChange={(value) => updateIccpField("cableCrossSectionUnit", value as CableAreaInputUnit)}
                options={[
                  { label: "mm2", value: "mm2" },
                  { label: "cm2", value: "cm2" }
                ]}
              />
              <NumberField
                label="Copper Resistivity Basis (Assumption)"
                unit="ohm*mm2/m"
                value={iccpForm.copperResistivityOhmMm2PerM}
                onChange={(value) => updateIccpField("copperResistivityOhmMm2PerM", value)}
                error={iccpErrors.copperResistivityOhmMm2PerM}
                help="Use the project-approved copper resistivity basis from the document or design standard."
              />
              <NumberField
                label="Back Voltage (Assumption)"
                unit="V"
                value={iccpForm.backVoltageV}
                onChange={(value) => updateIccpField("backVoltageV", value)}
                error={iccpErrors.backVoltageV}
              />
              <NumberField
                label="Rectifier Voltage Margin (Assumption)"
                unit="%"
                value={iccpForm.rectifierVoltageMarginPercent}
                onChange={(value) => updateIccpField("rectifierVoltageMarginPercent", value)}
                error={iccpErrors.rectifierVoltageMarginPercent}
              />
              <NumberField
                label="Rectifier Efficiency (Assumption)"
                unit="%"
                value={iccpForm.rectifierEfficiencyPercent}
                onChange={(value) => updateIccpField("rectifierEfficiencyPercent", value)}
                error={iccpErrors.rectifierEfficiencyPercent}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <SectionHeading
                title="Groundbed And Circuit Monitoring"
                description="These fields support MMO loading, per-circuit current checks, and shunt monitoring without inventing live data."
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <NumberField
                label="Total MMO Anodes"
                unit="count"
                value={iccpForm.totalMmoAnodes}
                onChange={(value) => updateIccpField("totalMmoAnodes", value)}
                error={iccpErrors.totalMmoAnodes}
                help="ICCP.docx preliminary groundbed basis: 3 MMO anodes."
              />
              <NumberField
                label="Minimum Operating MMO Anodes"
                unit="count"
                value={iccpForm.minimumOperatingMmoAnodes}
                onChange={(value) => updateIccpField("minimumOperatingMmoAnodes", value)}
                error={iccpErrors.minimumOperatingMmoAnodes}
                help="ICCP.docx indicates at least two operating anodes plus one spare."
              />
              <NumberField
                label="Individual MMO Continuous Rating"
                unit="A"
                value={iccpForm.individualAnodeContinuousRatingA}
                onChange={(value) => updateIccpField("individualAnodeContinuousRatingA", value)}
                error={iccpErrors.individualAnodeContinuousRatingA}
              />
              <NumberField
                label="Number Of Negative Circuits"
                unit="count"
                value={iccpForm.numberOfNegativeCircuits}
                onChange={(value) => updateIccpField("numberOfNegativeCircuits", value)}
                error={iccpErrors.numberOfNegativeCircuits}
                help="ICCP.docx recommends seven individually shunted negative circuits."
              />
              <NumberField
                label="Measured Negative-Circuit Shunt Voltage"
                unit="mV"
                value={iccpForm.measuredNegativeCircuitShuntMv}
                onChange={(value) => updateIccpField("measuredNegativeCircuitShuntMv", value)}
                error={iccpErrors.measuredNegativeCircuitShuntMv}
              />
              <NumberField
                label="Shunt Rated Current"
                unit="A"
                value={iccpForm.negativeCircuitShuntRatedCurrentA}
                onChange={(value) => updateIccpField("negativeCircuitShuntRatedCurrentA", value)}
                error={iccpErrors.negativeCircuitShuntRatedCurrentA}
              />
              <NumberField
                label="Shunt Rated Voltage"
                unit="mV"
                value={iccpForm.negativeCircuitShuntRatedVoltageMv}
                onChange={(value) => updateIccpField("negativeCircuitShuntRatedVoltageMv", value)}
                error={iccpErrors.negativeCircuitShuntRatedVoltageMv}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <SectionHeading
                title="Measured Potential-Control Checks"
                description="ICCP.docx requires native, ON, instant-OFF, and control-setpoint checks, with the OFF potential used for the protection criterion."
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <NumberField
                label="Native Potential"
                unit="mV CSE"
                value={iccpForm.nativePotentialMvCse}
                onChange={(value) => updateIccpField("nativePotentialMvCse", value)}
                error={iccpErrors.nativePotentialMvCse}
              />
              <NumberField
                label="ON Potential"
                unit="mV CSE"
                value={iccpForm.onPotentialMvCse}
                onChange={(value) => updateIccpField("onPotentialMvCse", value)}
                error={iccpErrors.onPotentialMvCse}
              />
              <NumberField
                label="Instant-OFF Potential"
                unit="mV CSE"
                value={iccpForm.instantOffPotentialMvCse}
                onChange={(value) => updateIccpField("instantOffPotentialMvCse", value)}
                error={iccpErrors.instantOffPotentialMvCse}
              />
              <NumberField
                label="Control Setpoint"
                unit="mV CSE"
                value={iccpForm.controlSetpointMvCse}
                onChange={(value) => updateIccpField("controlSetpointMvCse", value)}
                error={iccpErrors.controlSetpointMvCse}
                help="ICCP.docx suggests a preliminary control level around -1200 mV CSE or less negative, subject to coating limit."
              />
            </div>
          </div>

          {renderFieldError(iccpErrors, "form")}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button className="rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white" onClick={handleIccpCalculate} type="button">
              Run ICCP Calculation
            </button>
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        <div className={SECTION_PANEL_CLASSES}>
          <SectionHeading
            title="ICCP Results"
            description="Current, voltage, cable drop, MMO loading, shunt monitoring, and potential-control outputs are shown separately."
          />
          {iccpResult ? (
            <div className="mt-5 space-y-6">
              <div className="space-y-3">
                <ResultRow label="Surface Area" value={`${formatNumber(iccpResult.surfaceAreaM2)} m2`} />
                <ResultRow label="Exposed Area" value={`${formatNumber(iccpResult.exposedAreaM2)} m2`} />
                <ResultRow label="Current Demand" value={`${formatNumber(iccpResult.currentDemandA, 4)} A`} />
                <ResultRow label="Design Current With Margin" value={`${formatNumber(iccpResult.designCurrentWithMarginA, 4)} A`} />
                <ResultRow label="Minimum Rectifier Current" value={`${formatNumber(iccpResult.minimumRectifierCurrentA, 3)} A`} />
                <ResultRow label="Positive Cable Resistance" value={`${formatNumber(iccpResult.positiveCableResistanceOhm, 4)} ohm`} />
                <ResultRow label="Negative Cable Resistance" value={`${formatNumber(iccpResult.negativeCableResistanceOhm, 4)} ohm`} />
                <ResultRow label="Total Cable Resistance" value={`${formatNumber(iccpResult.totalCableResistanceOhm, 4)} ohm`} />
                <ResultRow label="Total Circuit Resistance" value={`${formatNumber(iccpResult.totalCircuitResistanceOhm, 4)} ohm`} />
                <ResultRow label="Operating Rectifier Voltage" value={`${formatNumber(iccpResult.operatingRectifierVoltageV, 3)} V`} />
                <ResultRow label="Minimum Rectifier Voltage" value={`${formatNumber(iccpResult.minimumRectifierVoltageV, 3)} V`} />
                <ResultRow label="Operating DC Power" value={`${formatNumber(iccpResult.operatingDcPowerW, 2)} W`} />
                <ResultRow label="Estimated AC Input Power" value={`${formatNumber(iccpResult.estimatedAcInputPowerW, 2)} W`} />
                <ResultRow label="Five-Year DC Charge" value={`${formatNumber(iccpResult.fiveYearDcChargeAh, 2)} Ah`} />
                <ResultRow label="Five-Year DC Energy" value={`${formatNumber(iccpResult.fiveYearDcEnergyKwh, 2)} kWh`} />
              </div>

              <div className="space-y-3">
                <ResultRow label="Current Per MMO Anode (All Anodes In Service)" value={`${formatNumber(iccpResult.currentPerMmoAnodeA, 3)} A`} />
                <ResultRow label="Current Per Operating MMO Anode" value={`${formatNumber(iccpResult.currentPerOperatingMmoAnodeA, 3)} A`} />
                <ResultRow label="MMO Loading Check" value={iccpResult.groundbedLoadingWithinContinuousRating ? "Pass: operating anode current is within the entered continuous rating." : "Check required: operating anode current exceeds the entered continuous rating."} />
                <ResultRow label="Design Current Per Negative Circuit" value={`${formatNumber(iccpResult.designCurrentPerNegativeCircuitA, 4)} A`} />
                <ResultRow label="Measured Negative-Circuit Current" value={`${formatNumber(iccpResult.measuredNegativeCircuitCurrentA, 4)} A`} />
                <ResultRow label="Negative-Circuit Shunt Check" value={iccpResult.measuredNegativeCircuitCurrentWithinShuntRating ? "Pass: measured current is within the shunt rating." : "Check required: measured current exceeds the shunt rating."} />
              </div>

              <div className="space-y-3">
                <ResultRow label="Native Potential" value={`${formatNumber(iccpResult.nativePotentialMvCse, 1)} mV CSE`} />
                <ResultRow label="ON Potential" value={`${formatNumber(iccpResult.onPotentialMvCse, 1)} mV CSE`} />
                <ResultRow label="Instant-OFF Potential" value={`${formatNumber(iccpResult.instantOffPotentialMvCse, 1)} mV CSE`} />
                <ResultRow label="Control Setpoint" value={`${formatNumber(iccpResult.controlSetpointMvCse, 1)} mV CSE`} />
                <ResultRow label="Polarization Shift" value={`${formatNumber(iccpResult.polarizationShiftMv, 1)} mV`} />
                <ResultRow label="Instant-OFF Protection Check" value={iccpResult.instantOffMeetsProtectionCriterion ? "Pass: instant-OFF potential is at or more negative than -950 mV CSE." : "Check required: instant-OFF potential is not yet at -950 mV CSE."} />
                <ResultRow label="Control Setpoint Window" value={iccpResult.controlSetpointWithinDocumentWindow ? "Within the document's normal preliminary range of -950 to -1200 mV CSE." : "Outside the document's normal preliminary range of -950 to -1200 mV CSE."} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                <p>
                  Document-backed preliminary selections: minimum practical rectifier current{" "}
                  <strong>{formatNumber(iccpResult.documentBackedMinimumPracticalRectifierCurrentA, 0)} A</strong>, enhanced current{" "}
                  <strong>{formatNumber(iccpResult.documentBackedEnhancedRectifierCurrentA, 0)} A</strong> where expansion is expected, and conservative preliminary voltage{" "}
                  <strong>{formatNumber(iccpResult.documentBackedPreliminaryRectifierVoltageV, 0)} V</strong> until soil resistivity and groundbed resistance are confirmed.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm leading-6 text-slate-500">
              Enter the required inputs and run the ICCP calculation.
            </div>
          )}
        </div>

        <div className={MUTED_PANEL_CLASSES}>
          <SectionHeading
            title="Document Limits"
            description="ICCP.docx supports the current, voltage, charge, cable-drop, MMO loading, shunt, and OFF-potential checks above. Final rectifier voltage, groundbed resistance, and field control settings still require project measurements and engineering confirmation."
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {headerCards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} tone={card.tone} />
        ))}
      </div>

      <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium leading-6 text-amber-900 shadow-sm sm:px-6">
        <span className="block break-words">
          Preliminary CP calculation — engineering verification required.
        </span>
      </div>

      <Panel className="p-4 sm:p-6 xl:p-7">
        {modeSelector}
        {mode === "SACP" ? sacpContent : iccpContent}
      </Panel>

      <Panel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">CP Calculation History</h3>
            <p className="mt-1 text-sm text-slate-500">Saved calculations for the selected pipeline.</p>
          </div>
          <button
            className="rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white"
            onClick={() => void saveCurrentCalculation()}
            type="button"
          >
            Save Calculation
          </button>
        </div>
        {saveNotice ? <p className="mt-4 text-sm text-slate-600">{saveNotice}</p> : null}
        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Record ID</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {cpHistory.length > 0 ? (
                cpHistory.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-4 font-medium text-slate-900">{record.id}</td>
                    <td className="px-4 py-4 text-slate-600">{record.calculationType}</td>
                    <td className="px-4 py-4 text-slate-600">{new Date(record.createdAt).toLocaleString("en-US")}</td>
                    <td className="px-4 py-4 text-slate-600">{record.createdByName ?? "Unknown User"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                    {selectedPipeline ? "No CP calculations saved for this pipeline." : "Select a pipeline to view CP history."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
