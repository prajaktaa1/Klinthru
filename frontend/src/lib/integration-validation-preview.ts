export const validationGroups = ["General Data Quality", "Asset & Location", "Measurement & Readings", "Document & Files", "Reference & Lookup", "Business Rules"];
export type ValidationRule = {
  id: string;
  title: string;
  description: string;
  group: string;
  domain: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  active: boolean;
  passRate: number;
  kind: "asset" | "segment" | "range" | "coordinates" | "file" | "unique" | "required" | "lookup" | "text";
  field: string;
  min: number;
  max: number;
  unit: string;
  requiredFields: string[];
  allowedValues: string[];
  logic: string;
  expected: string;
  failureAction: string;
  modified: string;
};
type Seed = [string, string, string, ValidationRule["severity"], number, ValidationRule["kind"], string];
export function createValidationPreviewRules(): ValidationRule[] {
  const rows: Seed[] = [
    ["Asset ID must exist in master data", "Asset & Location", "Assets", "Critical", 99.6, "asset", "asset_id"],
    ["Valid data range for measurement data", "Measurement & Readings", "Measurement", "High", 98.1, "range", "measurement"],
    ["Pressure value within operational limits", "Measurement & Readings", "Measurement", "High", 97.4, "range", "pressure"],
    ["Coordinate format is valid (WGS84)", "Asset & Location", "Location", "Medium", 99.2, "coordinates", "latitude"],
    ["File type and size validation", "Document & Files", "Document", "Medium", 0, "file", "file_name"],
    ["Check for duplicate records", "General Data Quality", "General", "Low", 99.8, "unique", "record_id"],
    ["Required fields are not null", "General Data Quality", "All Domains", "Critical", 98.9, "required", "asset_id"],
    ["Unit of measure is valid", "Reference & Lookup", "Measurement", "Medium", 99.1, "lookup", "unit"],
    ["Text field length within limits", "General Data Quality", "General", "Low", 99.7, "text", "description"],
    ["Pipeline segment must exist", "Asset & Location", "Assets", "High", 97.9, "segment", "segment_id"],
    ["Timestamp must be populated", "General Data Quality", "General", "High", 99.4, "required", "timestamp"],
    ["Source system identifier is required", "General Data Quality", "General", "Medium", 99.5, "required", "source_system"],
    ["Record identifier must be populated", "General Data Quality", "General", "High", 99.6, "required", "record_id"],
    ["Asset location must be populated", "Asset & Location", "Location", "Medium", 99.0, "required", "location"],
    ["Chainage is within pipeline extent", "Asset & Location", "Assets", "High", 98.8, "range", "chainage"],
    ["Temperature is within sensor range", "Measurement & Readings", "Measurement", "High", 98.7, "range", "temperature"],
    ["Flow rate must be non-negative", "Measurement & Readings", "Measurement", "Medium", 99.2, "range", "flow_rate"],
    ["Wall thickness must be positive", "Measurement & Readings", "Inspection", "Critical", 99.1, "range", "wall_thickness"],
    ["Corrosion rate is within expected range", "Measurement & Readings", "Inspection", "High", 98.6, "range", "corrosion_rate"],
    ["Document identifier is required", "Document & Files", "Document", "Medium", 99.5, "required", "document_id"],
    ["Document revision must be populated", "Document & Files", "Document", "Low", 99.3, "required", "revision"],
    ["Document title length is valid", "Document & Files", "Document", "Low", 99.7, "text", "document_title"],
    ["Material code exists in catalogue", "Reference & Lookup", "Assets", "High", 99.0, "lookup", "material"],
    ["Inspection type exists in catalogue", "Reference & Lookup", "Inspection", "Medium", 99.4, "lookup", "inspection_type"],
    ["Operational status is recognized", "Reference & Lookup", "Assets", "Medium", 99.6, "lookup", "operational_status"],
    ["Work order priority is recognized", "Business Rules", "Maintenance", "High", 99.1, "lookup", "priority"],
    ["Inspection owner must be assigned", "Business Rules", "Inspection", "Medium", 99.2, "required", "owner"],
    ["Risk category is recognized", "Business Rules", "Risk", "High", 98.9, "lookup", "risk_category"]
  ];
  return rows.map(([title, group, domain, severity, passRate, kind, field], index) => {
    const min = field === "temperature" ? -50 : field === "wall_thickness" ? .1 : 0;
    const max = kind === "text" ? 255 : kind === "file" ? 10_485_760 : field === "chainage" ? 500 : 100;
    const allowed: Record<string, string[]> = { unit: ["bar", "kPa", "°C", "m³/h"], material: ["Carbon Steel", "Stainless Steel"], inspection_type: ["ILI", "UT", "ECDA"], operational_status: ["Active", "Inactive", "Maintenance"], priority: ["Low", "Medium", "High", "Critical"], risk_category: ["Low", "Medium", "High"] };
    const allowedValues = allowed[field] ?? [];
    const requiredFields = index === 6 ? ["asset_id", "timestamp"] : [field];
    return {
      id: `VAL-${String(index + 1).padStart(3, "0")}`, title, group, domain, severity, passRate, kind, field, min, max, allowedValues, requiredFields,
      active: index !== 4, unit: field === "pressure" ? "bar" : field === "temperature" ? "°C" : field === "wall_thickness" ? "mm" : "",
      description: index === 0 ? "Validates that the incoming asset ID exists in KLINTHRU asset master. Rejects records with unknown or inactive asset IDs." : `Validates incoming ${field.replaceAll("_", " ")} data before routing records to ${domain.toLowerCase()} modules.`,
      logic: index === 0 ? "IF asset_id IS NULL\n    THEN Fail\nELSE IF asset_id NOT IN (SELECT id FROM asset_master\n    WHERE status = 'Active')\n    THEN Fail\nELSE Pass" : kind === "range" ? `IF ${field} IS NULL\n    THEN Fail\nELSE IF ${field} < ${min} OR ${field} > ${max}\n    THEN Fail\nELSE Pass` : kind === "lookup" ? `IF ${field} IN approved_catalogue\n    THEN Pass\nELSE Fail` : `CHECK ${title}\nIF condition satisfied THEN Pass\nELSE Fail`,
      expected: index === 0 ? "Record passes when asset ID exists and is active in the master data." : `Record passes when ${title.charAt(0).toLowerCase() + title.slice(1)}.`,
      failureAction: "Reject", modified: "03 Oct 2024, 14:18"
    };
  });
}

