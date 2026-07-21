"use client";

import { useMemo, useState } from "react";

import { Panel, StatCard } from "@/components/ui";
import {
  CpCoatingSystem,
  CurrentDensityInputUnit,
  DiameterInputUnit,
  LengthInputUnit
} from "@/lib/cpCalculationCommon";
import { calculateIccp, IccpCalculationResult } from "@/lib/iccpCalculations";
import { calculateSacp, SacpCalculationResult } from "@/lib/sacpCalculations";

type CalculatorMode = "SACP" | "ICCP";

type SacpFormState = {
  diameterValue: string;
  diameterUnit: DiameterInputUnit;
  lengthValue: string;
  lengthUnit: LengthInputUnit;
  coatingSystem: CpCoatingSystem | "";
  coatingBreakdownPercent: string;
  designCurrentDensityValue: string;
  designCurrentDensityUnit: CurrentDensityInputUnit;
  designLifeYears: string;
  designFactor: string;
  anodeNetWeightKg: string;
  electrochemicalCapacityAhPerKg: string;
  utilizationFactorPercent: string;
  drivingVoltageV: string;
  anodeResistanceOhm: string;
  connectionResistanceOhm: string;
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
  currentDemandMarginPercent: string;
  rectifierSpareCapacityPercent: string;
  circuitResistanceOhm: string;
  backVoltageV: string;
  rectifierVoltageMarginPercent: string;
  rectifierEfficiencyPercent: string;
};

const INPUT_CLASSES =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100";
const LABEL_CLASSES = "mb-2 block text-sm font-medium text-slate-700";
const HELP_CLASSES = "mt-2 text-xs leading-5 text-slate-500";
const ERROR_CLASSES = "mt-2 text-xs font-medium leading-5 text-red-600";
const SECTION_PANEL_CLASSES = "rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6";
const MUTED_PANEL_CLASSES = "rounded-[28px] border border-slate-200 bg-slate-50 p-5 sm:p-6";

const initialSacpState: SacpFormState = {
  diameterValue: "",
  diameterUnit: "inch",
  lengthValue: "",
  lengthUnit: "m",
  coatingSystem: "",
  coatingBreakdownPercent: "",
  designCurrentDensityValue: "",
  designCurrentDensityUnit: "mA/m2",
  designLifeYears: "5",
  designFactor: "",
  anodeNetWeightKg: "4.1",
  electrochemicalCapacityAhPerKg: "",
  utilizationFactorPercent: "",
  drivingVoltageV: "",
  anodeResistanceOhm: "",
  connectionResistanceOhm: ""
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
  currentDemandMarginPercent: "25",
  rectifierSpareCapacityPercent: "50",
  circuitResistanceOhm: "",
  backVoltageV: "2",
  rectifierVoltageMarginPercent: "50",
  rectifierEfficiencyPercent: "70"
};

function renderFieldError(errors: Record<string, string>, key: string) {
  return errors[key] ? <p className={ERROR_CLASSES}>{errors[key]}</p> : null;
}

