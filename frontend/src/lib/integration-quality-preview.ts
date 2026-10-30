export type QualityPeriod = "Last 24 Hours" | "Last 7 Days" | "Last 30 Days";
export type QualityStatus = "Open" | "In Progress" | "Resolved";
export type QualityIssue = { id: number; type: string; description: string; pipeline: string; domain: string; source: string; records: number; percent: string; trend: number[]; color: string };
export type QualityAction = { id: number; cause: string; recommendation: string; status: QualityStatus; owner: string; note: string };
export const qualityIssues: QualityIssue[] = [
  { id: 1, type: "Missing Value", description: "Missing pressure reading", pipeline: "North Ridge", domain: "SCADA / Operations", source: "SCADA OPC", records: 4821, percent: "0.40%", trend: [6, 10, 8, 9, 6, 8, 7, 9], color: "#fb7185" },
  { id: 2, type: "Invalid Format", description: "Date format mismatch (DD/MM/YYYY)", pipeline: "All Pipelines", domain: "External Data", source: "Laboratory (LIMS)", records: 3412, percent: "0.28%", trend: [4, 3, 6, 5, 8, 6, 7, 5], color: "#fb7185" },
  { id: 3, type: "Duplicate Record", description: "Duplicate ILI run record", pipeline: "East Fields", domain: "Integrity Assessment", source: "GIS System", records: 3198, percent: "0.26%", trend: [4, 7, 8, 5, 6, 4, 5, 7], color: "#f59e0b" },
  { id: 4, type: "Out of Range", description: "Pipe wall thickness < 0 or > 150 mm", pipeline: "Central Trunk", domain: "Integrity Assessment", source: "Manual Upload", records: 2145, percent: "0.18%", trend: [4, 7, 9, 7, 5, 6, 4, 7], color: "#22c55e" },
  { id: 5, type: "Missing Value", description: "Missing coating type", pipeline: "West Sector", domain: "Pipeline / Asset", source: "Asset Register", records: 1987, percent: "0.16%", trend: [3, 6, 4, 8, 9, 8, 5, 4], color: "#f59e0b" }
];
export const qualityActions: QualityAction[] = [
  { id: 1, cause: "Source field not populated", recommendation: "Update source mapping and backfill data", status: "In Progress", owner: "Integration Team", note: "" },
  { id: 2, cause: "Date format inconsistency", recommendation: "Apply transformation rule (DD/MM/YYYY)", status: "Open", owner: "Integration Team", note: "" },
  { id: 3, cause: "Multiple source feeds", recommendation: "Enable deduplication rule on source key", status: "In Progress", owner: "Integration Team", note: "" },
  { id: 4, cause: "Sensor calibration issue", recommendation: "Validate sensor data and apply thresholds", status: "Open", owner: "Integration Team", note: "" },
  { id: 5, cause: "Optional field in source", recommendation: "Set default value or mark as nullable", status: "Resolved", owner: "Integration Team", note: "" }
];
export const qualityFreshness = [
  { domain: "Pipeline / Asset", value: 99.6 }, { domain: "Integrity Assessment", value: 98.9 },
  { domain: "Cathodic Protection", value: 97.8 }, { domain: "SCADA / Operations", value: 99.1 },
  { domain: "External Data", value: 96.4 }, { domain: "Documents", value: 98.7 }
];
export const qualityMetrics = [
  { name: "Validity", values: [98.7, 98.4, 98.1], delta: "+0.3%", description: "Valid format & business rules", calculation: "Records that pass format and business-rule validation.", points: [22, 20, 24, 26, 25, 23, 26, 28, 27, 30, 28, 26, 29, 33, 33, 32] },
  { name: "Completeness", values: [97.9, 97.4, 97.0], delta: "+0.5%", description: "Required fields populated", calculation: "Required field values populated across assessed records.", points: [18, 17, 22, 21, 25, 24, 21, 24, 27, 29, 26, 24, 27, 31, 32, 34] },
  { name: "Duplicate Rate", values: [.3, .4, .5], delta: "-0.1%", description: "Duplicate records detected", calculation: "Duplicate records divided by assessed records.", points: [18, 17, 20, 19, 22, 24, 23, 27, 22, 20, 23, 24, 26, 23, 21, 23] },
  { name: "Freshness", values: [99.1, 98.9, 98.6], delta: "+0.2%", description: "Up-to-date records", calculation: "Records received within the sample freshness window.", points: [20, 19, 23, 22, 25, 25, 23, 21, 24, 26, 25, 28, 26, 25, 28, 31] },
  { name: "Rejected Records", values: [1.2, 1.3, 1.5], delta: "-0.4%", description: "Failed validation checks", calculation: "Rejected records divided by assessed records.", points: [29, 24, 29, 22, 25, 22, 20, 23, 22, 26, 25, 24, 28, 32, 32, 33] }
];
export function qualitySnapshot(period: QualityPeriod) {
  const index = period === "Last 24 Hours" ? 0 : period === "Last 7 Days" ? 1 : 2;
  const counts = [[1180432, 14221, 3542, 1805], [8251320, 102360, 28392, 17928], [35316000, 432000, 144000, 108000]][index];
  const percentages = index === 0 ? [98.4, 1.2, .3, .1] : counts.map(value => value / counts.reduce((sum, count) => sum + count, 0) * 100);
  return { percentages, index, multiplier: [1, 7, 30][index], total: counts.reduce((sum, value) => sum + value, 0), counts, overall: counts[0] / counts.reduce((sum, value) => sum + value, 0) * 100 };
}
