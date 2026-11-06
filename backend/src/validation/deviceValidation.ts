import { z } from "zod";

import { createValidationErrorFromZod } from "./validationErrors";

const deviceTypes = [
  "Flow Meter",
  "Level Switch",
  "Pressure Transmitter",
  "Temperature Sensor",
  "Discharge Sensor",
  "Flow Control Valve",
  "CP Monitoring Module",
  "Pressure Relief Valve (PRV)"
] as const;

const deviceStatuses = ["Active", "Inactive", "Fault"] as const;

const deviceInputSchema = z
  .object({
    deviceId: z.string().trim().min(1).max(120),
    deviceType: z.enum(deviceTypes),
    pipelineOrLocation: z.string().trim().min(1).max(200),
    status: z.enum(deviceStatuses),
    latestReadingOrState: z.string().trim().min(1).max(200),
    unit: z.string().trim().max(50).optional()
  })
  .strict();

const deviceRecordSchema = deviceInputSchema
  .extend({
    id: z.string().trim().min(1),
    lastUpdatedAt: z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Must be a valid date-time string"
    }),
    isDemoData: z.boolean(),
    authorId: z.string().trim().min(1).optional()
  })
  .strict();

const deviceRecordListSchema = z.array(deviceRecordSchema);

const deviceLocationUpdateSchema = z
  .object({
    pipelineOrLocation: z.string().trim().min(1).max(200)
  })
  .strict();

export function validateDeviceRecord(value: unknown) {
  const result = deviceRecordSchema.safeParse(value);
  if (!result.success) {
    throw createValidationErrorFromZod(result.error);
  }

  return result.data;
}

export function validateDeviceInput(value: unknown) {
  const result = deviceInputSchema.safeParse(value);
  if (!result.success) {
    throw createValidationErrorFromZod(result.error);
  }
  return result.data;
}

export function validateDeviceRecordList(value: unknown) {
  const result = deviceRecordListSchema.safeParse(value);
  if (!result.success) {
    throw createValidationErrorFromZod(result.error);
  }

  return result.data;
}

export function validateDeviceLocationUpdate(value: unknown) {
  const result = deviceLocationUpdateSchema.safeParse(value);
  if (!result.success) {
    throw createValidationErrorFromZod(result.error);
  }

  return result.data;
}

export const allowedDeviceTypes = deviceTypes;
export const allowedDeviceStatuses = deviceStatuses;

const deviceRegistrationSchema=deviceInputSchema.extend({isDemoData:z.boolean().optional(),demoConfirmed:z.boolean().optional(),assetRecordId:z.string().trim().min(1).optional(),pipelineId:z.string().trim().min(1).optional(),segmentRecordId:z.string().trim().min(1).optional(),identityConfirmed:z.boolean().optional()}).superRefine((value,context)=>{
 if(value.assetRecordId||value.pipelineId||value.segmentRecordId){
  for(const field of ["assetRecordId","pipelineId","segmentRecordId"] as const)if(!value[field])context.addIssue({code:"custom",path:[field],message:"All saved identity IDs are required."});
  if(!value.unit?.trim())context.addIssue({code:"custom",path:["unit"],message:"Confirmed engineering unit is required for saved sensor registration."});
 }
});
export function validateDeviceRegistrationInput(value:unknown){const result=deviceRegistrationSchema.safeParse(value);if(!result.success)throw createValidationErrorFromZod(result.error);return result.data;}
