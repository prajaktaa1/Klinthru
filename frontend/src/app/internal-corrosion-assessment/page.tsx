"use client";

import { useState } from "react";

import { AssessmentForm } from "@/components/assessment-form";
import { ExternalPipeHistoryModal } from "@/components/external-pipe-history-modal";
import { PageHeader } from "@/components/ui";
import { calculateInternalCorrosion } from "@/lib/internalCorrosionCalculations";
import {
  AssessmentPipeDataRecord,
  InternalCorrosionInput,
  InternalCorrosionResult,
  StoredAssessment
} from "@/lib/types";
import {
  createAssessmentPipeDataRecord,
  updateAssessmentPipeDataRecord
} from "@/lib/apiClient";

const sections: { title: string; description: string }[] = [
  {
    title: "Pipe Data",
    description: "Capture the line identity, material, age, and dimensional data for this internal screening run."
  },
  {
    title: "Internal Coating",
    description: "Document the current internal lining or coating arrangement used for the screened asset."
  },
  {
    title: "Pressure and Design Life",
    description: "Capture design life context and operating pressure inputs for the internal screening run."
  },
  {
    title: "Water Analysis",
    description: "Enter the placeholder chemistry and process-side values used by the Phase 1 scoring logic."
  }
];

const initialValues: InternalCorrosionInput = {
  pipelineName: "",
  pipeLocationId: "",
  pipeMaterial: "",
  pipeMaterialOther: "",
  pipeGrade: "",
  pipeGradeOther: "",
  pipeAge: 0,
  pipeIdDiameter: 0,
  pipeIdDiameterUnit: "mm",
  wallThickness: 0,
  designLife: 0,
  internalCoating: "",
  internalCoatingOther: "",
  waterPh: 0,
  temperature: 0,
  dissolvedOxygen: 0,
  waterVelocity: 0,
  pipelinePressure: 0
};

const fields = [
  {
    name: "pipelineName",
    label: "Pipeline Name",
    type: "text" as const,
    section: "Pipe Data",
    fullWidth: true,
    helperText: "Use the same asset name that should appear on the final report."
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
    section: "Pipe Data"
  },
  { name: "pipeGrade", label: "Pipe Grade", type: "select" as const, section: "Pipe Data" },
  { name: "pipeAge", label: "Pipe Age", type: "number" as const, section: "Pipe Data", step: "1", unit: "years" },
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
    name: "designLife",
    label: "Design Life",
    type: "number" as const,
    section: "Pressure and Design Life",
    step: "1",
    unit: "years",
    helperText: "Design life is shown for context in the Phase 1 UI."
  },
  {
    name: "internalCoating",
    label: "Pipe Internal Coating",
    type: "select" as const,
    section: "Internal Coating",
    helperText: "Select the closest current lining or coating arrangement."
  },
  {
    name: "pipelinePressure",
    label: "Pipeline Pressure",
    type: "number" as const,
    section: "Pressure and Design Life",
    step: "0.1",
    unit: "bar"
  },
  { name: "waterPh", label: "Water pH", type: "number" as const, section: "Water Analysis", step: "0.1", unit: "pH" },
  { name: "temperature", label: "Temperature", type: "number" as const, section: "Water Analysis", step: "0.1", unit: "deg C" },
  {
    name: "dissolvedOxygen",
    label: "Dissolved Oxygen",
    type: "number" as const,
    section: "Water Analysis",
    step: "0.1",
    unit: "mg/L",
    helperText: "Use mg/L. For water, this is approximately equivalent to ppm."
  },
  {
    name: "waterVelocity",
    label: "Water Velocity",
    type: "number" as const,
    section: "Water Analysis",
    step: "0.1",
    unit: "m/s",
    helperText: "Useful for highlighting stagnant or erosive conditions in the placeholder model."
  }
];

function renderMetrics(result: InternalCorrosionResult) {
  return [
    { label: "Internal Corrosion Rate", value: `${result.corrosionRate} mm/y` },
    { label: "Corrosion Depth", value: `${result.corrosionDepth} mm` },
    { label: "Remaining Life", value: `${result.remainingLife} years` },
    { label: "MIC Possibility", value: result.micWarning },
    { label: "Mode of Failure", value: result.majorModeOfFailure }
  ];
}

export default function InternalAssessmentPage() {
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
        eyebrow="Internal"
        title="Internal Corrosion Assessment"
        description="Capture process-side conditions and generate a placeholder internal corrosion screening profile suitable for Phase 1 product validation."
      />

      <AssessmentForm<InternalCorrosionInput, InternalCorrosionResult>
        kind="Internal"
        title="Process Conditions Screening Form"
        description="Collect baseline fluid and operating values, then create a simplified report without detailed engineering formulas."
        sections={sections}
        fields={fields}
        initialValues={initialValues}
        calculate={calculateInternalCorrosion}
        renderMetrics={renderMetrics}
        loadedAssessment={
          loadedRecord?.assessment.type === "Internal"
            ? {
                recordId: loadedRecord.id,
                input: loadedRecord.assessment.input as InternalCorrosionInput,
                result: loadedRecord.assessment.result as InternalCorrosionResult
              }
            : null
        }
        currentPipeDataRecordId={loadedRecord?.id ?? null}
        onSavePipeData={handleSavePipeData}
        onOpenPipeDataHistory={() => setHistoryOpen(true)}
      />

      <ExternalPipeHistoryModal
        isOpen={historyOpen}
        defaultAssessmentType="Internal"
        onClose={() => setHistoryOpen(false)}
        onEdit={(record) => {
          if (record.assessment.type === "Internal") {
            setLoadedRecord(record);
          }
        }}
      />
    </div>
  );
}
