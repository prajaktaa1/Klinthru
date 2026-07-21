import cors from "cors";
import express from "express";

import { allowedOrigins } from "./config/env";
import { assessmentsRouter } from "./routes/assessments";
import { devicesRouter } from "./routes/devices";
import { authRouter } from "./routes/auth";
import { externalPipeDataRouter } from "./routes/externalPipeData";
import { healthRouter } from "./routes/health";
import { reportsRouter } from "./routes/reports";
import { isRequestValidationError } from "./validation/validationErrors";

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

  app.use(express.json({ limit: "100kb" }));

  app.use("/api", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/assessments", assessmentsRouter);
  app.use("/api/devices", devicesRouter);
  app.use("/api/external-pipe-data", externalPipeDataRouter);
  app.use("/api/reports", reportsRouter);

  app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (isRequestValidationError(error)) {
      response.status(400).json({
        error: "Validation failed",
        fields: error.fields
      });
      return;
    }

    const bodyParserError = error as Error & { type?: string };

    if (bodyParserError.type === "entity.parse.failed") {
      response.status(400).json({
        error: "Validation failed",
        fields: {
          request: "Malformed JSON"
        }
      });
      return;
    }

    if (bodyParserError.type === "entity.too.large") {
      response.status(413).json({ error: "Payload too large" });
      return;
    }

    if (error.message.includes("CORS")) {
      response.status(403).json({ message: error.message });
      return;
    }

    response.status(500).json({ message: "Internal server error" });
  });

  return app;
}
