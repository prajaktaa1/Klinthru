import { z } from "zod";
import { parseChainage } from "../coreEngine/chainage/ChainageAgent";

// Explicit metre fields use the shared parser, never the legacy KP kilometre default.
const meters = z.number().finite().refine(value => {
  try { parseChainage(value, { allowNegative: true }); return true; } catch { return false; }
}, "Must be a safely representable distance in metres").nullable().optional();
const text = (max = 200) => z.string().trim().max(max).nullable().optional();
export const chainageSettingsShape = {
  chainageOriginMeters: meters,
  chainageOriginName: text(), chainageOriginDescription: text(4000), chainageOriginReference: text(),
  chainageOriginLatitude: z.number().finite().min(-90).max(90).nullable().optional(),
  chainageOriginLongitude: z.number().finite().min(-180).max(180).nullable().optional(),
  chainageDirection: z.enum(["INCREASING_DOWNSTREAM", "INCREASING_UPSTREAM"]).nullable().optional(),
  chainagePrecision: z.number().int().min(0).max(9).nullable().optional(),
  allowNegativeChainage: z.boolean().nullable().optional(),
  chainageMatchToleranceMeters: meters.refine(value => value == null || value >= 0, "Must be non-negative"),
  chainageBoundaryPolicy: z.enum(["REJECT", "WARN"]).nullable().optional(),
  parentPipelineId: z.string().trim().min(1).max(120).nullable().optional(),
  parentTieInChainageMeters: meters,
  chainageCalibration: z.record(z.string(), z.json()).nullable().optional(),
  chainageCoordinateSystem: text()
};
export type ChainageSettings = z.infer<z.ZodObject<typeof chainageSettingsShape>>;
