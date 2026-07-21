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

const deviceRecordSchema = z
  .object({
    id: z.string().trim().min(1),
    deviceId: z.string().trim().min(1).max(120),
    deviceType: z.enum(deviceTypes),
    pipelineOrLocation: z.string().trim().min(1).max(200),
    status: z.enum(deviceStatuses),
    latestReadingOrState: z.string().trim().min(1).max(200),
    unit: z.string().trim().max(50).optional(),
    lastUpdatedAt: z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Must be a valid date-time string"
    }),
    isDemoData: z.boolean()
  })
  .strict();

const deviceRecordListSchema = z.array(deviceRecordSchema);

export function validateDeviceRecord(value: unknown) {
  const result = deviceRecordSchema.safeParse(value);
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

export const allowedDeviceTypes = deviceTypes;
export const allowedDeviceStatuses = deviceStatuses;
