import dotenv from "dotenv";

dotenv.config();

function readTrimmed(rawValue: string | undefined): string {
  return rawValue?.trim() || "";
}

function readPort(rawPort: string | undefined): number {
  const parsed = Number(rawPort ?? "4002");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4002;
}

export const env = {
  port: readPort(process.env.PORT),
  jwtSecret: readTrimmed(process.env.JWT_SECRET) || "local-dev-secret",
  databaseUrl: readTrimmed(process.env.DATABASE_URL),
  seedAdminPassword: readTrimmed(process.env.SEED_ADMIN_PASSWORD),
  seedEngineerPassword: readTrimmed(process.env.SEED_ENGINEER_PASSWORD),
  seedViewerPassword: readTrimmed(process.env.SEED_VIEWER_PASSWORD)
};

export const allowedOrigins = ["http://localhost:4000"];
