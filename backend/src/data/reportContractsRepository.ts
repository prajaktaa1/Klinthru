import { env } from "../config/env";
import { getPrismaClient } from "../lib/prisma";
import { AuthUser } from "../types/domain";

export const REPORTS_SCHEMA_NOT_DEPLOYED = "Reports additive contract schema is not deployed; no records are available.";

type ContractResult = { status: "available" | "unavailable"; records: unknown[]; reason?: string };

function scope(user: AuthUser) {
  return user.role === "Admin" ? {} : { ownerId: user.id };
}

async function list(delegateName: string, user: AuthUser, args: Record<string, unknown> = {}): Promise<ContractResult> {
  const client = getPrismaClient() as (Record<string, any> | null);
  const delegate = client?.[delegateName];
  if (!delegate || typeof delegate.findMany !== "function") {
    return { status: "unavailable", records: [], reason: REPORTS_SCHEMA_NOT_DEPLOYED };
  }

  try {
    const where = { ...(args.where as Record<string, unknown> | undefined), ...scope(user) };
    return { status: "available", records: await delegate.findMany({ ...args, where }) };
  } catch {
    return { status: "unavailable", records: [], reason: REPORTS_SCHEMA_NOT_DEPLOYED };
  }
}

export function reportContractsReadiness() {
  return {
    status: "blocked" as const,
    mutationsEnabled: env.reportsBackendWritesEnabled,
    schemaDeploymentVerified: false,
    databaseAccessed: false,
    source: "Reports additive contract preparation",
    missingContracts: [
      "approved additive migration application",
      "generated Prisma client for Reports contract models",
      "Document Management output/version linkage contract",
      "Integration Hub connector delivery contract",
      "scheduler/worker execution contract",
      "field-catalog and cross-module permission approvals"
    ],
    ownership: {
      reportSettings: "Reports",
      reportFilesAndRetention: "Document Management",
      deliveryCredentials: "Integration Hub"
    }
  };
}

export const reportContractsRepository = {
  listDefinitions: (user: AuthUser) => list("reportDefinition", user),
  listTemplates: (user: AuthUser) => list("reportTemplate", user),
  listRuns: (user: AuthUser) => list("reportRun", user),
  listSchedules: (user: AuthUser) => list("reportSchedule", user),
  listExports: (user: AuthUser) => list("reportExportJob", user),
  getConfiguration: async (user: AuthUser): Promise<ContractResult> => {
    const result = await list("reportConfiguration", user, { take: 1 });
    return result;
  }
};
