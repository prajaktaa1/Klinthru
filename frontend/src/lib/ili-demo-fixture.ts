export type IliDemoAnomalyStatus = "Repair" | "Monitor" | "Safe";

export type IliDemoAnomaly = {
  id: string;
  kpKm: number;
  type: string;
  depthPercent: number;
  depthMm: number;
  lengthMm: number;
  widthMm: number;
  clockPosition: string;
  orientation: "Internal" | "External";
  rsf: number;
  failurePressureBar: number;
  status: IliDemoAnomalyStatus;
  growthRateMmYear: number;
};

export const iliDemoRun = {
  runReference: "DEMO-ILI-2026-01",
  toolType: "MFL / Caliper Combo",
  vendor: "Demo Inspection Vendor",
  inspectionDate: "2026-08-18",
  assessmentStandard: "Demo B31G-style workflow preview"
};

export const iliDemoPipeline = {
  outsideDiameter: "24 in",
  wallThickness: "0.500 in",
  grade: "X65",
  smys: "448 MPa",
  maop: "103 bar"
};

export const iliDemoAnomalies: IliDemoAnomaly[] = [
  { id: "F-001", kpKm: 4.2, type: "Metal Loss", depthPercent: 18, depthMm: 2.3, lengthMm: 42, widthMm: 18, clockPosition: "03:00", orientation: "External", rsf: 0.94, failurePressureBar: 142, status: "Safe", growthRateMmYear: 0.08 },
  { id: "F-002", kpKm: 9.8, type: "Metal Loss", depthPercent: 31, depthMm: 3.9, lengthMm: 78, widthMm: 26, clockPosition: "06:00", orientation: "External", rsf: 0.86, failurePressureBar: 124, status: "Monitor", growthRateMmYear: 0.16 },
  { id: "F-003", kpKm: 16.4, type: "Pitting", depthPercent: 22, depthMm: 2.8, lengthMm: 35, widthMm: 16, clockPosition: "09:00", orientation: "Internal", rsf: 0.9, failurePressureBar: 133, status: "Safe", growthRateMmYear: 0.11 },
  { id: "F-004", kpKm: 21.7, type: "Metal Loss", depthPercent: 47, depthMm: 6, lengthMm: 118, widthMm: 34, clockPosition: "12:00", orientation: "External", rsf: 0.72, failurePressureBar: 104, status: "Monitor", growthRateMmYear: 0.24 },
  { id: "F-005", kpKm: 29.3, type: "Metal Loss", depthPercent: 63, depthMm: 8, lengthMm: 164, widthMm: 41, clockPosition: "05:30", orientation: "External", rsf: 0.58, failurePressureBar: 84, status: "Repair", growthRateMmYear: 0.38 },
  { id: "F-006", kpKm: 35.6, type: "Dent + Metal Loss", depthPercent: 54, depthMm: 6.9, lengthMm: 132, widthMm: 38, clockPosition: "07:30", orientation: "External", rsf: 0.66, failurePressureBar: 95, status: "Repair", growthRateMmYear: 0.29 },
  { id: "F-007", kpKm: 42.9, type: "Metal Loss", depthPercent: 28, depthMm: 3.6, lengthMm: 62, widthMm: 22, clockPosition: "10:00", orientation: "Internal", rsf: 0.88, failurePressureBar: 128, status: "Monitor", growthRateMmYear: 0.13 },
  { id: "F-008", kpKm: 55.1, type: "Lamination", depthPercent: 12, depthMm: 1.5, lengthMm: 88, widthMm: 30, clockPosition: "02:00", orientation: "External", rsf: 0.97, failurePressureBar: 151, status: "Safe", growthRateMmYear: 0.04 }
];
