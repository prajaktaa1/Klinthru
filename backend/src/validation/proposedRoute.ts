import { z } from "zod";

const coordinate = z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)]);
const geometry = z.object({ type: z.literal("LineString"), coordinates: z.array(coordinate).min(3, "Surveyed route must contain intermediate points") }).strict().refine(v => v.coordinates.some(p => p[0] !== v.coordinates[0][0] || p[1] !== v.coordinates[0][1]), "Route must contain distinct positions");

export const proposedRouteInput = z.object({
  geometry,
  provenance: z.string().trim().min(3).max(120),
  sourceMetadata: z.record(z.string(), z.unknown()).optional()
}).strict();

export const proposedRouteSubmission = proposedRouteInput.extend({
  evidence: z.array(z.object({ documentId: z.string().trim().min(1), documentVersionId: z.string().trim().min(1) }).strict()).min(1).max(20)
}).strict();

export const proposedRouteReview = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().min(3).max(2000)
}).strict();

export type ProposedRouteWorkflow = {
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  submittedById?: string;
  submittedAt?: string;
  reviewedById?: string;
  reviewedAt?: string;
  reviewReason?: string;
  evidence: Array<{ documentId: string; documentVersionId: string }>;
  calibration: { routeLengthMeters: number; configuredLengthMeters: number; toleranceMeters: number };
};