export function evaluateValidationSample(rule: ValidationRule, record: Record<string, unknown>): { pass: boolean; reason: string } {
  const missing = rule.requiredFields.filter(field => record[field] === undefined || record[field] === null || record[field] === "");
  if (missing.length) return { pass: false, reason: `Missing required field: ${missing.join(", ")}` };
  const value = record[rule.field];
  let pass = true, reason = "Required values are populated.";
  if (rule.kind === "asset" || rule.kind === "segment") {
    pass = (rule.kind === "asset" ? ["PIPE-001", "PIPE-002"] : ["SEG-001", "SEG-002"]).includes(String(value));
    reason = pass ? "Found in the active sample master data." : "Value is unknown or inactive in the sample master data.";
  } else if (rule.kind === "range") {
    pass = typeof value === "number" && Number.isFinite(value) && value >= rule.min && value <= rule.max;
    reason = `Expected a number between ${rule.min} and ${rule.max}${rule.unit ? ` ${rule.unit}` : ""}.`;
  } else if (rule.kind === "coordinates") {
    pass = typeof record.latitude === "number" && typeof record.longitude === "number" && Number.isFinite(record.latitude) && Number.isFinite(record.longitude) && Math.abs(record.latitude) <= 90 && Math.abs(record.longitude) <= 180;
    reason = "WGS84 requires latitude −90 to 90 and longitude −180 to 180.";
  } else if (rule.kind === "file") {
    pass = /\.(csv|xlsx|json)$/i.test(String(value)) && typeof record.file_size === "number" && record.file_size > 0 && record.file_size <= rule.max;
    reason = `Allowed files: CSV, XLSX, JSON; maximum ${rule.max.toLocaleString("en-US")} bytes.`;
  } else if (rule.kind === "unique") {
    pass = String(value) !== "DUP-001" && record.is_duplicate !== true;
    reason = pass ? "Record does not match a sample duplicate." : "Duplicate record detected.";
  } else if (rule.kind === "lookup") {
    pass = rule.allowedValues.includes(String(value)); reason = `Allowed values: ${rule.allowedValues.join(", ")}.`;
  } else if (rule.kind === "text") {
    pass = typeof value === "string" && value.length >= rule.min && value.length <= rule.max;
    reason = `Expected text between ${rule.min} and ${rule.max} characters.`;
  }
  return { pass, reason };
}

export function validationSamples(rule: ValidationRule): Record<string, unknown>[] {
  const base: Record<string, unknown> = Object.fromEntries(rule.requiredFields.map(field => [field, field === "timestamp" ? "2026-10-06T14:25:00Z" : "Sample value"]));
  base[rule.field] = rule.kind === "asset" ? "PIPE-001" : rule.kind === "segment" ? "SEG-001" : rule.kind === "range" ? (rule.min + rule.max) / 2 : rule.kind === "lookup" ? rule.allowedValues[0] ?? "" : rule.kind === "file" ? "inspection.csv" : "Sample value";
  if (rule.kind === "coordinates") { base.latitude = 19.076; base.longitude = 72.8777; }
  if (rule.kind === "file") base.file_size = 1024;
  const invalid = { ...base, [rule.field]: rule.kind === "range" ? rule.max + 1 : rule.kind === "text" ? "x".repeat(rule.max + 1) : rule.kind === "unique" ? "DUP-001" : rule.kind === "coordinates" ? 200 : "UNKNOWN" };
  if (rule.kind === "required") invalid[rule.field] = "";
  return [base, invalid, { ...base, [rule.requiredFields[0] ?? rule.field]: null }];
}

export const topFailedValidationRules = [
  { id: "VAL-003", failures: 6842, rate: 2.6 }, { id: "VAL-002", failures: 3421, rate: 1.9 },
  { id: "VAL-010", failures: 1985, rate: 1.1 }, { id: "VAL-007", failures: 1124, rate: .8 }, { id: "VAL-004", failures: 849, rate: .5 }
];
