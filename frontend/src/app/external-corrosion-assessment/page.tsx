"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AssessmentForm } from "@/components/assessment-form";
import { ExternalPipeHistoryModal } from "@/components/external-pipe-history-modal";
import {
  calculateCoatingAge,
  calculateExternalCorrosion,
  calculateMinimumRequiredThickness,
  pipeDiameterToMm
} from "@/lib/externalCorrosionCalculations";
import {
  ExternalCorrosionInput,
  ExternalCorrosionResult,
  AssessmentPipeDataRecord,
  PipelineRecord,
  StoredAssessment
} from "@/lib/types";
import {
  createAssessmentPipeDataRecord,
  fetchAssessments,
  fetchCpMonitoringData,
  fetchPipelines,
  type CpMonitoringRealData,
  updateAssessmentPipeDataRecord
} from "@/lib/apiClient";

const sections: { title: string; description: string }[] = [
  {
    title: "Pipe Data",
    description: "Capture the pipeline geometry, grade, pressure, and inspection context used by the assessment."
  },
  {
    title: "Coating and Cathodic Protection",
    description: "Capture coating condition, holiday, and cathodic protection details for the ECDA review."
  },
  {
    title: "Soil Data",
    description: "Record surrounding soil chemistry and environment indicators that influence the screening output."
  },
  {
    title: "Excavation and Inspection",
    description: "Record excavation measurements and prior inspection data used in the remaining-strength check."
  },
  {
    title: "Electrical Interference",
    description: "Enter electrical interference indicators for simplified AC and stray current screening."
  },
  {
    title: "Engineering",
    description: "Capture derived thresholds and remaining-strength reference values."
  }
];

function convertPressureToBar(value: number, unit: string) {
  if (unit === "MPa") {
    return value * 10;
  }

  if (unit === "kPa") {
    return value * 0.01;
  }

  if (unit === "psi") {
    return value * 0.0689476;
  }

  return value;
}

const initialValues: ExternalCorrosionInput = {
  pipelineName: "",
  pipeLocationId: "",
  pipeMaterial: "",
  pipeMaterialOther: "",
  pipeGrade: "",
  pipeGradeOther: "",
  pipeAge: 0,
  pipeLength: 0,
  pipeIdDiameter: 0,
  pipeIdDiameterUnit: "mm",
  smys: 0,
  maop: 0,
  operatingPressure: 0,
  operatingPressureUnit: "bar",
  installationYear: 0,
  inspectionYear: 0,
  wallThickness: 0,
  wallThicknessUnit: "mm",
  coatingType: "",
  coatingTypeOther: "",
  coatingAge: 0,
  holidayFound: "No",
  holidaySize: 0,
  coatingCondition: "Unknown",
  onPotential: 0,
  offPotential: 0,
  referenceElectrode: "",
  cpStatus: "Not Determined",
  calculatedCpStatus: "Not Determined",
  manualCpStatusOverride: "No Override",
  cpStatusOverrideReason: "",
  soilPh: 0,
  soilType: "Clay",
  soilMoisture: 0,
  soilResistivity: 0,
  soilTemperature: 0,
  soilTemperatureUnit: "C",
  chloride: 0,
  sulphate: 0,
  sulphideH2S: 0,
  cinderAndCoke: "No",
  soilCarbonateContent: 0,
  redoxPotential: 0,
  groundwaterPresence: "No Groundwater",
  groundwaterCondition: "Not Applicable",
  cpSystemType: "",
  cpInputType: "CP Polarization",
  cpInputValue: 0,
  measuredThickness: 0,
  corrosionLength: 0,
  corrosionWidth: 0,
  previousInspectionDate: "",
  previousRemainingThickness: 0,
  minimumRequiredThickness: 0,
  dcCurrentDensity: 0,
  acInputType: "AC Voltage to Remote Earth",
  acInputValue: 0,
  strayCurrentDensity: 0
};

const fields = [
  {
    name: "pipelineName",
    label: "Pipeline Name",
    type: "text" as const,
    section: "Pipe Data",
    fullWidth: true,
    helperText: "Use a clear line or segment name for the report cover page."
  },
  {
    name: "pipeLocationId",
    label: "Pipe Location/ID",
    type: "text" as const,
    section: "Pipe Data",
    fullWidth: true,
    helperText: "Optional asset, route, or location identifier from the source record."
  },
  {
    name: "pipeMaterial",
    label: "Pipe Material",
    type: "select" as const,
    section: "Pipe Data",
    helperText: "Select the pipeline material category."
  },
  {
    name: "pipeGrade",
    label: "Pipe Grade",
    type: "select" as const,
    section: "Pipe Data",
    helperText: "Reference the nominal material grade from the source document."
  },
  { name: "pipeAge", label: "Pipe Age", type: "number" as const, section: "Pipe Data", step: "1", unit: "years" },
  {
    name: "pipeLength",
    label: "Pipe Length",
    type: "number" as const,
    section: "Pipe Data",
    step: "0.1",
    unit: "km",
    helperText: "Enter the screened segment length."
  },
  {
    name: "pipeIdDiameter",
    label: "Pipeline Outside Diameter (OD)",
    type: "number" as const,
    section: "Pipe Data",
    step: "0.1",
    unitFieldName: "pipeIdDiameterUnit",
    unitOptions: ["mm", "cm", "m", "inch", "ft"] as const,
    helperText: "Enter the outside diameter used for the remaining-strength calculation."
  },
  {
    name: "smys",
    label: "SMYS",
    type: "number" as const,
    section: "Pipe Data",
    step: "0.1",
    unit: "MPa",
    helperText: "Specified minimum yield strength in MPa."
  },
  {
    name: "maop",
    label: "MAOP",
    type: "number" as const,
    section: "Pipe Data",
    step: "0.1",
    unit: "bar",
    helperText: "Maximum allowable operating pressure."
  },
  {
    name: "operatingPressure",
    label: "Operating Pressure",
    type: "number" as const,
    section: "Pipe Data",
    step: "0.1",
    unitFieldName: "operatingPressureUnit",
    unitOptions: ["bar", "MPa", "kPa", "psi"] as const
  },
  {
    name: "installationYear",
    label: "Installation Year",
    type: "number" as const,
    section: "Pipe Data",
    step: "1",
    unit: "year"
  },
  {
    name: "inspectionYear",
    label: "Inspection Year",
    type: "number" as const,
    section: "Pipe Data",
    step: "1",
    unit: "year"
  },
  {
    name: "wallThickness",
    label: "Wall Thickness",
    type: "number" as const,
    section: "Pipe Data",
    step: "0.001",
    unitFieldName: "wallThicknessUnit",
    unitOptions: ["mm", "in"] as const
  },
  {
    name: "coatingType",
    label: "Coating Type",
    type: "select" as const,
    section: "Coating and Cathodic Protection",
    helperText: "Select the external coating system used on the screened segment."
  },
  {
    name: "coatingAge",
    label: "Coating Age",
    type: "number" as const,
    section: "Coating and Cathodic Protection",
    step: "1",
    unit: "years",
    readOnly: true,
    helperText: "Automatically calculated from installation and inspection years."
  },
  {
    name: "holidayFound",
    label: "Holiday Found",
    type: "select" as const,
    section: "Coating and Cathodic Protection",
    options: [
      { label: "No", value: "No" },
      { label: "Yes", value: "Yes" }
    ]
  },
  {
    name: "holidaySize",
    label: "Holiday Size",
    type: "number" as const,
    section: "Coating and Cathodic Protection",
    step: "0.1",
    unit: "mm",
    helperText: "Use the largest measured holiday dimension."
  },
  {
    name: "coatingCondition",
    label: "Coating Condition",
    type: "select" as const,
    section: "Coating and Cathodic Protection",
    options: [
      { label: "Excellent", value: "Excellent" },
      { label: "Very Good", value: "Very Good" },
      { label: "Good", value: "Good" },
      { label: "Fair", value: "Fair" },
      { label: "Poor", value: "Poor" },
      { label: "Very Poor", value: "Very Poor" },
      { label: "Failed", value: "Failed" },
      { label: "Unknown", value: "Unknown" }
    ]
  },
  {
    name: "cpSystemType",
    label: "CP Method",
    type: "select" as const,
    section: "Coating and Cathodic Protection",
    placeholder: "Select CP method",
    options: [
      {
        label: "Sacrificial Cathodic Protection (SCP)",
        value: "Sacrificial Cathodic Protection (SCP)"
      },
      {
        label: "Impressed Current Cathodic Protection (ICCP)",
        value: "Impressed Current Cathodic Protection (ICCP)"
      }
    ]
  },
  {
    name: "cpInputType",
    label: "CP Measurement Method",
    type: "select" as const,
    section: "Coating and Cathodic Protection",
    helperText: "Select the cathodic protection measurement method used for the field data. Changing the method will reset the entered CP value to prevent unit mismatch.",
    options: [
      { label: "CP Polarization", value: "CP Polarization" },
      { label: "Polarized Potential", value: "CP Polarized Potential" }
    ]
  },
  {
    name: "cpInputValue",
    label: "CP Input Value",
    type: "number" as const,
    section: "Coating and Cathodic Protection",
    step: "0.1",
    unit: "mV"
  },
  {
    name: "onPotential",
    label: "ON Potential",
    type: "number" as const,
    section: "Coating and Cathodic Protection",
    step: "0.1",
    unit: "mV"
  },
  {
    name: "offPotential",
    label: "OFF Potential",
    type: "number" as const,
    section: "Coating and Cathodic Protection",
    step: "0.1",
    unit: "mV"
  },
  {
    name: "referenceElectrode",
    label: "Reference Electrode",
    type: "text" as const,
    section: "Coating and Cathodic Protection",
    helperText: "Enter the electrode used for the CP measurement, for example CSE."
  },
  {
    name: "cpStatus",
    label: "CP Status",
    type: "text" as const,
    section: "Coating and Cathodic Protection",
    readOnly: true,
    helperText: "Automatically derived from ON and OFF potentials."
  },
  {
    name: "manualCpStatusOverride",
    label: "Manual CP Status Override",
    type: "select" as const,
    section: "Coating and Cathodic Protection",
    helperText: "Use No Override to keep the automatically calculated CP Status.",
    options: [
      { label: "No Override", value: "No Override" },
      { label: "Acceptable", value: "Acceptable" },
      { label: "Marginal / Review Required", value: "Marginal / Review Required" },
      { label: "Unacceptable", value: "Unacceptable" },
      { label: "Not Assessed", value: "Not Assessed" },
      { label: "Insufficient Data", value: "Insufficient Data" }
    ]
  },
  {
    name: "cpStatusOverrideReason",
    label: "Override Reason",
    type: "text" as const,
    section: "Coating and Cathodic Protection",
    fullWidth: true,
    helperText: "Required when Manual CP Status Override is not No Override."
  },
  {
    name: "soilPh",
    label: "Soil pH",
    type: "number" as const,
    section: "Soil Data",
    step: "0.1",
    unit: "pH"
  },
  {
    name: "soilType",
    label: "Soil Type",
    type: "select" as const,
    section: "Soil Data",
    helperText: "Use the nearest representative soil class for the route section.",
    options: [
      { label: "Clay", value: "Clay" },
      { label: "Silt", value: "Silt" },
      { label: "Sand", value: "Sand" },
      { label: "Loam", value: "Loam" },
      { label: "Gravel", value: "Gravel" },
      { label: "Peat / Organic Soil", value: "Peat / Organic Soil" },
      { label: "Calcareous Soil", value: "Calcareous Soil" },
      { label: "Saline Soil", value: "Saline Soil" },
      { label: "Gatch Soil", value: "Gatch Soil" },
      { label: "Excavated Soil / Backfill Material", value: "Excavated Soil / Backfill Material" },
      { label: "Made Ground / Fill", value: "Made Ground / Fill" },
      { label: "Waterlogged Soil", value: "Waterlogged Soil" },
      { label: "Soft Rock", value: "Soft Rock" },
      { label: "Hard Rock", value: "Hard Rock" },
      { label: "Unknown", value: "Unknown" },
      { label: "Other", value: "Other" }
    ]
  },
  { name: "soilMoisture", label: "Soil Moisture", type: "number" as const, section: "Soil Data", step: "0.1", unit: "%" },
  {
    name: "soilResistivity",
    label: "Soil Resistivity",
    type: "number" as const,
    section: "Soil Data",
    step: "1",
    unit: "ohm-m",
    helperText:
      "Stage 1 keeps the existing calculation input unit of ohm-m. The source document shows Ohm.cm, but this is not relabeled until a verified conversion path is approved."
  },
  {
    name: "soilTemperature",
    label: "Soil Temperature",
    type: "number" as const,
    section: "Soil Data",
    step: "0.1",
    unitFieldName: "soilTemperatureUnit",
    unitOptions: ["C", "F", "K"] as const
  },
  { name: "chloride", label: "Chloride", type: "number" as const, section: "Soil Data", step: "0.1", unit: "mg/kg" },
  { name: "sulphate", label: "Sulphate", type: "number" as const, section: "Soil Data", step: "0.1", unit: "mg/kg" },
  { name: "sulphideH2S", label: "Sulphide/H2S", type: "number" as const, section: "Soil Data", step: "0.1", unit: "mg/kg" },
  {
    name: "cinderAndCoke",
    label: "Cinder and Coke",
    type: "select" as const,
    section: "Soil Data",
    helperText: "Flag whether cinders or coke are present near the pipeline environment.",
    options: [
      { label: "No", value: "No" },
      { label: "Yes", value: "Yes" }
    ]
  },
  {
    name: "soilCarbonateContent",
    label: "Soil Carbonate Content",
    type: "number" as const,
    section: "Soil Data",
    step: "0.1",
    unit: "mg/kg",
    helperText:
      "Stage 1 keeps the existing calculation input unit of mg/kg. The source document shows %, but this is not relabeled until a verified conversion path is approved."
  },
  { name: "redoxPotential", label: "Redox Potential", type: "number" as const, section: "Soil Data", step: "1", unit: "mV" },
  {
    name: "groundwaterPresence",
    label: "Groundwater Presence",
    type: "select" as const,
    section: "Soil Data",
    options: [
      { label: "No Groundwater", value: "No Groundwater" },
      { label: "Seasonal Groundwater", value: "Seasonal Groundwater" },
      { label: "Seepage Water", value: "Seepage Water" },
      { label: "Permanent Groundwater", value: "Permanent Groundwater" },
      { label: "Mineral-Rich Groundwater", value: "Mineral-Rich Groundwater" },
      { label: "Waterlogged Area", value: "Waterlogged Area" },
      { label: "Unknown", value: "Unknown" }
    ]
  },
  {
    name: "groundwaterCondition",
    label: "Groundwater Condition",
    type: "select" as const,
    section: "Soil Data",
    helperText: "Automatically set to Not Applicable when groundwater is not present.",
    options: [
      { label: "Not Applicable", value: "Not Applicable" },
      { label: "Fresh Water", value: "Fresh Water" },
      { label: "Mineral-Rich Water", value: "Mineral-Rich Water" },
      { label: "Brackish Water", value: "Brackish Water" },
      { label: "Saline Water", value: "Saline Water" },
      { label: "Contaminated Water", value: "Contaminated Water" },
      { label: "Stagnant Water", value: "Stagnant Water" },
      { label: "Flowing Water", value: "Flowing Water" },
      { label: "Unknown / Not Tested", value: "Unknown / Not Tested" }
    ]
  },
  {
    name: "measuredThickness",
    label: "Measured Thickness",
    type: "number" as const,
    section: "Excavation and Inspection",
    step: "0.1",
    unit: "mm"
  },
  {
    name: "corrosionLength",
    label: "Corrosion Length",
    type: "number" as const,
    section: "Excavation and Inspection",
    step: "0.1",
    unit: "mm"
  },
  {
    name: "corrosionWidth",
    label: "Corrosion Width",
    type: "number" as const,
    section: "Excavation and Inspection",
    step: "0.1",
    unit: "mm"
  },
  {
    name: "previousInspectionDate",
    label: "Previous Inspection Date",
    type: "date" as const,
    section: "Excavation and Inspection"
  },
  {
    name: "previousRemainingThickness",
    label: "Previous Remaining Thickness",
    type: "number" as const,
    section: "Excavation and Inspection",
    step: "0.1",
    unit: "mm"
  },
  {
    name: "minimumRequiredThickness",
    label: "Minimum Required Thickness",
    type: "number" as const,
    section: "Engineering",
    step: "0.1",
    unit: "mm",
    readOnly: true,
    helperText: "Automatically calculated from OD, SMYS, and pressure."
  },
  {
    name: "dcCurrentDensity",
    label: "DC Current Density",
    type: "number" as const,
    section: "Electrical Interference",
    step: "0.1",
    unit: "A/m^2",
    helperText: "Used only by the placeholder screening logic in this phase."
  },
  {
    name: "acInputType",
    label: "AC Input Type",
    type: "select" as const,
    section: "Electrical Interference",
    helperText:
      "Choose whether the AC reading is a current density or voltage input. Changing the input type resets the entered value to avoid unit mixups.",
    options: [
      { label: "AC Current Density", value: "AC Current Density" },
      { label: "Pipe AC Voltage to Remote Earth", value: "AC Voltage to Remote Earth" }
    ]
  },
  {
    name: "acInputValue",
    label: "AC Input Value",
    type: "number" as const,
    section: "Electrical Interference",
    step: "0.1",
    unit: "A/m^2"
  },
  {
    name: "strayCurrentDensity",
    label: "Stray Current Density",
    type: "number" as const,
    section: "Electrical Interference",
    step: "0.1",
    unit: "A/m^2"
  }
];

