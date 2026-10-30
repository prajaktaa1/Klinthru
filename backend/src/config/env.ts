import dotenv from "dotenv";

dotenv.config();

function readTrimmed(rawValue: string | undefined): string {
  return rawValue?.trim() || "";
}

function readPort(rawPort: string | undefined): number {
  const parsed = Number(rawPort ?? "4002");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4002;
}

function readCorsOrigins(rawOrigins: string | undefined, rawSingleOrigin: string | undefined): string[] {
  const configuredOrigins = readTrimmed(rawOrigins) || readTrimmed(rawSingleOrigin);
  const origins = configuredOrigins || "http://localhost:3000,http://localhost:4000";

  return origins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: readTrimmed(process.env.NODE_ENV) || "development",
  port: readPort(process.env.PORT),
  jwtSecret: readTrimmed(process.env.JWT_SECRET) || "local-dev-secret",
  databaseUrl: readTrimmed(process.env.DATABASE_URL),
  corsOrigins: readCorsOrigins(process.env.CORS_ORIGINS, process.env.CORS_ORIGIN),
  saveDiagnostics: readTrimmed(process.env.SAVE_DIAGNOSTICS) === "true",
  seedAdminPassword: readTrimmed(process.env.SEED_ADMIN_PASSWORD),
  seedEngineerPassword: readTrimmed(process.env.SEED_ENGINEER_PASSWORD),
  seedViewerPassword: readTrimmed(process.env.SEED_VIEWER_PASSWORD),
  emailFrom: readTrimmed(process.env.EMAIL_FROM),
  resendApiKey: readTrimmed(process.env.RESEND_API_KEY),
  // Reports contract writes remain disabled until the separately approved
  // migration, backup, permission and deployment gates are complete.
  reportsBackendWritesEnabled: readTrimmed(process.env.REPORTS_BACKEND_WRITES_ENABLED) === "true"
};

export const isProduction = env.nodeEnv === "production";
export const allowMemoryStorage = env.nodeEnv === "development" || env.nodeEnv === "test";
export const allowedOrigins = env.corsOrigins;
