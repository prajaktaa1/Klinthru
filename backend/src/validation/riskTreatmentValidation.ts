import { z } from "zod";
import { riskMatrixSchema, riskResultSchema } from "./riskAssessmentValidation";
import type { TreatmentRecord, TreatmentRevisionRecord } from "../types/riskTreatment";

export const treatmentScopeSchema = z.object({ pipelineId: z.string().trim().min(1).max(120).optional(), methodologyVersionId: z.string().trim().min(1).max(120).optional(), riskId: z.string().trim().min(1).max(120).optional(),
  q: z.string().trim().max(200).optional(), status: z.string().trim().max(120).optional(), riskLevel: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(10), basis: z.enum(["proposed", "approved", "verified"]).optional()
}).strict();
export const treatmentDetailQuerySchema = z.object({ revisionId: z.string().trim().min(1).max(120).optional() }).strict();
export const centralActionSchema = z.object({ actionId: z.string().min(1), title: z.string().min(1), status: z.string().min(1), ownerId: z.string().nullable(), ownerName: z.string().nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const date = new Date(`${value}T00:00:00Z`); return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value; }).nullable(),
  overdue: z.boolean().nullable(), costAmount: z.string().regex(/^\d+(\.\d+)?$/).nullable(), currency: z.string().regex(/^[A-Z]{3}$/).nullable(), asOf: z.string().datetime()
}).strict();

export function validateTreatmentBaseline(record: TreatmentRecord, revision: TreatmentRevisionRecord) {
  const base = revision.baselineRevision;
  if (record.risk.id !== record.riskRecordId || revision.treatmentId !== record.id || revision.riskRecordId !== record.riskRecordId || base.id !== revision.baselineRevisionId || base.riskRecordId !== record.riskRecordId) throw new Error("Treatment/base risk scope mismatch.");
  if (base.approvalStatus !== "Approved" || !base.approvedAt || base.methodologyVersion.approvalStatus !== "Approved" || base.methodologyVersion.matrixVersion.approvalStatus !== "Approved" || base.methodologyVersion.matrixVersion.id !== base.matrixVersionId) throw new Error("Approved baseline/matrix required.");
  const cells = riskMatrixSchema.parse(base.methodologyVersion.matrixVersion.cells);
  const classify = (value: unknown) => {
    const result = riskResultSchema.parse(value);
    if (!cells.some(cell => cell.likelihood === result.likelihood && cell.consequence === result.consequence && cell.level === result.level)) throw new Error("Result/matrix mismatch.");
    return result;
  };
  return { inherent: classify(base.inherentResult), current: classify(base.currentResult), proposed: revision.proposedResidualResult == null ? null : classify(revision.proposedResidualResult) };
}