const externalCorrosionTabs = [
  "Overview",
  "Coating Condition",
  "CP Effectiveness",
  "Soil & Environment",
  "Interference",
  "Field Surveys",
  "ILI Correlation",
  "Findings",
  "Alerts & Events",
  "Trends & Historical",
  "Configuration"
] as const;

type ExternalCorrosionTab = (typeof externalCorrosionTabs)[number];

const unsupportedReason = "BLOCKED — APPROVAL NEEDED: the existing APIs do not expose a governed source for this requirement.";
const calculationUnavailableReason = "Not Available: an approved External Corrosion calculation method and source-record lineage are required before a new assessment can be calculated or saved.";
type DashboardContextValue = {
  activeTab: ExternalCorrosionTab;
  pipeline: PipelineRecord | null;
  cp: CpMonitoringRealData | null;
  selectTab: (tab: ExternalCorrosionTab) => void;
  viewCp: () => void;
};
const DashboardContext = createContext<DashboardContextValue | null>(null);

// Consume the owner-provided percentage; do not reclassify readings or infer confidence.
function recordedCpCoverage(data: CpMonitoringRealData | null, pipelineId: string): number | null {
  if (!data || data.pipelineId !== pipelineId || !data.availability.testPoints.available) return null;
  const { monitoredCount, protectedCount, protectionCoveragePercent } = data.summary;
  const readings = data.testPoints.filter(point => point.readingId);
  if (!Number.isInteger(monitoredCount) || monitoredCount <= 0 || readings.length !== monitoredCount ||
      !Number.isInteger(protectedCount) || protectedCount < 0 || protectedCount > monitoredCount ||
      readings.some(point => !point.readingAt || !Number.isFinite(Date.parse(point.readingAt))) ||
      typeof protectionCoveragePercent !== "number" || !Number.isFinite(protectionCoveragePercent) ||
      protectionCoveragePercent < 0 || protectionCoveragePercent > 100 ||
      Number((protectedCount / monitoredCount * 100).toFixed(1)) !== protectionCoveragePercent) return null;
  return protectionCoveragePercent;
}

function DashboardKpi({ label }: { label: string }) {
  const scope = useContext(DashboardContext);
  const value = scope?.activeTab === "CP Effectiveness" && label === "CP Compliant Points"
    ? recordedCpCoverage(scope.cp, scope.pipeline?.id ?? "") : null;
  return value === null
    ? <span title={unsupportedReason}><UnavailableValue /></span>
    : <span title="Recorded protected-point percentage from CP Monitoring; see the source timestamps below. Freshness and approved evaluation lineage are not supplied by this API.">{value}</span>;
}

function OverviewDashboard({ assessments, loading, error }: { assessments: StoredAssessment[]; loading: boolean; error: string }) {
  const scope = useContext(DashboardContext)!;
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [selectedId, setSelectedId] = useState("");
  const cards: Array<[string, ExternalCorrosionTab]> = [
    ["Segments Assessed", "Overview"], ["Coating Condition Good", "Coating Condition"],
    ["Segments with CP Concerns", "CP Effectiveness"], ["High External Corrosion Threat", "Findings"],
    ["Interference Locations", "Interference"], ["Data Confidence", "Overview"]
  ];
  const filtered = useMemo(() => assessments.filter(record => {
    const date = record.inspectionDate?.slice(0, 10);
    return (!query.trim() || [record.id, record.pipelineName].some(value => value.toLowerCase().includes(query.trim().toLowerCase()))) &&
      (!from || Boolean(date && date >= from)) && (!to || Boolean(date && date <= to));
  }).sort((a, b) => Date.parse(b.inspectionDate ?? b.createdAt) - Date.parse(a.inspectionDate ?? a.createdAt)), [assessments, query, from, to]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const selected = filtered.find(record => record.id === selectedId);
  const resetPage = () => { setPage(1); setSelectedId(""); };
  useEffect(() => { resetPage(); }, [assessments]);
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{cards.map(([label, tab]) => <button
      key={label} type="button" disabled={label === "Data Confidence"} title={label === "Data Confidence" ? unsupportedReason : undefined} onClick={() => tab === "Overview" ? document.getElementById("external-assessment-register")?.scrollIntoView({ behavior: "smooth" }) : scope.selectTab(tab)}
      className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-panel dark:border-slate-700 dark:bg-slate-900">
      <p className="text-2xl font-semibold"><UnavailableValue /></p><p className="mt-2 text-xs font-semibold">{label}</p>
    </button>)}</div>
    <p className="text-xs text-slate-500">Approved segment assessments, threat indicators and confidence are not available. Legacy assessment records below are not approved segment coverage or findings.</p>
    <div id="external-assessment-register"><DashboardPanel title="External Corrosion Assessment Register">
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="text-xs">Search assessments<input aria-label="Search assessments" value={query} onChange={event => { setQuery(event.target.value); resetPage(); }} className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 dark:bg-slate-900" /></label>
        <label className="text-xs">Inspection date from<input aria-label="Inspection date from" type="date" value={from} max={to || undefined} onChange={event => { setFrom(event.target.value); resetPage(); }} className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 dark:bg-slate-900" /></label>
        <label className="text-xs">Inspection date to<input aria-label="Inspection date to" type="date" value={to} min={from || undefined} onChange={event => { setTo(event.target.value); resetPage(); }} className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 dark:bg-slate-900" /></label>
        <button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={() => { setQuery(""); setFrom(""); setTo(""); resetPage(); }}>Reset</button>
      </div>
      {error ? <p role="alert" className="mb-3 text-sm text-rose-600">{error}</p> : null}
      <div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead><tr>{["Assessment ID", "Pipeline", "Inspection Date", "Saved At", "Action"].map(label => <th className="px-3 py-2" key={label}>{label}</th>)}</tr></thead>
        <tbody>{filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(record => <tr key={record.id} className="border-t border-slate-200 dark:border-slate-700"><td className="px-3 py-3">{record.id}</td><td className="px-3 py-3">{record.pipelineName}</td><td className="px-3 py-3">{record.inspectionDate ?? "Not Available"}</td><td className="px-3 py-3">{record.createdAt}</td><td className="px-3 py-3"><button type="button" onClick={() => setSelectedId(record.id)} className="text-slateblue-600">View Details</button></td></tr>)}</tbody></table></div>
      {!filtered.length ? <p className="py-4 text-xs">{loading ? "Loading assessments…" : error || !scope.pipeline ? "Not Available" : "No saved External Corrosion assessments match this scope."}</p> : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span>{error || !scope.pipeline || loading ? "Not Available" : `${filtered.length} matching records`}</span>
        <div className="flex items-center gap-3"><button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>{currentPage} / {pageCount}</span><button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></div>
        <label>Records per page<select aria-label="Assessment records per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); resetPage(); }} className="ml-2 rounded border bg-white px-2 py-1 dark:bg-slate-900"><option value={6}>6</option></select></label>
      </div>
    </DashboardPanel></div>
    {selected ? <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50" onClick={() => setSelectedId("")}><section role="dialog" aria-modal="true" aria-label="External Corrosion assessment details" className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 dark:bg-slate-900" onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === "Escape") setSelectedId(""); }}>
      <button autoFocus type="button" className="mb-5 rounded-lg border px-3 py-2 text-sm" onClick={() => setSelectedId("")}>Close</button>
      <h3 className="text-lg font-semibold">Assessment Details</h3><p className="mt-2 text-xs text-amber-700">Recorded legacy assessment. Approval, confidence and source revisions: Not Available.</p>
      <dl className="mt-4 space-y-3 text-sm">{[["Assessment ID", selected.id], ["Pipeline ID", selected.pipelineId], ["Pipeline", selected.pipelineName], ["Inspection Date", selected.inspectionDate], ["Saved At", selected.createdAt], ["Author / approval lineage", undefined]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="break-words">{value || "Not Available"}</dd></div>)}</dl>
      <a href={`/report?${new URLSearchParams({ pipelineId: selected.pipelineId ?? "" })}`} className="mt-5 inline-block text-sm text-slateblue-600">Open Reports</a>
    </section></div> : null}
  </div>;
}

