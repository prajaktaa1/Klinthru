export type RiskLevel = "High" | "Medium" | "Low";

export type AssessmentKind = "External" | "Internal";
export type UserRole = "Admin" | "Engineer" | "Viewer";
export type DiameterUnit = "mm" | "cm" | "m" | "inch" | "ft";
export type PressureUnit = "bar" | "MPa" | "kPa" | "psi";
export type TemperatureUnit = "C" | "F" | "K";
export type WallThicknessUnit = "mm" | "in";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type AiReadinessStatus =
  | "ready"
  | "insufficient_history"
  | "data_source_not_connected"
  | "model_not_configured"
  | "backend_not_implemented"
  | "failure_criterion_not_configured";

export type AiCapabilityReadiness = {
  status: AiReadinessStatus;
  ready: boolean;
  reason: string;
  requiredData: string[];
  availableData: string[];
};

export type AiPredictionsReadiness = {
  overallStatus: "ready" | "blocked";
  readyCapabilities: number;
  blockedCapabilities: number;
  capabilities: {
    corrosionGrowthForecasting: AiCapabilityReadiness;
    remainingUsefulLife: AiCapabilityReadiness;
    cpDriftPrediction: AiCapabilityReadiness;
    scadaAnomalyDetection: AiCapabilityReadiness;
    defectPrediction: AiCapabilityReadiness;
    modelConfidence: AiCapabilityReadiness;
    predictionScan: AiCapabilityReadiness;
    retraining: AiCapabilityReadiness;
  };
};

export type ExternalCorrosionInput = {
  pipelineId?: string;
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
  smys: number;
  maop: number;
  operatingPressure: number;
  operatingPressureDisplayValue?: number;
  operatingPressureUnit?: PressureUnit;
  installationYear: number;
  inspectionYear: number;
  wallThickness: number;
  wallThicknessDisplayValue?: number;
  wallThicknessUnit?: WallThicknessUnit;
  coatingType: string;
  coatingTypeOther: string;
  coatingAge: number;
  holidayFound: string;
  holidaySize: number;
  coatingCondition: string;
  soilPh: number;
  soilType: string;
  soilMoisture: number;
  soilResistivity: number;
  soilTemperature: number;
  soilTemperatureInputValue?: number;
  soilTemperatureUnit?: TemperatureUnit;
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
  onPotential: number;
  offPotential: number;
  referenceElectrode: string;
  cpStatus: string;
  calculatedCpStatus?: string;
  manualCpStatusOverride?:
    | "No Override"
    | "Acceptable"
    | "Marginal / Review Required"
    | "Unacceptable"
    | "Not Assessed"
    | "Insufficient Data";
  cpStatusOverrideReason?: string;
  dcCurrentDensity: number;
  acInputType: "AC Current Density" | "AC Voltage to Remote Earth" | "Pipe AC Voltage to Remote Earth";
  acInputValue: number;
  strayCurrentDensity: number;
  measuredThickness: number;
  corrosionLength: number;
  corrosionWidth: number;
  previousInspectionDate: string;
  previousRemainingThickness: number;
  minimumRequiredThickness: number;
};

export type ExternalCorrosionResult = {
  soilCorrosivityLevel: string;
  corrosionRate: number;
  corrosionDepth: number;
  metalLossPercent: number;
  remainingLife: number;
  failurePressure: number;
  failurePressureRatio: number;
  safetyMargin: number;
  recommendation: string;
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
  pipelineId?: string;
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
  wallThicknessDisplayValue?: number;
  wallThicknessUnit?: WallThicknessUnit;
  designLife: number;
  internalCoating: string;
  internalCoatingOther: string;
  waterPh: number;
  temperature: number;
  temperatureInputValue?: number;
  temperatureUnit?: TemperatureUnit;
  dissolvedOxygen: number;
  waterVelocity: number;
  pipelinePressure: number;
  pipelinePressureDisplayValue?: number;
  pipelinePressureUnit?: PressureUnit;
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
  pipelineId?: string;
  pipelineName: string;
  createdAt: string;
  inspectionDate?: string;
  riskLevel: RiskLevel;
  riskScore: number;
  input: ExternalCorrosionInput | InternalCorrosionInput;
  result: ExternalCorrosionResult | InternalCorrosionResult;
};

export type AssessmentPipeDataSummary = {
  id: string;
  assessmentId?: string;
  assessmentType: AssessmentKind;
  pipelineId?: string;
  pipelineName: string;
  pipeId: string;
  locationId: string;
  savedAt: string;
  savedByName: string;
  savedByEmail: string;
  pipelineOutsideDiameter?: number;
  pipelineDiameterUnit?: DiameterUnit;
  input?: ExternalCorrosionInput | InternalCorrosionInput;
};

export type AssessmentPipeDataRecord = AssessmentPipeDataSummary & {
  assessment: StoredAssessment;
};

export type GeoJsonLineString = {
  type: "LineString";
  coordinates: Array<[number, number]>;
};

export type PipelineRecord = {
  chainageOriginMeters?: number;
  chainageOriginName?: string;
  chainageOriginReference?: string;
  chainageDirection?: "INCREASING_DOWNSTREAM" | "INCREASING_UPSTREAM";
  chainageMatchToleranceMeters?: number;
  id: string;
  pipelineCode: string;
  pipelineName: string;
  location?: string;
  serviceOrProduct?: string;
  pipeLocationId?: string;
  pipeMaterial?: string;
  pipeMaterialOther?: string;
  pipeGrade?: string;
  pipeGradeOther?: string;
  pipeAgeYears?: number;
  pipeLengthKm?: number;
  pipeInsideDiameter?: number;
  pipeOutsideDiameter?: number;
  diameterUnit?: DiameterUnit;
  smysMpa?: number;
  maopBar?: number;
  nominalWallThickness?: number;
  wallThicknessInputValue?: number;
  wallThicknessUnit?: WallThicknessUnit;
  designPressure?: number;
  designPressureUnit?: "bar" | "psi" | "MPa";
  coatingType?: "3LPE" | "FBE" | "3LPP" | "Other";
  operatingPressure?: number;
  operatingPressureInputValue?: number;
  operatingPressureUnit?: PressureUnit;
  installationYear?: number;
  inspectionYear?: number;
  installationDate?: string;
  commissioningDate?: string | null;
  designLife?: number;
  routeGeometry?: GeoJsonLineString;
  status: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
  createdByEmail?: string;
};

