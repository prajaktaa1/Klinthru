import { chainageRouter } from "./routes/chainage";
import cors from "cors";
import express from "express";

import { allowedOrigins } from "./config/env";
import { assessmentsRouter } from "./routes/assessments";
import { riskAssessmentsRouter } from "./routes/riskAssessments";
import { assetMasterRouter } from "./routes/assetMaster";
import { inspectionRecordsRouter } from "./routes/inspectionRecords";
import { cpCalculationsRouter } from "./routes/cpCalculations";
import { cpMonitoringRouter } from "./routes/cpMonitoring";
import { dashboardRouter } from "./routes/dashboard";
import { devicesRouter } from "./routes/devices";
import { authRouter } from "./routes/auth";
import { externalPipeDataRouter } from "./routes/externalPipeData";
import { healthRouter } from "./routes/health";
import { reportsRouter } from "./routes/reports";
import { reportContractsRouter } from "./routes/reportContracts";
import { pipelinesRouter } from "./routes/pipelines";
import { sensorAssignmentsRouter } from "./routes/sensorAssignments";
import { letterHeadsRouter } from "./routes/letterHeads";
import { integrationsRouter } from "./routes/integrations";
import { aiPredictionsRouter } from "./routes/aiPredictions";
import { iliRouter } from "./routes/ili";
import { scadaRouter } from "./routes/scada";
import { documentsRouter } from "./routes/documents";
import { settingsRouter } from "./routes/settings";
import { cpEngineeringDesignBasesRouter } from "./routes/cpEngineeringDesignBases";
import { isRequestValidationError } from "./validation/validationErrors";
import { DatabaseUnavailableError } from "./data/store";
import {
  recordSaveDiagnosticsError,
  saveDiagnosticsMiddleware,
  updateSaveDiagnostics
} from "./middleware/saveDiagnostics";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin not allowed by CORS"));
      }
    })
  );

  app.use(saveDiagnosticsMiddleware);
  app.use("/api/letter-heads", letterHeadsRouter);
  app.use("/api/documents", documentsRouter);
  app.use(express.json({ limit: "100kb" }));

  app.use("/api", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/assessments", assessmentsRouter);
  app.use("/api/risk-assessments", riskAssessmentsRouter);
  app.use("/api/asset-master", assetMasterRouter);
  app.use("/api/chainage", chainageRouter);
  app.use("/api/inspection-records", inspectionRecordsRouter);
  app.use("/api/ai-predictions", aiPredictionsRouter);
  app.use("/api/cp-calculations", cpCalculationsRouter);
  app.use("/api/cp-engineering/design-bases", cpEngineeringDesignBasesRouter);
  app.use("/api/cp-monitoring", cpMonitoringRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/devices", devicesRouter);
  app.use("/api/external-pipe-data", externalPipeDataRouter);
  app.use("/api/ili", iliRouter);
  app.use("/api/integrations", integrationsRouter);
  app.use("/api/pipelines", pipelinesRouter);
  app.use("/api/reports/contracts", reportContractsRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/sensor-assignments", sensorAssignmentsRouter);
  app.use("/api/scada", scadaRouter);
  app.use("/api/settings", settingsRouter);

  app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    recordSaveDiagnosticsError(error);

    if (isRequestValidationError(error)) {
      response.status(400).json({
        error: "Validation failed",
        fields: error.fields
      });
      return;
    }

    const bodyParserError = error as Error & { type?: string };

    if (bodyParserError.type === "entity.parse.failed") {
      updateSaveDiagnostics({
        validationFields: ["request"],
        validationErrorCodes: ["malformed_json"]
      });
      response.status(400).json({
        error: "Validation failed",
        fields: {
          request: "Malformed JSON"
        }
      });
      return;
    }

    if (bodyParserError.type === "entity.too.large") {
      updateSaveDiagnostics({
        validationFields: ["request"],
        validationErrorCodes: ["payload_too_large"]
      });
      response.status(413).json({ error: "Payload too large" });
      return;
    }

    if (error.message.includes("CORS")) {
      response.status(403).json({ message: error.message });
      return;
    }

    if (error instanceof DatabaseUnavailableError) {
      response.status(503).json({ message: error.message });
      return;
    }

    const codedError = error as Error & { code?: string };
    const databaseError = error as Error & { code?: string; meta?: { code?: string } };
    if (databaseError.meta?.code === "42P01" || databaseError.meta?.code === "42703" || databaseError.code === "P2021" || databaseError.code === "P2022") {
      response.status(503).json({ message: "Database schema is unavailable. Apply the pending database migrations." });
      return;
    }
    if (codedError.code === "PIPELINE_DUPLICATE" || codedError.code === "P2002") {
      response.status(409).json({ message: "Pipeline code already exists for this owner." });
      return;
    }
    if (codedError.code === "PIPELINE_LINKED_RECORDS") {
      response.status(409).json({ message: codedError.message });
      return;
    }

    if (codedError.code === "USER_EMAIL_DUPLICATE") {
      response.status(409).json({ message: "An account already exists for this email." });
      return;
    }

    response.status(500).json({ message: "Internal server error" });
  });

  return app;
}