const externalCorrosionLegendColors: Record<string, string> = {
  Good: "bg-emerald-500", Fair: "bg-amber-400", Poor: "bg-rose-500", "Not Assessed": "bg-slate-400",
  Compliant: "bg-emerald-500", Marginal: "bg-amber-400", "Under-protected": "bg-rose-500", "Over-protected": "bg-blue-500",
  Matched: "bg-emerald-500", Unverified: "bg-amber-400", "No ILI Match": "bg-slate-400",
  "Previous ILI": "bg-blue-300", "Latest ILI": "bg-blue-700",
  Critical: "bg-rose-600", High: "bg-rose-500", Medium: "bg-amber-400", Low: "bg-emerald-500", "Not Specified": "bg-slate-400",
  "Total Alerts": "bg-blue-500", "CP Monitoring": "bg-blue-500", "Coating Survey": "bg-orange-500", "Field Survey": "bg-lime-600", "ILI Data": "bg-fuchsia-500", "Soil/Environment": "bg-slate-400", Interference: "bg-violet-500",
  "AC Interference": "bg-rose-500", "DC Interference": "bg-amber-400", Mitigated: "bg-emerald-500", "In Progress": "bg-blue-500", Planned: "bg-amber-400", "Not Mitigated": "bg-rose-500",
  CIPS: "bg-emerald-500", DCVG: "bg-blue-500", ACVG: "bg-orange-500", Other: "bg-slate-400", Informational: "bg-slate-400"
};

function UnavailableValue({ className = "" }: { className?: string }) {
  return <span className={`text-slate-400 ${className}`}>Not Available</span>;
}

