import { z } from "zod";

import { createValidationError, createValidationErrorFromZod } from "./validationErrors";

const MAX_PIPELINE_NAME_LENGTH = 200;
const MAX_SHORT_TEXT_LENGTH = 120;
const MAX_RESULT_TEXT_LENGTH = 300;
const MAX_IDENTIFIER_LENGTH = 100;

const riskLevels = ["High", "Medium", "Low"] as const;
const assessmentTypes = ["External", "Internal"] as const;
const diameterUnitValues = ["mm", "cm", "m", "inch", "ft"] as const;
const groundwaterPresenceValues = [
  "No Groundwater",
  "Seasonal Groundwater",
  "Seepage Water",
  "Permanent Groundwater",
  "Mineral-Rich Groundwater",
  "Waterlogged Area",
  "Unknown"
] as const;
const groundwaterConditionValues = [
  "Not Applicable",
  "Fresh Water",
  "Mineral-Rich Water",
  "Brackish Water",
  "Saline Water",
  "Contaminated Water",
  "Stagnant Water",
  "Flowing Water",
  "Unknown / Not Tested"
] as const;
const cpSystemTypeValues = [
  "Sacrificial Cathodic Protection (SCP)",
  "Impressed Current Cathodic Protection (ICCP)"
] as const;
const cinderAndCokeValues = ["Yes", "No"] as const;
const cpInputTypeValues = ["CP Polarization", "CP Polarized Potential", "Polarized Potential"] as const;
const acInputTypeValues = [
  "AC Current Density",
  "AC Voltage to Remote Earth",
  "Pipe AC Voltage to Remote Earth"
] as const;
const externalCoatingValues = [
  "Bare",
  "Asphalt Enamel",
  "Wrap-Tape",
  "High-Temperature Wrap Tape",
  "DENSO Petrolatum Tape",
  "Heat-Shrink Sleeve",
  "Coal-Tar",
  "FBE/PE/PP",
  "FBE / PE / PP",
  "FBE",
  "PE",
  "PP",
  "IPP",
  "Three-Layer Polypropylene (3LPP)",
  "Other"
] as const;
const internalCoatingValues = ["Bare", "Cement Lining", "Epoxy", "Epoxy/Others", "Other"] as const;
const soilTypeValues = [
  "Clay",
  "Silt",
  "Sand",
  "Loam",
  "Gravel",
  "Peat / Organic Soil",
  "Calcareous Soil",
  "Saline Soil",
  "Gatch Soil",
  "Excavated Soil / Backfill Material",
  "Made Ground / Fill",
  "Waterlogged Soil",
  "Soft Rock",
  "Hard Rock",
  "Unknown",
  "Calcareous/Sandy",
  "Peat",
  "Ordinary Soil",
  "Excavated/Previously Disturbed Soil",
  "Gatch",
  "Sandy Soil",
  "Gravelly Soil",
  "Laterite Soil",
  "Black Cotton Soil",
  "Saline/Alkaline Soil",
  "Other"
] as const;

