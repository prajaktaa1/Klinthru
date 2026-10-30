import { z } from "zod";
import { assertNoDangerousKeys, createValidationError, createValidationErrorFromZod } from "../validation/validationErrors";

export const manualModules = ["Data Mapping", "Validation Rules", "Processing Logs", "Data Quality", "Scheduler", "Notifications"] as const;
export type ManualModule = typeof manualModules[number];
const statuses: Record<ManualModule, readonly string[]> = {
  "Data Mapping": ["Active", "Inactive"],
  "Validation Rules": ["Active", "Inactive"],
  "Processing Logs": ["Success", "Failed", "Warning", "Pending"],
  "Data Quality": ["Open", "In Progress", "Resolved"],
  "Scheduler": ["Active", "Paused", "Failed"],
  "Notifications": ["Unacknowledged", "Acknowledged"]
};

const scalar = z.union([z.string().max(2000), z.number().finite(), z.boolean(), z.null()]);
const schema = z.object({
  module: z.enum(manualModules),
  name: z.string().trim().min(1).max(120),
  status: z.string().trim().min(1).max(40),
  connectorId: z.string().trim().min(1).max(100).nullable().optional(),
  details: z.record(z.string().max(80), scalar).default({})
}).strict();

export function validateManualRecord(body: unknown) {
  assertNoDangerousKeys(body);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw createValidationErrorFromZod(parsed.error);
  if (Object.keys(parsed.data.details).length > 35 || JSON.stringify(parsed.data.details).length > 16_000) {
    throw createValidationError({ details: "Record details are too large." });
  }
  if (!statuses[parsed.data.module].includes(parsed.data.status)) {
    throw createValidationError({ status: "Status is invalid for this module." });
  }
  if (Object.keys(parsed.data.details).some(key => /password|secret|token|credential|api[-_]?key|authorization/i.test(key))) {
    throw createValidationError({ details: "Credentials must not be stored in manual records." });
  }
  return parsed.data;
}
