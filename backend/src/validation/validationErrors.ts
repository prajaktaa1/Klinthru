import { ZodError, ZodIssue } from "zod";

export type ValidationFieldErrors = Record<string, string>;

export class RequestValidationError extends Error {
  readonly status = 400;
  readonly fields: ValidationFieldErrors;

  constructor(fields: ValidationFieldErrors) {
    super("Validation failed");
    this.name = "RequestValidationError";
    this.fields = fields;
  }
}

const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function formatPath(path: Array<string | number | symbol>) {
  return path
    .map((segment) =>
      typeof segment === "number" ? String(segment) : typeof segment === "symbol" ? segment.toString() : segment
    )
    .join(".");
}

function collectIssueEntries(issue: ZodIssue): Array<[string, string]> {
  if (issue.code === "unrecognized_keys") {
    const parentPath = formatPath(issue.path);
    return issue.keys.map((key) => {
      const fieldPath = parentPath ? `${parentPath}.${key}` : key;
      return [fieldPath, "Unknown field"];
    });
  }

  const fieldPath = formatPath(issue.path) || "request";
  return [[fieldPath, issue.message]];
}

export function createValidationError(fields: ValidationFieldErrors) {
  return new RequestValidationError(fields);
}

export function createValidationErrorFromZod(error: ZodError) {
  const fields: ValidationFieldErrors = {};

  for (const issue of error.issues) {
    for (const [path, message] of collectIssueEntries(issue)) {
      if (!fields[path]) {
        fields[path] = message;
      }
    }
  }

  return createValidationError(fields);
}

export function assertNoDangerousKeys(value: unknown, path: Array<string | number> = []): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoDangerousKeys(item, [...path, index]));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const fields: ValidationFieldErrors = {};

  for (const key of Object.keys(value)) {
    const nextPath = [...path, key];
    if (DANGEROUS_KEYS.has(key)) {
      fields[formatPath(nextPath)] = "Dangerous property name is not allowed";
      continue;
    }

    assertNoDangerousKeys((value as Record<string, unknown>)[key], nextPath);
  }

  if (Object.keys(fields).length > 0) {
    throw createValidationError(fields);
  }
}

export function isRequestValidationError(error: unknown): error is RequestValidationError {
  return error instanceof RequestValidationError;
}