const pipeMaterialGradeMap = {
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
    "Other"
  ],
  "Low-Alloy Steel": [
    "ASTM A335 P1",
    "ASTM A335 P5",
    "ASTM A335 P9",
    "ASTM A335 P11",
    "ASTM A335 P12",
    "ASTM A335 P22",
    "ASTM A335 P91",
    "ASTM A335 P92",
    "Other"
  ],
  "Stainless Steel 304": ["ASTM A312 TP304", "ASTM A312 TP304L", "ASTM A312 TP304H", "Other"],
  "Stainless Steel 316": ["ASTM A312 TP316", "ASTM A312 TP316L", "ASTM A312 TP316H", "Other"],
  "Duplex Stainless Steel": ["ASTM A790 UNS S31803", "ASTM A790 UNS S32205", "Duplex 2205", "Other"],
  "Super Duplex Stainless Steel": ["ASTM A790 UNS S32750", "ASTM A790 UNS S32760", "Super Duplex 2507", "Other"],
  "Cast Iron": [
    "Grey Cast Iron",
    "ASTM A48 Class 20",
    "ASTM A48 Class 25",
    "ASTM A48 Class 30",
    "ASTM A48 Class 35",
    "ASTM A48 Class 40",
    "Other"
  ],
  "Ductile Iron": [
    "ISO 2531 Class C25",
    "ISO 2531 Class C30",
    "ISO 2531 Class C40",
    "ISO 2531 Class C50",
    "ISO 2531 Class C64",
    "ISO 2531 Class C100",
    "K7",
    "K8",
    "K9",
    "K10",
    "K12",
    "Other"
  ],
  "Galvanized Steel": [
    "ASTM A53 Grade A Galvanized",
    "ASTM A53 Grade B Galvanized",
    "EN 10255 Light",
    "EN 10255 Medium",
    "EN 10255 Heavy",
    "Other"
  ],
  Copper: [
    "ASTM B88 Type K",
    "ASTM B88 Type L",
    "ASTM B88 Type M",
    "ASTM B88 Type DWV",
    "Copper C12200",
    "Other"
  ],
  "Copper-Nickel Alloy": ["Cu-Ni 90/10", "Cu-Ni 70/30", "UNS C70600", "UNS C71500", "Other"],
  "Nickel Alloy": ["Alloy 200", "Alloy 400", "Alloy 600", "Alloy 625", "Alloy 800", "Alloy 825", "Alloy C276", "Other"],
  "HDPE / Polyethylene": ["PE63", "PE80", "PE100", "PE100-RC", "Other"],
  PVC: ["PVC-U", "PVC-M", "PVC-O", "Class 6", "Class 9", "Class 12", "Class 16", "Schedule 40", "Schedule 80", "Other"],
  CPVC: ["CPVC Schedule 40", "CPVC Schedule 80", "CPVC SDR 11", "CPVC SDR 13.5", "Other"],
  Polypropylene: ["PP-H", "PP-B", "PP-R", "PP-RCT", "Other"],
  "GRP / FRP": ["PN6", "PN10", "PN16", "PN20", "PN25", "SN2500", "SN5000", "SN10000", "Other"],
  "Reinforced Concrete": [
    "ASTM C76 Class I",
    "ASTM C76 Class II",
    "ASTM C76 Class III",
    "ASTM C76 Class IV",
    "ASTM C76 Class V",
    "Other"
  ],
  "Prestressed Concrete Cylinder Pipe": [
    "Embedded Cylinder Pipe",
    "Lined Cylinder Pipe",
    "Project-Specified Pressure Class",
    "Other"
  ],
  "Asbestos Cement": ["Class 100", "Class 150", "Class 200", "Other"],
  Other: ["Other"]
} as const;

type PipeMaterial = keyof typeof pipeMaterialGradeMap;

const pipeMaterialValues = Object.keys(pipeMaterialGradeMap) as PipeMaterial[];

const finiteNumber = (message = "Must be a finite number") =>
  z.number().refine((value) => Number.isFinite(value), { message });

const nonNegativeNumber = () =>
  finiteNumber().refine((value) => value >= 0, { message: "Must be a non-negative number" });

const positiveNumber = () =>
  finiteNumber().refine((value) => value > 0, { message: "Must be a positive number" });

const trimmedString = (maxLength: number, requiredMessage = "Must be a non-empty string") =>
  z
    .string()
    .trim()
    .min(1, requiredMessage)
    .max(maxLength, `Must be ${maxLength} characters or fewer`);

const optionalTrimmedString = (maxLength: number) =>
  z.string().trim().max(maxLength, `Must be ${maxLength} characters or fewer`).optional();

const assessmentEnvelopeSchema = z
  .object({
    id: optionalTrimmedString(MAX_IDENTIFIER_LENGTH),
    type: z.enum(assessmentTypes),
    pipelineName: trimmedString(MAX_PIPELINE_NAME_LENGTH, "Pipeline name is required"),
    createdAt: z
      .string()
      .trim()
      .refine((value) => value === undefined || (value.length > 0 && !Number.isNaN(Date.parse(value))), {
        message: "Must be a valid date-time string"
      })
      .optional(),
    riskLevel: z.enum(riskLevels),
    riskScore: finiteNumber(),
    input: z.unknown(),
    result: z.unknown()
  })
  .strict();

