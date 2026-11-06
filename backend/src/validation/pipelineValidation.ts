import { z } from "zod";

import { CpCalculationType } from "../types/domain";
import { createValidationError, createValidationErrorFromZod } from "./validationErrors";
import { alignmentReadiness } from "../coreEngine/chainage/ChainageAgent";
import { routeGeometrySchema } from "./routeGeometry";
import { chainageSettingsShape } from "./chainageSettings";

const MAX_TEXT = 200;
const MAX_SHORT_TEXT = 120;
const diameterUnits = ["mm", "cm", "m", "inch", "ft"] as const;
const pressureUnits = ["bar", "MPa", "kPa", "psi"] as const;
const designPressureUnits = ["bar", "psi", "MPa"] as const;
const coatingTypes = ["3LPE", "FBE", "3LPP", "Other"] as const;
const wallThicknessUnits = ["mm", "in"] as const;
const cpCalculationTypes = ["SACP", "ICCP"] as const;

const optionalText = (maxLength = MAX_TEXT) =>
  z.string().trim().max(maxLength, `Must be ${maxLength} characters or fewer`).optional();

const optionalNumber = () =>
  z.number().refine((value) => Number.isFinite(value), { message: "Must be a finite number" }).optional();

const optionalNonNegativeNumber = () =>
  optionalNumber().refine((value) => value === undefined || value >= 0, {
    message: "Must be non-negative"
  });

const optionalPositiveNumber = () =>
  optionalNumber().refine((value) => value === undefined || value > 0, {
    message: "Must be positive"
  });

const optionalReasonableYear = () =>
  z
    .number()
    .int()
    .refine((value) => value >= 1900 && value <= 2100, { message: "Enter a reasonable four-digit year" })
    .optional();

function convertPressureToBar(value: number, unit = "bar") {
  if (unit === "MPa") {
    return value * 10;
  }

  if (unit === "kPa") {
    return value * 0.01;
  }

  if (unit === "psi") {
    return value * 0.0689476;
  }

  return value;
}

const MATERIAL_GRADES: Record<string, string[]> = {
  "Carbon Steel": [
    "ASTM A53 Grade A",
    "ASTM A53 Grade B",
    "ASTM A106 Grade A",
    "ASTM A106 Grade B",
    "ASTM A106 Grade C",
    "API 5L Grade A",
    "API 5L Grade B",
    "API 5L X42",
    "API 5L X46",
    "API 5L X52",
    "API 5L X56",
    "API 5L X60",
    "API 5L X65",
    "API 5L X70",
    "API 5L X80",
    "API 5L A",
    "API 5L B",
    "X42",
    "X46",
    "X52",
    "X56",
    "X60",
    "X65",
    "X70",
    "X80",
    "Other"
  ],
  "Stainless Steel": ["304", "304L", "316", "316L", "321", "347", "Other"],
  "Alloy Steel": ["ASTM A335 P5", "ASTM A335 P9", "ASTM A335 P11", "ASTM A335 P22", "Other"],
  "HDPE": ["PE80", "PE100", "PE4710", "Other"],
  "Low-Alloy Steel": ["ASTM A335 P1", "ASTM A335 P5", "ASTM A335 P9", "ASTM A335 P11", "ASTM A335 P12", "ASTM A335 P22", "ASTM A335 P91", "ASTM A335 P92", "Other"],
  "Stainless Steel 304": ["ASTM A312 TP304", "ASTM A312 TP304L", "ASTM A312 TP304H", "Other"],
  "Stainless Steel 316": ["ASTM A312 TP316", "ASTM A312 TP316L", "ASTM A312 TP316H", "Other"],
  "Duplex Stainless Steel": ["ASTM A790 UNS S31803", "ASTM A790 UNS S32205", "Duplex 2205", "2205", "2507", "2101", "Other"],
  "Super Duplex Stainless Steel": ["ASTM A790 UNS S32750", "ASTM A790 UNS S32760", "Super Duplex 2507", "Other"],
  "Cast Iron": ["Grey Cast Iron", "ASTM A48 Class 20", "ASTM A48 Class 25", "ASTM A48 Class 30", "ASTM A48 Class 35", "ASTM A48 Class 40", "Class 40", "Class 50", "Other"],
  "Ductile Iron": ["ISO 2531 Class C25", "ISO 2531 Class C30", "ISO 2531 Class C40", "ISO 2531 Class C50", "ISO 2531 Class C64", "ISO 2531 Class C100", "K7", "K8", "K9", "K10", "K12", "350", "400", "500", "600", "Other"],
  "Galvanized Steel": ["ASTM A53 Grade A Galvanized", "ASTM A53 Grade B Galvanized", "EN 10255 Light", "EN 10255 Medium", "EN 10255 Heavy", "Other"],
  Copper: ["ASTM B88 Type K", "ASTM B88 Type L", "ASTM B88 Type M", "ASTM B88 Type DWV", "Copper C12200", "Other"],
  "Copper-Nickel Alloy": ["Cu-Ni 90/10", "Cu-Ni 70/30", "UNS C70600", "UNS C71500", "Other"],
  "Nickel Alloy": ["Alloy 200", "Alloy 400", "Alloy 600", "Alloy 625", "Alloy 800", "Alloy 825", "Alloy C276", "Other"],
  "HDPE / Polyethylene": ["PE63", "PE80", "PE100", "PE100-RC", "Other"],
  PVC: ["PVC-U", "PVC-M", "PVC-O", "Class 6", "Class 9", "Class 12", "Class 16", "Schedule 40", "Schedule 80", "Other"],
  CPVC: ["CPVC Schedule 40", "CPVC Schedule 80", "CPVC SDR 11", "CPVC SDR 13.5", "Other"],
  Polypropylene: ["PP-H", "PP-B", "PP-R", "PP-RCT", "Other"],
  "GRP / FRP": ["PN6", "PN10", "PN16", "PN20", "PN25", "SN2500", "SN5000", "SN10000", "Other"],
  "Reinforced Concrete": ["ASTM C76 Class I", "ASTM C76 Class II", "ASTM C76 Class III", "ASTM C76 Class IV", "ASTM C76 Class V", "Other"],
  "Prestressed Concrete Cylinder Pipe": ["Embedded Cylinder Pipe", "Lined Cylinder Pipe", "Project-Specified Pressure Class", "Other"],
  "Asbestos Cement": ["Class 100", "Class 150", "Class 200", "Other"],
  Other: ["Other"]
};

