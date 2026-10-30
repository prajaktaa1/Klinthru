import { PipelineInput, PipelineRecord, StoredAssessment } from "../types/domain";

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function textValue(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function pressureUnit(value: unknown): PipelineInput["operatingPressureUnit"] {
  return value === "MPa" || value === "kPa" || value === "psi" || value === "bar" ? value : "bar";
}

function wallThicknessUnit(value: unknown): PipelineInput["wallThicknessUnit"] {
  return value === "in" ? "in" : "mm";
}

function diameterUnit(value: unknown): PipelineInput["diameterUnit"] {
  return value === "cm" || value === "m" || value === "inch" || value === "ft" || value === "mm"
    ? value
    : "mm";
}

type PipelineMasterMergeOptions = {
  preserveExistingNonEmpty?: boolean;
};

function hasNonEmptyValue(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return value !== undefined && value !== null;
}

function useIncomingValue<T>(existing: T | undefined, incoming: T | undefined, options: PipelineMasterMergeOptions) {
  if (options.preserveExistingNonEmpty && hasNonEmptyValue(existing)) {
    return existing;
  }

  return incoming ?? existing;
}

function toEditablePipelineInput(pipeline: PipelineRecord): PipelineInput {
  return {
    pipelineCode: pipeline.pipelineCode,
    pipelineName: pipeline.pipelineName,
    location: pipeline.location,
    serviceOrProduct: pipeline.serviceOrProduct,
    pipeLocationId: pipeline.pipeLocationId,
    pipeMaterial: pipeline.pipeMaterial,
    pipeMaterialOther: pipeline.pipeMaterialOther,
    pipeGrade: pipeline.pipeGrade,
    pipeGradeOther: pipeline.pipeGradeOther,
    pipeAgeYears: pipeline.pipeAgeYears,
    pipeLengthKm: pipeline.pipeLengthKm,
    pipeInsideDiameter: pipeline.pipeInsideDiameter,
    pipeOutsideDiameter: pipeline.pipeOutsideDiameter,
    diameterUnit: pipeline.diameterUnit,
    smysMpa: pipeline.smysMpa,
    maopBar: pipeline.maopBar,
    nominalWallThickness: pipeline.nominalWallThickness,
    wallThicknessInputValue: pipeline.wallThicknessInputValue,
    wallThicknessUnit: pipeline.wallThicknessUnit,
    designPressure: pipeline.designPressure,
    operatingPressure: pipeline.operatingPressure,
    operatingPressureInputValue: pipeline.operatingPressureInputValue,
    operatingPressureUnit: pipeline.operatingPressureUnit,
    installationYear: pipeline.installationYear,
    inspectionYear: pipeline.inspectionYear,
    installationDate: pipeline.installationDate,
    designLife: pipeline.designLife,
    status: pipeline.status
  };
}

export function buildPipelineMasterDataFromAssessment(
  pipeline: PipelineRecord,
  assessment: StoredAssessment,
  options: PipelineMasterMergeOptions = {}
): PipelineInput {
  const input = assessment.input ?? {};
  const pipeLocationId = textValue(input.pipeLocationId);
  const pipeDiameter = numberValue(input.pipeIdDiameter);
  const pipeDiameterDisplayValue = numberValue(input.pipeIdDiameterDisplayValue) ?? pipeDiameter;
  const operatingPressure =
    assessment.type === "Internal" ? numberValue(input.pipelinePressure) : numberValue(input.operatingPressure);
  const operatingPressureInputValue =
    assessment.type === "Internal"
      ? numberValue(input.pipelinePressureDisplayValue) ?? operatingPressure
      : numberValue(input.operatingPressureDisplayValue) ?? operatingPressure;

  return {
    ...toEditablePipelineInput(pipeline),
    pipelineName: useIncomingValue(pipeline.pipelineName, assessment.pipelineName, options) ?? pipeline.pipelineName,
    location: useIncomingValue(pipeline.location, pipeLocationId, options),
    pipeLocationId: useIncomingValue(pipeline.pipeLocationId, pipeLocationId, options),
    pipeMaterial: useIncomingValue(pipeline.pipeMaterial, textValue(input.pipeMaterial), options),
    pipeMaterialOther: useIncomingValue(pipeline.pipeMaterialOther, textValue(input.pipeMaterialOther), options),
    pipeGrade: useIncomingValue(pipeline.pipeGrade, textValue(input.pipeGrade), options),
    pipeGradeOther: useIncomingValue(pipeline.pipeGradeOther, textValue(input.pipeGradeOther), options),
    pipeAgeYears: useIncomingValue(pipeline.pipeAgeYears, numberValue(input.pipeAge), options),
    pipeLengthKm:
      assessment.type === "External"
        ? useIncomingValue(pipeline.pipeLengthKm, numberValue(input.pipeLength), options)
        : pipeline.pipeLengthKm,
    pipeInsideDiameter:
      assessment.type === "Internal" ? useIncomingValue(pipeline.pipeInsideDiameter, pipeDiameter, options) : pipeline.pipeInsideDiameter,
    pipeOutsideDiameter:
      assessment.type === "External" ? useIncomingValue(pipeline.pipeOutsideDiameter, pipeDiameter, options) : pipeline.pipeOutsideDiameter,
    diameterUnit: useIncomingValue(pipeline.diameterUnit, diameterUnit(input.pipeIdDiameterUnit), options),
    smysMpa:
      assessment.type === "External" ? useIncomingValue(pipeline.smysMpa, numberValue(input.smys), options) : pipeline.smysMpa,
    maopBar:
      assessment.type === "External" ? useIncomingValue(pipeline.maopBar, numberValue(input.maop), options) : pipeline.maopBar,
    nominalWallThickness: useIncomingValue(pipeline.nominalWallThickness, numberValue(input.wallThickness), options),
    wallThicknessInputValue: useIncomingValue(
      pipeline.wallThicknessInputValue,
      numberValue(input.wallThicknessDisplayValue) ?? numberValue(input.wallThickness),
      options
    ),
    wallThicknessUnit: useIncomingValue(pipeline.wallThicknessUnit, wallThicknessUnit(input.wallThicknessUnit), options),
    operatingPressure: useIncomingValue(pipeline.operatingPressure, operatingPressure, options),
    operatingPressureInputValue: useIncomingValue(pipeline.operatingPressureInputValue, operatingPressureInputValue, options),
    operatingPressureUnit:
      assessment.type === "Internal"
        ? useIncomingValue(pipeline.operatingPressureUnit, pressureUnit(input.pipelinePressureUnit), options)
        : useIncomingValue(pipeline.operatingPressureUnit, pressureUnit(input.operatingPressureUnit), options),
    installationYear:
      assessment.type === "External"
        ? useIncomingValue(pipeline.installationYear, numberValue(input.installationYear), options)
        : pipeline.installationYear,
    inspectionYear:
      assessment.type === "External"
        ? useIncomingValue(pipeline.inspectionYear, numberValue(input.inspectionYear), options)
        : pipeline.inspectionYear,
    designLife:
      assessment.type === "Internal" ? useIncomingValue(pipeline.designLife, numberValue(input.designLife), options) : pipeline.designLife
  };
}
