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
};

export type UserRecord = AuthUser & {
  passwordHash: string;
  createdAt: string;
};

export type StoredAssessment = {
  id: string;
  type: AssessmentKind;
  pipelineName: string;
  createdAt: string;
  riskLevel: RiskLevel;
  riskScore: number;
  input: Record<string, string | number>;
  result: Record<string, string | number>;
  authorId?: string;
};

export type ReportRecord = {
  id: string;
  assessmentId: string;
  assessmentType: AssessmentKind;
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

export type JwtClaims = {
  sub: string;
  email: string;
  role: UserRole;
};