function DashboardPanel({
  title,
  action,
  onAction,
  children,
  className = ""
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-700 dark:bg-slate-900 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        {action ? (
          <button
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slateblue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slateblue-300"
            disabled={!onAction}
            onClick={onAction}
            title={onAction ? action : unsupportedReason}
            type="button"
          >
            {action}
          </button>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyChart({ axisLabel, categories }: { axisLabel: string; categories: string[] }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/30">
      <div className="flex h-40 items-center justify-center text-center text-xs text-slate-500">
        <div>
          <p className="font-semibold text-slate-600 dark:text-slate-300">Verified chart data not available</p>
          <p className="mt-1">{axisLabel}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-3 text-[11px] text-slate-500">
        {categories.map((category) => <span className="inline-flex items-center gap-1.5" key={category}>{externalCorrosionLegendColors[category] ? <span className={`h-2.5 w-2.5 rounded-full ${category === "High" && categories.includes("Critical") ? "bg-orange-500" : externalCorrosionLegendColors[category]}`} /> : null}{category}</span>)}
      </div>
    </div>
  );
}

function EmptyTable({ headers, rows, emptyLabel }: { headers: string[]; rows?: Array<{ id: string; cells: ReactNode[] }>; emptyLabel?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/70">
          <tr>{headers.map((header) => <th className="whitespace-nowrap px-3 py-2 font-semibold" key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows?.length ? rows.map(row => <tr key={row.id} className="border-t border-slate-200 dark:border-slate-700">{row.cells.map((cell, index) => <td className="px-3 py-3" key={headers[index]}>{cell}</td>)}</tr>) : <tr className="border-t border-slate-200 dark:border-slate-700">
            <td className="px-3 py-3" colSpan={headers.length}>{emptyLabel ?? <UnavailableValue />}</td>
          </tr>}
        </tbody>
      </table>
    </div>
  );
}

function CoatingConditionDashboard() {
  const kpis = [
    ["Good Condition", "green"],
    ["Fair Condition", "amber"],
    ["Poor Condition", "red"],
    ["Coating Holidays", "blue"],
    ["Disbondment Indications", "blue"],
    ["Surveyed Length", "blue"]
  ] as const;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        Approved coating assessment values: <strong>Not Available</strong>.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map(([label, tone]) => (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-700 dark:bg-slate-900" key={label}>
            <div className={`h-2 w-12 rounded-full ${tone === "green" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-400" : tone === "red" ? "bg-rose-500" : "bg-slateblue-500"}`} />
            <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white"><DashboardKpi label={label} />{label === "Surveyed Length" ? <span className="ml-1 text-sm text-slate-500">km</span> : null}</p>
            <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>
            <p className="mt-2 text-[11px] text-slate-500"><UnavailableValue /> {label === "Surveyed Length" ? "vs. previous" : "vs. last survey"}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <DashboardPanel title="Coating Condition Map" action="View in GIS">
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-100 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/50">
            <div>
              <p className="font-semibold">Map data not available</p>
              <p className="mt-1 text-xs">Pipeline/Segment Master geometry and approved coating assessments are required.</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-300">
            {[
              ["Good", "bg-emerald-500"],
              ["Fair", "bg-amber-400"],
              ["Poor", "bg-rose-500"],
              ["Not Assessed", "bg-slate-400"]
            ].map(([label, color]) => <span className="inline-flex items-center gap-2" key={label}><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>)}
          </div>
        </DashboardPanel>
        <DashboardPanel title="Coating Condition by Segment">
          <EmptyChart axisLabel="Length (km)" categories={["Not Available"]} />
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">{["Good", "Fair", "Poor", "Not Assessed"].map((label) => <span className="inline-flex items-center gap-1.5" key={label}><span className={`h-2.5 w-2.5 rounded-full ${externalCorrosionLegendColors[label]}`} />{label}</span>)}</div>
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel title="Coating Condition Distribution">
          <EmptyChart axisLabel="Assessed length (km)" categories={["Good", "Fair", "Poor", "Not Assessed"]} />
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">Approved assessed-length totals and their denominator are not available.</p>
        </DashboardPanel>
        <DashboardPanel title="Coating Type Mix">
          <EmptyChart axisLabel="Total surveyed length (km)" categories={["3LPE", "FBE", "Coal Tar Enamel", "Other"]} />
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel title="Recent Coating Findings" action="View All">
          <EmptyTable headers={["ID", "Pipeline / Segment", "KP / Location", "Finding Type", "Coating Condition", "Severity", "Date", "Action"]} />
        </DashboardPanel>
        <DashboardPanel title="Inspection History" action="View All">
          <EmptyTable headers={["Survey ID", "Pipeline / Segment", "Survey Date", "Method", "Length (km)", "Status"]} />
        </DashboardPanel>
      </div>

      <DashboardPanel title="Top Deteriorated Areas" action="View All">
        <EmptyTable headers={["Rank", "Pipeline / Segment", "KP Range", "Finding Count", "Dominant Issue"]} />
      </DashboardPanel>

      <DashboardPanel title="Quick Actions">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["Add Coating Inspection", "View in GIS", "Create Finding", "Generate Report"].map((action) => (
            <button className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slateblue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slateblue-300" disabled key={action} title="Verified External Corrosion data or workflow is not available" type="button">
              {action}
              <span className="mt-1 block text-xs font-normal text-slate-500">Not Available</span>
            </button>
          ))}
        </div>
      </DashboardPanel>
    </div>
  );
}

function CpEffectivenessChart({
  axisLabel,
  categories,
  legend,
  selector
}: {
  axisLabel: string;
  categories: string[];
  legend: string[];
  selector?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/30">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{axisLabel}</span>
        {selector ? (
          <select aria-label={selector} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" defaultValue="" disabled>
            <option value="">{selector}</option>
          </select>
        ) : null}
      </div>
      <div className="flex h-40 items-center justify-center text-center text-xs text-slate-500">
        <div>
          <p className="font-semibold text-slate-600 dark:text-slate-300">Verified CP Monitoring data not available</p>
          <p className="mt-1">Chart values remain owned by CP Monitoring.</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-3 text-[11px] text-slate-500">
        {categories.map((category) => <span key={category}>{category}</span>)}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-3 text-[11px] text-slate-500">
        {legend.map((item) => <span className="inline-flex items-center gap-1.5" key={item}><span className={`h-2 w-2 rounded-full ${externalCorrosionLegendColors[item]}`} />{item}</span>)}
      </div>
    </div>
  );
}

function CpEffectivenessDashboard() {
  const scope = useContext(DashboardContext)!;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [selectedId, setSelectedId] = useState("");
  const cp = scope.cp;
  const connected = Boolean(cp?.availability.testPoints.available);
  const cases = (cp?.testPoints ?? []).filter(point => point.readingId &&
    (point.protectionStatus === "UnderProtected" || point.protectionStatus === "Critical") &&
    (!status || point.protectionStatus === status) &&
    (!search.trim() || [point.code, point.name, point.location, point.kp, point.readingId].some(value => value?.toLowerCase().includes(search.trim().toLowerCase()))));
  const pages = Math.max(1, Math.ceil(cases.length / pageSize));
  const currentPage = Math.min(page, pages);
  const selected = cp?.testPoints.find(point => point.id === selectedId);
  useEffect(() => { setPage(1); setSelectedId(""); }, [cp]);
  const latestReading = (cp?.testPoints ?? []).map(point => point.readingAt).filter((value): value is string => Boolean(value && Number.isFinite(Date.parse(value)))).sort().at(-1);
  const caseRows = cases.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(point => ({ id: point.id, cells: [
    point.readingId, scope.pipeline?.pipelineName ?? "Not Available", point.kp ?? point.location ?? "Not Available",
    typeof point.valueV === "number" && Number.isFinite(point.valueV) ? point.valueV : typeof point.valueMv === "number" && Number.isFinite(point.valueMv) ? point.valueMv / 1000 : "Not Available",
    "Not Available", point.protectionStatus, point.readingAt ?? "Not Available",
    <button key={point.id} type="button" className="text-slateblue-600" onClick={() => setSelectedId(point.id)}>View Details</button>
  ] }));
  const kpis = [
    ["CP Compliant Points", "green", "% vs. last survey"],
    ["Marginal Points", "amber", "% vs. last survey"],
    ["Under-protected Segments", "red", "% vs. last survey"],
    ["Over-protection Exceptions", "blue", "% vs. last survey"],
    ["Rectifier Availability", "blue", ""],
    ["Data Confidence", "blue", ""]
  ] as const;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        CP Monitoring owns these recorded readings and statuses. Latest recorded reading: <strong>{latestReading ?? "Not Available"}</strong>. Approved evaluation lineage and freshness policy are not supplied by this API; current engineering compliance and data confidence remain Not Available.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map(([label, tone, sublabel]) => (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-700 dark:bg-slate-900" key={label}>
            <div className={`h-2 w-12 rounded-full ${tone === "green" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-400" : tone === "red" ? "bg-rose-500" : "bg-slateblue-500"}`} />
            <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white"><DashboardKpi label={label} /><span className="ml-1 text-sm text-slate-500">%</span></p>
            <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>
            <p className="mt-2 text-[11px] text-slate-500"><UnavailableValue /> {sublabel}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <DashboardPanel title="CP Effectiveness Map" action="View in GIS">
          <div className="relative flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-100 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/50">
            <div className="absolute right-3 top-3 flex flex-col gap-1">
              {["+", "−", "Layers"].map((control) => <button aria-label={control} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900" disabled key={control} type="button">{control}</button>)}
            </div>
            <div>
              <p className="font-semibold">Map data not available</p>
              <p className="mt-1 text-xs">Pipeline/Segment Master geometry and CP Monitoring references are required.</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-300">
            {[
              ["Compliant", "bg-emerald-500"],
              ["Marginal", "bg-amber-400"],
              ["Under-protected", "bg-rose-500"],
              ["Over-protected", "bg-slateblue-500"]
            ].map(([label, color]) => <span className="inline-flex items-center gap-2" key={label}><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>)}
          </div>
        </DashboardPanel>
        <DashboardPanel title="CP Compliance Trend">
          <CpEffectivenessChart axisLabel="Compliance Rate" categories={["0%", "20%", "40%", "60%", "80%", "100%", "Not Available"]} legend={["Compliant", "Marginal", "Under-protected"]} selector="Last 12 Months" />
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel title="CP Effectiveness by Segment">
          <CpEffectivenessChart axisLabel="Segments" categories={["Compliant", "Marginal", "Under-protected", "Over-protected"]} legend={["Compliant", "Marginal", "Under-protected", "Over-protected"]} />
        </DashboardPanel>
        <DashboardPanel title="Coating Condition vs CP Performance" action="View Details">
          <CpEffectivenessChart axisLabel="CP Potential (V vs CSE) / Coating Condition Rating" categories={["High Concern", "Coating Poor / CP Inadequate", "Coating Good / CP Adequate", "CP Over-protection"]} legend={["Under-protected", "Marginal", "Compliant", "Over-protected"]} />
        </DashboardPanel>
      </div>

      <DashboardPanel title="Recent Under-Protection Cases" action="View All">
        <div className="mb-3 flex flex-wrap gap-3 text-xs">
          <label>Search CP cases<input aria-label="Search CP cases" value={search} onChange={event => { setSearch(event.target.value); setPage(1); setSelectedId(""); }} className="ml-2 rounded-lg border bg-white px-3 py-2 dark:bg-slate-900" /></label>
          <label>Source status<select aria-label="CP source status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); setSelectedId(""); }} className="ml-2 rounded-lg border bg-white px-3 py-2 dark:bg-slate-900"><option value="">All source cases</option><option>UnderProtected</option><option>Critical</option></select></label>
          <button type="button" onClick={() => { setSearch(""); setStatus(""); setPage(1); setSelectedId(""); }}>Reset</button>
        </div>
        <EmptyTable headers={["ID", "Pipeline / Segment", "KP / Location", "CP Potential (V)", "Severity", "Status", "Date", "Action"]} rows={caseRows} emptyLabel={connected ? "No matching recorded CP cases." : undefined} />
        <div className="mt-3 flex flex-wrap justify-between gap-3 text-xs"><span>{connected ? `${cases.length} matching source cases` : "Not Available"}</span><div className="flex gap-3"><button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>{currentPage} / {pages}</span><button type="button" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Next</button></div><label>Cases per page<select aria-label="CP cases per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }} className="ml-2 rounded border bg-white dark:bg-slate-900"><option value={6}>6</option></select></label></div>
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <DashboardPanel title="Segment Summary" action="View All">
          <EmptyTable headers={["Pipeline / Segment", "Length (km)", "Compliant (%)", "Marginal (%)", "Under-protected (%)", "Status"]} />
        </DashboardPanel>
        <DashboardPanel title="CP System Performance" action="View Details">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {["Rectifiers Total", "Online", "Offline", "Total Output (A)", "Data Uptime (last 30 days)"].map((label) => (
              <div className="rounded-xl border border-slate-200 p-3 text-center dark:border-slate-700" key={label}>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{label === "Rectifiers Total" && cp?.availability.rectifiers.available && Number.isInteger(cp.summary.rectifierCount) && cp.summary.rectifierCount >= 0 ? cp.summary.rectifierCount : <UnavailableValue />}</p>
                <p className="mt-1 text-[11px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel title="Quick Actions">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["View CP Details", "Create Field Review", "Add Finding", "Generate Report"].map((action) => (
            <button className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slateblue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slateblue-300" disabled={action !== "View CP Details" || !scope.pipeline} onClick={scope.viewCp} key={action} title={action === "View CP Details" ? "Open CP Monitoring for the selected pipeline" : unsupportedReason} type="button">
              {action}
              <span className="mt-1 block text-xs font-normal text-slate-500">{action === "View CP Details" ? "Open source module" : "Not Available"}</span>
            </button>
          ))}
        </div>
      </DashboardPanel>
      {selected ? <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50" onClick={() => setSelectedId("")}><section role="dialog" aria-modal="true" aria-label="CP source record details" className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 dark:bg-slate-900" onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === "Escape") setSelectedId(""); }}>
        <button autoFocus type="button" onClick={() => setSelectedId("")} className="mb-4 rounded-lg border px-3 py-2">Close</button><h3 className="font-semibold">Recorded CP Source</h3><dl className="mt-4 space-y-3 text-sm">{[["Owner", "CP Monitoring"], ["Pipeline ID", cp?.pipelineId], ["CP Point ID", selected.id], ["Reading ID", selected.readingId], ["Code", selected.code], ["Location", selected.location], ["KP", selected.kp], ["Reading timestamp", selected.readingAt], ["Measurement type", selected.measurementType], ["Reference electrode", selected.referenceElectrode], ["Potential (mV)", selected.valueMv], ["Potential (V)", selected.valueV], ["Recorded status", selected.protectionStatus], ["Freshness / quality / evaluation ID", null]].map(([label, value]) => <div key={String(label)}><dt className="text-xs text-slate-500">{label}</dt><dd className="break-words">{value ?? "Not Available"}</dd></div>)}</dl><button type="button" onClick={scope.viewCp} className="mt-5 text-slateblue-600">Open CP Monitoring</button><p className="mt-2 text-xs text-slate-500">Opens the source pipeline workspace. This source workspace does not accept a reading ID deep link.</p>
      </section></div> : null}
    </div>
  );
}

function SoilEnvironmentChart({ title, axisLabel, categories }: { title: string; axisLabel: string; categories: string[] }) {
  return (
    <DashboardPanel title={title}>
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/30">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{axisLabel}</p>
        <div className="flex h-32 items-center justify-center text-center text-xs text-slate-500">
          <div>
            <p className="font-semibold text-slate-600 dark:text-slate-300">Verified soil and environment data not available</p>
            <p className="mt-1">Values remain linked to approved survey or laboratory records.</p>
            <p className="mt-1">Reference bands only. Approved classification rules: Not Available.</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3 text-[11px] text-slate-500">
          {categories.map((category) => <span key={category}>{category}</span>)}
        </div>
      </div>
    </DashboardPanel>
  );
}

function SoilEnvironmentDashboard() {
  const kpis = [
    ["Soil Resistivity Zones", "green", "+% vs. last survey"],
    ["Corrosive Areas", "red", "+% vs. last assessment"],
    ["Moisture Hotspots", "blue", "+% vs. last survey"],
    ["Stray Current Exposure", "red", "require review"],
    ["Drainage Concerns", "green", "-% vs. last survey"],
    ["Data Confidence", "blue", ""]
  ] as const;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        Soil and environment values are read-only references to verified survey, laboratory and Integration Hub records. Current values: <strong>Not Available</strong>.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map(([label, tone, sublabel]) => (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-700 dark:bg-slate-900" key={label}>
            <div className={`h-2 w-12 rounded-full ${tone === "green" ? "bg-emerald-500" : tone === "red" ? "bg-rose-500" : "bg-slateblue-500"}`} />
            <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white"><DashboardKpi label={label} />{label === "Data Confidence" ? <span className="ml-1 text-sm text-slate-500">%</span> : null}</p>
            <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>
            <p className="mt-2 text-[11px] text-slate-500"><UnavailableValue /> {sublabel}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <DashboardPanel title="Soil & Environment Map" action="View in GIS">
          <div className="relative flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-100 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/50">
            <div className="absolute right-3 top-3 flex flex-col gap-1">
              {["+", "−", "Layers"].map((control) => <button aria-label={control} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900" disabled key={control} type="button">{control}</button>)}
            </div>
            <div>
              <p className="font-semibold">Map data not available</p>
              <p className="mt-1 text-xs">Pipeline geometry and verified environmental assessments are required.</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
            {["Low Resistivity (< 500 Ω·m)", "Moderate (500 - 1,000 Ω·m)", "High Resistivity (> 1,000 Ω·m)", "High Moisture", "Clay Soil", "Corrosive Area"].map((label) => <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800" key={label}>{label}</span>)}
          </div>
        </DashboardPanel>
        <SoilEnvironmentChart title="Soil Resistivity Distribution" axisLabel="(Ω·m)" categories={["< 500 (High Concern)", "500 - 1,000 (Moderate)", "1,000 - 5,000 (Good)", "> 5,000 (Very Good)"]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SoilEnvironmentChart title="Soil pH Distribution" axisLabel="pH" categories={["< 5 (Acidic)", "5 - 6 (Slightly Acidic)", "6 - 8 (Neutral)", "> 8 (Alkaline)"]} />
        <SoilEnvironmentChart title="Soil Moisture Content" axisLabel="(%)" categories={["< 5 (Very Low)", "5 - 15 (Low)", "15 - 30 (Moderate)", "> 30 (High)"]} />
        <SoilEnvironmentChart title="Chloride Content in Soil" axisLabel="(mg/kg)" categories={["< 50 (Low)", "50 - 200 (Moderate)", "200 - 1,000 (High)", "> 1,000 (Very High)"]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel title="Soil Survey Points" action="View All">
          <EmptyTable headers={["ID", "Pipeline / Segment", "Location (KP)", "Soil Resistivity (Ω·m)", "pH", "Moisture (%)", "Chloride (mg/kg)", "Soil Type", "Status"]} />
        </DashboardPanel>
        <DashboardPanel title="High-Concern Environmental Areas" action="View All">
          <EmptyTable headers={["ID", "Pipeline / Segment", "Location (KP)", "Issue Type", "Severity", "Status"]} />
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <DashboardPanel title="Environmental Assessment Summary">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {["High Concern Areas", "Moderate Concern", "Low Concern", "Total Survey Points"].map((label) => (
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700" key={label}>
                <p className="text-lg font-semibold text-slate-900 dark:text-white"><UnavailableValue /></p>
                <p className="mt-1 text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-[11px] text-slate-400"><UnavailableValue /></p>
              </div>
            ))}
          </div>
        </DashboardPanel>
        <DashboardPanel title="Key Environmental Insights">
          <p className="text-xs leading-5 text-slate-500"><UnavailableValue /> — Verified environmental records and engineering review are required before insights can be shown.</p>
        </DashboardPanel>
      </div>

      <DashboardPanel title="Quick Actions">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["Add Soil Survey", "View in GIS", "Upload Environmental Report", "Create New Finding"].map((action) => (
            <button className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slateblue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slateblue-300" disabled key={action} title="Verified soil and environment data or workflow is not available" type="button">
              {action}
              <span className="mt-1 block text-xs font-normal text-slate-500">Not Available</span>
            </button>
          ))}
        </div>
      </DashboardPanel>
    </div>
  );
}

function InterferenceChart({ axisLabel, categories }: { axisLabel: string; categories: string[] }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/30">
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{axisLabel}</p>
      <div className="flex h-32 items-center justify-center text-center text-xs text-slate-500">
        <div>
          <p className="font-semibold text-slate-600 dark:text-slate-300">Verified interference data not available</p>
          <p className="mt-1">Raw CP and interference readings remain owned by CP Monitoring.</p>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3 text-[11px] text-slate-500">
        {categories.map((category) => <span className="inline-flex items-center gap-1.5" key={category}><span className={`h-2.5 w-2.5 rounded-full ${externalCorrosionLegendColors[category]}`} />{category}</span>)}
      </div>
    </div>
  );
}

function InterferenceDashboard() {
  const kpis = [
    ["Interference Locations", "blue", "+ vs. last period"],
    ["Active Cases", "blue", "+ vs. last period"],
    ["Critical Hotspots", "red", "% of locations"],
    ["Mitigated Sites", "green", "+ vs. last period"],
    ["Pending Review", "amber", ""],
    ["Data Confidence", "blue", ""]
  ] as const;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        Interference assessments are read-only interpretations of verified CP Monitoring and survey evidence. Current values: <strong>Not Available</strong>.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map(([label, tone, sublabel]) => (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-700 dark:bg-slate-900" key={label}>
            <div className={`h-2 w-12 rounded-full ${tone === "green" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-400" : tone === "red" ? "bg-rose-500" : "bg-slateblue-500"}`} />
            <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white"><DashboardKpi label={label} />{label === "Data Confidence" ? <span className="ml-1 text-sm text-slate-500">%</span> : null}</p>
            <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>
            <p className="mt-2 text-[11px] text-slate-500"><UnavailableValue /> {sublabel}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <DashboardPanel title="Interference Location Map" action="View in GIS">
          <div className="relative flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-100 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/50">
            <div className="absolute right-3 top-3 flex flex-col gap-1">
              {["+", "−", "Layers"].map((control) => <button aria-label={control} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900" disabled key={control} type="button">{control}</button>)}
            </div>
            <div>
              <p className="font-semibold">Map data not available</p>
              <p className="mt-1 text-xs">Pipeline geometry and verified interference assessments are required.</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
            {[
              ["AC Interference", "bg-rose-500"],
              ["DC Interference", "bg-amber-400"],
              ["Mitigated", "bg-emerald-500"],
              ["Under Investigation", "bg-slateblue-500"],
              ["Low Severity", "bg-slate-400"]
            ].map(([label, color]) => <span className="inline-flex items-center gap-2" key={label}><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>)}
          </div>
        </DashboardPanel>
        <DashboardPanel title="AC vs DC Interference Locations">
          <InterferenceChart axisLabel="Number of Locations" categories={["AC Interference", "DC Interference"]} />
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel title="Interference Severity Distribution">
          <InterferenceChart axisLabel="Locations" categories={["High", "Medium", "Low", "Not Assessed"]} />
        </DashboardPanel>
        <DashboardPanel title="Mitigation Status" action="View All">
          <InterferenceChart axisLabel="Locations" categories={["Mitigated", "In Progress", "Planned", "Not Mitigated"]} />
        </DashboardPanel>
      </div>

      <DashboardPanel title="Recent Interference Findings" action="View All">
        <EmptyTable headers={["ID", "Pipeline / Location", "Chainage (km)", "Interference Type", "Source", "Severity", "Status", "Date", "Action"]} />
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <DashboardPanel title="Interference Insights">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {["AC Locations", "DC Locations", "Critical (High)", "In Mitigation"].map((label) => (
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700" key={label}>
                <p className="text-lg font-semibold text-slate-900 dark:text-white"><UnavailableValue /></p>
                <p className="mt-1 text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-[11px] text-slate-400"><UnavailableValue /></p>
              </div>
            ))}
          </div>
        </DashboardPanel>
        <DashboardPanel title="Top Interference Sources">
          <EmptyTable headers={["Rank", "Interference Source", "Count", "Percentage"]} />
        </DashboardPanel>
      </div>

      <DashboardPanel title="Quick Actions">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["Add Interference Study", "Create Action", "View in GIS", "Generate Report"].map((action) => (
            <button className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slateblue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slateblue-300" disabled key={action} title="Verified interference data or workflow is not available" type="button">
              {action}
              <span className="mt-1 block text-xs font-normal text-slate-500">Not Available</span>
            </button>
          ))}
        </div>
      </DashboardPanel>
    </div>
  );
}

function FieldSurveyChart({ title, axisLabel, categories, selector }: { title: string; axisLabel: string; categories: string[]; selector?: string }) {
  return (
    <DashboardPanel title={title}>
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/30">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{axisLabel}</p>
          {selector ? <select aria-label={selector} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" defaultValue="" disabled><option value="">{selector}</option></select> : null}
        </div>
        <div className="flex h-32 items-center justify-center text-center text-xs text-slate-500">
          <div>
            <p className="font-semibold text-slate-600 dark:text-slate-300">Verified field survey data not available</p>
            <p className="mt-1">Survey records remain linked to Document Management and Integration Hub workflows.</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3 text-[11px] text-slate-500">
          {categories.map((category) => <span className="inline-flex items-center gap-1.5" key={category}><span className={`h-2.5 w-2.5 rounded-full ${externalCorrosionLegendColors[category]}`} />{category}</span>)}
        </div>
      </div>
    </DashboardPanel>
  );
}

function FieldSurveyCalendar() {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex items-center justify-between gap-3">
        <button aria-label="Previous month" className="rounded-lg border border-slate-200 px-2 py-1 text-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700" disabled type="button">‹</button>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200"><UnavailableValue /></p>
        <button aria-label="Next month" className="rounded-lg border border-slate-200 px-2 py-1 text-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700" disabled type="button">›</button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="mt-2 flex h-44 items-center justify-center rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-500 dark:border-slate-700">
        Verified survey schedule: <strong className="ml-1">Not Available</strong>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
        {[["Scheduled", "bg-emerald-500"], ["In Progress", "bg-amber-400"], ["Overdue", "bg-rose-500"]].map(([label, color]) => <span className="inline-flex items-center gap-1.5" key={label}><span className={`h-2 w-2 rounded-full ${color}`} />{label}</span>)}
      </div>
    </div>
  );
}

function FieldSurveysDashboard() {
  const kpis = [
    ["Surveys Completed", "blue", "+% vs. last year"],
    ["Open Surveys", "blue", "overdue"],
    ["CIPS Surveys", "blue", "% of total"],
    ["Close Interval (DCVG)", "blue", "% of total"],
    ["ACVG Surveys", "blue", "% of total"],
    ["Overdue Surveys", "red", "+% vs. last month"],
    ["Confirmed Anomalies", "blue", "high priority"],
    ["Data Confidence", "blue", ""]
  ] as const;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        Field Survey data is available only from verified survey records. Reference dates are not active schedules. Current values: <strong>Not Available</strong>.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {kpis.map(([label, tone, sublabel]) => (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-700 dark:bg-slate-900" key={label}>
            <div className={`h-2 w-12 rounded-full ${tone === "red" ? "bg-rose-500" : "bg-slateblue-500"}`} />
            <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white"><DashboardKpi label={label} />{label === "Data Confidence" ? <span className="ml-1 text-sm text-slate-500">%</span> : null}</p>
            <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>
            <p className="mt-2 text-[11px] text-slate-500"><UnavailableValue /> {sublabel}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <DashboardPanel title="Survey Route Coverage" action="View in GIS">
          <div className="relative flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-100 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/50">
            <div className="absolute right-3 top-3 flex gap-1">
              {["+", "−", "Layers", "Expand"].map((control) => <button aria-label={control} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900" disabled key={control} type="button">{control}</button>)}
            </div>
            <div>
              <p className="font-semibold">Route coverage not available</p>
              <p className="mt-1 text-xs">Pipeline geometry and verified Field Survey records are required.</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-300">
            {[["Completed", "bg-emerald-500"], ["In Progress", "bg-amber-400"], ["Overdue", "bg-rose-500"], ["Not Surveyed", "bg-slate-400"]].map(([label, color]) => <span className="inline-flex items-center gap-2" key={label}><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>)}
          </div>
        </DashboardPanel>
        <DashboardPanel title="Survey Schedule" action="View All">
          <FieldSurveyCalendar />
          <div className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Upcoming Surveys</p>
            <EmptyTable headers={["Date", "Pipeline / Segment", "Survey", "Status"]} />
          </div>
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel title="Survey Results Summary">
          <FieldSurveyChart title="Surveys by Method" axisLabel="Surveys by Method" categories={["CIPS", "DCVG", "ACVG", "Other"]} selector="Last 12 Months" />
          <div className="mt-4"><FieldSurveyChart title="Findings by Severity" axisLabel="Findings by Severity" categories={["High", "Medium", "Low", "Informational"]} /></div>
        </DashboardPanel>
        <FieldSurveyChart title="Findings Trend" axisLabel="Findings" categories={["High", "Medium", "Low", "Informational"]} selector="Last 12 Months" />
      </div>

      <DashboardPanel title="Latest Field Surveys" action="View All">
        <EmptyTable headers={["ID", "Survey Date", "Pipeline / Segment", "Method", "Coverage (km)", "Findings", "Status", "Action"]} />
      </DashboardPanel>

      <DashboardPanel title="Quick Actions">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["Add Field Survey", "Upload Survey File", "Validate Import", "Generate Report"].map((action) => (
            <button className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slateblue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slateblue-300" disabled key={action} title="Verified Field Survey data or workflow is not available" type="button">
              {action}
              <span className="mt-1 block text-xs font-normal text-slate-500">Not Available</span>
            </button>
          ))}
        </div>
      </DashboardPanel>
    </div>
  );
}

function IliCorrelationChart({ axisLabel, categories, legend }: { axisLabel: string; categories: string[]; legend?: string[] }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/30">
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{axisLabel}</p>
      <div className="flex h-32 items-center justify-center text-center text-xs text-slate-500">
        <div>
          <p className="font-semibold text-slate-600 dark:text-slate-300">Verified ILI correlation data not available</p>
          <p className="mt-1">ILI runs and anomalies remain owned by ILI Analysis.</p>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3 text-[11px] text-slate-500">
        {categories.map((category) => <span key={category}>{category}</span>)}
      </div>
      {legend ? <div className="mt-3 flex flex-wrap justify-center gap-3 text-[11px] text-slate-500">{legend.map((item) => <span className="inline-flex items-center gap-1.5" key={item}><span className={`h-2 w-2 rounded-full ${externalCorrosionLegendColors[item]}`} />{item}</span>)}</div> : null}
    </div>
  );
}

function IliCorrelationDashboard() {
  const kpis = [
    ["Correlated Anomalies", "blue", "+% vs. last survey"],
    ["Unverified Anomalies", "blue", "+% vs. last survey"],
    ["Matched Excavations", "blue", "+% vs. last year"],
    ["Growth Cases", "red", "+ new cases"],
    ["Correlation Confidence", "green", "+% vs. previous"],
    ["Pending Reviews", "amber", "high priority"]
  ] as const;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        ILI correlation references existing ILI Analysis records. External Corrosion does not duplicate ILI runs or anomalies. Current values: <strong>Not Available</strong>.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map(([label, tone, sublabel]) => (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-700 dark:bg-slate-900" key={label}>
            <div className={`h-2 w-12 rounded-full ${tone === "green" ? "bg-emerald-500" : tone === "red" ? "bg-rose-500" : tone === "amber" ? "bg-amber-400" : "bg-slateblue-500"}`} />
            <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white"><DashboardKpi label={label} />{label === "Correlation Confidence" ? <span className="ml-1 text-sm text-slate-500">%</span> : null}</p>
            <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>
            <p className="mt-2 text-[11px] text-slate-500"><UnavailableValue /> {sublabel}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <DashboardPanel title="Pipeline ILI Correlation Map" action="View in GIS">
          <div className="relative flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-100 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/50">
            <div className="absolute right-3 top-3 flex flex-col gap-1">
              {["+", "−", "Layers"].map((control) => <button aria-label={control} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900" disabled key={control} type="button">{control}</button>)}
            </div>
            <div>
              <p className="font-semibold">Correlation map data not available</p>
              <p className="mt-1 text-xs">Pipeline geometry and approved ILI correlation links are required.</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-300">
            {[["Correlated (Match)", "bg-emerald-500"], ["Unverified", "bg-amber-400"], ["Growth Case", "bg-rose-500"], ["No Match", "bg-slate-400"]].map(([label, color]) => <span className="inline-flex items-center gap-2" key={label}><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>)}
          </div>
        </DashboardPanel>
        <DashboardPanel title="Anomaly Correlation Status">
          <IliCorrelationChart axisLabel="ILI Anomalies" categories={["Matched", "Unverified", "No ILI Match"]} legend={["Matched", "Unverified", "No ILI Match"]} />
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel title="Anomaly Feature Types">
          <IliCorrelationChart axisLabel="Anomaly Count" categories={["Metal Loss", "Geometric", "Dent", "Other"]} />
        </DashboardPanel>
        <DashboardPanel title="Anomaly Growth Comparison">
          <IliCorrelationChart axisLabel="Depth (mm)" categories={["Previous ILI", "Latest ILI"]} legend={["Previous ILI", "Latest ILI"]} />
        </DashboardPanel>
      </div>

      <DashboardPanel title="ILI – External Corrosion Correlation Table" action="View All">
        <EmptyTable headers={["ID", "ILI Anomaly ID", "Pipeline / Segment", "KP (km)", "Feature Type", "Matched Finding", "Correlation Status", "Confidence", "Action"]} />
      </DashboardPanel>

      <DashboardPanel title="Quick Actions">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[["View ILI Details", "Open ILI analysis and features"], ["Correlate Finding", "Link ILI anomaly to EC finding"], ["Request Excavation", "Create excavation request"], ["Generate Report", "ILI correlation report"]].map(([action, description]) => (
            <button className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slateblue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slateblue-300" disabled key={action} title="Verified ILI correlation data or workflow is not available" type="button">
              {action}
              <span className="mt-1 block text-xs font-normal text-slate-500">{description}</span>
              <span className="mt-1 block text-xs font-normal text-slate-500">Not Available</span>
            </button>
          ))}
        </div>
      </DashboardPanel>
    </div>
  );
}

function FindingsDashboard() {
  const kpis = [
    ["Open Findings", "blue", "vs. last month", ""],
    ["High Severity", "red", "of open findings", ""],
    ["Under Review", "amber", "", ""],
    ["Action Required", "red", "vs. last month", ""],
    ["Linked to Defects", "blue", "of total findings", ""],
    ["Avg. Closure Time", "blue", "vs. last quarter", "days"]
  ] as const;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        External Corrosion findings are shown only from verified assessment records. Confirmed defects remain owned by Defect Management. Current values: <strong>Not Available</strong>.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map(([label, tone, sublabel, unit]) => (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-700 dark:bg-slate-900" key={label}>
            <div className={`h-2 w-12 rounded-full ${tone === "red" ? "bg-rose-500" : tone === "amber" ? "bg-amber-400" : "bg-slateblue-500"}`} />
            <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white"><DashboardKpi label={label} />{unit ? <span className="ml-1 text-sm font-medium text-slate-500">{unit}</span> : null}</p>
            <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>
            <p className="mt-2 text-[11px] text-slate-500"><UnavailableValue /> {sublabel}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <DashboardPanel title="Findings Register" action="View All">
          <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_minmax(180px,1.4fr)_auto]">
            {["All Statuses", "All Severities", "All Finding Types"].map((label) => (
              <select aria-label={label} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" disabled key={label} defaultValue={label}>
                <option>{label}</option>
              </select>
            ))}
            <input aria-label="Search findings" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" disabled placeholder="Search findings..." />
            <button aria-label="Filter findings" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slateblue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slateblue-300" disabled type="button">Filter</button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/70">
                <tr>
                  <th className="px-3 py-2"><input aria-label="Select all findings" disabled type="checkbox" /></th>
                  {["ID", "Pipeline / Segment", "KP (km)", "Finding Type", "Severity", "Confidence", "Status", "Created Date", "Action"].map((header) => <th className="whitespace-nowrap px-3 py-2 font-semibold" key={header}>{header}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-3 py-3"><input aria-label="Select finding" disabled type="checkbox" /></td>
                  <td className="px-3 py-3" colSpan={9}><UnavailableValue /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>Showing <UnavailableValue /> findings</span>
            <div className="flex items-center gap-1">
              {["‹", "Not Available", "›"].map((page) => <button aria-label={`Page ${page}`} className="rounded-lg border border-slate-200 px-2.5 py-1.5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700" disabled key={page} type="button">{page}</button>)}
            </div>
            <select aria-label="Findings per page" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900" disabled defaultValue="10 per page">
              <option>10 per page</option>
            </select>
          </div>
        </DashboardPanel>
        <div className="space-y-4">
          <DashboardPanel title="Findings by Severity">
            <EmptyChart axisLabel="Number of Findings" categories={["High", "Medium", "Low", "Not Specified"]} />
          </DashboardPanel>
          <DashboardPanel title="Findings by Status">
            <EmptyChart axisLabel="Number of Findings" categories={["Open", "Under Review", "Action Required", "Closed"]} />
          </DashboardPanel>
        </div>
      </div>

      <DashboardPanel title="Recent Activity" action="View All Activities">
        <EmptyTable headers={["Date / Time", "Finding ID", "Activity", "User"]} />
      </DashboardPanel>

      <DashboardPanel title="Quick Actions">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["Create New Finding", "Send to Defect Manager", "Assign Action", "Generate Report"].map((action) => (
            <button className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slateblue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slateblue-300" disabled key={action} title="Verified finding records or workflow is not available" type="button">
              {action}
              <span className="mt-1 block text-xs font-normal text-slate-500">Not Available</span>
            </button>
          ))}
        </div>
      </DashboardPanel>
    </div>
  );
}

function AlertsEventsDashboard() {
  const kpis = [
    ["Open Alerts", "red", "vs. last month", ""],
    ["Critical Alerts", "red", "of open alerts", ""],
    ["Acknowledged", "blue", "vs. last month", ""],
    ["Overdue Reviews", "amber", "of open alerts", ""],
    ["Recently Resolved", "green", "vs. last month", ""],
    ["Alert Data Confidence", "blue", "", "%"]
  ] as const;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        Alerts and events are derived from verified External Corrosion records and source-module references. CP Monitoring, SCADA and other source alarms remain authoritative in their owning modules. Current values: <strong>Not Available</strong>.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map(([label, tone, sublabel, unit]) => (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-700 dark:bg-slate-900" key={label}>
            <div className={`h-2 w-12 rounded-full ${tone === "red" ? "bg-rose-500" : tone === "amber" ? "bg-amber-400" : tone === "green" ? "bg-emerald-500" : "bg-slateblue-500"}`} />
            <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white"><DashboardKpi label={label} />{unit ? <span className="ml-1 text-sm font-medium text-slate-500">{unit}</span> : null}</p>
            <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>
            <p className="mt-2 text-[11px] text-slate-500"><UnavailableValue /> {sublabel}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr_1fr]">
        <DashboardPanel title="Alert Trend">
          <div className="mb-3 flex justify-end"><select aria-label="Alert Trend period" disabled className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slateblue-700 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:text-slateblue-300"><option>Last 6 Months</option></select></div>
          <EmptyChart axisLabel="Number of Alerts" categories={["Critical", "High", "Medium", "Low", "Total Alerts"]} />
        </DashboardPanel>
        <DashboardPanel title="Alerts by Source">
          <EmptyChart axisLabel="Open Alerts" categories={["CP Monitoring", "Coating Survey", "Field Survey", "ILI Data", "Soil/Environment", "Interference"]} />
        </DashboardPanel>
        <DashboardPanel title="Alerts by Severity">
          <EmptyChart axisLabel="Number of Alerts" categories={["Critical", "High", "Medium", "Low"]} />
        </DashboardPanel>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="mr-2 text-sm font-semibold text-slate-900 dark:text-white">Filters</h3>
          {[["Severity", "All Severities"], ["Status", "All Statuses"], ["Source", "All Sources"]].map(([heading, label]) => (
            <label className="min-w-[150px] flex-1 text-xs text-slate-500" key={label}>
              <span className="mb-1 block">{heading}</span>
              <select aria-label={label} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" disabled defaultValue={label}>
                <option>{label}</option>
              </select>
            </label>
          ))}
          <label className="min-w-[190px] flex-1 text-xs text-slate-500">
            <span className="mb-1 block">Date Range</span>
            <input aria-label="Date Range" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" disabled readOnly value="Not Available" />
          </label>
          <button className="rounded-lg px-3 py-2 text-xs font-semibold text-slateblue-700 underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-slateblue-300" disabled type="button">Clear Filters</button>
          <button className="rounded-lg bg-slateblue-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled type="button">Apply Filters</button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <DashboardPanel title="Alerts & Events Register" action="Export">
          <div className="mb-3 flex flex-wrap justify-end gap-2">
            <input aria-label="Search alerts" className="min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" disabled placeholder="Search alerts..." />
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/70">
                <tr>
                  <th className="px-3 py-2"><input aria-label="Select all alerts" disabled type="checkbox" /></th>
                  {["Alert ID", "Source", "Pipeline / Segment", "Alert Type", "Severity", "Status", "Raised Time", "Assignee", "Action"].map((header) => <th className="whitespace-nowrap px-3 py-2 font-semibold" key={header}>{header}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-3 py-3"><input aria-label="Select alert" disabled type="checkbox" /></td>
                  <td className="px-3 py-3" colSpan={9}><UnavailableValue /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>Showing <UnavailableValue /> alerts</span>
            <div className="flex items-center gap-1">
              {["‹", "Not Available", "›"].map((page) => <button aria-label={`Alert page ${page}`} className="rounded-lg border border-slate-200 px-2.5 py-1.5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700" disabled key={page} type="button">{page}</button>)}
            </div>
            <select aria-label="Alerts per page" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900" disabled defaultValue="10 per page">
              <option>10 per page</option>
            </select>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Quick Actions">
          <div className="grid gap-3">
            {[
              ["Acknowledge Alert", "Mark alert as acknowledged"],
              ["Create Action", "Create follow-up action"],
              ["View Source Record", "Open related data (CP, survey, ILI, etc.)"],
              ["Generate Report", "Download alerts report"]
            ].map(([action, description]) => (
              <button className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slateblue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slateblue-300" disabled key={action} title="Verified alert records or workflow is not available" type="button">
                {action}
                <span className="mt-1 block text-xs font-normal text-slate-500">{description}</span>
              </button>
            ))}
          </div>
        </DashboardPanel>
      </div>
    </div>
  );
}

function HistoricalTrendChart({ title, selector, yLabel, xLabel = "Year", legend }: { title: string; selector?: string; yLabel: string; xLabel?: string; legend: { label: string; color: string }[] }) {
  return (
    <DashboardPanel title={title}>
      <div className="mb-3 flex justify-end">
        {selector ? <select aria-label={`${title} display`} disabled className="max-w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slateblue-700 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:text-slateblue-300"><option>{selector}</option></select> : <span className="text-xs text-slate-400">R = Not Available · n = Not Available segments</span>}
      </div>
      <div className="flex gap-2">
        <span className="text-[10px] text-slate-500 [writing-mode:vertical-rl] rotate-180">{yLabel}</span>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-40 items-center justify-center border-b border-l border-slate-200 bg-[linear-gradient(to_top,transparent_24%,#e2e8f0_25%,transparent_26%,transparent_49%,#e2e8f0_50%,transparent_51%,transparent_74%,#e2e8f0_75%,transparent_76%)] px-3 text-center text-xs text-slate-400 dark:border-slate-700">
            Not Available
          </div>
          <span className="mt-2 text-center text-[10px] text-slate-500">{xLabel}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-3 text-[11px] text-slate-500">
        {legend.map(({ label, color }) => <span className="inline-flex items-center gap-1.5" key={label}><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>)}
      </div>
    </DashboardPanel>
  );
}

function TrendsHistoricalDashboard() {
  const kpis = ["Overall Corrosion Trend", "Segments Deteriorating", "Segments Improving", "Historical Surveys", "Long-term CP Correlation", "Data Confidence"];
  const actions = [
    ["Compare Periods", "Compare trends between time periods"],
    ["Export Trend Data", "Download charts and tables"],
    ["Generate Report", "Create historical analysis report"],
    ["View in GIS", "Explore historical data on map"]
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map((label) => <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-700 dark:bg-slate-900" key={label}>
          <p className="text-2xl font-semibold"><DashboardKpi label={label} />{label === "Overall Corrosion Trend" || label === "Data Confidence" ? <span className="ml-1 text-sm text-slate-500">%</span> : null}</p>
          <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>
          <p className="mt-2 text-[11px] text-slate-400">Not Available</p>
        </div>)}
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        {[["Date Range", "Not Available"], ["Pipeline", "All Pipelines"], ["Segment", "All Segments"], ["Location Type", "All Locations"]].map(([label, option]) => <label className="min-w-[160px] flex-1 text-xs text-slate-600 dark:text-slate-300" key={label}>
          <span className="mb-1 block">{label}</span>
          <select aria-label={label} disabled className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"><option>{option}</option></select>
        </label>)}
        {["Apply", "Reset"].map((label) => <button disabled type="button" key={label} className="rounded-lg border border-slate-200 px-4 py-2 text-xs text-slateblue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slateblue-300">{label}</button>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <HistoricalTrendChart title="Coating Deterioration Trend" selector="Percentage of Segments" yLabel="% Deteriorated Segments" legend={[{ label: "High Severity", color: "bg-rose-500" }, { label: "Moderate Severity", color: "bg-amber-400" }]} />
        <HistoricalTrendChart title="CP Concern Trend" selector="Number of Segments" yLabel="Number of Segments" legend={[{ label: "High Concern", color: "bg-rose-500" }, { label: "Moderate Concern", color: "bg-amber-400" }, { label: "Low Concern", color: "bg-emerald-500" }]} />
        <HistoricalTrendChart title="Interference Trend" selector="Number of Locations" yLabel="Number of Locations" legend={[{ label: "AC Interference", color: "bg-rose-500" }, { label: "DC Interference", color: "bg-blue-500" }, { label: "Other Interference", color: "bg-emerald-500" }]} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_270px]">
        <HistoricalTrendChart title="Assessment History" selector="By Assessment Result" yLabel="Number of Segments" legend={[{ label: "Good", color: "bg-emerald-500" }, { label: "Fair", color: "bg-amber-400" }, { label: "Poor", color: "bg-rose-500" }, { label: "Not Assessed", color: "bg-slate-400" }]} />
        <HistoricalTrendChart title="CP Effectiveness vs. Coating Condition (Historical Correlation)" yLabel="Coating Condition Index" xLabel="CP ON Potential (V vs CSE)" legend={[]} />
        <DashboardPanel title="Quick Actions"><div className="grid gap-2">{actions.map(([label, description]) => <button key={label} type="button" disabled title="Verified historical records and an approved workflow are required" className="rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slateblue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slateblue-300">{label}<span className="mt-1 block text-[11px] font-normal text-slate-500">{description}</span></button>)}</div></DashboardPanel>
      </div>
      <DashboardPanel title="Recent Trend Observations" action="View All">
        <EmptyTable headers={["ID", "Pipeline / Segment", "Observation", "Metric", "Current Value", "Previous Value", "Trend", "Change", "Period", "Comment", "Action"]} />
      </DashboardPanel>
    </div>
  );
}

function UnavailableConfigSwitch({ label }: { label: string }) {
  return <button type="button" aria-label={`${label}: Not Available`} disabled title="Saved state: Not Available" className="inline-flex h-5 w-9 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xs text-slate-400 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800">—</button>;
}

function ConfigurationDashboard() {
  const tables = [
    { title: "1. Mechanism Library", description: "Manage external corrosion mechanisms and applicability.", action: "Add Mechanism", headers: ["ID", "Mechanism", "Description", "Active", "Actions"] },
    { title: "2. Coating Condition Rules", description: "Define coating condition categories and assessment rules.", action: "Add Rule", headers: ["Condition", "Criteria (e.g. % coating defect)", "Threat Severity", "Active"] },
    { title: "3. CP Correlation Thresholds", description: "Set thresholds for CP effectiveness and correlation rules.", action: "Edit Thresholds", headers: ["Parameter", "Good", "Moderate", "Poor", "Units"] },
    { title: "4. Soil & Environment Categories", description: "Define soil/environment categories and corrosivity levels.", action: "Add Category", headers: ["Category", "Description", "Corrosivity", "Active"] },
    { title: "5. Interference Rules", description: "Configure AC/DC interference assessment criteria.", action: "Add Rule", headers: ["Interference Type", "Threshold", "Threat Severity", "Active"] },
    { title: "6. Field Survey Templates", description: "Manage field survey forms and data collection templates.", action: "Add Template", headers: ["Template Name", "Version", "Type", "Last Updated", "Active"] },
    { title: "7. Alert Rules", description: "Configure automatic alerts for corrosion threats and data anomalies.", action: "Add Alert", headers: ["Rule Name", "Condition", "Severity", "Channels", "Active"] }
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <DashboardPanel title="Module Configuration">
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            <p className="min-w-[180px] flex-1">Configure rules, libraries, thresholds and settings for External Corrosion assessment.</p>
            <div><p>Configuration Status</p><p className="mt-2"><UnavailableValue /></p></div>
            <div><p>Last Updated</p><p className="mt-2"><UnavailableValue /></p></div>
          </div>
        </DashboardPanel>
        <DashboardPanel title="Data Source Integration">
          <p className="text-xs text-slate-500">Link external data sources from Integration Hub for corrosion analysis (coating, CP, soil, surveys).</p>
          <a href="/integration-hub" className="mt-3 inline-block rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slateblue-700 dark:border-slate-700 dark:text-slateblue-300">Open Integration Hub</a>
        </DashboardPanel>
      </div>
      <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {tables.map(({ title, description, action, headers }) => <DashboardPanel title={title} action={action} key={title}>
          <p className="mb-3 text-xs text-slate-500">{description}</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800"><tr>{headers.map((header) => <th className="whitespace-nowrap px-2 py-2 font-semibold" key={header}>{header}</th>)}</tr></thead>
              <tbody><tr className="border-t border-slate-200 dark:border-slate-700">{headers.map((header) => <td className="px-2 py-3" key={header}>{header === "Active" ? <UnavailableConfigSwitch label={`${title} activation unavailable`} /> : header === "Actions" ? <div className="flex gap-2">{["Edit", "More"].map((label) => <button type="button" disabled className="text-slate-400 disabled:cursor-not-allowed" key={label}>{label}</button>)}</div> : <UnavailableValue />}</td>)}</tr></tbody>
            </table>
          </div>
          {title.startsWith("3.") ? <p className="mt-3 text-[11px] text-slate-500">CP Monitoring owns authoritative CP criteria. Pipe-to-Soil Potential (ON), Pipe-to-Soil Potential (OFF), IR Drop and Instant Off Criterion: mV. CP Current Density: mA/m². Approved values: Not Available.</p> : null}
        </DashboardPanel>)}
        <DashboardPanel title="8. Notification Settings" action="Edit Settings">
          <p className="mb-3 text-xs text-slate-500">Manage recipients and notification preferences.</p>
          {[["Email Notifications", "Send email alerts and notifications"], ["In-App Notifications", "Show notifications in the application"], ["SMS Notifications", "Send critical alerts via SMS"], ["Daily Digest", "Summary of new findings and alerts"]].map(([label, description]) => <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 dark:border-slate-800" key={label}><div><p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p><p className="text-[11px] text-slate-500">{description}</p><p className="text-[11px]"><UnavailableValue /></p></div><UnavailableConfigSwitch label={`${label} saved state unavailable`} /></div>)}
        </DashboardPanel>
        <DashboardPanel title="9. Display Preferences & Access" action="Edit Preferences">
          <p className="mb-3 text-xs text-slate-500">Customize module display and manage role permissions.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">{["Default Map View", "Default Table Page Size", "Threat Color Scheme", "Units"].map((label) => <label className="block text-[11px] text-slate-500" key={label}>{label}<select aria-label={label} disabled className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900"><option>Not Available</option></select></label>)}</div>
            <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Role Permissions</h4><button type="button" disabled className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-400 disabled:cursor-not-allowed dark:border-slate-700">Manage Access</button></div>{["Administrator", "Integrity Manager", "Corrosion Analyst", "Field Engineer", "Viewer"].map((label) => <div className="mb-2 text-[11px]" key={label}><span className="text-slate-500">{label}</span><p><UnavailableValue /></p></div>)}</div>
          </div>
        </DashboardPanel>
      </div>
    </div>
  );
}

function renderMetrics(result: ExternalCorrosionResult) {
  return [
    { label: "Predicted Soil Corrosivity", value: result.soilCorrosivityLevel },
    { label: "Metal Loss", value: `${result.corrosionDepth} mm` },
    { label: "Metal Loss %", value: `${result.metalLossPercent} %` },
    { label: "Corrosion Rate", value: `${result.corrosionRate} mm/y` },
    { label: "Remaining Life / Time to Perforation", value: `${result.remainingLife} years` },
    { label: "Failure Pressure", value: `${result.failurePressure} bar` },
    { label: "Failure Pressure Ratio", value: result.failurePressureRatio },
    { label: "Safety Margin", value: `${result.safetyMargin} %` },
    { label: "Recommendation", value: result.recommendation },
    { label: "High-pH SCC Probability", value: result.highPhSccProbability },
    { label: "Near-Neutral-pH SCC Probability", value: result.nearNeutralPhSccProbability },
    { label: "MIC Possibility", value: result.micWarning },
    { label: "Cathodic Coating Delamination", value: result.cathodicDelaminationWarning },
    { label: "AC Corrosion Likelihood", value: result.acCorrosionWarning },
    { label: "Stray Current Corrosion Rate", value: `${result.strayCurrentCorrosionRate} mm/y` },
    { label: "Mode of Failure", value: result.majorModeOfFailure }
  ].map(metric => ({ ...metric, value: "Not Available" }));
}

export default function ExternalAssessmentPage() {
  const router = useRouter();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadedRecord, setLoadedRecord] = useState<AssessmentPipeDataRecord | null>(null);
  const [activeTab, setActiveTab] = useState<ExternalCorrosionTab>("Overview");
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [pipelineId, setPipelineId] = useState("");
  const [pipelineError, setPipelineError] = useState("");
  const [loadingPipelines, setLoadingPipelines] = useState(true);
  const [source, setSource] = useState<{ pipelineId: string; cp: CpMonitoringRealData | null; cpError: string; assessments: StoredAssessment[]; assessmentError: string } | null>(null);
  const [loadingSources, setLoadingSources] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const pipeline = pipelines.find(record => record.id === pipelineId) ?? null;
  const scopedSource = source?.pipelineId === pipelineId ? source : null;
  const cp = scopedSource?.cp ?? null;

  useEffect(() => {
    let live = true;
    const restoreLocation = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      setActiveTab(externalCorrosionTabs.some(value => value === tab) ? tab as ExternalCorrosionTab : "Overview");
    };
    restoreLocation();
    window.addEventListener("popstate", restoreLocation);
    fetchPipelines().then(records => {
      if (!live) return;
      setPipelines(records);
      const requested = new URLSearchParams(window.location.search).get("pipelineId");
      if (records.some(record => record.id === requested)) setPipelineId(requested!);
    }).catch(() => live && setPipelineError("Pipeline Master is unavailable. Please retry from Pipeline / Asset Master.")).finally(() => live && setLoadingPipelines(false));
    return () => { live = false; window.removeEventListener("popstate", restoreLocation); };
  }, []);

  useEffect(() => {
    let live = true;
    if (!pipelineId) { setSource(null); setLoadingSources(false); return; }
    setSource(null);
    setLoadingSources(true);
    Promise.allSettled([fetchCpMonitoringData(pipelineId), fetchAssessments()]).then(([cpResult, assessmentResult]) => {
      if (!live) return;
      setSource({ pipelineId,
        cp: cpResult.status === "fulfilled" && cpResult.value.pipelineId === pipelineId ? cpResult.value : null,
        cpError: cpResult.status === "rejected" ? "CP Monitoring is unavailable. Recorded CP values are not displayed." : cpResult.value.pipelineId !== pipelineId ? "CP response does not match the selected pipeline." : "",
        assessments: assessmentResult.status === "fulfilled" ? assessmentResult.value.filter(record => record.type === "External" && record.pipelineId === pipelineId) : [],
        assessmentError: assessmentResult.status === "rejected" ? "Assessment history is unavailable. Previous records are not displayed." : ""
      });
      setLoadingSources(false);
    });
    return () => { live = false; };
  }, [pipelineId, refresh]);

  function selectTab(tab: ExternalCorrosionTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }

  function selectPipeline(id: string) {
    setPipelineId(id);
    setLoadedRecord(null);
    const params = new URLSearchParams(window.location.search);
    if (id) params.set("pipelineId", id); else params.delete("pipelineId");
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }

  const viewCp = () => {
    if (pipeline) router.push(`/cp-monitoring?${new URLSearchParams({ pipelineId: pipeline.id })}`);
  };

  const coatingConditionOptions = new Set([
    "Excellent",
    "Very Good",
    "Good",
    "Fair",
    "Poor",
    "Very Poor",
    "Failed",
    "Unknown"
  ]);

  function normalizeCoatingCondition(input: ExternalCorrosionInput) {
    const currentValue = String(input.coatingCondition ?? "").trim();
    return coatingConditionOptions.has(currentValue) ? currentValue : "Unknown";
  }
  function deriveValues(input: ExternalCorrosionInput) {
    const inspectionYear = Number(input.inspectionYear ?? 0);
    const installationYear = Number(input.installationYear ?? 0);
    const coatingAge = calculateCoatingAge(installationYear, inspectionYear);
    const pipelineOdMm = pipeDiameterToMm(Number(input.pipeIdDiameter ?? 0), String(input.pipeIdDiameterUnit ?? "mm"));
    const operatingPressureBar = convertPressureToBar(
      Number(input.operatingPressure ?? 0),
      String(input.operatingPressureUnit ?? "bar")
    );
    const minimumRequiredThickness = calculateMinimumRequiredThickness({
      pipelineOdMm,
      smysMpa: Number(input.smys ?? 0),
      pressureBar: Math.max(Number(input.maop ?? 0), operatingPressureBar)
    });

    // Raw CP snapshots cannot establish a governed CP evaluation in this workspace.
    const calculatedCpStatus = "Not Available";

    return {
      coatingAge,
      coatingCondition: normalizeCoatingCondition({
        ...input,
        coatingAge
      }),
      cpStatus: calculatedCpStatus,
      calculatedCpStatus,
      minimumRequiredThickness
    } as Partial<ExternalCorrosionInput>;
  }

  async function handleSavePipeData({
    recordId,
    assessment
  }: {
    recordId?: string | null;
    assessment: StoredAssessment;
  }) {
    const savedRecord = recordId
      ? await updateAssessmentPipeDataRecord(recordId, assessment)
      : await createAssessmentPipeDataRecord(assessment);

    setLoadedRecord(savedRecord);
    return {
      recordId: savedRecord.id,
      message: recordId
        ? `Pipe data updated successfully. Record ID: ${savedRecord.id}`
        : `Pipe data saved successfully. Record ID: ${savedRecord.id}`
    };
  }

  return (
    <DashboardContext.Provider value={{ activeTab, pipeline, cp, selectTab, viewCp }}>
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
        <span>Home</span><span aria-hidden="true">&gt;</span><span className="text-slate-700 dark:text-slate-300">External Corrosion</span>
      </div>
      <div className="mb-6">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">External Corrosion</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
          Assess external corrosion condition using coating, CP effectiveness, soil/environment, interference, field survey and ILI information.
        </p>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {["Export", "New Assessment"].map((action) => (
          <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slateblue-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slateblue-300" disabled={action === "New Assessment" || !pipeline} onClick={() => router.push(`/report?${new URLSearchParams({ pipelineId })}`)} key={action} title={action === "New Assessment" ? calculationUnavailableReason : "Open Reports to review and export saved assessments"} type="button">
            {action}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <label className="min-w-[220px] flex-1 text-xs text-slate-500">Pipeline<select aria-label="External Corrosion pipeline" value={pipelineId} disabled={loadingPipelines || Boolean(pipelineError)} onChange={event => selectPipeline(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:bg-slate-900"><option value="">Select a pipeline</option>{pipelines.map(record => <option key={record.id} value={record.id}>{record.pipelineName} ({record.pipelineCode})</option>)}</select></label>
        <button type="button" disabled={!pipeline || loadingSources} onClick={() => setRefresh(value => value + 1)} className="rounded-lg border px-3 py-2 text-xs">{loadingSources ? "Loading sources…" : "Refresh Sources"}</button>
        <a href="/asset-master" className="rounded-lg border px-3 py-2 text-xs text-slateblue-600">View Asset</a>
        <a href="/integration-hub" className="rounded-lg border px-3 py-2 text-xs text-slateblue-600">Open Integration Hub</a>
        <button type="button" onClick={() => setHistoryOpen(true)} className="rounded-lg border px-3 py-2 text-xs">Pipe Data History</button>
        {pipelineError ? <p role="alert" className="w-full text-sm text-rose-600">{pipelineError}</p> : null}
        {scopedSource?.cpError ? <p role="alert" className="w-full text-sm text-rose-600">{scopedSource.cpError}</p> : null}
      </div>

      <p role="status" className="text-xs text-slate-500">Approved source data is required for unavailable indicators and workflows. Existing recorded CP data and saved assessment history can be reviewed in their own scope.</p>

      <nav aria-label="External Corrosion tabs" className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-700 dark:bg-slate-800/60">
        <div className="flex min-w-max gap-1">
          {externalCorrosionTabs.map((tab) => (
            <button
              aria-current={activeTab === tab ? "page" : undefined}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${activeTab === tab ? "bg-white text-slateblue-700 shadow-sm dark:bg-slate-900 dark:text-slateblue-300" : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-900/60"}`}
              key={tab}
              onClick={() => selectTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {activeTab === "Overview" ? (
        <OverviewDashboard key={pipelineId} assessments={scopedSource?.assessments ?? []} loading={loadingSources} error={scopedSource?.assessmentError ?? ""} />
      ) : activeTab === "Coating Condition" ? (
        <CoatingConditionDashboard />
      ) : activeTab === "CP Effectiveness" ? (
        <CpEffectivenessDashboard key={pipelineId} />
      ) : activeTab === "Soil & Environment" ? (
        <SoilEnvironmentDashboard />
      ) : activeTab === "Interference" ? (
        <InterferenceDashboard />
      ) : activeTab === "Field Surveys" ? (
        <FieldSurveysDashboard />
      ) : activeTab === "ILI Correlation" ? (
        <IliCorrelationDashboard />
      ) : activeTab === "Findings" ? (
        <FindingsDashboard />
      ) : activeTab === "Alerts & Events" ? (
        <AlertsEventsDashboard />
      ) : activeTab === "Trends & Historical" ? (
        <TrendsHistoricalDashboard />
      ) : activeTab === "Configuration" ? (
        <ConfigurationDashboard />
      ) : (
        <DashboardPanel title={activeTab}>
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/30">
            This tab is reserved for its approved External Corrosion implementation. Verified records are currently <strong>Not Available</strong>.
          </div>
        </DashboardPanel>
      )}

      {activeTab === "Coating Condition" ? (
        <DashboardPanel title="Existing External Corrosion Assessment">
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Saved legacy assessment history remains available below. New calculations require an approved engineering method and source-record lineage.
          </p>

          <AssessmentForm<ExternalCorrosionInput, ExternalCorrosionResult>
            key={pipelineId}
            scopePipeline={pipeline}
            kind="External"
            title=""
            description=""
            sections={sections}
            fields={fields}
            initialValues={initialValues}
            calculate={calculateExternalCorrosion}
            calculationUnavailableReason={calculationUnavailableReason}
            renderMetrics={renderMetrics}
            deriveValues={deriveValues}
            loadedAssessment={
              loadedRecord?.assessment.type === "External"
                ? {
                    assessmentId: loadedRecord.assessment.id,
                    recordId: loadedRecord.id,
                    inspectionDate: loadedRecord.assessment.inspectionDate,
                    input: loadedRecord.assessment.input as ExternalCorrosionInput,
                    result: loadedRecord.assessment.result as ExternalCorrosionResult
                  }
                : null
            }
            currentPipeDataRecordId={loadedRecord?.id ?? null}
            onSavePipeData={handleSavePipeData}
            onOpenPipeDataHistory={() => setHistoryOpen(true)}
          />
        </DashboardPanel>
      ) : null}

      <ExternalPipeHistoryModal
        pipelineId={pipelineId || undefined}
        isOpen={historyOpen}
        defaultAssessmentType="External"
        onClose={() => setHistoryOpen(false)}
        onEdit={(record) => { if (record.pipelineId && pipelines.some(item => item.id === record.pipelineId)) selectPipeline(record.pipelineId); setLoadedRecord(record); selectTab("Coating Condition"); }}
      />
    </div>
    </DashboardContext.Provider>
  );
}

