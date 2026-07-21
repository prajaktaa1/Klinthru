"use client";

import { useState } from "react";

import { AssessmentForm } from "@/components/assessment-form";
import { ExternalPipeHistoryModal } from "@/components/external-pipe-history-modal";
import { PageHeader } from "@/components/ui";
import { calculateExternalCorrosion } from "@/lib/externalCorrosionCalculations";
import {
  ExternalCorrosionInput,
  ExternalCorrosionResult,
  AssessmentPipeDataRecord,
  StoredAssessment
} from "@/lib/types";
import {
  createAssessmentPipeDataRecord,
  updateAssessmentPipeDataRecord
} from "@/lib/apiClient";

const sections: { title: string; description: string }[] = [
  {
    title: "Pipe Data",
    description: "Capture the basic pipeline dimensions, age, and material details used by the placeholder screen."
  },
  {
    title: "Coating and Cathodic Protection",
    description: "Document coating condition context and which cathodic protection input mode is being reviewed."
  },
  {
    title: "Soil Data",
    description: "Record surrounding soil chemistry and environment indicators that influence the screening output."
  },
  {
    title: "Stray Current and AC Corrosion",
    description: "Enter electrical interference indicators for simplified AC and stray current screening."
  }
];

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
  wallThickness: 0,
  coatingType: "",
  coatingTypeOther: "",
  soilPh: 0,
  soilType: "Clay",
  soilMoisture: 0,
  soilResistivity: 0,
  soilTemperature: 0,
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
    label: "Pipe ID / Diameter",
    type: "number" as const,
    section: "Pipe Data",
    step: "0.1",
    unitFieldName: "pipeIdDiameterUnit",
    unitOptions: ["mm", "cm", "m", "inch", "ft"] as const
  },
  { name: "wallThickness", label: "Wall Thickness", type: "number" as const, section: "Pipe Data", step: "0.1", unit: "mm" },
  {
    name: "coatingType",
    label: "Coating Type",
    type: "select" as const,
    section: "Coating and Cathodic Protection",
    helperText: "Select the external coating system used on the screened segment."
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
  { name: "soilTemperature", label: "Soil Temperature", type: "number" as const, section: "Soil Data", step: "0.1", unit: "deg C" },
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
    name: "dcCurrentDensity",
    label: "DC Current Density",
    type: "number" as const,
    section: "Stray Current and AC Corrosion",
    step: "0.1",
    unit: "A/m^2",
    helperText: "Used only by the placeholder screening logic in this phase."
  },
  {
    name: "acInputType",
    label: "AC Input Type",
    type: "select" as const,
    section: "Stray Current and AC Corrosion",
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
    section: "Stray Current and AC Corrosion",
    step: "0.1",
    unit: "A/m^2"
  },
  {
    name: "strayCurrentDensity",
    label: "Stray Current Density",
    type: "number" as const,
    section: "Stray Current and AC Corrosion",
    step: "0.1",
    unit: "A/m^2"
  }
];

function renderMetrics(result: ExternalCorrosionResult) {
  return [
    { label: "Predicted Soil Corrosivity", value: result.soilCorrosivityLevel },
    { label: "Maximum Corrosion Depth", value: `${result.corrosionDepth} mm` },
    { label: "Corrosion Rate", value: `${result.corrosionRate} mm/y` },
    { label: "Remaining Life / Time to Perforation", value: `${result.remainingLife} years` },
    { label: "High-pH SCC Probability", value: result.highPhSccProbability },
    { label: "Near-Neutral-pH SCC Probability", value: result.nearNeutralPhSccProbability },
    { label: "MIC Possibility", value: result.micWarning },
    { label: "Cathodic Coating Delamination", value: result.cathodicDelaminationWarning },
    { label: "AC Corrosion Likelihood", value: result.acCorrosionWarning },
    { label: "Stray Current Corrosion Rate", value: `${result.strayCurrentCorrosionRate} mm/y` },
    { label: "Mode of Failure", value: result.majorModeOfFailure }
  ];
}

export default function ExternalAssessmentPage() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadedRecord, setLoadedRecord] = useState<AssessmentPipeDataRecord | null>(null);

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
    <div>
      <PageHeader
        eyebrow="External"
        title="External Corrosion Assessment"
        description="Screen soil and interference conditions around buried assets. This phase uses UI-focused placeholder calculations only, without advanced engineering models."
      />

      <AssessmentForm<ExternalCorrosionInput, ExternalCorrosionResult>
        kind="External"
        title="Buried Pipeline Screening Form"
        description="Capture environmental and electrical indicators, then generate a simplified risk profile and report."
        sections={sections}
        fields={fields}
        initialValues={initialValues}
        calculate={calculateExternalCorrosion}
        renderMetrics={renderMetrics}
        loadedAssessment={
          loadedRecord?.assessment.type === "External"
            ? {
                recordId: loadedRecord.id,
                input: loadedRecord.assessment.input as ExternalCorrosionInput,
                result: loadedRecord.assessment.result as ExternalCorrosionResult
              }
            : null
        }
        currentPipeDataRecordId={loadedRecord?.id ?? null}
        onSavePipeData={handleSavePipeData}
        onOpenPipeDataHistory={() => setHistoryOpen(true)}
      />

      <ExternalPipeHistoryModal
        isOpen={historyOpen}
        defaultAssessmentType="External"
        onClose={() => setHistoryOpen(false)}
        onEdit={(record) => setLoadedRecord(record)}
      />
    </div>
  );
}
