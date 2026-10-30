import { parseKp } from "../coreEngine/chainage/ChainageAgent";
import { z } from "zod";

import { AssetPhysicalStatus, AssetSide, AssetType } from "../types/domain";
import { createValidationErrorFromZod } from "./validationErrors";
import { alignmentReadiness } from "../coreEngine/chainage/ChainageAgent";
import { routeGeometrySchema } from "./routeGeometry";

const MAX_IDENTIFIER_LENGTH = 120;
const MAX_TEXT_LENGTH = 500;
const assetTypes = ["STATION", "VALVE", "TEST_POST", "RECTIFIER", "COMPRESSOR", "SENSOR", "PUMP", "METER", "PIG_LAUNCHER", "PIG_RECEIVER", "PIPELINE_FITTING", "FLANGE", "INSULATING_JOINT", "PIPELINE_CROSSING", "OTHER"] as const;
const physicalStatuses = ["Active", "Inactive", "Maintenance", "Decommissioned", "Unknown"] as const;
const assetSides = ["LHS", "RHS"] as const;

const optionalTrimmedString = (maxLength = MAX_TEXT_LENGTH) =>
  z.string().trim().max(maxLength, `Must be ${maxLength} characters or fewer`).optional();

const optionalKp = optionalTrimmedString(MAX_IDENTIFIER_LENGTH).transform((value, ctx) => {
  if (!value) return value;
  try { return String(parseKp(value).kilometers); }
  catch (error) { ctx.addIssue({ code: "custom", message: (error as Error).message }); return z.NEVER; }
});

const requiredTrimmedString = (maxLength: number, message: string) =>
  z.string().trim().min(1, message).max(maxLength, `Must be ${maxLength} characters or fewer`);

const optionalCoordinate = (min: number, max: number, label: string) =>
  z.number().refine((value) => Number.isFinite(value) && value >= min && value <= max, {
    message: `${label} must be between ${min} and ${max}`
  }).optional();

const optionalDateOnly = z
  .string()
  .trim()
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Must be a valid date in YYYY-MM-DD format"
  })
  .refine((value) => !value || !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), {
    message: "Must be a valid date in YYYY-MM-DD format"
  })
  .optional();

const optionalNullableEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .enum(values)
    .nullable()
    .optional()
    .transform((value) => value ?? undefined);

export const segmentSchema = z
  .object({
    pipelineId: requiredTrimmedString(MAX_IDENTIFIER_LENGTH, "Pipeline ID is required"),
    segmentId: requiredTrimmedString(MAX_IDENTIFIER_LENGTH, "Segment ID is required"),
    name: optionalTrimmedString(),
    description: optionalTrimmedString(1000),
    startKp: optionalKp,
    endKp: optionalKp,
    coatingType: optionalTrimmedString(MAX_IDENTIFIER_LENGTH),
    cpType: optionalTrimmedString(MAX_IDENTIFIER_LENGTH),
    terrain: optionalTrimmedString(MAX_IDENTIFIER_LENGTH),
    status: z.enum(physicalStatuses).optional(),
    routeGeometry: routeGeometrySchema.optional()
  })
  .strict().superRefine((segment, ctx) => {
    if (!segment.routeGeometry) return;
    if (!segment.startKp || !segment.endKp) { ctx.addIssue({code:"custom",path:["routeGeometry"],message:"From/To KP are required to validate the surveyed segment distance."}); return; }
    const length = parseKp(segment.endKp).meters - parseKp(segment.startKp).meters;
    if (length <= 0 || !alignmentReadiness(segment.routeGeometry, length).ready) ctx.addIssue({code:"custom",path:["routeGeometry"],message:"GIS Route Data Required: surveyed segment distance must match its From/To KP range (within 1% or 5 m)."});
  });

export const assetSchema = z
  .object({
    assetId: requiredTrimmedString(MAX_IDENTIFIER_LENGTH, "Asset ID is required"),
    assetType: z.enum(assetTypes),
    name: optionalTrimmedString(),
    facilityType: optionalTrimmedString(MAX_IDENTIFIER_LENGTH),
    equipmentType: optionalTrimmedString(MAX_IDENTIFIER_LENGTH),
    pipelineId: requiredTrimmedString(MAX_IDENTIFIER_LENGTH, "Pipeline ID is required"),
    segmentId: optionalTrimmedString(MAX_IDENTIFIER_LENGTH),
    kp: optionalKp,
    latitude: optionalCoordinate(-90, 90, "Latitude"),
    longitude: optionalCoordinate(-180, 180, "Longitude"),
    coordinates: optionalTrimmedString(MAX_TEXT_LENGTH),
    side: optionalNullableEnum(assetSides),
    installationDate: optionalDateOnly,
    manufacturer: optionalTrimmedString(MAX_TEXT_LENGTH),
    model: optionalTrimmedString(MAX_TEXT_LENGTH),
    physicalStatus: z.enum(physicalStatuses).default("Unknown"),
    parentAssetId: optionalTrimmedString(MAX_IDENTIFIER_LENGTH)
  })
  .strict().superRefine((asset, ctx) => {
    if ((asset.latitude === undefined) !== (asset.longitude === undefined)) ctx.addIssue({ code: "custom", path: ["latitude"], message: "Provide both latitude and longitude, or leave both blank." });
  });

export function validateSegmentInput(value: unknown) {
  const result = segmentSchema.safeParse(value);
  if (!result.success) {
    throw createValidationErrorFromZod(result.error);
  }

  return result.data;
}

export function validateAssetInput(value: unknown) {
  const result = assetSchema.safeParse(value);
  if (!result.success) {
    throw createValidationErrorFromZod(result.error);
  }

  return result.data as z.infer<typeof assetSchema> & {
    assetType: AssetType;
    side?: AssetSide;
    physicalStatus: AssetPhysicalStatus;
  };
}
