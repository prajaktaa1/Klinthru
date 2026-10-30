import { type ReportRecord } from "@/lib/apiClient";

export const DEMO_SCREENING_NOTICE =
  "Demo screening output — placeholder calculations for early product validation only. Not for engineering decisions.";

type AssessmentType = "External" | "Internal";

type SnapshotField = {
  name: string;
  label: string;
  section: string;
};

type SnapshotRow = {
  key: string;
  label: string;
  value: string;
};

export type SnapshotSection = {
  title: string;
  rows: SnapshotRow[];
};

const EXTERNAL_FIELDS: SnapshotField[] = [
  { name: "pipelineName", label: "Pipeline Name", section: "Pipe Data" },
  { name: "pipeLocationId", label: "Pipe Location/ID", section: "Pipe Data" },
  { name: "pipeMaterial", label: "Pipe Material", section: "Pipe Data" },
  { name: "pipeMaterialOther", label: "Specify Pipe Material", section: "Pipe Data" },
  { name: "pipeGrade", label: "Pipe Grade", section: "Pipe Data" },
  { name: "pipeGradeOther", label: "Specify Pipe Grade", section: "Pipe Data" },
  { name: "pipeAge", label: "Pipe Age", section: "Pipe Data" },
  { name: "pipeLength", label: "Pipe Length", section: "Pipe Data" },
  { name: "pipeIdDiameter", label: "Pipeline Outside Diameter (OD)", section: "Pipe Data" },
  { name: "smys", label: "SMYS", section: "Pipe Data" },
  { name: "maop", label: "MAOP", section: "Pipe Data" },
  { name: "operatingPressure", label: "Operating Pressure", section: "Pipe Data" },
  { name: "installationYear", label: "Installation Year", section: "Pipe Data" },
  { name: "inspectionYear", label: "Inspection Year", section: "Pipe Data" },
  { name: "wallThickness", label: "Wall Thickness", section: "Pipe Data" },
  { name: "coatingType", label: "Coating Type", section: "Coating and Cathodic Protection" },
  { name: "coatingTypeOther", label: "Specify External Coating Type", section: "Coating and Cathodic Protection" },
  { name: "coatingAge", label: "Coating Age", section: "Coating and Cathodic Protection" },
  { name: "holidayFound", label: "Holiday Found", section: "Coating and Cathodic Protection" },
  { name: "holidaySize", label: "Holiday Size", section: "Coating and Cathodic Protection" },
  { name: "coatingCondition", label: "Coating Condition", section: "Coating and Cathodic Protection" },
  { name: "cpSystemType", label: "CP Method", section: "Coating and Cathodic Protection" },
  { name: "cpInputType", label: "CP Measurement Method", section: "Coating and Cathodic Protection" },
  { name: "cpInputValue", label: "CP Input Value", section: "Coating and Cathodic Protection" },
  { name: "onPotential", label: "ON Potential", section: "Coating and Cathodic Protection" },
  { name: "offPotential", label: "OFF Potential", section: "Coating and Cathodic Protection" },
  { name: "referenceElectrode", label: "Reference Electrode", section: "Coating and Cathodic Protection" },
  { name: "cpStatus", label: "CP Status", section: "Coating and Cathodic Protection" },
  { name: "manualCpStatusOverride", label: "Manual CP Status Override", section: "Coating and Cathodic Protection" },
  { name: "cpStatusOverrideReason", label: "Override Reason", section: "Coating and Cathodic Protection" },
  { name: "soilPh", label: "Soil pH", section: "Soil Data" },
  { name: "soilType", label: "Soil Type", section: "Soil Data" },
  { name: "soilMoisture", label: "Soil Moisture", section: "Soil Data" },
  { name: "soilResistivity", label: "Soil Resistivity", section: "Soil Data" },
  { name: "soilTemperature", label: "Soil Temperature", section: "Soil Data" },
  { name: "chloride", label: "Chloride", section: "Soil Data" },
  { name: "sulphate", label: "Sulphate", section: "Soil Data" },
  { name: "sulphideH2S", label: "Sulphide/H2S", section: "Soil Data" },
  { name: "cinderAndCoke", label: "Cinder and Coke", section: "Soil Data" },
  { name: "soilCarbonateContent", label: "Soil Carbonate Content", section: "Soil Data" },
  { name: "redoxPotential", label: "Redox Potential", section: "Soil Data" },
  { name: "groundwaterPresence", label: "Groundwater Presence", section: "Soil Data" },
  { name: "groundwaterCondition", label: "Groundwater Condition", section: "Soil Data" },
  { name: "measuredThickness", label: "Measured Thickness", section: "Excavation and Inspection" },
  { name: "corrosionLength", label: "Corrosion Length", section: "Excavation and Inspection" },
  { name: "corrosionWidth", label: "Corrosion Width", section: "Excavation and Inspection" },
  { name: "previousInspectionDate", label: "Previous Inspection Date", section: "Excavation and Inspection" },
  { name: "previousRemainingThickness", label: "Previous Remaining Thickness", section: "Excavation and Inspection" },
  { name: "dcCurrentDensity", label: "DC Current Density", section: "Electrical Interference" },
  { name: "acInputType", label: "AC Input Type", section: "Electrical Interference" },
  { name: "acInputValue", label: "AC Input Value", section: "Electrical Interference" },
  { name: "strayCurrentDensity", label: "Stray Current Density", section: "Electrical Interference" },
  { name: "minimumRequiredThickness", label: "Minimum Required Thickness", section: "Engineering" }
];

