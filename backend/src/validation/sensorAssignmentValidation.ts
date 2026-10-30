import { z } from "zod";

import { createValidationErrorFromZod } from "./validationErrors";

export const sensorAssignmentCategories = [
  "Internal Corrosion Sensors",
  "Internal Process Sensors",
  "External Corrosion Sensors"
] as const;

export const sensorAssignmentNamesByCategory = {
  "Internal Corrosion Sensors": ["Corrosion Coupon", "Electrical Resistance Probe"],
  "Internal Process Sensors": [
    "Flow Meter",
    "Level Switch",
    "Pressure Transmitter",
    "Temperature Sensor",
    "Discharge Sensor",
    "Flow Control Valve",
    "Pressure Relief Valve (PRV)"
  ],
  "External Corrosion Sensors": ["CP Monitoring Module"]
} as const;

export const sensorAssignmentDeviceTypesByCategory = {
  "Internal Corrosion Sensors": ["Corrosion Coupon", "Electrical Resistance Probe"],
  "Internal Process Sensors": [
    "Flow Meter",
    "Level Switch",
    "Pressure Transmitter",
    "Temperature Sensor",
    "Discharge Sensor",
    "Flow Control Valve",
    "Pressure Relief Valve (PRV)"
  ],
  "External Corrosion Sensors": ["CP Monitoring Module"]
} as const;

export const sensorAssignmentInstallationTypes = [
  "Inline",
  "Insertion",
  "Surface Mounted",
  "Remote Mounted",
  "Test Station",
  "Other"
] as const;

export const sensorAssignmentMeasuredValues = [
  "Corrosion rate",
  "Metal loss",
  "Flow",
  "Level",
  "Pressure",
  "Temperature",
  "Discharge",
  "Valve position",
  "Pipe-to-soil potential"
] as const;

export const sensorAssignmentMeasurementUnits = [
  "mpy",
  "mm/y",
  "%",
  "m3/h",
  "bar",
  "deg C",
  "V vs CSE",
  "State",
  "Other",
  "kPa",
  "\u00b0C",
  "mm/yr",
  "m\u00b3/h",
  "mm/s",
  "g",
  "psi",
  "MPa",
  "\u00b0F",
  "K",
  "in/s",
  "mm/year",
  "mm",
  "in",
  "m",
  "mV"
] as const;

export const sensorAssignmentDataSources = ["Manual", "IoT Gateway", "API", "Other"] as const;
export const sensorAssignmentStatuses = ["Active", "Inactive", "Fault", "Maintenance", "Unassigned"] as const;

const MAX_IDENTIFIER_LENGTH = 120;
const MAX_TEXT_LENGTH = 200;
const MAX_NOTES_LENGTH = 1000;

const optionalTrimmedString = (maxLength: number) =>
  z.string().trim().max(maxLength, `Must be ${maxLength} characters or fewer`).optional();

const requiredTrimmedString = (maxLength: number, message: string) =>
  z.string().trim().min(1, message).max(maxLength, `Must be ${maxLength} characters or fewer`);

const dateOnlySchema = z.string().trim().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime());
}, {
  message: "Must be a valid date in YYYY-MM-DD format"
});

export const sensorAssignmentSchema = z
  .object({
    sensorId: requiredTrimmedString(MAX_IDENTIFIER_LENGTH, "Sensor ID is required"),
    sensorName: z.enum(flattenValues(sensorAssignmentNamesByCategory)),
    sensorCategory: z.enum(sensorAssignmentCategories),
    sensorDeviceType: z.enum(flattenValues(sensorAssignmentDeviceTypesByCategory)),
    pipelineOrAsset: requiredTrimmedString(MAX_TEXT_LENGTH, "Pipeline or asset is required"),
    installationLocation: requiredTrimmedString(MAX_TEXT_LENGTH, "Installation location is required"),
    installationType: z.enum(sensorAssignmentInstallationTypes),
    valuesMeasured: z.enum(sensorAssignmentMeasuredValues),
    measurementUnit: z.enum(sensorAssignmentMeasurementUnits),
    installationDate: dateOnlySchema,
    dataSource: z.enum(sensorAssignmentDataSources),
    assignmentStatus: z.enum(sensorAssignmentStatuses),
    notes: optionalTrimmedString(MAX_NOTES_LENGTH),
    previousAssignmentId: optionalTrimmedString(MAX_IDENTIFIER_LENGTH)
  })
  .strict()
  .superRefine((value, ctx) => {
    const names = sensorAssignmentNamesByCategory[value.sensorCategory] as readonly string[];
    if (!names.includes(value.sensorName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sensorName"],
        message: "Sensor name is not supported for the selected category"
      });
    }

    const deviceTypes = sensorAssignmentDeviceTypesByCategory[value.sensorCategory] as readonly string[];
    if (!deviceTypes.includes(value.sensorDeviceType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sensorDeviceType"],
        message: "Sensor/device type is not supported for the selected category"
      });
    }

    if (value.installationType === "Other" && !value.notes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["notes"],
        message: "Notes are required when installation type is Other"
      });
    }

    if (value.measurementUnit === "Other" && !value.notes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["notes"],
        message: "Notes are required when measurement unit is Other"
      });
    }
  });

export const sensorAssignmentUpdateSchema = sensorAssignmentSchema.extend({
  activeTo: dateOnlySchema.optional()
});

export const sensorAssignmentRecordSchema = sensorAssignmentSchema.extend({
  id: requiredTrimmedString(MAX_IDENTIFIER_LENGTH, "ID is required"),
  activeFrom: z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Must be a valid date-time string"
  }),
  activeTo: z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Must be a valid date-time string"
  }).optional(),
  createdAt: z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Must be a valid date-time string"
  }),
  updatedAt: z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Must be a valid date-time string"
  }),
  authorId: optionalTrimmedString(MAX_IDENTIFIER_LENGTH),
  createdByName: optionalTrimmedString(MAX_TEXT_LENGTH),
  createdByEmail: optionalTrimmedString(MAX_TEXT_LENGTH)
});

export const sensorAssignmentListSchema = z.array(sensorAssignmentRecordSchema);

export function validateSensorAssignmentInput(value: unknown) {
  const result = sensorAssignmentSchema.safeParse(value);
  if (!result.success) {
    throw createValidationErrorFromZod(result.error);
  }

  return result.data;
}

export function validateSensorAssignmentUpdate(value: unknown) {
  const result = sensorAssignmentUpdateSchema.safeParse(value);
  if (!result.success) {
    throw createValidationErrorFromZod(result.error);
  }

  return result.data;
}

export function validateSensorAssignmentRecord(value: unknown) {
  const result = sensorAssignmentRecordSchema.safeParse(value);
  if (!result.success) {
    throw createValidationErrorFromZod(result.error);
  }

  return result.data;
}

export function validateSensorAssignmentList(value: unknown) {
  const result = sensorAssignmentListSchema.safeParse(value);
  if (!result.success) {
    throw createValidationErrorFromZod(result.error);
  }

  return result.data;
}

function flattenValues<T extends Record<string, readonly string[]>>(valuesByCategory: T) {
  return Array.from(new Set(Object.values(valuesByCategory).flat())) as [string, ...string[]];
}
