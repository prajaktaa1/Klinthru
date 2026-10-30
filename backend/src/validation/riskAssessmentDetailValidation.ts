import { z } from "zod";
const id = z.string().trim().min(1).max(200);
export const assessmentDetailOptionsScope = z.object({ pipelineId: id.optional(), methodologyVersionId: id.optional() }).strict();
export const assessmentDetailScope = assessmentDetailOptionsScope.extend({ riskId: id, revisionId: id }).strict();
// Read projections only: absent/malformed saved JSON stays unavailable. No defaults are persisted.
const text = z.string().min(1).nullable().optional();
export const detailScopeSnapshot = z.object({ title: text, scenario: text, threatType: text, initiatingEvent: text, location: text, assetType: text, ownerId: text }).passthrough();
export const detailNarrativeSchema = z.object({ justification: text, basis: text, method: text, confidence: text, value: z.number().finite().nullable().optional(), unit: text }).passthrough();
export const detailControlsSchema = z.array(z.object({ id: text, name: text, type: text, effectiveness: text, ownerId: text, evidenceReferences: z.array(z.string().min(1)).nullable().optional() }).passthrough().refine(row => row.id || row.name, "Saved control identity/name required"));
export const detailTextSchema = z.union([z.string(), z.array(z.string())]);
export const detailDictionarySchema = z.array(z.object({ level: z.number().int().min(1).max(5), label: z.string().min(1) }).strict()).length(5).refine(rows => new Set(rows.map(row => row.level)).size === 5);
export const detailSourceMetadataSchema = z.object({ canonicalId: id, displayId: id, title: z.string().min(1), location: z.string().nullable(), status: z.string().nullable(), date: z.string().datetime().nullable(), dateLabel: z.string(), updatedAt: z.string().datetime().nullable(), result: z.string().nullable(), version: z.string().nullable() });