const externalInputSchema = z
  .object({
    pipelineName: optionalTrimmedString(MAX_PIPELINE_NAME_LENGTH),
    pipeLocationId: optionalTrimmedString(MAX_SHORT_TEXT_LENGTH),
    pipeMaterial: z.enum(pipeMaterialValues),
    pipeMaterialOther: optionalTrimmedString(MAX_SHORT_TEXT_LENGTH),
    pipeGrade: trimmedString(MAX_SHORT_TEXT_LENGTH, "Pipe grade is required"),
    pipeGradeOther: optionalTrimmedString(MAX_SHORT_TEXT_LENGTH),
    pipeAge: nonNegativeNumber(),
    pipeLength: nonNegativeNumber(),
    pipeIdDiameter: positiveNumber(),
    pipeIdDiameterDisplayValue: positiveNumber().optional(),
    pipeIdDiameterUnit: z.enum(diameterUnitValues),
    wallThickness: positiveNumber(),
    coatingType: z.enum(externalCoatingValues),
    coatingTypeOther: optionalTrimmedString(MAX_SHORT_TEXT_LENGTH),
    soilPh: finiteNumber(),
    soilType: z.enum(soilTypeValues),
    soilMoisture: nonNegativeNumber(),
    soilResistivity: finiteNumber(),
    soilTemperature: finiteNumber(),
    chloride: nonNegativeNumber(),
    sulphate: nonNegativeNumber(),
    sulphideH2S: nonNegativeNumber(),
    cinderAndCoke: z.enum(cinderAndCokeValues),
    soilCarbonateContent: nonNegativeNumber(),
    redoxPotential: finiteNumber(),
    groundwaterPresence: z.enum(groundwaterPresenceValues),
    groundwaterCondition: z.enum(groundwaterConditionValues).optional(),
    cpSystemType: z.enum(cpSystemTypeValues).optional(),
    cpInputType: z.enum(cpInputTypeValues),
    cpInputValue: finiteNumber(),
    dcCurrentDensity: nonNegativeNumber(),
    acInputType: z.enum(acInputTypeValues),
    acInputValue: finiteNumber(),
    strayCurrentDensity: nonNegativeNumber()
  })
  .strict()
  .superRefine((value, ctx) => {
    validatePipeGradeForMaterial(value.pipeMaterial, value.pipeGrade, ctx, ["pipeGrade"]);
    validateOtherField(value.pipeMaterial, value.pipeMaterialOther, "Other", ["pipeMaterialOther"], ctx);
    validateOtherField(value.pipeGrade, value.pipeGradeOther, "Other", ["pipeGradeOther"], ctx);
    validateOtherField(value.coatingType, value.coatingTypeOther, "Other", ["coatingTypeOther"], ctx);

    if (value.groundwaterPresence === "No Groundwater") {
      if (value.groundwaterCondition && value.groundwaterCondition !== "Not Applicable") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["groundwaterCondition"],
          message: "Must be Not Applicable or absent when groundwater presence is No Groundwater"
        });
      }
    }

    if (value.groundwaterPresence !== "No Groundwater" && value.groundwaterCondition === "Not Applicable") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["groundwaterCondition"],
        message: "Must not be Not Applicable when groundwater presence is not No Groundwater"
      });
    }

    if (value.cpInputType === "CP Polarization" && value.cpInputValue < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cpInputValue"],
        message: "Must be non-negative for CP Polarization"
      });
    }

    if (value.cpInputType === "CP Polarized Potential" && value.cpInputValue > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cpInputValue"],
        message: "Must be negative for CP Polarized Potential"
      });
    }
  });

const internalInputSchema = z
  .object({
    pipelineName: optionalTrimmedString(MAX_PIPELINE_NAME_LENGTH),
    pipeLocationId: optionalTrimmedString(MAX_SHORT_TEXT_LENGTH),
    pipeMaterial: z.enum(pipeMaterialValues),
    pipeMaterialOther: optionalTrimmedString(MAX_SHORT_TEXT_LENGTH),
    pipeGrade: trimmedString(MAX_SHORT_TEXT_LENGTH, "Pipe grade is required"),
    pipeGradeOther: optionalTrimmedString(MAX_SHORT_TEXT_LENGTH),
    pipeAge: nonNegativeNumber(),
    pipeIdDiameter: positiveNumber(),
    pipeIdDiameterDisplayValue: positiveNumber().optional(),
    pipeIdDiameterUnit: z.enum(diameterUnitValues),
    wallThickness: positiveNumber(),
    designLife: nonNegativeNumber(),
    internalCoating: z.enum(internalCoatingValues),
    internalCoatingOther: optionalTrimmedString(MAX_SHORT_TEXT_LENGTH),
    waterPh: finiteNumber(),
    temperature: finiteNumber(),
    dissolvedOxygen: nonNegativeNumber(),
    waterVelocity: nonNegativeNumber(),
    pipelinePressure: nonNegativeNumber()
  })
  .strict()
  .superRefine((value, ctx) => {
    validatePipeGradeForMaterial(value.pipeMaterial, value.pipeGrade, ctx, ["pipeGrade"]);
    validateOtherField(value.pipeMaterial, value.pipeMaterialOther, "Other", ["pipeMaterialOther"], ctx);
    validateOtherField(value.pipeGrade, value.pipeGradeOther, "Other", ["pipeGradeOther"], ctx);
    validateOtherField(value.internalCoating, value.internalCoatingOther, "Other", ["internalCoatingOther"], ctx);
  });

