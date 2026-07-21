export type RiskLevel = "High" | "Medium" | "Low";

export type AssessmentKind = "External" | "Internal";
export type UserRole = "Admin" | "Engineer" | "Viewer";
export type DiameterUnit = "mm" | "cm" | "m" | "inch" | "ft";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type ExternalCorrosionInput = {
  pipelineName: string;
  pipeLocationId?: string;
  pipeMaterial: string;
  pipeMaterialOther: string;
  pipeGrade: string;
  pipeGradeOther: string;
  pipeAge: number;
  pipeLength: number;
  pipeIdDiameter: number;
  pipeIdDiameterDisplayValue?: number;
  pipeIdDiameterUnit: DiameterUnit;
  wallThickness: number;
  coatingType: string;
  coatingTypeOther: string;
  soilPh: number;
  soilType: string;
  soilMoisture: number;
  soilResistivity: number;
  soilTemperature: number;
  chloride: number;
  sulphate: number;
  sulphideH2S: number;
  cinderAndCoke: string;
  soilCarbonateContent: number;
  redoxPotential: number;
  groundwaterPresence: string;
  groundwaterCondition?:
    | "Not Applicable"
    | "Fresh Water"
    | "Mineral-Rich Water"
    | "Brackish Water"
    | "Saline Water"
    | "Contaminated Water"
    | "Stagnant Water"
    | "Flowing Water"
    | "Unknown / Not Tested";
  cpSystemType?:
    | ""
    | "Sacrificial Cathodic Protection (SCP)"
    | "Impressed Current Cathodic Protection (ICCP)";
  cpInputType: "CP Polarization" | "CP Polarized Potential";
  cpInputValue: number;
  dcCurrentDensity: number;
  acInputType: "AC Current Density" | "AC Voltage to Remote Earth" | "Pipe AC Voltage to Remote Earth";
  acInputValue: number;
  strayCurrentDensity: number;
};

export type ExternalCorrosionResult = {
  soilCorrosivityLevel: string;
  corrosionRate: number;
  corrosionDepth: number;
  remainingLife: number;
  highPhSccProbability: string;
  nearNeutralPhSccProbability: string;
  micWarning: string;
  cathodicDelaminationWarning: string;
  acCorrosionWarning: string;
  strayCurrentCorrosionRate: number;
  majorModeOfFailure: string;
  riskLevel: RiskLevel;
  riskScore: number;
};

export type InternalCorrosionInput = {
  pipelineName: string;
  pipeLocationId?: string;
  pipeMaterial: string;
  pipeMaterialOther: string;
  pipeGrade: string;
  pipeGradeOther: string;
  pipeAge: number;
  pipeIdDiameter: number;
  pipeIdDiameterDisplayValue?: number;
  pipeIdDiameterUnit: DiameterUnit;
  wallThickness: number;
  designLife: number;
  internalCoating: string;
  internalCoatingOther: string;
  waterPh: number;
  temperature: number;
  dissolvedOxygen: number;
  waterVelocity: number;
  pipelinePressure: number;
};

export type InternalCorrosionResult = {
  corrosionRate: number;
  corrosionDepth: number;
  remainingLife: number;
  highPhSccProbability: string;
  nearNeutralPhSccProbability: string;
  micWarning: string;
  cathodicDelaminationWarning: string;
  acCorrosionWarning: string;
  strayCurrentCorrosionRate: number;
  majorModeOfFailure: string;
  riskLevel: RiskLevel;
  riskScore: number;
};

export type StoredAssessment = {
  id: string;
  type: AssessmentKind;
  pipelineName: string;
  createdAt: string;
  riskLevel: RiskLevel;
  riskScore: number;
  input: ExternalCorrosionInput | InternalCorrosionInput;
  result: ExternalCorrosionResult | InternalCorrosionResult;
};

export type AssessmentPipeDataSummary = {
  id: string;
  assessmentType: AssessmentKind;
  pipelineName: string;
  pipeId: string;
  locationId: string;
  savedAt: string;
  savedByName: string;
  savedByEmail: string;
};

export type AssessmentPipeDataRecord = AssessmentPipeDataSummary & {
  assessment: StoredAssessment;
};

export type DeviceStatus = "Active" | "Inactive" | "Fault";

export type DeviceType =
  | "Flow Meter"
  | "Level Switch"
  | "Pressure Transmitter"
  | "Temperature Sensor"
  | "Discharge Sensor"
  | "Flow Control Valve"
  | "CP Monitoring Module"
  | "Pressure Relief Valve (PRV)";

export type DeviceRecord = {
  id: string;
  deviceId: string;
  deviceType: DeviceType;
  pipelineOrLocation: string;
  status: DeviceStatus;
  latestReadingOrState: string;
  unit?: string;
  lastUpdatedAt: string;
  isDemoData: boolean;
};
