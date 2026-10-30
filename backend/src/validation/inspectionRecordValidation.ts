import { z } from "zod";
import { assertNoDangerousKeys, createValidationErrorFromZod } from "./validationErrors";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").refine((value) => {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Enter a valid date");
const schema = z.object({
  pipelineId: z.string().trim().min(1).max(200),
  reference: z.string().trim().min(1, "Record reference is required").max(200),
  type: z.enum(["Visual Inspection", "ILI", "ECDA", "CP Survey", "UT Inspection", "Other"]),
  date,
  segmentId: z.string().trim().max(200).optional().default(""),
  vendor: z.string().trim().max(200).optional().default(""),
  findings: z.string().trim().max(5000).optional().default(""),
  status: z.enum(["Planned", "In Progress", "Completed", "Cancelled"]),
  nextDue: z.union([date, z.literal("")]).optional().default(""),
  risk: z.enum(["", "Low", "Medium", "High"]).optional().default("")
}).strict().refine((input) => !input.nextDue || input.nextDue >= input.date, {
  path: ["nextDue"], message: "Next due date must be on or after the inspection date"
});

export function validateInspectionRecord(input: unknown) {
  assertNoDangerousKeys(input);
  const result = schema.safeParse(input);
  if (!result.success) throw createValidationErrorFromZod(result.error);
  return result.data;
}