const externalResultSchema = z
  .object({
    soilCorrosivityLevel: trimmedString(MAX_RESULT_TEXT_LENGTH),
    corrosionRate: finiteNumber(),
    corrosionDepth: finiteNumber(),
    remainingLife: finiteNumber(),
    highPhSccProbability: trimmedString(MAX_RESULT_TEXT_LENGTH),
    nearNeutralPhSccProbability: trimmedString(MAX_RESULT_TEXT_LENGTH),
    micWarning: trimmedString(MAX_RESULT_TEXT_LENGTH),
    cathodicDelaminationWarning: trimmedString(MAX_RESULT_TEXT_LENGTH),
    acCorrosionWarning: trimmedString(MAX_RESULT_TEXT_LENGTH),
    strayCurrentCorrosionRate: finiteNumber(),
    majorModeOfFailure: trimmedString(MAX_RESULT_TEXT_LENGTH),
    riskLevel: z.enum(riskLevels),
    riskScore: finiteNumber()
  })
  .strict();

const internalResultSchema = z
  .object({
    corrosionRate: finiteNumber(),
    corrosionDepth: finiteNumber(),
    remainingLife: finiteNumber(),
    highPhSccProbability: trimmedString(MAX_RESULT_TEXT_LENGTH),
    nearNeutralPhSccProbability: trimmedString(MAX_RESULT_TEXT_LENGTH),
    micWarning: trimmedString(MAX_RESULT_TEXT_LENGTH),
    cathodicDelaminationWarning: trimmedString(MAX_RESULT_TEXT_LENGTH),
    acCorrosionWarning: trimmedString(MAX_RESULT_TEXT_LENGTH),
    strayCurrentCorrosionRate: finiteNumber(),
    majorModeOfFailure: trimmedString(MAX_RESULT_TEXT_LENGTH),
    riskLevel: z.enum(riskLevels),
    riskScore: finiteNumber()
  })
  .strict();

const compatibilityAssessmentTypeSchema = z
  .string()
  .trim()
  .refine((value) => ["external", "internal"].includes(value.toLowerCase()), {
    message: "Must be External or Internal"
  })
  .transform((value) => {
    const normalized = value.toLowerCase();
    return normalized === "internal" ? "Internal" : "External";
  });

const compatibilityEnvelopeSchema = assessmentEnvelopeSchema.extend({
  type: compatibilityAssessmentTypeSchema
});

function validateOtherField(
  selectedValue: string,
  detailValue: string | undefined,
  otherValue: string,
  path: (string | number)[],
  ctx: z.RefinementCtx
) {
  const hasDetail = Boolean(detailValue && detailValue.trim().length > 0);

  if (selectedValue === otherValue && !hasDetail) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: "This field is required when Other is selected"
    });
  }

  if (selectedValue !== otherValue && hasDetail) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: "Must be blank unless Other is selected"
    });
  }
}

function validatePipeGradeForMaterial(
  pipeMaterial: PipeMaterial,
  pipeGrade: string,
  ctx: z.RefinementCtx,
  path: (string | number)[]
) {
  const allowedGrades = pipeMaterialGradeMap[pipeMaterial] as readonly string[];
  if (!allowedGrades.includes(pipeGrade)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: "Invalid grade for the selected pipe material"
    });
  }
}

function validateEnvelopeResultConsistency(
  envelope: { riskLevel: (typeof riskLevels)[number]; riskScore: number },
  result: { riskLevel: (typeof riskLevels)[number]; riskScore: number },
  ctx: z.RefinementCtx
) {
  if (envelope.riskLevel !== result.riskLevel) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["result", "riskLevel"],
      message: "Must match riskLevel"
    });
  }

  if (envelope.riskScore !== result.riskScore) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["result", "riskScore"],
      message: "Must match riskScore"
    });
  }
}

function validateNestedPipelineNameConsistency(
  envelopePipelineName: string,
  input: { pipelineName?: string },
  ctx: z.RefinementCtx
) {
  if (input.pipelineName && input.pipelineName !== envelopePipelineName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["input", "pipelineName"],
      message: "Must match pipelineName"
    });
  }
}

