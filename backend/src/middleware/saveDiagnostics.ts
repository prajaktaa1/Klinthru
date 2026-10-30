import { AsyncLocalStorage } from "node:async_hooks";

import { NextFunction, Request, Response } from "express";

import { RequestValidationError } from "../validation/validationErrors";

type SaveDiagnosticsContext = {
  requestPath?: string;
  validationFields?: string[];
  validationErrorCodes?: string[];
  storageMode?: "postgresql" | "memory";
  prismaWriteAttempted?: boolean;
  prismaWriteSucceeded?: boolean;
  prismaErrorCode?: string;
};

const diagnosticPaths = new Set(["/api/assessments", "/api/reports"]);
const saveDiagnosticsStorage = new AsyncLocalStorage<SaveDiagnosticsContext>();

export function isSaveDiagnosticsEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.SAVE_DIAGNOSTICS === "true";
}

export function updateSaveDiagnostics(values: Partial<SaveDiagnosticsContext>) {
  const context = saveDiagnosticsStorage.getStore();
  if (!context) {
    return;
  }

  Object.assign(context, values);
}

function getSanitizedPrismaErrorCode(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && /^[A-Z0-9_]+$/i.test(code) ? code : undefined;
}

export function recordSaveDiagnosticsError(error: unknown) {
  if (error instanceof RequestValidationError) {
    updateSaveDiagnostics({
      validationFields: Object.keys(error.fields),
      validationErrorCodes: Object.keys(error.fields).map(() => "validation_failed")
    });
    return;
  }

  const prismaErrorCode = getSanitizedPrismaErrorCode(error);
  if (prismaErrorCode) {
    updateSaveDiagnostics({
      prismaWriteSucceeded: false,
      prismaErrorCode
    });
  }
}

function shouldDiagnoseRequest(request: Request) {
  const requestPath = request.originalUrl.split("?")[0];
  return request.method === "POST" && diagnosticPaths.has(requestPath);
}

export function saveDiagnosticsMiddleware(request: Request, response: Response, next: NextFunction) {
  if (!isSaveDiagnosticsEnabled() || !shouldDiagnoseRequest(request)) {
    next();
    return;
  }

  const startedAt = process.hrtime.bigint();
  const context: SaveDiagnosticsContext = {
    requestPath: request.originalUrl.split("?")[0],
    prismaWriteAttempted: false,
    prismaWriteSucceeded: false
  };
  let logged = false;

  const writeFinalLine = (event: "finish" | "close") => {
    if (logged) {
      return;
    }

    logged = true;
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const user = request.user;
    const entry = {
      event: "save_diagnostic",
      timestamp: new Date().toISOString(),
      completionEvent: event,
      method: request.method,
      path: context.requestPath,
      origin: request.header("Origin") ?? null,
      status: response.statusCode,
      durationMs: Math.round(durationMs),
      authorizationHeaderPresent: Boolean(request.header("Authorization")),
      authenticatedUserIdPresent: Boolean(user?.id),
      authenticatedUserRole: user?.role ?? null,
      validationFields: context.validationFields ?? [],
      validationErrorCodes: context.validationErrorCodes ?? [],
      storageMode: context.storageMode ?? null,
      prismaWriteAttempted: Boolean(context.prismaWriteAttempted),
      prismaWriteSucceeded: Boolean(context.prismaWriteSucceeded),
      prismaErrorCode: context.prismaErrorCode ?? null
    };

    console.log(JSON.stringify(entry));
  };

  response.once("finish", () => writeFinalLine("finish"));
  response.once("close", () => writeFinalLine("close"));

  saveDiagnosticsStorage.run(context, next);
}