const INTERNAL_FIELDS: SnapshotField[] = [
  { name: "pipelineName", label: "Pipeline Name", section: "Pipe Data" },
  { name: "pipeLocationId", label: "Pipe Location/ID", section: "Pipe Data" },
  { name: "pipeMaterial", label: "Pipe Material", section: "Pipe Data" },
  { name: "pipeMaterialOther", label: "Specify Pipe Material", section: "Pipe Data" },
  { name: "pipeGrade", label: "Pipe Grade", section: "Pipe Data" },
  { name: "pipeGradeOther", label: "Specify Pipe Grade", section: "Pipe Data" },
  { name: "pipeAge", label: "Pipe Age", section: "Pipe Data" },
  { name: "pipeIdDiameter", label: "Pipe ID / Diameter", section: "Pipe Data" },
  { name: "wallThickness", label: "Wall Thickness", section: "Pipe Data" },
  { name: "internalCoating", label: "Pipe Internal Coating", section: "Internal Coating" },
  { name: "internalCoatingOther", label: "Specify Internal Lining Type", section: "Internal Coating" },
  { name: "designLife", label: "Design Life", section: "Pressure and Design Life" },
  { name: "pipelinePressure", label: "Pipeline Pressure", section: "Pressure and Design Life" },
  { name: "waterPh", label: "Water pH", section: "Water Analysis" },
  { name: "temperature", label: "Temperature", section: "Water Analysis" },
  { name: "dissolvedOxygen", label: "Dissolved Oxygen", section: "Water Analysis" },
  { name: "waterVelocity", label: "Water Velocity", section: "Water Analysis" }
];

const EXTERNAL_RESULT_ORDER = [
  "soilCorrosivityLevel",
  "corrosionRate",
  "corrosionDepth",
  "metalLossPercent",
  "remainingLife",
  "failurePressure",
  "failurePressureRatio",
  "safetyMargin",
  "recommendation",
  "highPhSccProbability",
  "nearNeutralPhSccProbability",
  "micWarning",
  "cathodicDelaminationWarning",
  "acCorrosionWarning",
  "strayCurrentCorrosionRate",
  "majorModeOfFailure",
  "riskLevel",
  "riskScore"
] as const;

const INTERNAL_RESULT_ORDER = [
  "corrosionRate",
  "corrosionDepth",
  "remainingLife",
  "highPhSccProbability",
  "nearNeutralPhSccProbability",
  "micWarning",
  "cathodicDelaminationWarning",
  "acCorrosionWarning",
  "strayCurrentCorrosionRate",
  "majorModeOfFailure",
  "riskLevel",
  "riskScore"
] as const;

