import { z } from "zod";

const level = z.number().int().min(1).max(5);
export const riskResultSchema = z.object({ likelihood: level, consequence: level, score: z.number().int().min(1).max(25), level: z.string().trim().min(1) }).strict()
  .refine(value => value.score === value.likelihood * value.consequence, "Score must equal likelihood × consequence");
export const riskMatrixSchema = z.array(z.object({ likelihood: level, consequence: level, level: z.string().trim().min(1) }).strict()).length(25)
  .refine(cells => new Set(cells.map(cell => `${cell.likelihood}:${cell.consequence}`)).size === 25, "A 5×5 matrix requires 25 distinct coordinates");
const names = z.array(z.string().trim().min(1)).min(1).refine(values => new Set(values).size === values.length, "Duplicate dictionary entries");
export const riskPolicySchema = z.object({
  activeStatuses: names,
  highLevels: names,
  mediumLevels: names,
  lowLevels: names,
  categoryKeys: names,
  sourceCategories: names,
  calendarTimeZone: z.string().refine(value => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }, "Approved IANA timezone required"),
  sourceCounting: z.literal("primary-source-per-risk"),
  // Initial UI shows counts only: a percentage policy is deliberately not invented.
  percentageRounding: z.literal("counts-only"),
  reviewSelection: z.literal("earliest-open-current-revision"),
  missingReview: z.literal("unavailable")
}).strict().refine(policy => {
  const levels = [...policy.highLevels, ...policy.mediumLevels, ...policy.lowLevels];
  return new Set(levels).size === levels.length;
}, "Risk-level KPI groups must not overlap");

export const riskScopeSchema = z.object({ pipelineId: z.string().trim().min(1).max(120).optional(), methodologyVersionId: z.string().trim().min(1).max(120).optional() }).strict();

export const riskSourceSnapshotSchema = z.array(z.object({
  sourceLinkId: z.string().min(1), sourceModule: z.string().min(1), sourceRecordType: z.string().min(1), sourceRecordId: z.string().min(1),
  sourceVersion: z.string().min(1).nullable(), capturedAt: z.string().datetime(), inputs: z.record(z.string(), z.unknown()), contentHash: z.string().min(1)
}).strict()).min(1);
export const riskScopeSnapshotSchema = z.object({ title: z.string().trim().min(1) }).passthrough();

/** No draft edits are permitted once a revision has left Draft. */
export function assertDraftEditable(revision: { approvalStatus: string; approvedAt: Date | null }) {
  if (revision.approvalStatus !== "Draft" || revision.approvedAt !== null) throw new Error("Approved/submitted revisions are immutable; create a reassessment.");
}

export const riskApprovalDecisions = [
  "Risk_ID format and allocation", "Scenario correlation and KP tolerance", "Approval roles and separation of duties",
  "Approved methodology, matrix and dictionaries", "Active status and KPI level groups", "Review calendar and urgency rules",
  "Primary-source counting policy", "Percentage rounding and comparison baselines", "Source confidence and data sufficiency rules",
  "Database constraints, immutability guards and deployment"
];