export type PipelineInput = Omit<
  PipelineRecord,
  "id" | "createdById" | "createdAt" | "updatedAt" | "createdByName" | "createdByEmail" | "routeGeometry"
> & { routeGeometry?: GeoJsonLineString | null };

export type CpCalculationType = "SACP" | "ICCP";

export type CpCalculationRecord = {
  id: string;
  pipelineId: string;
  calculationType: CpCalculationType;
  input: Record<string, string | number | boolean>;
  result: Record<string, string | number | boolean>;
  createdAt: string;
  authorId?: string;
  createdByName?: string;
  createdByEmail?: string;
};

export type CpCalculationInput = Omit<CpCalculationRecord, "id" | "createdAt" | "authorId" | "createdByName" | "createdByEmail">;

export type PipelineHistoryRecord = {
  id: string;
  recordType: "Assessment" | "Report" | "CpCalculation";
  pipelineId: string;
  displayType: string;
  riskLevel?: RiskLevel;
  calculationType?: CpCalculationType;
  createdAt: string;
  createdByName?: string;
  createdByEmail?: string;
  reportId?: string;
  assessmentId?: string;
};

export type PipelineHistory = {
  pipeline: PipelineRecord;
  externalAssessments: StoredAssessment[];
  internalAssessments: StoredAssessment[];
  reports: import("@/lib/apiClient").ReportRecord[];
  cpCalculations: CpCalculationRecord[];
  timeline: PipelineHistoryRecord[];
};

export type AssetMasterSegmentRecord = {
  id: string;
  pipelineId: string;
  segmentId: string;
  name?: string;
  description?: string;
  startKp?: string;
  endKp?: string;
  coatingType?: string;
  cpType?: string;
  terrain?: string;
  status?: "Active" | "Inactive" | "Maintenance" | "Decommissioned" | "Unknown";
  routeGeometry?: GeoJsonLineString;
  createdAt?: string;
  updatedAt?: string;
};

export type AssetMasterAssetRecord = {
  serialNumber?: string;
  condition?: string;
  description?: string;
  pressureRatingBar?: number | null;
  id: string;
  assetId: string;
  assetType: "STATION" | "VALVE" | "TEST_POST" | "RECTIFIER" | "COMPRESSOR" | "SENSOR" | "PUMP" | "METER" | "PIG_LAUNCHER" | "PIG_RECEIVER" | "PIPELINE_FITTING" | "FLANGE" | "INSULATING_JOINT" | "PIPELINE_CROSSING" | "OTHER";
  pipelineId: string;
  segmentId?: string;
  name?: string;
  facilityType?: string;
  equipmentType?: string;
  kp?: string;
  latitude?: number;
  longitude?: number;
  coordinates?: string;
  side?: "LHS" | "RHS";
  installationDate?: string;
  manufacturer?: string;
  model?: string;
  physicalStatus: "Active" | "Inactive" | "Maintenance" | "Decommissioned" | "Unknown";
  parentAssetId?: string;
  createdAt?: string;
  updatedAt?: string;
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
  authorId?: string;
};

/** Read-only relationship resolved from the device registry and saved Asset Master records. */
export type SensorMasterLink = {
  sensorId: string;
  pipelineId: string;
  pipelineCode: string;
  pipelineName: string;
  segmentRecordId: string;
  segmentId: string;
  assetRecordId: string;
  assetId: string;
  assetName?: string;
  kp?: string;
  unit?: string;
  status: DeviceStatus;
  monitoringPoint?: string;
  channel?: string;
  provenance: string;
};

export type DeviceInput = Pick<
  DeviceRecord,
  "deviceId" | "deviceType" | "pipelineOrLocation" | "status" | "latestReadingOrState" | "unit"
>;

export type SensorAssignmentCategory =
  | "Internal Corrosion Sensors"
  | "Internal Process Sensors"
  | "External Corrosion Sensors";

export type SensorAssignmentDataSource = "Manual" | "IoT Gateway" | "API" | "Other";
export type SensorAssignmentStatus = "Active" | "Inactive" | "Fault" | "Maintenance" | "Unassigned";

export type SensorAssignmentRecord = {
  id: string;
  sensorId: string;
  sensorName: string;
  sensorCategory: SensorAssignmentCategory;
  sensorDeviceType: string;
  pipelineOrAsset: string;
  installationLocation: string;
  installationType: string;
  valuesMeasured: string;
  measurementUnit: string;
  installationDate: string;
  dataSource: SensorAssignmentDataSource;
  assignmentStatus: SensorAssignmentStatus;
  notes?: string;
  activeFrom: string;
  activeTo?: string;
  previousAssignmentId?: string;
  createdAt: string;
  updatedAt: string;
  authorId?: string;
  createdByName?: string;
  createdByEmail?: string;
};

export type SensorAssignmentInput = Omit<
  SensorAssignmentRecord,
  "id" | "activeFrom" | "activeTo" | "createdAt" | "updatedAt" | "authorId" | "createdByName" | "createdByEmail"
> & {
  activeTo?: string;
};