const newAssessmentSubmissionSchema = assessmentEnvelopeSchema.superRefine((value, ctx) => {
  if (value.type === "External") {
    const inputResult = externalInputSchema.safeParse(value.input);
    if (!inputResult.success) {
      for (const issue of inputResult.error.issues) {
        ctx.addIssue({ ...issue, path: ["input", ...issue.path] });
      }
    }

    const resultValidation = externalResultSchema.safeParse(value.result);
    if (!resultValidation.success) {
      for (const issue of resultValidation.error.issues) {
        ctx.addIssue({ ...issue, path: ["result", ...issue.path] });
      }
    } else {
      validateEnvelopeResultConsistency(value, resultValidation.data, ctx);
    }

    if (inputResult.success) {
      validateNestedPipelineNameConsistency(value.pipelineName, inputResult.data, ctx);
    }
    return;
  }

  const inputResult = internalInputSchema.safeParse(value.input);
  if (!inputResult.success) {
    for (const issue of inputResult.error.issues) {
      ctx.addIssue({ ...issue, path: ["input", ...issue.path] });
    }
  }

  const resultValidation = internalResultSchema.safeParse(value.result);
  if (!resultValidation.success) {
    for (const issue of resultValidation.error.issues) {
      ctx.addIssue({ ...issue, path: ["result", ...issue.path] });
    }
  } else {
    validateEnvelopeResultConsistency(value, resultValidation.data, ctx);
  }

  if (inputResult.success) {
    validateNestedPipelineNameConsistency(value.pipelineName, inputResult.data, ctx);
  }
});

const compatibilityAssessmentSchema = compatibilityEnvelopeSchema.superRefine((value, ctx) => {
  if (value.type === "External") {
    const inputResult = externalInputSchema.safeParse(value.input);
    if (!inputResult.success) {
      for (const issue of inputResult.error.issues) {
        ctx.addIssue({ ...issue, path: ["input", ...issue.path] });
      }
    }

    const resultValidation = externalResultSchema.safeParse(value.result);
    if (!resultValidation.success) {
      for (const issue of resultValidation.error.issues) {
        ctx.addIssue({ ...issue, path: ["result", ...issue.path] });
      }
    } else {
      validateEnvelopeResultConsistency(value, resultValidation.data, ctx);
    }

    if (inputResult.success) {
      validateNestedPipelineNameConsistency(value.pipelineName, inputResult.data, ctx);
    }
    return;
  }

  const inputResult = internalInputSchema.safeParse(value.input);
  if (!inputResult.success) {
    for (const issue of inputResult.error.issues) {
      ctx.addIssue({ ...issue, path: ["input", ...issue.path] });
    }
  }

  const resultValidation = internalResultSchema.safeParse(value.result);
  if (!resultValidation.success) {
    for (const issue of resultValidation.error.issues) {
      ctx.addIssue({ ...issue, path: ["result", ...issue.path] });
    }
  } else {
    validateEnvelopeResultConsistency(value, resultValidation.data, ctx);
  }

  if (inputResult.success) {
    validateNestedPipelineNameConsistency(value.pipelineName, inputResult.data, ctx);
  }
});

export const reportRequestSchema = z
  .object({
    assessmentId: optionalTrimmedString(MAX_IDENTIFIER_LENGTH),
    assessment: compatibilityAssessmentSchema
  })
  .strict()
  .superRefine((value, ctx) => {
    const topLevelId = value.assessmentId;
    const nestedId = value.assessment.id;

    if (topLevelId && nestedId && topLevelId !== nestedId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assessmentId"],
        message: "Must match assessment.id when both are provided"
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assessment", "id"],
        message: "Must match assessmentId when both are provided"
      });
    }
  });

export type NewAssessmentSubmission = z.infer<typeof newAssessmentSubmissionSchema>;
export type CompatibilityAssessment = z.infer<typeof compatibilityAssessmentSchema>;
export type ReportRequest = z.infer<typeof reportRequestSchema>;

function parseWithSchema<T>(schema: z.ZodSchema<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw createValidationErrorFromZod(result.error);
  }

  return result.data;
}

export function validateNewAssessmentSubmission(value: unknown) {
  return parseWithSchema(newAssessmentSubmissionSchema, value);
}

export function validateCompatibilityAssessment(value: unknown) {
  return parseWithSchema(compatibilityAssessmentSchema, value);
}

export function validateReportRequest(value: unknown) {
  return parseWithSchema(reportRequestSchema, value);
}

export function createUnknownFieldValidationError(path: string, key: string) {
  return createValidationError({ [path]: `Unknown field: ${key}` });
}

export const legacyAcceptedValues = {
  assessmentTypes: ["external", "internal"],
  externalCoating: ["FBE / PE / PP"],
  internalCoating: ["Epoxy/Others"],
  cpInputType: ["Polarized Potential"],
  acInputType: ["Pipe AC Voltage to Remote Earth"]
} as const;