function normalizeAssessmentType(value: unknown): AssessmentType {
  return String(value ?? "").trim().toLowerCase() === "internal" ? "Internal" : "External";
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return "Not provided";
  }

  if (typeof value === "string") {
    return value.trim() ? value : "Not provided";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

function formatDateOnly(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "Not provided";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US");
}

function formatDateTime(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "Not provided";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-US");
}

function formatTemperatureUnit(value: unknown) {
  if (value === "F") {
    return "°F";
  }

  if (value === "K") {
    return "K";
  }

  return "°C";
}

function formatTemperatureValue(
  value: unknown,
  input: Record<string, unknown>,
  inputValueKey: "soilTemperatureInputValue" | "temperatureInputValue",
  unitKey: "soilTemperatureUnit" | "temperatureUnit"
) {
  const displayValue = input[inputValueKey] ?? value;
  return `${formatValue(displayValue)} ${formatTemperatureUnit(input[unitKey])}`;
}

function formatFinalCpStatus(input: Record<string, unknown>) {
  const manualOverride = formatValue(input.manualCpStatusOverride);
  const calculated = formatValue(input.calculatedCpStatus ?? input.cpStatus);

  if (manualOverride === "Not provided" || manualOverride === "No Override") {
    return calculated;
  }

  const reason = formatValue(input.cpStatusOverrideReason);
  return `${manualOverride} (calculated: ${calculated}; reason: ${reason})`;
}

function formatInputValue(
  fieldName: string,
  input: Record<string, unknown>,
  assessmentType: AssessmentType
) {
  if (fieldName === "cpStatus") {
    return formatFinalCpStatus(input);
  }

  if (fieldName === "pipeIdDiameter") {
    const displayValue = input.pipeIdDiameterDisplayValue ?? input[fieldName];
    const unit = formatValue(input.pipeIdDiameterUnit === undefined ? "mm" : input.pipeIdDiameterUnit);
    return `${formatValue(displayValue)} ${unit}`;
  }

  if (fieldName === "wallThickness") {
    const displayValue = input.wallThicknessDisplayValue ?? input[fieldName];
    const unit = formatValue(input.wallThicknessUnit ?? "mm");
    return `${formatValue(displayValue)} ${unit}`;
  }

  if (fieldName === "operatingPressure") {
    const displayValue = input.operatingPressureDisplayValue ?? input[fieldName];
    const unit = formatValue(input.operatingPressureUnit ?? "bar");
    return `${formatValue(displayValue)} ${unit}`;
  }

  if (fieldName === "pipelinePressure") {
    const displayValue = input.pipelinePressureDisplayValue ?? input[fieldName];
    const unit = formatValue(input.pipelinePressureUnit ?? "bar");
    return `${formatValue(displayValue)} ${unit}`;
  }

  if (fieldName === "soilTemperature") {
    return formatTemperatureValue(input[fieldName], input, "soilTemperatureInputValue", "soilTemperatureUnit");
  }

  if (fieldName === "temperature") {
    return formatTemperatureValue(input[fieldName], input, "temperatureInputValue", "temperatureUnit");
  }

  if (fieldName === "cpInputValue") {
    const unit = input.cpInputType === "CP Polarized Potential" ? "V vs CSE" : "mV";
    return `${formatValue(input[fieldName])} ${unit}`;
  }

  if (fieldName === "acInputValue") {
    const unit =
      input.acInputType === "AC Voltage to Remote Earth" || input.acInputType === "Pipe AC Voltage to Remote Earth"
        ? "V"
        : "A/m^2";
    return `${formatValue(input[fieldName])} ${unit}`;
  }

  const units: Record<string, string> = {
    pipeAge: "years",
    pipeLength: "km",
    smys: "MPa",
    maop: "bar",
    installationYear: "year",
    inspectionYear: "year",
    coatingAge: "years",
    holidaySize: "mm",
    soilMoisture: "%",
    soilResistivity: "ohm-m",
    chloride: "mg/kg",
    sulphate: "mg/kg",
    sulphideH2S: "mg/kg",
    soilCarbonateContent: "mg/kg",
    redoxPotential: "mV",
    onPotential: "mV",
    offPotential: "mV",
    dcCurrentDensity: "A/m^2",
    strayCurrentDensity: "A/m^2",
    measuredThickness: "mm",
    corrosionLength: "mm",
    corrosionWidth: "mm",
    previousRemainingThickness: "mm",
    minimumRequiredThickness: "mm",
    designLife: "years",
    dissolvedOxygen: "mg/L",
    waterVelocity: "m/s"
  };

  const unit = units[fieldName];
  if (unit) {
    return `${formatValue(input[fieldName])} ${unit}`;
  }

  if (fieldName === "previousInspectionDate") {
    return formatValue(input[fieldName]);
  }

  if (fieldName === "pipeIdDiameter" && assessmentType === "Internal") {
    return formatValue(input[fieldName]);
  }

  return formatValue(input[fieldName]);
}

function prettyResultLabel(value: string) {
  const overrides: Record<string, string> = {
    soilCorrosivityLevel: "Predicted Soil Corrosivity",
    corrosionRate: "Corrosion Rate",
    corrosionDepth: "Corrosion Depth",
    metalLossPercent: "Metal Loss %",
    remainingLife: "Remaining Life",
    failurePressure: "Failure Pressure",
    failurePressureRatio: "Failure Pressure Ratio",
    safetyMargin: "Safety Margin",
    recommendation: "Recommendation",
    highPhSccProbability: "High-pH SCC Probability",
    nearNeutralPhSccProbability: "Near-Neutral-pH SCC Probability",
    micWarning: "MIC Possibility",
    cathodicDelaminationWarning: "Cathodic Coating Delamination",
    acCorrosionWarning: "AC Corrosion Likelihood",
    strayCurrentCorrosionRate: "Stray Current Corrosion Rate",
    majorModeOfFailure: "Mode of Failure",
    riskLevel: "Risk Level",
    riskScore: "Risk Score"
  };

  return overrides[value] ?? value;
}

function formatResultValue(key: string, result: Record<string, unknown>) {
  const units: Record<string, string> = {
    corrosionRate: "mm/y",
    corrosionDepth: "mm",
    metalLossPercent: "%",
    remainingLife: "years",
    failurePressure: "bar",
    failurePressureRatio: "x",
    safetyMargin: "%",
    strayCurrentCorrosionRate: "mm/y"
  };

  const unit = units[key];
  if (unit) {
    return `${formatValue(result[key])} ${unit}`;
  }

  return formatValue(result[key]);
}

export function buildReportContextRows(report: ReportRecord): SnapshotRow[] {
  return [
    { key: "pipelineName", label: "Pipeline Name", value: formatValue(report.pipelineName) },
    { key: "pipelineCode", label: "Pipeline Code", value: formatValue(report.pipelineCode) },
    { key: "assessmentType", label: "Assessment Type", value: normalizeAssessmentType(report.assessmentType) },
    { key: "inspectionDate", label: "Inspection Date", value: formatDateOnly(report.inspectionDate) },
    { key: "generatedAt", label: "Report / Generated Date", value: formatDateTime(report.generatedAt) }
  ];
}

export function buildReportInputSections(report: ReportRecord): SnapshotSection[] {
  const assessmentType = normalizeAssessmentType(report.assessmentType);
  const fields = assessmentType === "Internal" ? INTERNAL_FIELDS : EXTERNAL_FIELDS;
  const input = report.input as Record<string, unknown>;
  const sectionOrder = [...new Set(fields.map((field) => field.section))];

  return sectionOrder.map((sectionTitle) => ({
    title: sectionTitle,
    rows: fields
      .filter((field) => field.section === sectionTitle)
      .map((field) => ({
        key: field.name,
        label: field.label,
        value: formatInputValue(field.name, input, assessmentType)
      }))
  }));
}

export function buildReportResultSection(report: ReportRecord): SnapshotSection {
  const assessmentType = normalizeAssessmentType(report.assessmentType);
  const result = report.result as Record<string, unknown>;
  const orderedKeys: string[] =
    assessmentType === "Internal" ? [...INTERNAL_RESULT_ORDER] : [...EXTERNAL_RESULT_ORDER];
  const seen = new Set(orderedKeys);
  const remainingKeys = Object.keys(result).filter((key) => !seen.has(key));

  return {
    title: "Generated Outputs",
    rows: [...orderedKeys, ...remainingKeys].map((key) => ({
      key,
      label: prettyResultLabel(key),
      value: formatResultValue(key, result)
    }))
  };
}
