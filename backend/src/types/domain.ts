export type UserRole = "Admin" | "Engineer" | "Viewer";
export type AssessmentKind = "External" | "Internal";
export type RiskLevel = "High" | "Medium" | "Low";
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

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;
};

export type UserRecord = AuthUser & {
  passwordHash: string;
  createdAt: string;
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
  input: Record<string, string | number>;
  result: Record<string, string | number>;
  authorId?: string;
};

export type ReportRecord = {
  id: string;
  assessmentId: string;
  inspectionId?: string;
  assessmentType: AssessmentKind;
  pipelineId?: string;
  pipelineName: string;
  riskLevel: RiskLevel;
  input: Record<string, string | number>;
  result: Record<string, string | number>;
  generatedAt: string;
  createdAt: string;
  authorId?: string;
  createdByName?: string;
  createdByEmail?: string;
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
  pipelineDiameterUnit?: string;
  input?: StoredAssessment["input"];
};

export type AssessmentPipeDataRecord = AssessmentPipeDataSummary & {
  assessment: StoredAssessment;
};

export type PipelineRecord = import("../validation/chainageSettings").ChainageSettings & {
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
  diameterUnit?: string;
  smysMpa?: number;
  maopBar?: number;
  nominalWallThickness?: number;
  wallThicknessInputValue?: number;
  wallThicknessUnit?: "mm" | "in";
  designPressure?: number;
  designPressureUnit?: "bar" | "psi" | "MPa";
  coatingType?: "3LPE" | "FBE" | "3LPP" | "Other";
  operatingPressure?: number;
  operatingPressureInputValue?: number;
  operatingPressureUnit?: string;
  installationYear?: number;
  inspectionYear?: number;
  installationDate?: string;
  designLife?: number;
  routeGeometry?: RouteGeometry;
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
> & { routeGeometry?: RouteGeometry | null };

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
  reports: ReportRecord[];
  cpCalculations: CpCalculationRecord[];
  timeline: PipelineHistoryRecord[];
};

export type AssetType = "STATION" | "VALVE" | "TEST_POST" | "RECTIFIER" | "COMPRESSOR" | "SENSOR" | "PUMP" | "METER" | "PIG_LAUNCHER" | "PIG_RECEIVER" | "PIPELINE_FITTING" | "FLANGE" | "INSULATING_JOINT" | "PIPELINE_CROSSING" | "OTHER";
export type AssetPhysicalStatus = "Active" | "Inactive" | "Maintenance" | "Decommissioned" | "Unknown";
export type AssetSide = "LHS" | "RHS";

export type SegmentRecord = {
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
  routeGeometry?: RouteGeometry;
  createdAt: string;
  updatedAt: string;
};

export type SegmentInput = Omit<SegmentRecord, "id" | "createdAt" | "updatedAt">;

export type RouteGeometry = {
  type: "LineString";
  coordinates: Array<[number, number]>;
};

export type AssetRecord = {
  name?: string;
  facilityType?: string;
  equipmentType?: string;
  id: string;
  assetId: string;
  assetType: AssetType;
  pipelineId: string;
  segmentId?: string;
  kp?: string;
  latitude?: number;
  longitude?: number;
  coordinates?: string;
  side?: AssetSide;
  installationDate?: string;
  manufacturer?: string;
  model?: string;
  physicalStatus: AssetPhysicalStatus;
  parentAssetId?: string;
  createdAt: string;
  updatedAt: string;
};

export type AssetInput = Omit<AssetRecord, "id" | "createdAt" | "updatedAt">;

export type TestPointAssetStatus = "Active" | "Inactive" | "Maintenance";
export type RectifierStatus = "Active" | "Standby" | "Fault" | "Offline" | "Maintenance";

export type CpPotentialReadingSummary = {
  readingId: string;
  readingAt: string;
  valueMv?: number;
  valueV?: number;
  referenceElectrode: string;
  source?: string;
  quality?: string;
};

export type CpTestPointLatestReadings = {
  onPotential?: CpPotentialReadingSummary;
  offPotential?: CpPotentialReadingSummary;
  lastReadingAt?: string;
};

export type CpTestPointRecord = {
  id: string;
  pipelineId: string;
  assetMasterId: string;
  code: string;
  name?: string;
  location?: string;
  kp?: string;
  assetStatus: TestPointAssetStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  asset?: AssetRecord;
  latestReadings?: CpTestPointLatestReadings;
};

export type CpTestPointInput = {
  pipelineId: string;
  assetMasterId: string;
  name?: string;
  assetStatus?: TestPointAssetStatus;
  notes?: string;
};

export type CpTestPointUpdateInput = {
  name?: string;
  assetStatus?: TestPointAssetStatus;
  notes?: string;
};

export type CpRectifierRecord = {
  id: string;
  pipelineId: string;
  assetMasterId: string;
  rectifierCode: string;
  name?: string;
  location?: string;
  kp?: string;
  status: RectifierStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  asset?: AssetRecord;
};

export type CpRectifierInput = {
  pipelineId: string;
  assetMasterId: string;
  name?: string;
  status?: RectifierStatus;
  notes?: string;
};

export type CpRectifierUpdateInput = {
  name?: string;
  status?: RectifierStatus;
  notes?: string;
};

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

export type JwtClaims = {
  sub: string;
  email: string;
  role: UserRole;
};