export function normalizePipelineCode(value: string) {
  return value.trim().toLowerCase();
}

const pipelineInputSchema = z
  .object({
    ...chainageSettingsShape,
    pipelineCode: z.string().trim().min(1, "Pipeline code is required").max(MAX_SHORT_TEXT),
    pipelineName: z.string().trim().min(1, "Pipeline name is required").max(MAX_TEXT),
    location: optionalText(),
    serviceOrProduct: optionalText(),
    pipeLocationId: optionalText(MAX_SHORT_TEXT),
    pipeMaterial: z.string().trim().min(1, "Pipe material is required").max(MAX_SHORT_TEXT),
    pipeMaterialOther: optionalText(MAX_SHORT_TEXT),
    pipeGrade: z.string().trim().min(1, "Pipe grade is required").max(MAX_SHORT_TEXT),
    pipeGradeOther: optionalText(MAX_SHORT_TEXT),
    pipeAgeYears: optionalNonNegativeNumber(),
    pipeLengthKm: optionalNonNegativeNumber(),
    pipeInsideDiameter: optionalNonNegativeNumber(),
    pipeOutsideDiameter: optionalNonNegativeNumber(),
    diameterUnit: z.enum(diameterUnits).optional(),
    smysMpa: optionalNonNegativeNumber(),
    maopBar: optionalNonNegativeNumber(),
    nominalWallThickness: optionalPositiveNumber(),
    wallThicknessInputValue: optionalPositiveNumber(),
    wallThicknessUnit: z.enum(wallThicknessUnits).optional(),
    designPressure: optionalNonNegativeNumber(),
    designPressureUnit: z.enum(designPressureUnits).optional(),
    coatingType: z.enum(coatingTypes).optional(),
    operatingPressure: optionalNonNegativeNumber(),
    operatingPressureInputValue: optionalNonNegativeNumber(),
    operatingPressureUnit: z.enum(pressureUnits).optional(),
    commissioningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").refine(value => { const date = new Date(`${value}T00:00:00.000Z`); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value; }, "Must be a valid calendar date").nullable().optional(),
    installationYear: optionalReasonableYear(),
    inspectionYear: optionalReasonableYear(),
    installationDate: z
      .string()
      .trim()
      .refine((value) => !value || !Number.isNaN(Date.parse(value)), { message: "Must be a valid date" })
      .optional(),
    designLife: z.number().int().nonnegative().optional(),
    routeGeometry: routeGeometrySchema.nullable().optional(),
    status: z.string().trim().min(1).max(MAX_SHORT_TEXT).default("Active")
  })
  .superRefine((value, context) => {
    if (value.routeGeometry && (value.pipeLengthKm === undefined || value.pipeLengthKm <= 0 || !alignmentReadiness(value.routeGeometry, value.pipeLengthKm * 1000).ready)) context.addIssue({ code: "custom", path: ["routeGeometry"], message: "GIS Route Data Required: surveyed alignment must match the positive pipeline length (within 1% or 5 m)." });
    const validGrades = MATERIAL_GRADES[value.pipeMaterial];
    if (!validGrades) {
      context.addIssue({
        code: "custom",
        path: ["pipeMaterial"],
        message: "Select a valid pipe material"
      });
    } else if (!validGrades.includes(value.pipeGrade)) {
      context.addIssue({
        code: "custom",
        path: ["pipeGrade"],
        message: "Select a valid grade for the selected material"
      });
    }

    if (
      value.maopBar !== undefined &&
      (value.operatingPressureInputValue !== undefined || value.operatingPressure !== undefined) &&
      convertPressureToBar(
        value.operatingPressureInputValue ?? value.operatingPressure ?? 0,
        value.operatingPressureUnit ?? "bar"
      ) > value.maopBar
    ) {
      context.addIssue({
        code: "custom",
        path: ["operatingPressure"],
        message: "Operating Pressure cannot exceed MAOP."
      });
    }
  })
  .strict();

const cpCalculationSchema = z
  .object({
    pipelineId: z.string().trim().min(1, "Pipeline is required").max(MAX_SHORT_TEXT),
    calculationType: z.enum(cpCalculationTypes),
    input: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    result: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  })
  .strict();

function parseWithSchema<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw createValidationErrorFromZod(result.error);
  }

  return result.data;
}

export function validatePipelineInput(value: unknown) {
  return parseWithSchema(pipelineInputSchema, value);
}

export function routeGeometryMatchesSaved(candidate: unknown, existing: unknown) {
  return JSON.stringify(candidate) === JSON.stringify(existing);
}

export function validateCpCalculationInput(value: unknown) {
  return parseWithSchema(cpCalculationSchema, value) as {
    pipelineId: string;
    calculationType: CpCalculationType;
    input: Record<string, string | number | boolean>;
    result: Record<string, string | number | boolean>;
  };
}
