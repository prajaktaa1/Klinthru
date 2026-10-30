import { z } from "zod";

import { createValidationErrorFromZod } from "./validationErrors";

const MAX_IDENTIFIER_LENGTH = 120;
const MAX_TEXT_LENGTH = 500;
const MAX_NOTES_LENGTH = 1000;
const testPointStatuses = ["Active", "Inactive", "Maintenance"] as const;
const rectifierStatuses = ["Active", "Standby", "Fault", "Offline", "Maintenance"] as const;

const optionalTrimmedString = (maxLength = MAX_TEXT_LENGTH) =>
  z.string().trim().max(maxLength, `Must be ${maxLength} characters or fewer`).optional();

const requiredTrimmedString = (message: string) =>
  z.string().trim().min(1, message).max(MAX_IDENTIFIER_LENGTH, `Must be ${MAX_IDENTIFIER_LENGTH} characters or fewer`);

const cpTestPointCreateSchema = z
  .object({
    pipelineId: requiredTrimmedString("Pipeline ID is required"),
    assetMasterId: requiredTrimmedString("Asset Master ID is required"),
    name: optionalTrimmedString(),
    assetStatus: z.enum(testPointStatuses).optional(),
    notes: optionalTrimmedString(MAX_NOTES_LENGTH)
  })
  .strict();

const cpTestPointUpdateSchema = z
  .object({
    name: optionalTrimmedString(),
    assetStatus: z.enum(testPointStatuses).optional(),
    notes: optionalTrimmedString(MAX_NOTES_LENGTH)
  })
  .strict();

const cpRectifierCreateSchema = z
  .object({
    pipelineId: requiredTrimmedString("Pipeline ID is required"),
    assetMasterId: requiredTrimmedString("Asset Master ID is required"),
    name: optionalTrimmedString(),
    status: z.enum(rectifierStatuses).optional(),
    notes: optionalTrimmedString(MAX_NOTES_LENGTH)
  })
  .strict();

const cpRectifierUpdateSchema = z
  .object({
    name: optionalTrimmedString(),
    status: z.enum(rectifierStatuses).optional(),
    notes: optionalTrimmedString(MAX_NOTES_LENGTH)
  })
  .strict();

function parseWithSchema<T>(schema: z.ZodType<T>, value: unknown) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw createValidationErrorFromZod(result.error);
  }

  return result.data;
}

export function validateCpTestPointInput(value: unknown) {
  return parseWithSchema(cpTestPointCreateSchema, value);
}

export function validateCpTestPointUpdateInput(value: unknown) {
  return parseWithSchema(cpTestPointUpdateSchema, value);
}

export function validateCpRectifierInput(value: unknown) {
  return parseWithSchema(cpRectifierCreateSchema, value);
}

export function validateCpRectifierUpdateInput(value: unknown) {
  return parseWithSchema(cpRectifierUpdateSchema, value);
}