function parsePositiveNumber(
  rawValue: string,
  label: string,
  fieldName: string,
  errors: Record<string, string>
) {
  const value = Number(rawValue);
  if (!rawValue.trim()) {
    errors[fieldName] = `${label} is required.`;
    return null;
  }

  if (!Number.isFinite(value)) {
    errors[fieldName] = `${label} must be a valid number.`;
    return null;
  }

  if (value <= 0) {
    errors[fieldName] = `${label} must be greater than 0.`;
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

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="min-w-0 text-sm text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-left text-sm font-semibold text-slate-900 sm:max-w-[55%] sm:text-right">
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

export function CpDashboardView() {
  const [mode, setMode] = useState<CalculatorMode>("SACP");
  const [sacpForm, setSacpForm] = useState(initialSacpState);
  const [iccpForm, setIccpForm] = useState(initialIccpState);
  const [sacpErrors, setSacpErrors] = useState<Record<string, string>>({});
  const [iccpErrors, setIccpErrors] = useState<Record<string, string>>({});
  const [sacpResult, setSacpResult] = useState<SacpCalculationResult | null>(null);
  const [iccpResult, setIccpResult] = useState<IccpCalculationResult | null>(null);

  const headerCards = useMemo(
    () => [
      {
        label: "Document-Supported Modes",
        value: "2",
        tone: "blue" as const
      },
      {
        label: "SACP Output Basis",
        value: "Capacity + Output",
        tone: "green" as const
      },
      {
        label: "ICCP Output Basis",
        value: "Current / Voltage / Power",
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

  function handleSacpCalculate() {
    const errors: Record<string, string> = {};
    const coatingSystem = parseSelectedCoating(sacpForm.coatingSystem, errors, "coatingSystem");
    const diameterValue = parsePositiveNumber(sacpForm.diameterValue, "Diameter", "diameterValue", errors);
    const lengthValue = parsePositiveNumber(sacpForm.lengthValue, "Length", "lengthValue", errors);
    const coatingBreakdownPercent = parsePositiveNumber(
      sacpForm.coatingBreakdownPercent,
      "Coating breakdown factor",
      "coatingBreakdownPercent",
      errors
    );
    const designCurrentDensityValue = parsePositiveNumber(
      sacpForm.designCurrentDensityValue,
      "Design current density",
      "designCurrentDensityValue",
      errors
    );
    const designLifeYears = parsePositiveNumber(
      sacpForm.designLifeYears,
      "Design life",
      "designLifeYears",
      errors
    );
    const designFactor = parsePositiveNumber(
      sacpForm.designFactor,
      "Design factor",
      "designFactor",
      errors
    );
    const anodeNetWeightKg = parsePositiveNumber(
      sacpForm.anodeNetWeightKg,
      "Anode net weight",
      "anodeNetWeightKg",
      errors
    );
    const electrochemicalCapacityAhPerKg = parsePositiveNumber(
      sacpForm.electrochemicalCapacityAhPerKg,
      "Electrochemical capacity",
      "electrochemicalCapacityAhPerKg",
      errors
    );
    const utilizationFactorPercent = parsePositiveNumber(
      sacpForm.utilizationFactorPercent,
      "Utilization factor",
      "utilizationFactorPercent",
      errors
    );
    const drivingVoltageV = parsePositiveNumber(
      sacpForm.drivingVoltageV,
      "Driving voltage",
      "drivingVoltageV",
      errors
    );
    const anodeResistanceOhm = parsePositiveNumber(
      sacpForm.anodeResistanceOhm,
      "Anode resistance",
      "anodeResistanceOhm",
      errors
    );
    const connectionResistanceOhm = parsePositiveNumber(
      sacpForm.connectionResistanceOhm,
      "Connection resistance",
      "connectionResistanceOhm",
      errors
    );

    setSacpErrors(errors);
    if (Object.keys(errors).length > 0 || !coatingSystem) {
      setSacpResult(null);
      return;
    }

    setSacpResult(
      calculateSacp({
        diameterValue: diameterValue!,
        diameterUnit: sacpForm.diameterUnit,
        lengthValue: lengthValue!,
        lengthUnit: sacpForm.lengthUnit,
        coatingSystem,
        coatingBreakdownPercent: coatingBreakdownPercent!,
        designCurrentDensityValue: designCurrentDensityValue!,
        designCurrentDensityUnit: sacpForm.designCurrentDensityUnit,
        designLifeYears: designLifeYears!,
        designFactor: designFactor!,
        anodeNetWeightKg: anodeNetWeightKg!,
        electrochemicalCapacityAhPerKg: electrochemicalCapacityAhPerKg!,
        utilizationFactorPercent: utilizationFactorPercent!,
        drivingVoltageV: drivingVoltageV!,
        anodeResistanceOhm: anodeResistanceOhm!,
        connectionResistanceOhm: connectionResistanceOhm!
      })
    );
  }

  function handleIccpCalculate() {
    const errors: Record<string, string> = {};
    const coatingSystem = parseSelectedCoating(iccpForm.coatingSystem, errors, "coatingSystem");
    const diameterValue = parsePositiveNumber(iccpForm.diameterValue, "Diameter", "diameterValue", errors);
    const lengthValue = parsePositiveNumber(iccpForm.lengthValue, "Length", "lengthValue", errors);
    const coatingBreakdownPercent = parsePositiveNumber(
      iccpForm.coatingBreakdownPercent,
      "Coating breakdown factor",
      "coatingBreakdownPercent",
      errors
    );
    const designCurrentDensityValue = parsePositiveNumber(
      iccpForm.designCurrentDensityValue,
      "Design current density",
      "designCurrentDensityValue",
      errors
    );
    const currentDemandMarginPercent = parsePositiveNumber(
      iccpForm.currentDemandMarginPercent,
      "Current-demand margin",
      "currentDemandMarginPercent",
      errors
    );
    const rectifierSpareCapacityPercent = parsePositiveNumber(
      iccpForm.rectifierSpareCapacityPercent,
      "Rectifier spare capacity",
      "rectifierSpareCapacityPercent",
      errors
    );
    const circuitResistanceOhm = parsePositiveNumber(
      iccpForm.circuitResistanceOhm,
      "Circuit resistance",
      "circuitResistanceOhm",
      errors
    );
    const backVoltageV = parsePositiveNumber(
      iccpForm.backVoltageV,
      "Back voltage",
      "backVoltageV",
      errors
    );
    const rectifierVoltageMarginPercent = parsePositiveNumber(
      iccpForm.rectifierVoltageMarginPercent,
      "Rectifier voltage margin",
      "rectifierVoltageMarginPercent",
      errors
    );
    const rectifierEfficiencyPercent = parsePositiveNumber(
      iccpForm.rectifierEfficiencyPercent,
      "Rectifier efficiency",
      "rectifierEfficiencyPercent",
      errors
    );

    setIccpErrors(errors);
    if (Object.keys(errors).length > 0 || !coatingSystem) {
      setIccpResult(null);
      return;
    }

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
        currentDemandMarginPercent: currentDemandMarginPercent!,
        rectifierSpareCapacityPercent: rectifierSpareCapacityPercent!,
        circuitResistanceOhm: circuitResistanceOhm!,
        backVoltageV: backVoltageV!,
        rectifierVoltageMarginPercent: rectifierVoltageMarginPercent!,
        rectifierEfficiencyPercent: rectifierEfficiencyPercent!
      })
    );
  }

  const modeSelector = (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:max-w-3xl">
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

  const sacpContent = (
    <div className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.95fr)]">
      <div className="min-w-0 space-y-6">
        <div className={MUTED_PANEL_CLASSES}>
          <h3 className="text-xl font-semibold text-slate-900">SACP Inputs</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Uses the document-supported surface-area, current-demand, ampere-hour,
            single-anode output, and greater-of-two anode sizing sequence.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Diameter</span>
              <input className={INPUT_CLASSES} type="number" value={sacpForm.diameterValue} onChange={(event) => updateSacpField("diameterValue", event.target.value)} />
              {renderFieldError(sacpErrors, "diameterValue")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Diameter Unit</span>
              <select className={INPUT_CLASSES} value={sacpForm.diameterUnit} onChange={(event) => updateSacpField("diameterUnit", event.target.value as DiameterInputUnit)}>
                <option value="inch">inch</option>
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="m">m</option>
                <option value="ft">ft</option>
              </select>
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Length</span>
              <input className={INPUT_CLASSES} type="number" value={sacpForm.lengthValue} onChange={(event) => updateSacpField("lengthValue", event.target.value)} />
              {renderFieldError(sacpErrors, "lengthValue")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Length Unit</span>
              <select className={INPUT_CLASSES} value={sacpForm.lengthUnit} onChange={(event) => updateSacpField("lengthUnit", event.target.value as LengthInputUnit)}>
                <option value="m">m</option>
                <option value="km">km</option>
                <option value="ft">ft</option>
              </select>
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Coating System</span>
              <select className={INPUT_CLASSES} value={sacpForm.coatingSystem} onChange={(event) => updateSacpField("coatingSystem", event.target.value as CpCoatingSystem | "")}>
                <option value="">Select coating</option>
                <option value="FBE">FBE</option>
                <option value="3LPP">3LPP</option>
                <option value="Custom">Custom</option>
              </select>
              {renderFieldError(sacpErrors, "coatingSystem")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Coating Breakdown Factor % (Assumption)</span>
              <input className={INPUT_CLASSES} type="number" value={sacpForm.coatingBreakdownPercent} onChange={(event) => updateSacpField("coatingBreakdownPercent", event.target.value)} />
              <p className={HELP_CLASSES}>Not stated in 1CP.docx. Enter the approved design assumption.</p>
              {renderFieldError(sacpErrors, "coatingBreakdownPercent")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Design Current Density</span>
              <input className={INPUT_CLASSES} type="number" value={sacpForm.designCurrentDensityValue} onChange={(event) => updateSacpField("designCurrentDensityValue", event.target.value)} />
              <p className={HELP_CLASSES}>Required by the formula. Enter the approved design value.</p>
              {renderFieldError(sacpErrors, "designCurrentDensityValue")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Current Density Unit</span>
              <select className={INPUT_CLASSES} value={sacpForm.designCurrentDensityUnit} onChange={(event) => updateSacpField("designCurrentDensityUnit", event.target.value as CurrentDensityInputUnit)}>
                <option value="mA/m2">mA/m2</option>
                <option value="A/m2">A/m2</option>
              </select>
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Design Life (years)</span>
              <input className={INPUT_CLASSES} type="number" value={sacpForm.designLifeYears} onChange={(event) => updateSacpField("designLifeYears", event.target.value)} />
              <p className={HELP_CLASSES}>The SACP document states a 5-year design life.</p>
              {renderFieldError(sacpErrors, "designLifeYears")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Design Factor (Assumption)</span>
              <input className={INPUT_CLASSES} type="number" value={sacpForm.designFactor} onChange={(event) => updateSacpField("designFactor", event.target.value)} />
              <p className={HELP_CLASSES}>The document requires a design or contingency factor but does not give its value.</p>
              {renderFieldError(sacpErrors, "designFactor")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Anode Net Weight (kg)</span>
              <input className={INPUT_CLASSES} type="number" value={sacpForm.anodeNetWeightKg} onChange={(event) => updateSacpField("anodeNetWeightKg", event.target.value)} />
              <p className={HELP_CLASSES}>The SACP document specifies a 4.1 kg pre-packaged magnesium anode.</p>
              {renderFieldError(sacpErrors, "anodeNetWeightKg")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Electrochemical Capacity (Ah/kg) (Assumption)</span>
              <input className={INPUT_CLASSES} type="number" value={sacpForm.electrochemicalCapacityAhPerKg} onChange={(event) => updateSacpField("electrochemicalCapacityAhPerKg", event.target.value)} />
              <p className={HELP_CLASSES}>Not stated in 1CP.docx. Enter the approved magnesium alloy value.</p>
              {renderFieldError(sacpErrors, "electrochemicalCapacityAhPerKg")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Utilization Factor % (Assumption)</span>
              <input className={INPUT_CLASSES} type="number" value={sacpForm.utilizationFactorPercent} onChange={(event) => updateSacpField("utilizationFactorPercent", event.target.value)} />
              <p className={HELP_CLASSES}>Not stated in 1CP.docx. Enter the approved utilization factor.</p>
              {renderFieldError(sacpErrors, "utilizationFactorPercent")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Driving Voltage V (Assumption)</span>
              <input className={INPUT_CLASSES} type="number" value={sacpForm.drivingVoltageV} onChange={(event) => updateSacpField("drivingVoltageV", event.target.value)} />
              <p className={HELP_CLASSES}>Required for the output check. Enter the approved delta-E value.</p>
              {renderFieldError(sacpErrors, "drivingVoltageV")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Anode-to-Earth Resistance Ohm (Assumption)</span>
              <input className={INPUT_CLASSES} type="number" value={sacpForm.anodeResistanceOhm} onChange={(event) => updateSacpField("anodeResistanceOhm", event.target.value)} />
              <p className={HELP_CLASSES}>Not stated in 1CP.docx. Use the measured or designed resistance value.</p>
              {renderFieldError(sacpErrors, "anodeResistanceOhm")}
            </label>
            <label className="block min-w-0 md:col-span-2">
              <span className={LABEL_CLASSES}>Connection Resistance Ohm (Assumption)</span>
              <input className={INPUT_CLASSES} type="number" value={sacpForm.connectionResistanceOhm} onChange={(event) => updateSacpField("connectionResistanceOhm", event.target.value)} />
              <p className={HELP_CLASSES}>Cable, contact, shunt and connection resistance.</p>
              {renderFieldError(sacpErrors, "connectionResistanceOhm")}
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button className="rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white" onClick={handleSacpCalculate} type="button">
              Run SACP Calculation
            </button>
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        <div className={SECTION_PANEL_CLASSES}>
          <h3 className="text-xl font-semibold text-slate-900">SACP Results</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Capacity-based and output-based anode sizing are both shown. The governing quantity uses the greater requirement.
          </p>
          {sacpResult ? (
            <div className="mt-5 space-y-3">
              <ResultRow label="Surface Area" value={`${formatNumber(sacpResult.surfaceAreaM2)} m2`} />
              <ResultRow label="Exposed Area" value={`${formatNumber(sacpResult.exposedAreaM2)} m2`} />
              <ResultRow label="Current Demand" value={`${formatNumber(sacpResult.currentDemandA, 4)} A`} />
              <ResultRow label="Required Ampere-Hours" value={`${formatNumber(sacpResult.requiredAmpereHours, 2)} Ah`} />
              <ResultRow label="Usable Capacity per Anode" value={`${formatNumber(sacpResult.usableAnodeCapacityAh, 2)} Ah`} />
              <ResultRow label="One-Anode Output Current" value={`${formatNumber(sacpResult.oneAnodeOutputCurrentA, 4)} A`} />
              <ResultRow label="Anodes by Capacity" value={`${formatNumber(sacpResult.capacityBasedAnodesRaw, 3)} -> ${sacpResult.capacityBasedAnodesRounded}`} />
              <ResultRow label="Anodes by Output" value={`${formatNumber(sacpResult.outputBasedAnodesRaw, 3)} -> ${sacpResult.outputBasedAnodesRounded}`} />
              <ResultRow label="Final Governing Requirement" value={`${sacpResult.governingAnodeRequirement} anodes`} />
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm leading-6 text-slate-500">
              Enter the required inputs and run the SACP calculation.
            </div>
          )}
        </div>

        <div className={MUTED_PANEL_CLASSES}>
          <h4 className="text-lg font-semibold text-slate-900">Document Limits</h4>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            The SACP document does not provide coating breakdown factor, design current density, electrochemical capacity, utilization factor, soil resistivity, or anode dimensions. Those inputs remain editable and must be engineering-approved.
          </p>
        </div>
      </div>
    </div>
  );

  const iccpContent = (
    <div className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.95fr)]">
      <div className="min-w-0 space-y-6">
        <div className={MUTED_PANEL_CLASSES}>
          <h3 className="text-xl font-semibold text-slate-900">ICCP Inputs</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Uses the document-supported surface-area, current-demand, rectifier current, voltage, and power sequence.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Diameter</span>
              <input className={INPUT_CLASSES} type="number" value={iccpForm.diameterValue} onChange={(event) => updateIccpField("diameterValue", event.target.value)} />
              {renderFieldError(iccpErrors, "diameterValue")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Diameter Unit</span>
              <select className={INPUT_CLASSES} value={iccpForm.diameterUnit} onChange={(event) => updateIccpField("diameterUnit", event.target.value as DiameterInputUnit)}>
                <option value="inch">inch</option>
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="m">m</option>
                <option value="ft">ft</option>
              </select>
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Length</span>
              <input className={INPUT_CLASSES} type="number" value={iccpForm.lengthValue} onChange={(event) => updateIccpField("lengthValue", event.target.value)} />
              {renderFieldError(iccpErrors, "lengthValue")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Length Unit</span>
              <select className={INPUT_CLASSES} value={iccpForm.lengthUnit} onChange={(event) => updateIccpField("lengthUnit", event.target.value as LengthInputUnit)}>
                <option value="m">m</option>
                <option value="km">km</option>
                <option value="ft">ft</option>
              </select>
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Coating System</span>
              <select
                className={INPUT_CLASSES}
                value={iccpForm.coatingSystem}
                onChange={(event) => {
                  const next = event.target.value as CpCoatingSystem | "";
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
              >
                <option value="">Select coating</option>
                <option value="FBE">FBE</option>
                <option value="3LPP">3LPP</option>
                <option value="Custom">Custom</option>
              </select>
              {renderFieldError(iccpErrors, "coatingSystem")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Coating Breakdown Factor % (Assumption)</span>
              <input className={INPUT_CLASSES} type="number" value={iccpForm.coatingBreakdownPercent} onChange={(event) => updateIccpField("coatingBreakdownPercent", event.target.value)} />
              <p className={HELP_CLASSES}>Document preliminary values: FBE 3%, 3LPP 1.5%. Edit if the approved design basis differs.</p>
              {renderFieldError(iccpErrors, "coatingBreakdownPercent")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Design Current Density (Assumption)</span>
              <input className={INPUT_CLASSES} type="number" value={iccpForm.designCurrentDensityValue} onChange={(event) => updateIccpField("designCurrentDensityValue", event.target.value)} />
              <p className={HELP_CLASSES}>Document preliminary value: 20 mA/m2.</p>
              {renderFieldError(iccpErrors, "designCurrentDensityValue")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Current Density Unit</span>
              <select className={INPUT_CLASSES} value={iccpForm.designCurrentDensityUnit} onChange={(event) => updateIccpField("designCurrentDensityUnit", event.target.value as CurrentDensityInputUnit)}>
                <option value="mA/m2">mA/m2</option>
                <option value="A/m2">A/m2</option>
              </select>
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Current-Demand Margin % (Assumption)</span>
              <input className={INPUT_CLASSES} type="number" value={iccpForm.currentDemandMarginPercent} onChange={(event) => updateIccpField("currentDemandMarginPercent", event.target.value)} />
              <p className={HELP_CLASSES}>Document preliminary value: 25%.</p>
              {renderFieldError(iccpErrors, "currentDemandMarginPercent")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Rectifier Spare Capacity % (Assumption)</span>
              <input className={INPUT_CLASSES} type="number" value={iccpForm.rectifierSpareCapacityPercent} onChange={(event) => updateIccpField("rectifierSpareCapacityPercent", event.target.value)} />
              <p className={HELP_CLASSES}>Document preliminary minimum: 50% above calculated demand.</p>
              {renderFieldError(iccpErrors, "rectifierSpareCapacityPercent")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Circuit Resistance Ohm (Assumption)</span>
              <input className={INPUT_CLASSES} type="number" value={iccpForm.circuitResistanceOhm} onChange={(event) => updateIccpField("circuitResistanceOhm", event.target.value)} />
              <p className={HELP_CLASSES}>Required for voltage sizing. Enter the engineering circuit resistance.</p>
              {renderFieldError(iccpErrors, "circuitResistanceOhm")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Back Voltage V (Assumption)</span>
              <input className={INPUT_CLASSES} type="number" value={iccpForm.backVoltageV} onChange={(event) => updateIccpField("backVoltageV", event.target.value)} />
              <p className={HELP_CLASSES}>Document preliminary allowance: 2.0 V.</p>
              {renderFieldError(iccpErrors, "backVoltageV")}
            </label>
            <label className="block min-w-0">
              <span className={LABEL_CLASSES}>Rectifier Voltage Margin % (Assumption)</span>
              <input className={INPUT_CLASSES} type="number" value={iccpForm.rectifierVoltageMarginPercent} onChange={(event) => updateIccpField("rectifierVoltageMarginPercent", event.target.value)} />
              <p className={HELP_CLASSES}>Document example uses a 50% voltage margin.</p>
              {renderFieldError(iccpErrors, "rectifierVoltageMarginPercent")}
            </label>
            <label className="block min-w-0 md:col-span-2">
              <span className={LABEL_CLASSES}>Rectifier Efficiency % (Assumption)</span>
              <input className={INPUT_CLASSES} type="number" value={iccpForm.rectifierEfficiencyPercent} onChange={(event) => updateIccpField("rectifierEfficiencyPercent", event.target.value)} />
              <p className={HELP_CLASSES}>Document example uses 70% overall efficiency.</p>
              {renderFieldError(iccpErrors, "rectifierEfficiencyPercent")}
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button className="rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white" onClick={handleIccpCalculate} type="button">
              Run ICCP Calculation
            </button>
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        <div className={SECTION_PANEL_CLASSES}>
          <h3 className="text-xl font-semibold text-slate-900">ICCP Results</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Rectifier current, voltage and power are calculated from the document-supported sizing sequence.
          </p>
          {iccpResult ? (
            <div className="mt-5 space-y-3">
              <ResultRow label="Surface Area" value={`${formatNumber(iccpResult.surfaceAreaM2)} m2`} />
              <ResultRow label="Exposed Area" value={`${formatNumber(iccpResult.exposedAreaM2)} m2`} />
              <ResultRow label="Current Demand" value={`${formatNumber(iccpResult.currentDemandA, 4)} A`} />
              <ResultRow label="Design Current with Margin" value={`${formatNumber(iccpResult.designCurrentWithMarginA, 4)} A`} />
              <ResultRow label="Minimum Rectifier Current" value={`${formatNumber(iccpResult.minimumRectifierCurrentA, 3)} A`} />
              <ResultRow label="Recommended Standard Current" value={`${formatNumber(iccpResult.recommendedRectifierCurrentA, 0)} A`} />
              <ResultRow label="Operating Rectifier Voltage" value={`${formatNumber(iccpResult.operatingRectifierVoltageV, 3)} V`} />
              <ResultRow label="Minimum Rectifier Voltage" value={`${formatNumber(iccpResult.minimumRectifierVoltageV, 3)} V`} />
              <ResultRow label="Recommended Standard Voltage" value={`${formatNumber(iccpResult.recommendedRectifierVoltageV, 0)} V`} />
              <ResultRow label="Operating DC Power" value={`${formatNumber(iccpResult.operatingDcPowerW, 2)} W`} />
              <ResultRow label="Estimated AC Input Power" value={`${formatNumber(iccpResult.estimatedAcInputPowerW, 2)} W`} />
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm leading-6 text-slate-500">
              Enter the required inputs and run the ICCP calculation.
            </div>
          )}
        </div>

        <div className={MUTED_PANEL_CLASSES}>
          <h4 className="text-lg font-semibold text-slate-900">Document Limits</h4>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            The ICCP document gives preliminary values for current density, coating breakdown, margins, back voltage and efficiency, but it does not freeze the final circuit resistance or groundbed configuration. Those remain editable assumptions.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {headerCards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} tone={card.tone} />
        ))}
      </div>

      <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium leading-6 text-amber-900 shadow-sm sm:px-6">
        <span className="block break-words">
          Preliminary CP calculation - engineering verification required.
        </span>
      </div>

      <Panel className="p-4 sm:p-6 xl:p-7">
        {modeSelector}
        {mode === "SACP" ? sacpContent : iccpContent}
      </Panel>
    </div>
  );
}
